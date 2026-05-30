import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guid } = await params;
  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30")));

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Ambil semua debit transaction — termasuk yang agent-nya null
  // Sertakan user_product_id sebagai jalur lookup alternatif ke products.guid
  const { data: txns } = await supabase
    .from("credit_manager_transactions")
    .select("agent, amount, inserted_at, product_name, product_package, user_product_id")
    .eq("user_id", guid)
    .eq("type", "debit")
    .gte("inserted_at", since);

  if (!txns || txns.length === 0) {
    return NextResponse.json({ dates: [], apps: [] });
  }

  // ── Lookup 1: via agent → products.agent_id ──────────────────────────────
  const agentIds = [...new Set(txns.map((t) => t.agent).filter(Boolean))];
  const productMapByAgent: Record<string, { appName: string; package: string | null }> = {};

  if (agentIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("agent_id, app_name, package")
      .in("agent_id", agentIds)
      .not("app_name", "is", null);

    for (const p of products || []) {
      productMapByAgent[p.agent_id] = { appName: p.app_name, package: p.package };
    }
  }

  // ── Lookup 2: via user_product_id → products.guid ────────────────────────
  // Hanya untuk transaksi yang agent-nya null (belum ter-resolve)
  const userProductIds = [
    ...new Set(
      txns
        .filter((t) => !t.agent && t.user_product_id)
        .map((t) => t.user_product_id)
    ),
  ];
  const productMapByUPID: Record<string, { appName: string; package: string | null }> = {};

  if (userProductIds.length > 0) {
    const { data: products2 } = await supabase
      .from("products")
      .select("guid, app_name, package")
      .in("guid", userProductIds)
      .not("app_name", "is", null);

    for (const p of products2 || []) {
      productMapByUPID[p.guid] = { appName: p.app_name, package: p.package };
    }
  }

  // ── Generate date array: last N days ascending (oldest → today) ──────────
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  // ── Aggregate by app and date ─────────────────────────────────────────────
  // Fallback chain:
  //   1. products via agent
  //   2. products via user_product_id
  //   3. product_name dari kolom transaksi
  //   4. "Lainnya"
  const appMap: Record<string, {
    appName: string;
    package: string | null;
    daily: Record<string, number>;
    total: number;
  }> = {};

  for (const t of txns) {
    const byAgent = t.agent ? productMapByAgent[t.agent] : null;
    const byUPID  = t.user_product_id ? productMapByUPID[t.user_product_id] : null;
    const prod    = byAgent ?? byUPID;

    const appName = prod?.appName ?? t.product_name ?? "Lainnya";
    const pkg     = prod?.package ?? t.product_package ?? null;
    const date    = new Date(t.inserted_at).toISOString().slice(0, 10);
    const amount  = Number(t.amount) || 0;

    if (!appMap[appName]) {
      appMap[appName] = { appName, package: pkg, daily: {}, total: 0 };
    }
    appMap[appName].daily[date] = (appMap[appName].daily[date] || 0) + amount;
    appMap[appName].total += amount;
  }

  const apps = Object.values(appMap).sort((a, b) => b.total - a.total);

  // Hanya kembalikan tanggal yang ada penggunaannya
  const activeDates = dates.filter((d) =>
    apps.some((app) => (app.daily[d] || 0) > 0)
  );

  // ── Debug sementara ───────────────────────────────────────────────────────
  const nullAgentTxns = txns.filter((t) => !t.agent);
  const debugInfo = {
    totalTxns: txns.length,
    nullAgentCount: nullAgentTxns.length,
    agentIds,
    productsFoundByAgent: Object.keys(productMapByAgent).length,
    userProductIds,
    productsFoundByUPID: Object.keys(productMapByUPID).length,
    sampleNullAgentTxn: nullAgentTxns[0]
      ? {
          agent: nullAgentTxns[0].agent,
          user_product_id: nullAgentTxns[0].user_product_id,
          product_name: nullAgentTxns[0].product_name,
          product_package: nullAgentTxns[0].product_package,
          amount: nullAgentTxns[0].amount,
        }
      : null,
  };

  return NextResponse.json({ dates: activeDates, apps, _debug: debugInfo });
}
