import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();
  let reprocessed = 0;
  let saved = 0;

  // Get all unmatched events
  const { data: events } = await supabase
    .from("crm_webhook_events")
    .select("id, payload_json")
    .eq("process_status", "unmatched")
    .limit(50);

  if (!events || events.length === 0) {
    return NextResponse.json({ reprocessed: 0, saved: 0, message: "No unmatched events" });
  }

  for (const ev of events) {
    const p = ev.payload_json as Record<string, unknown> | undefined;
    const from = p?.from as string;
    const textBody = p?.textBody as string;
    const msgId = p?.msgId as string;
    if (!from || !textBody) continue;

    reprocessed++;

    // Try to find recipient by phone
    const phone = from.replace(/^\+/, "").replace("@c.us", "");
    const { data: recipients } = await supabase
      .from("crm_campaign_recipients")
      .select("id, customer_guid, phone_number")
      .or(`phone_number.eq.${phone},phone_number.eq.+${phone}`)
      .limit(1);

    const recipient = recipients?.[0];
    const customerGuid = recipient?.customer_guid || null;

    // Try to update reply
    if (recipient) {
      await supabase
        .from("crm_campaign_recipients")
        .update({
          send_status: "replied",
          reply_text: textBody,
          replied_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);
    }

    // Get or create pipeline
    let pipelineId: string | null = null;
    if (customerGuid) {
      const { data: pl } = await supabase
        .from("crm_lead_pipeline")
        .select("id")
        .eq("customer_guid", customerGuid)
        .maybeSingle();
      if (pl) pipelineId = pl.id;
    }

    // Save to wa_messages
    await supabase.from("wa_messages").insert({
      pipeline_id: pipelineId, direction: "inbound",
      type: "text", content: textBody,
      status: "sent", damcorp_message_id: msgId,
      sent_at: new Date().toISOString(),
    });

    saved++;

    // Mark as processed
    await supabase
      .from("crm_webhook_events")
      .update({ process_status: "reprocessed", processed_at: new Date().toISOString() })
      .eq("id", ev.id);
  }

  return NextResponse.json({ reprocessed, saved });
}