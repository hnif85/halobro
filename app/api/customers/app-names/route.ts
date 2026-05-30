import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createAdminClient();

  const { data } = await supabase
    .from("products")
    .select("app_name")
    .not("app_name", "is", null)
    .order("app_name");

  const names = [...new Set((data || []).map((r) => r.app_name).filter(Boolean))];

  // Check if any credit transactions exist for Top Up filter
  const { count: creditCount } = await supabase
    .from("credit_manager_transactions")
    .select("id", { count: "exact", head: true })
    .eq("type", "credit");

  if (creditCount && creditCount > 0) {
    names.push("Top Up");
  }

  return NextResponse.json({ appNames: names });
}
