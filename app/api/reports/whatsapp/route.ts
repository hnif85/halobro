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

  const [{ data: recipients }, { data: waMessages }, { data: halosisMessages }] = await Promise.all([
    supabase
      .from("crm_campaign_recipients")
      .select("send_status, sent_at, replied_at, created_at")
      .gte("sent_at", sinceStr)
      .not("sent_at", "is", null),
    supabase
      .from("wa_messages")
      .select("direction, status, created_at")
      .gte("created_at", sinceStr),
    supabase
      .from("halosis_messages")
      .select("status, sent_at, type")
      .gte("sent_at", sinceStr),
  ]);

  const totalSent = recipients?.length || 0;
  const delivered = recipients?.filter((r) => ["delivered", "read", "replied"].includes(r.send_status)).length || 0;
  const read = recipients?.filter((r) => ["read", "replied"].includes(r.send_status)).length || 0;
  const replied = recipients?.filter((r) => r.send_status === "replied").length || 0;

  const dailyTrend: { date: string; sent: number; delivered: number; read: number }[] = [];
  const dayMap = new Map<string, { sent: number; delivered: number; read: number }>();

  for (const r of recipients || []) {
    if (!r.sent_at) continue;
    const key = r.sent_at.slice(0, 10);
    if (!dayMap.has(key)) dayMap.set(key, { sent: 0, delivered: 0, read: 0 });
    const d = dayMap.get(key)!;
    d.sent++;
    if (["delivered", "read", "replied"].includes(r.send_status)) d.delivered++;
    if (["read", "replied"].includes(r.send_status)) d.read++;
  }
  for (const [date, data] of dayMap) dailyTrend.push({ date, ...data });
  dailyTrend.sort((a, b) => a.date.localeCompare(b.date));

  const hourlyBuckets = new Map<string, number>();
  for (const r of recipients || []) {
    if (!r.sent_at) continue;
    const h = new Date(r.sent_at).getHours().toString().padStart(2, "0") + ":00";
    hourlyBuckets.set(h, (hourlyBuckets.get(h) || 0) + 1);
  }
  const hourlyDistribution = [...hourlyBuckets.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const responseTimes: number[] = [];
  for (const r of recipients || []) {
    if (r.replied_at && r.sent_at) {
      const diff = new Date(r.replied_at).getTime() - new Date(r.sent_at).getTime();
      if (diff > 0) responseTimes.push(Math.round(diff / 3600000));
    }
  }
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length)
    : 0;

  const damcorpVolume = recipients?.length || 0;
  const halosisVolume = halosisMessages?.length || 0;
  const totalWaMessages = waMessages?.length || 0;

  return NextResponse.json({
    summary: {
      totalSent,
      delivered,
      read,
      replied,
      deliveryRate: totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0,
      readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      replyRate: delivered > 0 ? Math.round((replied / delivered) * 100) : 0,
      avgResponseTime,
    },
    dailyTrend,
    hourlyDistribution,
    providerComparison: {
      damcorp: damcorpVolume,
      halosis: halosisVolume,
      waMessages: totalWaMessages,
    },
  });
}
