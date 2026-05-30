import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const template = searchParams.get("template") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const supabase = await createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("halosis_messages").select("*", { count: "exact" });

    if (search) {
      query = query.or(`from_phone.ilike.%${search}%,to_phone.ilike.%${search}%`);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (template) {
      query = query.ilike("template_name", `%${template}%`);
    }
    if (startDate) {
      query = query.gte("sent_at", startDate);
    }
    if (endDate) {
      query = query.lte("sent_at", endDate);
    }

    const { data, count, error } = await query.order("sent_at", { ascending: false }).range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
