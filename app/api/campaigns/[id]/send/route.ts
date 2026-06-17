import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { sendTemplateMessage, sendTextMessage, normalizePhone } from "@/lib/waba";

const RATE_LIMIT_MS = 500;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const recipientGuids: string[] = body.recipient_guids || [];

  const supabase = await createAdminClient();

  const { data: campaign } = await supabase
    .from("crm_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let customersQuery = supabase
    .from("cms_customers")
    .select("guid, full_name, phone_number, email, city, username")
    .not("phone_number", "is", null)
    .neq("phone_number", "");

  if (recipientGuids.length > 0) {
    customersQuery = customersQuery.in("guid", recipientGuids);
  }

  const { data: customers } = await customersQuery;

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: "No valid recipients found" }, { status: 400 });
  }

  await supabase
    .from("crm_campaigns")
    .update({ status: "sending" })
    .eq("id", id);

  const recipientsToInsert = customers.map((c: Record<string,unknown>) => ({
    campaign_id: id,
    customer_guid: c.guid,
    phone_number: c.phone_number,
    send_status: "pending",
    created_at: new Date().toISOString(),
  }));

  const { data: insertedRecipients } = await supabase
    .from("crm_campaign_recipients")
    .insert(recipientsToInsert)
    .select("id, phone_number, customer_guid");

  const batch = insertedRecipients || [];
  let processed = 0;
  let failed = 0;

  const customerMap: Record<string, Record<string, unknown>> = {};
  for (const c of customers || []) {
    customerMap[c.guid as string] = c as Record<string, unknown>;
  }

  for (let i = 0; i < batch.length; i++) {
    const recipient = batch[i] as Record<string,unknown>;
    const phone = normalizePhone(recipient.phone_number as string);
    const customer = customerMap[recipient.customer_guid as string];

    try {
      let result;
      if (campaign.message_type === "template" && campaign.template_name) {
        let components: Record<string,unknown>[] = [];
        if (campaign.template_components_json) {
          try {
            const parsed = typeof campaign.template_components_json === "string"
              ? JSON.parse(campaign.template_components_json)
              : campaign.template_components_json;
            const keys = Object.keys(parsed).sort((a, b) => parseInt(a) - parseInt(b));
            const params = keys.map((k) => {
              const cfg = parsed[k] as { type: string; source?: string; value?: string };
              if (cfg.type === "dynamic" && cfg.source) {
                return { type: "text" as const, text: String((customer || {})[cfg.source] || "") };
              }
              return { type: "text" as const, text: cfg.value || "" };
            });
            if (params.length > 0) {
              components = [{ type: "body", parameters: params }];
            }
          } catch {}
        }
        result = await sendTemplateMessage({
          to: phone,
          templateName: campaign.template_name,
          language: campaign.template_lang || "id",
          components,
        });
      } else {
        result = await sendTextMessage(phone, campaign.text_body || "");
      }

      if (result.success) {
        await supabase
          .from("crm_campaign_recipients")
          .update({
            send_status: "sent",
            wa_message_id: result.wamid,
            sent_at: new Date().toISOString(),
            provider_response_json: { wamid: result.wamid, wa_id: result.wa_id },
          })
          .eq("id", recipient.id);
        processed++;
      } else {
        await supabase
          .from("crm_campaign_recipients")
          .update({
            send_status: "failed",
            error_message: result.error,
          })
          .eq("id", recipient.id);
        failed++;
      }
    } catch (err) {
      await supabase
        .from("crm_campaign_recipients")
        .update({
          send_status: "failed",
          error_message: String(err),
        })
        .eq("id", recipient.id);
      failed++;
    }

    if (i < batch.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  await supabase
    .from("crm_campaigns")
    .update({ status: "done" })
    .eq("id", id);

  return NextResponse.json({
    status: "done",
    total: batch.length,
    sent: processed,
    failed,
  });
}