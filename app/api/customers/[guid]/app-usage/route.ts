import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ guid: string }> }) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guid } = await params;
  const supabase = await createAdminClient();

  // Get ALL transactions for this user (credit + debit)
  const { data: txData } = await supabase
    .from("credit_manager_transactions")
    .select("agent, type, amount, inserted_at")
    .eq("user_id", guid)
    .order("inserted_at", { ascending: false });

  if (!txData || txData.length === 0) {
    return NextResponse.json({ apps: [], totalRegistered: 0, activeCount: 0 });
  }

  // Separate credit (top-up) and debit (usage)
  const creditTx = txData.filter((t) => t.type === "credit");
  const debitTx = txData.filter((t) => t.type === "debit" && t.agent);

  // Build app map from debit transactions
  const agentIds = [...new Set(debitTx.map((t) => t.agent))];
  const agentToProduct: Record<string, { appName: string; package: string | null }> = {};

  if (agentIds.length > 0) {
    const { data: prodData } = await supabase
      .from("products")
      .select("agent_id, app_name, package")
      .in("agent_id", agentIds)
      .not("app_name", "is", null);

    for (const p of prodData || []) {
      agentToProduct[p.agent_id] = {
        appName: p.app_name,
        package: p.package,
      };
    }
  }

  // Build result: "Top Up" entry + per-app entries
  const apps: Array<{
    appName: string;
    package: string | null;
    lastUsed: string;
    totalCredit: number;
    totalDebit: number;
  }> = [];

  // Top Up entry from credit transactions
  const totalTopUp = creditTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const lastTopUp = creditTx.length > 0 ? creditTx[0].inserted_at : "";

  if (totalTopUp > 0) {
    apps.push({
      appName: "Top Up",
      package: null,
      lastUsed: lastTopUp,
      totalCredit: totalTopUp,
      totalDebit: 0,
    });
  }

  // Per-app entries from debit transactions
  const appMap: Record<string, typeof apps[0]> = {};
  for (const t of debitTx) {
    const prod = agentToProduct[t.agent];
    const appName = prod?.appName || "Unknown";
    if (!appMap[appName]) {
      appMap[appName] = {
        appName,
        package: prod?.package || null,
        lastUsed: t.inserted_at,
        totalCredit: 0,
        totalDebit: 0,
      };
    }
    appMap[appName].totalDebit += Number(t.amount) || 0;
    if (t.inserted_at > appMap[appName].lastUsed) {
      appMap[appName].lastUsed = t.inserted_at;
    }
  }

  apps.push(...Object.values(appMap));

  return NextResponse.json({
    apps,
    totalRegistered: apps.length,
    activeCount: debitTx.length > 0 ? apps.length - (totalTopUp > 0 ? 1 : 0) : 0,
  });
}
