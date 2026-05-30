import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = today.toISOString();

  const [
    { count: totalCustomers },
    { data: recentCampaigns },
    { data: recentActivity },
    { count: sentToday },
    { data: deliveredRecipients },
    { data: repliedRecipients },
  ] = await Promise.all([
    supabase.from("cms_customers").select("*", { count: "exact", head: true }),
    supabase
      .from("crm_campaigns")
      .select("id, name, message_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("crm_campaign_recipients")
      .select("id, customer_guid, phone_number, send_status, sent_at, replied_at, reply_text")
      .order("sent_at", { ascending: false })
      .not("sent_at", "is", null)
      .limit(6),
    supabase
      .from("crm_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", todayStr),
    supabase
      .from("crm_campaign_recipients")
      .select("send_status")
      .in("send_status", ["delivered", "read", "replied"]),
    supabase
      .from("crm_campaign_recipients")
      .select("send_status")
      .in("send_status", ["replied"]),
  ]);

  const totalDelivered = deliveredRecipients?.length || 0;
  const totalReplied = repliedRecipients?.length || 0;

  // Fetch customer names for activity
  const activityGuids = (recentActivity || []).map((r: Record<string,unknown>) => r.customer_guid).filter(Boolean);
  const customerNames: Record<string, string> = {};
  if (activityGuids.length > 0) {
    const { data: customers } = await supabase
      .from("cms_customers")
      .select("guid, full_name")
      .in("guid", activityGuids);
    if (customers) {
      for (const c of customers) {
        customerNames[c.guid] = c.full_name || "Unknown";
      }
    }
  }

  const enrichedActivity = (recentActivity || []).map((r: Record<string,unknown>) => ({
    ...r,
    customer_name: customerNames[r.customer_guid as string] || "Unknown",
  }));

  return NextResponse.json({
    stats: {
      totalCustomers: totalCustomers || 0,
      sentToday: sentToday || 0,
      readRate: totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0,
      repliedRate: totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0,
    },
    recentCampaigns: recentCampaigns || [],
    activity: enrichedActivity,
  });
}