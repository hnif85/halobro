import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();
  const days = parseInt(req.nextUrl.searchParams.get("days") || "90");

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [{ data: campaigns }, { data: recipients }] = await Promise.all([
    supabase
      .from("crm_campaigns")
      .select("id, name, message_type, status, created_at")
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: false }),
    supabase
      .from("crm_campaign_recipients")
      .select("id, campaign_id, send_status, sent_at, replied_at")
      .not("sent_at", "is", null)
      .gte("sent_at", sinceStr),
  ]);

  const campaignStats = new Map<number, { sent: number; delivered: number; read: number; replied: number }>();

  for (const r of recipients || []) {
    if (!campaignStats.has(r.campaign_id)) {
      campaignStats.set(r.campaign_id, { sent: 0, delivered: 0, read: 0, replied: 0 });
    }
    const s = campaignStats.get(r.campaign_id)!;
    s.sent++;
    if (["delivered", "read", "replied"].includes(r.send_status)) s.delivered++;
    if (["read", "replied"].includes(r.send_status)) s.read++;
    if (r.send_status === "replied") s.replied++;
  }

  const enriched = (campaigns || []).map((c) => {
    const stats = campaignStats.get(c.id) || { sent: 0, delivered: 0, read: 0, replied: 0 };
    return {
      ...c,
      ...stats,
      readRate: stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0,
      replyRate: stats.delivered > 0 ? Math.round((stats.replied / stats.delivered) * 100) : 0,
    };
  });

  const avgReadRate = enriched.length > 0
    ? Math.round(enriched.reduce((s, c) => s + c.readRate, 0) / enriched.length)
    : 0;
  const avgReplyRate = enriched.length > 0
    ? Math.round(enriched.reduce((s, c) => s + c.replyRate, 0) / enriched.length)
    : 0;

  const totalSent = enriched.reduce((s, c) => s + c.sent, 0);
  const totalDelivered = enriched.reduce((s, c) => s + c.delivered, 0);
  const totalRead = enriched.reduce((s, c) => s + c.read, 0);
  const totalReplied = enriched.reduce((s, c) => s + c.replied, 0);

  const templateCamps = enriched.filter((c) => c.message_type === "template");
  const textCamps = enriched.filter((c) => c.message_type === "text");

  const templateAvgRead = templateCamps.length > 0
    ? Math.round(templateCamps.reduce((s, c) => s + c.readRate, 0) / templateCamps.length)
    : 0;
  const templateAvgReply = templateCamps.length > 0
    ? Math.round(templateCamps.reduce((s, c) => s + c.replyRate, 0) / templateCamps.length)
    : 0;
  const textAvgRead = textCamps.length > 0
    ? Math.round(textCamps.reduce((s, c) => s + c.readRate, 0) / textCamps.length)
    : 0;
  const textAvgReply = textCamps.length > 0
    ? Math.round(textCamps.reduce((s, c) => s + c.replyRate, 0) / textCamps.length)
    : 0;

  const bestPerformers = [...enriched]
    .filter((c) => c.sent >= 5)
    .sort((a, b) => b.replyRate - a.replyRate)
    .slice(0, 5);

  const worstPerformers = [...enriched]
    .filter((c) => c.sent >= 5)
    .sort((a, b) => a.replyRate - b.replyRate)
    .slice(0, 5);

  const weeklyTrend: { week: string; sent: number; delivered: number; read: number }[] = [];
  const weekMap = new Map<string, { sent: number; delivered: number; read: number }>();
  for (const r of recipients || []) {
    if (!r.sent_at) continue;
    const d = new Date(r.sent_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, { sent: 0, delivered: 0, read: 0 });
    const w = weekMap.get(key)!;
    w.sent++;
    if (["delivered", "read", "replied"].includes(r.send_status)) w.delivered++;
    if (["read", "replied"].includes(r.send_status)) w.read++;
  }
  for (const [week, data] of weekMap) {
    weeklyTrend.push({ week, ...data });
  }
  weeklyTrend.sort((a, b) => a.week.localeCompare(b.week));

  return NextResponse.json({
    summary: {
      totalCampaigns: campaigns?.length || 0,
      totalSent,
      totalDelivered,
      totalRead,
      totalReplied,
      avgReadRate,
      avgReplyRate,
    },
    funnel: {
      sent: totalSent,
      delivered: totalDelivered,
      read: totalRead,
      replied: totalReplied,
    },
    templateComparison: {
      templateCount: templateCamps.length,
      textCount: textCamps.length,
      templateAvgRead,
      templateAvgReply,
      textAvgRead,
      textAvgReply,
    },
    bestPerformers,
    worstPerformers,
    weeklyTrend,
    campaigns: enriched,
  });
}
