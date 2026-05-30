import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recipientId } = await params;
  const supabase = await createAdminClient();

  // Get recipient + campaign
  const { data: recipient } = await supabase
    .from("crm_campaign_recipients")
    .select("*, crm_campaigns!inner(id, name, template_name, text_body, created_at)")
    .eq("id", recipientId)
    .eq("campaign_id", Number(id))
    .single();

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const campaign = recipient.crm_campaigns as Record<string, unknown>;
  const customerGuid = recipient.customer_guid as string;

  // Customer info
  const { data: customer } = await supabase
    .from("cms_customers")
    .select("full_name, phone_number, email, username")
    .eq("guid", customerGuid)
    .single();

  const displayName = customer?.full_name || customer?.username || "Unknown";

  // Build messages from wa_messages (historical chat)
  const seen = new Set<string>();
  const messages: Record<string, unknown>[] = [];

  // Find pipeline
  const { data: pipeline } = await supabase
    .from("crm_lead_pipeline")
    .select("id")
    .eq("customer_guid", customerGuid)
    .maybeSingle();

  if (pipeline) {
    const { data: waHistory } = await supabase
      .from("wa_messages")
      .select("direction, type, content, status, sent_at, damcorp_message_id")
      .eq("pipeline_id", pipeline.id)
      .order("sent_at", { ascending: true });

    if (waHistory) {
      for (const msg of waHistory) {
        const key = msg.damcorp_message_id || `${msg.direction}-${msg.sent_at}-${Math.random()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        messages.push({
          direction: msg.direction,
          type: msg.type || "text",
          content: msg.content || "",
          status: msg.status,
          created_at: msg.sent_at,
          wa_message_id: msg.damcorp_message_id,
        });
      }
    }
  }

  // Add campaign sent message (if not already in wa_messages)
  if (recipient.sent_at) {
    const wamid = recipient.wa_message_id as string;
    const key = wamid || `sent-${recipient.sent_at}`;
    if (!seen.has(key)) {
      seen.add(key);

      let sentContent = campaign.text_body as string || "";
      if (!sentContent && campaign.template_name) {
        const { data: tpl } = await supabase
          .from("wa_templates")
          .select("content")
          .eq("name", campaign.template_name as string)
          .maybeSingle();
        sentContent = tpl?.content || `[Template: ${campaign.template_name}]`;
      }

      messages.push({
        direction: "outbound",
        type: campaign.template_name ? "template" : "text",
        content: sentContent,
        status: recipient.send_status,
        created_at: recipient.sent_at,
        wa_message_id: wamid,
      });
    }
  }

  // Add customer reply (only if not already in wa_messages)
  if (recipient.reply_text && recipient.replied_at) {
    const alreadyExists = messages.some(
      (m) => m.direction === "inbound" && m.content === recipient.reply_text
    );
    if (!alreadyExists) {
      messages.push({
        direction: "inbound",
        type: "text",
        content: recipient.reply_text,
        status: "replied",
        created_at: recipient.replied_at,
      });
    }
  }

  messages.sort((a, b) =>
    new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
  );

  return NextResponse.json({
    customer: {
      full_name: displayName,
      phone_number: customer?.phone_number || recipient.phone_number,
      email: customer?.email || "",
    },
    messages,
  });
}