import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { sendTextMessage, normalizePhone } from "@/lib/waba";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recipientId } = await params;
  const body = await req.json();
  const textBody = (body.text || "").trim();

  if (!textBody) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Get recipient info
  const { data: recipient } = await supabase
    .from("crm_campaign_recipients")
    .select("id, customer_guid, phone_number, wa_message_id")
    .eq("id", recipientId)
    .eq("campaign_id", Number(id))
    .single();

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const phone = normalizePhone(recipient.phone_number);

  // Send via Damcorp
  const result = await sendTextMessage(phone, textBody);

  if (!result.success) {
    return NextResponse.json({
      error: result.error,
      sent: false,
    }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Ensure pipeline exists — create if not
  const { data: pipeline } = await supabase
    .from("crm_lead_pipeline")
    .select("id")
    .eq("customer_guid", recipient.customer_guid)
    .maybeSingle();

  let pipelineId = pipeline?.id;
  if (!pipelineId) {
      const { data: newPipeline } = await supabase
        .from("crm_lead_pipeline")
        .insert({ customer_guid: recipient.customer_guid })
        .select("id")
        .single();
    pipelineId = newPipeline?.id;
  }

  await supabase.from("wa_messages").insert({
    pipeline_id: pipelineId,
    direction: "outbound",
    type: "text",
    content: textBody,
    status: "sent",
    damcorp_message_id: result.wamid,
    sent_at: now,
  });

  return NextResponse.json({
    sent: true,
    wamid: result.wamid,
    wa_id: result.wa_id,
    created_at: now,
  });
}