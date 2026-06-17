import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = await createAdminClient();

    const [
      { count: contactTotal },
      { data: contactLast },
      { count: messageTotal },
      { data: messageLast },
    ] = await Promise.all([
      supabase.from("halosis_contacts").select("*", { count: "exact", head: true }),
      supabase
        .from("halosis_contacts")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1),
      supabase.from("halosis_messages").select("*", { count: "exact", head: true }),
      supabase
        .from("halosis_messages")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1),
    ]);

    return NextResponse.json({
      contacts: {
        lastSyncAt: contactLast?.[0]?.synced_at || null,
        total: contactTotal || 0,
        status: contactLast?.[0]?.synced_at ? "synced" : "never",
      },
      messages: {
        lastSyncAt: messageLast?.[0]?.synced_at || null,
        total: messageTotal || 0,
        status: messageLast?.[0]?.synced_at ? "synced" : "never",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
