import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function normalizePhone(phone: string): string[] {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.endsWith("@c.us")) p = p.slice(0, -5);
  const variants: string[] = [];
  if (p.startsWith("+")) variants.push(p, p.slice(1));
  else if (p.startsWith("62")) variants.push(p, "+" + p);
  else if (p.startsWith("0")) variants.push("62" + p.slice(1), "+62" + p.slice(1));
  else variants.push(p);
  return [...new Set(variants)];
}

function extractPayload(payload: Record<string, unknown>) {
  if (payload.messages || payload.statuses) {
    return {
      contacts: (payload.contacts as Record<string, unknown>[]) || [],
      messages: (payload.messages as Record<string, unknown>[]) || [],
      statuses: (payload.statuses as Record<string, unknown>[]) || [],
    };
  }
  const entry = (payload.entry as Record<string, unknown>[] || [])[0];
  const value = (((entry?.changes as Record<string, unknown>[]) || [])[0])?.value as Record<string, unknown> || {};
  return {
    contacts: (value.contacts as Record<string, unknown>[]) || [],
    messages: (value.messages as Record<string, unknown>[]) || [],
    statuses: (value.statuses as Record<string, unknown>[]) || [],
  };
}

async function getOrCreatePipeline(supabase: any, customerGuid: string) {
  if (!customerGuid) return null;

  const { data: existing } = await supabase
    .from("crm_lead_pipeline")
    .select("id")
    .eq("customer_guid", customerGuid)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("crm_lead_pipeline")
    .insert({ customer_guid: customerGuid })
    .select("id")
    .single();

  return created?.id || null;
}

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const supabase = await createAdminClient();
  const { contacts, messages, statuses } = extractPayload(payload);

  await supabase.from("crm_webhook_events").insert({
    provider: "damcorp", event_type: "webhook_received",
    payload_json: payload, process_status: "received",
    received_at: new Date().toISOString(),
  });

  // ── Status updates ──
  for (const status of statuses) {
    const wamid = status.id as string;
    const statusVal = status.status as string;
    if (!wamid || !statusVal) continue;

    const f: Record<string, string> = {};
    if (statusVal === "delivered") f.delivered_at = new Date().toISOString();
    else if (statusVal === "read") f.read_at = new Date().toISOString();
    // Don't overwrite sent_at — already set correctly by send endpoint
    if (Object.keys(f).length === 0) continue;

    const { data: updated } = await supabase
      .from("crm_campaign_recipients").update(f).eq("wa_message_id", wamid).select("id");
    if (!updated?.length) {
      const rid = status.recipient_id as string;
      if (rid) {
        for (const ph of normalizePhone(rid)) {
          const r = await supabase.from("crm_campaign_recipients").update(f).eq("phone_number", ph).select("id");
          if (r.data?.length) break;
        }
      }
    }
  }

  // ── Incoming messages ──
  for (const msg of messages) {
    const from = msg.from as string;
    if (!from) continue;

    const msgType = msg.type as string;
    let textBody = "";
    if (msgType === "text") textBody = (msg.text as Record<string, unknown>)?.body as string || "";
    else if (msgType === "interactive") {
      const btn = ((msg.interactive as Record<string, unknown>)?.button_reply as Record<string, unknown>);
      const lst = ((msg.interactive as Record<string, unknown>)?.list_reply as Record<string, unknown>);
      if (btn) textBody = (btn.title || btn.id) as string;
      if (lst) textBody = (lst.title || lst.id) as string;
    }
    const msgId = msg.id as string;
    const phoneVariants = normalizePhone(from);
    const contact = contacts.find((c) => c.wa_id === from || c.wa_id === phoneVariants[0]);
    const contactName = ((contact?.profile as Record<string, unknown>)?.name as string) || "";
    const now = new Date().toISOString();

    // Step 1: Find recipient → get customer_guid
    let customerGuid: string | null = null;
    for (const ph of phoneVariants) {
      const { data: found } = await supabase
        .from("crm_campaign_recipients")
        .select("customer_guid")
        .eq("phone_number", ph)
        .limit(1);
      if (found?.length) { customerGuid = found[0].customer_guid; break; }
    }

    // Step 2: Update reply
    let replied = false;
    for (const ph of phoneVariants) {
      const { data: r } = await supabase
        .from("crm_campaign_recipients")
        .update({ send_status: "replied", reply_text: textBody, replied_at: now })
        .eq("phone_number", ph)
        .select("id");
      if (r?.length) { replied = true; break; }
    }

    // Step 3: Get or create pipeline
    const pipelineId = await getOrCreatePipeline(supabase, customerGuid || "");

    // Step 4: Always save to wa_messages (even without pipeline)
    await supabase.from("wa_messages").insert({
      pipeline_id: pipelineId, direction: "inbound",
      type: msgType || "text", content: textBody,
      status: "sent", damcorp_message_id: msgId, sent_at: now,
    });

    // Step 5: Log
    await supabase.from("crm_webhook_events").insert({
      provider: "damcorp",
      event_type: replied ? "reply_matched" : "reply_unmatched",
      external_event_id: msgId,
      payload_json: { from: phoneVariants[0], textBody, msgId, matched: replied, contactName, customerGuid, pipelineCreated: !!pipelineId },
      process_status: replied ? "processed" : "unmatched",
      received_at: now, processed_at: now,
    });
  }

  return NextResponse.json({ status: "ok" });
}