import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function normalizePhone(phone: string): string[] {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.endsWith("@c.us")) p = p.slice(0, -5);
  // Return all possible formats for matching
  const variants: string[] = [];
  if (p.startsWith("+")) {
    variants.push(p, p.slice(1));
  } else if (p.startsWith("62")) {
    variants.push(p, "+" + p);
  } else if (p.startsWith("0")) {
    variants.push("62" + p.slice(1), "+62" + p.slice(1));
  } else {
    variants.push(p);
  }
  return [...new Set(variants)];
}

export async function POST(req: NextRequest) {
  // POST events from Damcorp — no token needed
  const payload = await req.json().catch(() => null);

  const supabase = await createAdminClient();

  // Log raw webhook
  await supabase.from("crm_webhook_events").insert({
    provider: "damcorp",
    event_type: "webhook_received",
    payload_json: payload,
    process_status: "received",
    received_at: new Date().toISOString(),
  });

  const entry = (payload.entry as Record<string, unknown>[] || [])[0];
  const changes = (((entry?.changes as Record<string, unknown>[]) || [])[0])?.value as Record<string, unknown> || {};

  // ── Handle status updates (sent/delivered/read) ──
  const statuses = changes.statuses as Record<string, unknown>[] | undefined;
  if (statuses && statuses.length > 0) {
    for (const status of statuses) {
      const wamid = status.id as string;
      const statusVal = status.status as string;
      if (!wamid || !statusVal) continue;

      const updateField: Record<string, string> = {};
      if (statusVal === "delivered") updateField.delivered_at = new Date().toISOString();
      else if (statusVal === "read") updateField.read_at = new Date().toISOString();
      // Don't overwrite sent_at

      if (Object.keys(updateField).length > 0) {
        const { data: updated } = await supabase
          .from("crm_campaign_recipients")
          .update(updateField)
          .eq("wa_message_id", wamid)
          .select("id");

        if (!updated || updated.length === 0) {
          // Also try matching by phone number from the status context
          const metadata = changes.metadata as Record<string, unknown> | undefined;
          const recipientWaId = metadata?.display_phone_number as string | undefined;
          if (recipientWaId) {
            const phones = normalizePhone(recipientWaId);
            const orQueries = phones.map((ph) => `phone_number.eq.${ph}`).join(",");
            await supabase
              .from("crm_campaign_recipients")
              .update(updateField)
              .or(orQueries);
          }
        }
      }
    }
  }

  // ── Handle incoming messages (replies) ──
  const messages = changes.messages as Record<string, unknown>[] | undefined;
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      const from = msg.from as string;
      const msgType = msg.type as string;
      let textBody = "";
      if (msgType === "text") {
        textBody = (msg.text as Record<string, unknown>)?.body as string || "";
      } else if (msgType === "interactive") {
        const interactive = msg.interactive as Record<string, unknown> || {};
        const buttonReply = interactive.button_reply as Record<string, unknown>;
        const listReply = interactive.list_reply as Record<string, unknown>;
        if (buttonReply) textBody = (buttonReply.title || buttonReply.id) as string;
        if (listReply) textBody = (listReply.title || listReply.id) as string;
      }
      const msgId = msg.id as string;
      if (!from) continue;

      const phoneVariants = normalizePhone(from);

      // Try to update crm_campaign_recipients by matching any phone variant
      let updated = false;
      for (const phone of phoneVariants) {
        const { data: result } = await supabase
          .from("crm_campaign_recipients")
          .update({
            send_status: "replied",
            reply_text: textBody,
            replied_at: new Date().toISOString(),
          })
          .or(`phone_number.eq.${phone},phone_number.eq.+${phone}`)
          .is("replied_at", null)
          .select("id");

        if (result && result.length > 0) {
          updated = true;
          break;
        }
      }

      // Always save to wa_messages
      const now = new Date().toISOString();
      await supabase.from("wa_messages").insert({
        pipeline_id: null, direction: "inbound",
        type: msgType || "text", content: textBody,
        status: "sent", damcorp_message_id: msgId, sent_at: now,
      });

      await supabase.from("crm_webhook_events").insert({
        provider: "damcorp",
        event_type: updated ? "reply_matched" : "reply_unmatched",
        external_event_id: msgId,
        payload_json: { from: phoneVariants[0], textBody, msgId, matched: updated },
        process_status: updated ? "processed" : "unmatched",
        received_at: now,
        processed_at: now,
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}