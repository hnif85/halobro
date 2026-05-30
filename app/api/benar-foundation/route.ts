import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { normalizePhone } from "@/lib/waba";
import { sbGet, sbGetAll } from "@/lib/supabase-api";

export async function GET(req: NextRequest) {

  const supabase = await createAdminClient();

  const { data: beneficiaries, error } = await supabase
    .from("user_benar")
    .select("id, customer_guid, notes, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!beneficiaries || beneficiaries.length === 0) {
    return NextResponse.json({ customers: [] });
  }

  const guids = beneficiaries.map((b) => b.customer_guid);

  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, full_name, phone_number, email, city, country, status, is_active, created_at")
    .in("guid", guids);

  const customerMap: Record<string, any> = {};
  for (const c of customers || []) {
    customerMap[c.guid] = c;
  }

  const { data: txData } = await supabase
    .from("transactions")
    .select("customer_guid, grand_total, payment_channel_name, invoice_number, created_at, transaction_details(purchase_type_name)")
    .in("customer_guid", guids)
    .order("created_at", { ascending: false });

  const txMap: Record<string, { count: number; total: number; list: Array<{ date: string; nominal: number; invoice: string }> }> = {};
  for (const tx of txData || []) {
    if (tx.payment_channel_name === "FREE TRIAL") continue;
    const details = tx.transaction_details as Array<{ purchase_type_name: string }> | undefined;
    if (details?.some((d) => d.purchase_type_name === "Free Trial")) continue;
    if (!txMap[tx.customer_guid]) txMap[tx.customer_guid] = { count: 0, total: 0, list: [] };
    txMap[tx.customer_guid].count++;
    txMap[tx.customer_guid].total += Number(tx.grand_total) || 0;
    txMap[tx.customer_guid].list.push({
      date: tx.created_at || "",
      nominal: Number(tx.grand_total) || 0,
      invoice: tx.invoice_number || "",
    });
  }

  const { data: cmtDebit } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, agent")
    .in("user_id", guids)
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

  const { data: cmtCredit } = await supabase
    .from("credit_manager_transactions")
    .select("user_id")
    .in("user_id", guids)
    .eq("type", "credit");

  const userHasTopUp = new Set((cmtCredit || []).map((t) => t.user_id));

  const userAppCount: Record<string, number> = {};
  for (const t of cmtDebit || []) {
    if (!userAppCount[t.user_id]) userAppCount[t.user_id] = 0;
    userAppCount[t.user_id] += agentAppMap[t.agent]?.size || 0;
  }

  const { data: enrollmentData } = await supabase
    .from("training_enrollments")
    .select("user_guid, event_id")
    .in("user_guid", guids)
    .not("event_id", "is", null);

  const { data: events } = await supabase
    .from("training_events")
    .select("id, name, event_date")
    .in("id", [...new Set((enrollmentData || []).map((e) => e.event_id))]);

  const eventMap: Record<string, { name: string; event_date: string }> = {};
  for (const ev of events || []) {
    eventMap[ev.id] = { name: ev.name, event_date: ev.event_date || "" };
  }

  const eventEnrollment: Record<string, { count: number; last: { name: string; date: string } | null; names: string[] }> = {};
  for (const enr of enrollmentData || []) {
    if (!enr.user_guid) continue;
    if (!eventEnrollment[enr.user_guid]) {
      eventEnrollment[enr.user_guid] = { count: 0, last: null, names: [] };
    }
    eventEnrollment[enr.user_guid].count++;
    const ev = eventMap[enr.event_id];
    if (ev) {
      if (!eventEnrollment[enr.user_guid].names.includes(ev.name)) {
        eventEnrollment[enr.user_guid].names.push(ev.name);
      }
      if (!eventEnrollment[enr.user_guid].last || ev.event_date > eventEnrollment[enr.user_guid].last!.date) {
        eventEnrollment[enr.user_guid].last = { name: ev.name, date: ev.event_date };
      }
    }
  }

  const { data: lastDebit } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, inserted_at")
    .in("user_id", guids)
    .eq("type", "debit")
    .order("inserted_at", { ascending: false });

  const lastActivityMap: Record<string, string> = {};
  const seen = new Set<string>();
  for (const t of lastDebit || []) {
    if (!seen.has(t.user_id)) {
      seen.add(t.user_id);
      lastActivityMap[t.user_id] = t.inserted_at;
    }
  }

  const enriched = beneficiaries.map((b) => {
    const c = customerMap[b.customer_guid];
    const tx = txMap[b.customer_guid] || { count: 0, total: 0, list: [] };
    const es = eventEnrollment[b.customer_guid] || { count: 0, last: null, names: [] };
    return {
      id: b.id,
      guid: b.customer_guid,
      full_name: c?.full_name || null,
      email: c?.email || null,
      phone_number: c?.phone_number || null,
      city: c?.city || null,
      status: c?.status || null,
      is_active: c?.is_active || null,
      customer_created_at: c?.created_at || null,
      notes: b.notes,
      added_at: b.created_at,
      transaction_count: tx.count,
      total_pembelian: tx.total,
      transactions: tx.list,
      app_registered: (userAppCount[b.customer_guid] || 0) + (userHasTopUp.has(b.customer_guid) ? 1 : 0),
      last_activity: lastActivityMap[b.customer_guid] || null,
      event_count: es.count,
      last_event: es.last,
      event_names: es.names,
    };
  });

  // ── Blast History ──────────────────────────────────────────────
  const phoneToGuid: Record<string, string> = {};
  const phoneSet = new Set<string>();
  for (const c of enriched) {
    if (c.phone_number) {
      const normalized = normalizePhone(c.phone_number);
      phoneToGuid[normalized] = c.guid;
      phoneSet.add(normalized);
    }
  }

  let blastRows: any[] = [];
  if (phoneSet.size > 0) {
    blastRows = await sbGetAll(
      "halosis_messages", "to_phone,template_name,status,sent_at", "template_name=not.is.null&order=sent_at.desc"
    );
  }

  const blastMap: Record<string, Array<{ template_name: string; status: string; sent_at: string | null }>> = {};
  for (const row of blastRows || []) {
    if (!row.to_phone) continue;
    const normPhone = normalizePhone(row.to_phone);
    const guid = phoneToGuid[normPhone];
    if (!guid) continue;
    if (!blastMap[guid]) blastMap[guid] = [];
    blastMap[guid].push({
      template_name: row.template_name,
      status: row.status || "sent",
      sent_at: row.sent_at || null,
    });
  }

  const enrichedWithBlasts = enriched.map((c) => ({
    ...c,
    blasts: blastMap[c.guid] || [],
    blast_count: (blastMap[c.guid] || []).length,
  }));

  return NextResponse.json({ customers: enrichedWithBlasts });
}

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient();
  const body = await req.json();

  if (body.bulk) {
    const { emails } = body;
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Email list required" }, { status: 400 });
    }

    const { data: matched } = await supabase
      .from("cms_customers")
      .select("guid, full_name, email")
      .in("email", emails);

    const normalized = new Map<string, string>();
    for (const m of matched || []) {
      if (m.email) normalized.set(m.email.toLowerCase(), m.guid);
    }

    const found: Array<{ email: string; guid: string; name: string }> = [];
    const notFound: string[] = [];

    for (const email of emails) {
      const guid = normalized.get(email.toLowerCase().trim());
      if (guid) {
        found.push({ email, guid, name: matched?.find((m) => m.guid === guid)?.full_name || "" });
      } else {
        notFound.push(email);
      }
    }

    let inserted = 0;
    if (found.length > 0) {
      const rows = found.map((f) => ({ customer_guid: f.guid }));
      const { error: insertError } = await supabase.from("user_benar").upsert(rows, {
        onConflict: "customer_guid",
        ignoreDuplicates: true,
      });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      inserted = found.length;
    }

    return NextResponse.json({ inserted, found, notFound });
  }

  const { customer_guid, notes } = body;
  if (!customer_guid) {
    return NextResponse.json({ error: "customer_guid required" }, { status: 400 });
  }

  const { data, error: upsertError } = await supabase
    .from("user_benar")
    .upsert({ customer_guid, notes: notes || null }, { onConflict: "customer_guid", ignoreDuplicates: false })
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guid = searchParams.get("guid");

  if (!guid) {
    return NextResponse.json({ error: "guid required" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("user_benar")
    .update({ deleted_at: new Date().toISOString() })
    .eq("customer_guid", guid)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
