import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") !== "false";

  const supabase = await createAdminClient();

  let query = supabase
    .from("wa_templates")
    .select("id, name, display_name, content, variables, damcorp_status, is_active, created_at, updated_at")
    .order("display_name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: templates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
}