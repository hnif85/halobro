import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30")));

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: txns, error } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, agent, amount")
    .eq("type", "debit")
    .gte("inserted_at", since)
    .not("user_id", "is", null)
    .not("agent", "is", null);

  if (error || !txns || txns.length === 0) {
    return NextResponse.json({ users: [], apps: [], period: days });
  }

  const userIds = [...new Set(txns.map((t) => t.user_id))];
  const agentIds = [...new Set(txns.map((t) => t.agent))];

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("cms_customers")
      .select("guid, full_name, email")
      .in("guid", userIds),
    supabase
      .from("products")
      .select("agent_id, app_name")
      .in("agent_id", agentIds)
      .not("app_name", "is", null),
  ]);

  const customerMap: Record<string, { name: string; email: string }> = {};
  for (const c of customers || []) {
    customerMap[c.guid] = { name: c.full_name || "Unknown", email: c.email || "" };
  }

  const productMap: Record<string, string> = {};
  for (const p of products || []) {
    productMap[p.agent_id] = p.app_name;
  }

  const matrix: Record<string, Record<string, number>> = {};
  const appSet = new Set<string>();

  for (const t of txns) {
    const appName = productMap[t.agent];
    if (!appName) continue;
    appSet.add(appName);
    if (!matrix[t.user_id]) matrix[t.user_id] = {};
    matrix[t.user_id][appName] = (matrix[t.user_id][appName] || 0) + Number(t.amount || 0);
  }

  const apps = [...appSet].sort();

  const users = Object.entries(matrix)
    .map(([guid, appCredits]) => ({
      guid,
      name: customerMap[guid]?.name || "Unknown",
      email: customerMap[guid]?.email || "",
      apps: appCredits,
      total: Object.values(appCredits).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 50);

  return NextResponse.json({ users, apps, period: days });
}
