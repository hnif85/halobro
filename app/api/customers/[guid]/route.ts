import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guid } = await params;
  const supabase = await createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("cms_customers")
    .select("*")
    .eq("guid", guid)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, transaction_details(*)")
    .eq("customer_guid", guid)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: campaignHistory } = await supabase
    .from("crm_campaign_recipients")
    .select(`
      id,
      send_status,
      sent_at,
      delivered_at,
      read_at,
      replied_at,
      reply_text,
      crm_campaigns!left(name, created_at)
    `)
    .eq("customer_guid", guid)
    .order("sent_at", { ascending: false });

  const totalSpend = (transactions || []).reduce(
    (sum, t: Record<string,unknown>) => sum + (Number((t.grand_total as Record<string,unknown> || {}).val ?? t.grand_total) || 0),
    0
  );
  const totalOrders = (transactions || []).length;

  return NextResponse.json({
    profile,
    transactions: transactions || [],
    campaignHistory: (campaignHistory || []).map((r: Record<string,unknown>) => ({
      ...r,
      campaign_name: (r.crm_campaigns as Record<string,unknown>)?.name || "Unknown",
      campaign_created_at: (r.crm_campaigns as Record<string,unknown>)?.created_at,
    })),
    summary: { totalSpend, totalOrders },
  });
}