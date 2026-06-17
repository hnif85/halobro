import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { sbGetAll, sbGetChunked } from "@/lib/supabase-api";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get("days") || "90");
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const supabase = await createAdminClient();

  const [{ data: customers }, { data: transactions }, { data: allUsage }] = await Promise.all([
    supabase.from("cms_customers").select("guid, full_name, city, status, created_at, is_active"),
    supabase
      .from("transactions")
      .select("customer_guid, grand_total, created_at")
      .gte("created_at", sinceStr),
    supabase
      .from("credit_manager_transactions")
      .select("user_id, amount, type, agent, created_at")
      .gte("created_at", sinceStr),
  ]);

  const customerGuids = (customers || []).map((c) => c.guid).filter(Boolean);

  const { data: enrollments } = await supabase
    .from("training_enrollments")
    .select("user_guid")
    .in("user_guid", customerGuids);

  const enrolledSet = new Set((enrollments || []).map((e) => e.user_guid));

  const totalCustomers = customers?.length || 0;

  const activeUsers = new Set<string>();
  const usageCount = new Map<string, number>();
  const appUsage = new Map<string, Set<string>>();

  for (const t of allUsage || []) {
    if (t.user_id && t.type !== "credit") {
      activeUsers.add(t.user_id);
      usageCount.set(t.user_id, (usageCount.get(t.user_id) || 0) + 1);
      if (t.agent) {
        if (!appUsage.has(t.agent)) appUsage.set(t.agent, new Set());
        appUsage.get(t.agent)!.add(t.user_id);
      }
    }
  }

  let active = 0, idle = 0, passive = 0;
  for (const c of customers || []) {
    if (!c.guid) continue;
    if (usageCount.has(c.guid) && (usageCount.get(c.guid) || 0) >= 3) active++;
    else if (usageCount.has(c.guid)) idle++;
    else passive++;
  }

  const cityMap = new Map<string, number>();
  for (const c of customers || []) {
    if (c.city) cityMap.set(c.city, (cityMap.get(c.city) || 0) + 1);
  }
  const cityDistribution = [...cityMap.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const monthlyTransactions: { month: string; total: number; count: number }[] = [];
  const monthTx = new Map<string, { total: number; count: number }>();
  for (const tx of transactions || []) {
    const key = tx.created_at?.slice(0, 7);
    if (!key) continue;
    if (!monthTx.has(key)) monthTx.set(key, { total: 0, count: 0 });
    const m = monthTx.get(key)!;
    m.total += Number(tx.grand_total) || 0;
    m.count++;
  }
  for (const [month, data] of monthTx) {
    monthlyTransactions.push({ month, ...data });
  }
  monthlyTransactions.sort((a, b) => a.month.localeCompare(b.month));

  const topApps = [...appUsage.entries()]
    .map(([agent, users]) => ({ agent, users: users.size }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  const enrolledCount = enrolledSet.size;
  const withTransactions = new Set((transactions || []).map((t) => t.customer_guid)).size;

  return NextResponse.json({
    summary: {
      totalCustomers,
      activeUsers: activeUsers.size,
      active,
      idle,
      passive,
      enrolledCount,
      withTransactions,
    },
    cityDistribution,
    monthlyTransactions,
    topApps,
    segmentDistribution: [
      { label: "Aktif", value: active, color: "#84cc16" },
      { label: "Idle", value: idle, color: "#f59e0b" },
      { label: "Pasif", value: passive, color: "#ef4444" },
    ],
  });
}
