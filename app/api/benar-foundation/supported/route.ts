import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all";

  const supabase = await createAdminClient();

  const { data: beneficiaries } = await supabase
    .from("user_benar")
    .select("customer_guid")
    .is("deleted_at", null);

  const excludeGuids = new Set((beneficiaries || []).map((b) => b.customer_guid));

  const allCmtData: any[] = [];
  {
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data } = await supabase
        .from("credit_manager_transactions")
        .select("user_id, type, amount, agent, inserted_at")
        .range(offset, offset + pageSize - 1);
      if (!data || data.length === 0) break;
      allCmtData.push(...data);
      if (data.length < pageSize) break;
    }
  }

  const activityIds = new Set<string>();
  for (const t of allCmtData || []) {
    if (t.user_id && !excludeGuids.has(t.user_id)) activityIds.add(t.user_id);
  }

  const allEnrollmentData: any[] = [];
  {
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data } = await supabase
        .from("training_enrollments")
        .select("user_guid, event_id")
        .not("event_id", "is", null)
        .range(offset, offset + pageSize - 1);
      if (!data || data.length === 0) break;
      allEnrollmentData.push(...data);
      if (data.length < pageSize) break;
    }
  }

  for (const e of allEnrollmentData || []) {
    if (e.user_guid && !excludeGuids.has(e.user_guid)) activityIds.add(e.user_guid);
  }

  const candidateGuids = [...activityIds];

  if (candidateGuids.length === 0) {
    return NextResponse.json({ suggestions: [], stats: { total: 0, usageActive: 0, eventAttendees: 0 } });
  }

  const candidateSet = new Set(candidateGuids);
  const activeCmtData = (allCmtData || []).filter((t) => t.user_id && candidateSet.has(t.user_id));
  const agentIds = [...new Set(activeCmtData.filter((t) => t.agent).map((t) => t.agent))];
  const agentAppMap: Record<string, string> = {};

  if (agentIds.length > 0) {
    const { data: prodData } = await supabase
      .from("products")
      .select("agent_id, app_name")
      .in("agent_id", agentIds)
      .not("app_name", "is", null);

    for (const p of prodData || []) {
      if (!agentAppMap[p.agent_id]) agentAppMap[p.agent_id] = p.app_name;
    }
  }

  const userCredit: Record<string, number> = {};
  const userDebit: Record<string, number> = {};
  const userAgents: Record<string, Set<string>> = {};
  const userLastActivity: Record<string, string> = {};
  const cmtSeen = new Set<string>();

  for (const t of activeCmtData || []) {
    const uid = t.user_id;
    if (t.type === "credit") {
      userCredit[uid] = (userCredit[uid] || 0) + (Number(t.amount) || 0);
    } else if (t.type === "debit" && t.agent) {
      userDebit[uid] = (userDebit[uid] || 0) + (Number(t.amount) || 0);
      if (!userAgents[uid]) userAgents[uid] = new Set();
      userAgents[uid].add(t.agent);
    }
    if (!cmtSeen.has(uid) && t.type === "debit" && t.inserted_at) {
      cmtSeen.add(uid);
      userLastActivity[uid] = t.inserted_at;
    }
  }

  const userAppCount: Record<string, number> = {};
  const userAppNames: Record<string, string[]> = {};
  for (const [uid, agents] of Object.entries(userAgents)) {
    const names = new Set<string>();
    for (const a of agents) {
      const appName = agentAppMap[a];
      if (appName) names.add(appName);
    }
    userAppCount[uid] = names.size;
    userAppNames[uid] = [...names];
  }

  const filteredEnrollments = (allEnrollmentData || []).filter(
    (e) => e.user_guid && candidateSet.has(e.user_guid)
  );

  const eventIds = [...new Set((filteredEnrollments || []).map((e) => e.event_id))];
  const { data: events } = await supabase
    .from("training_events")
    .select("id, name")
    .in("id", eventIds);

  const eventNameMap: Record<string, string> = {};
  for (const ev of events || []) eventNameMap[ev.id] = ev.name;

  const userEvents: Record<string, { count: number; names: string[] }> = {};
  for (const enr of filteredEnrollments || []) {
    if (!enr.user_guid) continue;
    if (!userEvents[enr.user_guid]) userEvents[enr.user_guid] = { count: 0, names: [] };
    userEvents[enr.user_guid].count++;
    const en = eventNameMap[enr.event_id];
    if (en && !userEvents[enr.user_guid].names.includes(en)) {
      userEvents[enr.user_guid].names.push(en);
    }
  }

  const allCustomers: any[] = [];
  for (let i = 0; i < candidateGuids.length; i += 100) {
    const chunk = candidateGuids.slice(i, i + 100);
    const { data } = await supabase
      .from("cms_customers")
      .select("guid, full_name, phone_number, email, city, status, is_active, created_at")
      .in("guid", chunk);
    if (data) allCustomers.push(...data);
  }

  const customerMap: Record<string, any> = {};
  for (const c of allCustomers || []) customerMap[c.guid] = c;

  const { data: excludedRows } = await supabase
    .from("demo_excluded_emails")
    .select("email");

  const excludedEmails = new Set((excludedRows || []).map((r) => r.email?.toLowerCase()).filter(Boolean));

  let activeGuids = candidateGuids;
  if (excludedEmails.size > 0) {
    activeGuids = candidateGuids.filter((guid) => {
      const c = customerMap[guid];
      const email = c?.email?.toLowerCase();
      return !email || !excludedEmails.has(email);
    });
    if (activeGuids.length === 0) {
      return NextResponse.json({ suggestions: [], stats: { total: 0, usageActive: 0, eventAttendees: 0 } });
    }
  }

  const allTxData: any[] = [];
  for (let i = 0; i < activeGuids.length; i += 100) {
    const chunk = activeGuids.slice(i, i + 100);
    const { data } = await supabase
      .from("transactions")
      .select("customer_guid, grand_total, payment_channel_name, transaction_details(purchase_type_name)")
      .in("customer_guid", chunk);
    if (data) allTxData.push(...data);
  }

  const userPaid: Record<string, boolean> = {};
  const userTotalPembelian: Record<string, number> = {};
  for (const tx of allTxData || []) {
    if (tx.payment_channel_name === "FREE TRIAL") continue;
    const details = tx.transaction_details as Array<{ purchase_type_name: string }> | undefined;
    if (details?.some((d) => d.purchase_type_name === "Free Trial")) continue;
    userPaid[tx.customer_guid] = true;
    userTotalPembelian[tx.customer_guid] = (userTotalPembelian[tx.customer_guid] || 0) + (Number(tx.grand_total) || 0);
  }

  let suggestions = activeGuids.map((guid) => {
    const c = customerMap[guid];
    const credit = userCredit[guid] || 0;
    const debit = userDebit[guid] || 0;
    const remaining = credit - debit;
    const ev = userEvents[guid] || { count: 0, names: [] };
    const hasUsage = debit > 0;
    const hasEvent = ev.count > 0;

    return {
      guid,
      full_name: c?.full_name || null,
      email: c?.email || null,
      phone_number: c?.phone_number || null,
      city: c?.city || null,
      status: c?.status || null,
      is_active: c?.is_active || null,
      totalCredit: credit,
      totalDebit: debit,
      remaining,
      appCount: userAppCount[guid] || 0,
      appNames: userAppNames[guid] || [],
      lastActivity: userLastActivity[guid] || null,
      eventCount: ev.count,
      eventNames: ev.names,
      hasUsage,
      hasEvent,
      hasPaidPurchase: userPaid[guid] || false,
      totalPembelian: userTotalPembelian[guid] || 0,
    };
  });

  if (filter === "usage") {
    suggestions = suggestions.filter((s) => s.hasUsage);
  } else if (filter === "event") {
    suggestions = suggestions.filter((s) => s.hasEvent);
  }

  const stats = {
    total: suggestions.length,
    usageActive: suggestions.filter((s) => s.hasUsage).length,
    eventAttendees: suggestions.filter((s) => s.hasEvent).length,
  };

  suggestions.sort((a, b) => {
    const aScore = (a.hasUsage ? 2 : 0) + (a.hasEvent ? 1 : 0);
    const bScore = (b.hasUsage ? 2 : 0) + (b.hasEvent ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return (b.remaining || 0) - (a.remaining || 0);
  });

  return NextResponse.json({ suggestions, stats });
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient();
  const body = await req.json();
  const { guids } = body;

  if (!Array.isArray(guids) || guids.length === 0) {
    return NextResponse.json({ error: "guids array required" }, { status: 400 });
  }

  const rows = guids.map((g: string) => ({ customer_guid: g }));
  const { error } = await supabase.from("user_benar").upsert(rows, {
    onConflict: "customer_guid",
    ignoreDuplicates: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: guids.length });
}
