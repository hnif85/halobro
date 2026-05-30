import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: campaign, error } = await supabase
    .from("crm_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: recipients } = await supabase
    .from("crm_campaign_recipients")
    .select(`
      id,
      customer_guid,
      phone_number,
      wa_message_id,
      send_status,
      provider_response_json,
      error_message,
      sent_at,
      delivered_at,
      read_at,
      replied_at,
      reply_text,
      failed_at,
      created_at
    `)
    .eq("campaign_id", Number(id))
    .order("created_at", { ascending: false });

  const stats = {
    total: recipients?.length || 0,
    sent: recipients?.filter((r: Record<string,unknown>) => ["sent", "delivered", "read", "replied"].includes(r.send_status as string)).length || 0,
    delivered: recipients?.filter((r: Record<string,unknown>) => ["delivered", "read", "replied"].includes(r.send_status as string)).length || 0,
    read: recipients?.filter((r: Record<string,unknown>) => ["read", "replied"].includes(r.send_status as string)).length || 0,
    replied: recipients?.filter((r: Record<string,unknown>) => r.send_status === "replied").length || 0,
    failed: recipients?.filter((r: Record<string,unknown>) => r.send_status === "failed").length || 0,
  };

  // Fetch customer names for recipients
  const guids = (recipients || []).map((r: Record<string,unknown>) => r.customer_guid).filter(Boolean);
  const customerNames: Record<string, string> = {};
  if (guids.length > 0) {
    const { data: customers } = await supabase
      .from("cms_customers")
      .select("guid, full_name, email")
      .in("guid", guids);
    if (customers) {
      for (const c of customers) {
        customerNames[c.guid] = c.full_name || "Unknown";
      }
    }
  }

  const enrichedRecipients = (recipients || []).map((r: Record<string,unknown>) => ({
    ...r,
    full_name: customerNames[r.customer_guid as string] || "Unknown",
    email: "",
  }));

  // Fetch template content if template type
  let messagePreview = campaign.text_body || null;
  if (campaign.message_type === "template" && campaign.template_name) {
    const { data: templateData } = await supabase
      .from("wa_templates")
      .select("content, display_name")
      .eq("name", campaign.template_name)
      .maybeSingle();
    if (templateData) {
      messagePreview = templateData.content || `[Template: ${campaign.template_name}]`;
    } else {
      messagePreview = `[Template: ${campaign.template_name}]`;
    }
  }

  return NextResponse.json({ campaign, stats, recipients: enrichedRecipients, messagePreview });
}