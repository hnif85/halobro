import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const supabase = await createAdminClient();

  let query = supabase
    .from("crm_campaigns")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data: campaigns, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch stats for all campaigns
  const campaignIds = (campaigns || []).map((c) => c.id);
  if (campaignIds.length > 0) {
    const { data: statsData } = await supabase
      .from("crm_campaign_recipients")
      .select("campaign_id, send_status")
      .in("campaign_id", campaignIds);

    const statsMap: Record<number, { total: number; sent: number; read: number }> = {};
    for (const s of statsData || []) {
      if (!statsMap[s.campaign_id]) {
        statsMap[s.campaign_id] = { total: 0, sent: 0, read: 0 };
      }
      statsMap[s.campaign_id].total++;
      if (["sent", "delivered", "read", "replied"].includes(s.send_status)) {
        statsMap[s.campaign_id].sent++;
      }
      if (["read", "replied"].includes(s.send_status)) {
        statsMap[s.campaign_id].read++;
      }
    }

    for (const c of campaigns || []) {
      (c as Record<string, unknown>)._stats = statsMap[c.id] || { total: 0, sent: 0, read: 0 };
    }
  }

  return NextResponse.json({ campaigns, total: campaigns?.length || 0 });
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createAdminClient();

  const { data: campaign, error } = await supabase
    .from("crm_campaigns")
    .insert({
      name: body.name,
      message_type: body.message_type || "template",
      template_name: body.template_name,
      template_lang: body.template_lang || "id",
      template_components_json: body.template_components_json,
      text_body: body.text_body,
      status: body.status || "draft",
      segment_id: body.segment_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign }, { status: 201 });
}