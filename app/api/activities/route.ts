import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const segmen = searchParams.get("segmen") || "";
  const search = searchParams.get("search") || "";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  const supabase = await createAdminClient();

  let query = supabase
    .from("crm_lead_pipeline")
    .select("id, customer_guid, segmen, status, tier, priority, last_contact_at, created_at", { count: "exact" })
    .order("last_contact_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (segmen) query = query.eq("segmen", segmen);
  if (search) {
    const { data: customerMatches } = await supabase
      .from("cms_customers")
      .select("guid")
      .or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(200);
    const guids = (customerMatches || []).map((c) => c.guid);
    if (guids.length > 0) query = query.in("customer_guid", guids);
    else return NextResponse.json({ activities: [], total: 0, segments: [], page: offset / limit + 1 });
  }

  const { data: pipelines, count } = await query;

  if (!pipelines || pipelines.length === 0) {
    const { data: allSegments } = await supabase
      .from("crm_lead_pipeline")
      .select("segmen")
      .not("segmen", "is", null);
    const segments = [...new Set((allSegments || []).map((p) => p.segmen as string).filter(Boolean))].sort();
    return NextResponse.json({ activities: [], total: 0, segments, page: 1 });
  }

  // Enrich with customer data
  const guids = [...new Set(pipelines.map((p) => p.customer_guid))];
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, full_name, email, phone_number")
    .in("guid", guids);
  const customerMap: Record<string, any> = {};
  for (const c of customers || []) customerMap[c.guid] = c;

  // Get latest message per pipeline
  const pipelineIds = pipelines.map((p) => p.id);
  const { data: messages } = await supabase
    .from("wa_messages")
    .select("pipeline_id, direction, content, sent_at")
    .in("pipeline_id", pipelineIds)
    .order("sent_at", { ascending: false });

  const latestMsg: Record<string, { direction: string; content: string; sent_at: string }> = {};
  for (const m of messages || []) {
    if (!latestMsg[m.pipeline_id]) {
      latestMsg[m.pipeline_id] = { direction: m.direction, content: m.content, sent_at: m.sent_at };
    }
  }

  const { data: allSegments } = await supabase
    .from("crm_lead_pipeline")
    .select("segmen")
    .not("segmen", "is", null);
  const segments = [...new Set((allSegments || []).map((p) => p.segmen as string).filter(Boolean))].sort();

  const activities = pipelines.map((p) => {
    const c = customerMap[p.customer_guid];
    const msg = latestMsg[p.id];
    return {
      id: p.id,
      customer_guid: p.customer_guid,
      customer_name: c?.full_name || null,
      customer_email: c?.email || null,
      customer_phone: c?.phone_number || null,
      segmen: p.segmen || "—",
      status: p.status,
      tier: p.tier,
      priority: p.priority,
      last_contact_at: p.last_contact_at,
      created_at: p.created_at,
      last_message: msg?.content || null,
      last_message_direction: msg?.direction || null,
      last_message_at: msg?.sent_at || null,
    };
  });

  return NextResponse.json({ activities, total: count || 0, segments, page: Math.floor(offset / limit) + 1 });
}
