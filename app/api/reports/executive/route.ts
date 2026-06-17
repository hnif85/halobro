import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [
    { count: totalCustomers },
    { data: allRecipients },
    { data: campaigns },
    { data: monthlyCampaigns },
    { data: customerGrowth },
  ] = await Promise.all([
    supabase.from("cms_customers").select("*", { count: "exact", head: true }),
    supabase
      .from("crm_campaign_recipients")
      .select("send_status, sent_at, replied_at, phone_number")
      .not("sent_at", "is", null),
    supabase
      .from("crm_campaigns")
      .select("id, name, message_type, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("crm_campaigns")
      .select("id, created_at")
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: true }),
    supabase
      .from("cms_customers")
      .select("created_at")
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: true }),
  ]);

  const total = allRecipients?.length || 0;
  const delivered = allRecipients?.filter((r) => ["delivered", "read", "replied"].includes(r.send_status)).length || 0;
  const read = allRecipients?.filter((r) => ["read", "replied"].includes(r.send_status)).length || 0;
  const replied = allRecipients?.filter((r) => r.send_status === "replied").length || 0;

  const funnel = {
    sent: total,
    delivered,
    read,
    replied,
    deliveredRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
    repliedRate: delivered > 0 ? Math.round((replied / delivered) * 100) : 0,
  };

  const campaignTrend: { month: string; total: number }[] = [];
  const monthMap = new Map<string, number>();
  for (const c of monthlyCampaigns || []) {
    const key = c.created_at?.slice(0, 7);
    if (key) monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }
  for (const [month, total] of monthMap) {
    campaignTrend.push({ month, total });
  }
  campaignTrend.sort((a, b) => a.month.localeCompare(b.month));

  const customerTrend: { month: string; total: number }[] = [];
  const cMonthMap = new Map<string, number>();
  for (const c of customerGrowth || []) {
    const key = c.created_at?.slice(0, 7);
    if (key) cMonthMap.set(key, (cMonthMap.get(key) || 0) + 1);
  }
  let runningTotal = 0;
  for (const [month, count] of [...cMonthMap].sort(([a], [b]) => a.localeCompare(b))) {
    runningTotal += count;
    customerTrend.push({ month, total: runningTotal });
  }

  const templateCampaigns = campaigns?.filter((c) => c.message_type === "template") || [];
  const textCampaigns = campaigns?.filter((c) => c.message_type === "text") || [];

  const topCampaigns = (campaigns || [])
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      message_type: c.message_type,
      status: c.status,
      created_at: c.created_at,
    }));

  return NextResponse.json({
    stats: {
      totalCustomers: totalCustomers || 0,
      totalCampaigns: campaigns?.length || 0,
      templateCampaigns: templateCampaigns.length,
      textCampaigns: textCampaigns.length,
    },
    funnel,
    campaignTrend,
    customerTrend,
    topCampaigns,
  });
}
