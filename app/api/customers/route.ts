import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const appName = searchParams.get("app_name");
  const activeDays = searchParams.get("active_days");
  const limit = parseInt(searchParams.get("limit") || (eventId ? "5000" : "20"));
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const hasTransaction = searchParams.get("has_transaction");

  const supabase = await createAdminClient();

  // Build guid filters from event, app_name, etc.
  let filterGuids: string[] | null = null;

  if (eventId) {
    const { data: enrollments } = await supabase
      .from("training_enrollments")
      .select("user_guid")
      .eq("event_id", eventId);

    if (enrollments && enrollments.length > 0) {
      filterGuids = enrollments.map((e) => e.user_guid);
    } else {
      return NextResponse.json({ customers: [], total: 0 });
    }
  }

  if (appName) {
    let userIds: string[] = [];

    if (appName === "Top Up") {
      const { data: txData } = await supabase
        .from("credit_manager_transactions")
        .select("user_id")
        .eq("type", "credit")
        .not("user_id", "is", null);

      userIds = [...new Set((txData || []).map((t) => t.user_id))];
    } else {
      const { data: products } = await supabase
        .from("products")
        .select("agent_id")
        .eq("app_name", appName)
        .not("agent_id", "is", null);

      const agentIds = [...new Set((products || []).map((p) => p.agent_id))];
      if (agentIds.length === 0) {
        return NextResponse.json({ customers: [], total: 0 });
      }

      const { data: txData } = await supabase
        .from("credit_manager_transactions")
        .select("user_id")
        .in("agent", agentIds)
        .not("user_id", "is", null);

      userIds = [...new Set((txData || []).map((t) => t.user_id))];
    }

    if (userIds.length === 0) {
      return NextResponse.json({ customers: [], total: 0 });
    }

    if (filterGuids) {
      filterGuids = filterGuids.filter((g) => userIds.includes(g as unknown as string));
    } else {
      filterGuids = userIds as unknown as string[];
    }
  }

  if (activeDays) {
    const since = new Date(Date.now() - parseInt(activeDays) * 86400000).toISOString();
    const { data: activeTxns } = await supabase
      .from("credit_manager_transactions")
      .select("user_id")
      .eq("type", "debit")
      .gte("inserted_at", since)
      .not("user_id", "is", null);

    const activeIds = [...new Set((activeTxns || []).map((t) => t.user_id as string))];

    if (activeIds.length === 0) {
      return NextResponse.json({ customers: [], total: 0 });
    }

    filterGuids = filterGuids
      ? filterGuids.filter((g) => activeIds.includes(g))
      : activeIds;
  }

  let query = supabase
    .from("cms_customers")
    .select("guid, full_name, phone_number, email, username, city, country, status, is_active, created_at", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (filterGuids) {
    query = query.in("guid", filterGuids);
  }

  const { data: customers, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with transaction & app data
  let enriched = (customers || []).map((c) => ({ ...c, transaction_count: 0, total_spend: 0, app_registered: 0 }));

  if (enriched.length > 0) {
    const guids = enriched.map((c) => c.guid);

    // Transaction data
    if (hasTransaction === "true") {
      const { data: txData } = await supabase
        .from("transactions")
        .select("customer_guid, grand_total")
        .in("customer_guid", guids);

      const txMap: Record<string, { count: number; total: number }> = {};
      for (const tx of txData || []) {
        if (!txMap[tx.customer_guid]) txMap[tx.customer_guid] = { count: 0, total: 0 };
        txMap[tx.customer_guid].count++;
        txMap[tx.customer_guid].total += Number(tx.grand_total) || 0;
      }

      enriched = enriched
        .map((c) => ({
          ...c,
          transaction_count: txMap[c.guid]?.count || 0,
          total_spend: txMap[c.guid]?.total || 0,
        }))
        .filter((c) => c.transaction_count > 0);
    }

    // App registration count per customer
    if (enriched.length > 0) {
      const currentGuids = enriched.map((c) => c.guid);

      // Debit transactions → linked to products via agent
      const { data: cmtDebit } = await supabase
        .from("credit_manager_transactions")
        .select("user_id, agent")
        .in("user_id", currentGuids)
        .eq("type", "debit")
        .not("agent", "is", null);

      const agentIds = [...new Set((cmtDebit || []).map((t) => t.agent))];
      const agentAppMap: Record<string, Set<string>> = {};

      if (agentIds.length > 0) {
        const { data: prodData } = await supabase
          .from("products")
          .select("agent_id, app_name")
          .in("agent_id", agentIds)
          .not("app_name", "is", null);

        for (const p of prodData || []) {
          if (!agentAppMap[p.agent_id]) agentAppMap[p.agent_id] = new Set();
          agentAppMap[p.agent_id].add(p.app_name);
        }
      }

      // Credit transactions → "Top Up" count
      const { data: cmtCredit } = await supabase
        .from("credit_manager_transactions")
        .select("user_id")
        .in("user_id", currentGuids)
        .eq("type", "credit");

      const userHasTopUp = new Set((cmtCredit || []).map((t) => t.user_id));

      const userAppCount: Record<string, number> = {};
      for (const t of cmtDebit || []) {
        if (!userAppCount[t.user_id]) userAppCount[t.user_id] = 0;
        userAppCount[t.user_id] += agentAppMap[t.agent]?.size || 0;
      }

      enriched = enriched.map((c) => ({
        ...c,
        app_registered: (userAppCount[c.guid] || 0) + (userHasTopUp.has(c.guid) ? 1 : 0),
      }));
    }
  }

  return NextResponse.json({ customers: enriched, total: enriched.length });
}