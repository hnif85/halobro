import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getMessageHistory } from "@/lib/halosis";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { startDate, endDate } = body;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const end = endDate || new Date().toISOString().split("T")[0];

    const supabase = await createAdminClient();
    let totalFetched = 0;
    let page = 1;

    while (true) {
      const response = await getMessageHistory(start, end, page);
      const messages = response.data;
      const meta = response.meta;

      if (!messages || messages.length === 0) break;

      for (const msg of messages) {
        if (!msg.wam_id) continue;

        const { data: existing } = await supabase
          .from("halosis_messages")
          .select("id")
          .eq("id", msg.wam_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("halosis_messages").insert({
            id: msg.wam_id,
            from_phone: msg.from_phone_number,
            to_phone: msg.to_phone_number,
            type: msg.session_status,
            template_name: msg.template_name,
            status: mapStatus(msg.session_status),
            sent_at: msg.created_time,
            raw_json: msg,
            synced_at: new Date().toISOString(),
          });
        }
      }

      totalFetched += messages.length;
      if (page >= meta.last_page) break;
      page++;
    }

    return NextResponse.json({
      success: true,
      message: `Sync selesai: ${totalFetched} pesan dari Halosis (${start} - ${end}).`,
      totalFetched,
      period: { start, end },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function mapStatus(halosisStatus: string): string {
  const map: Record<string, string> = {
    RESOLVED: "delivered",
    PENDING: "pending",
    SENT: "sent",
    FAILED: "failed",
    READ: "read",
  };
  return map[halosisStatus] || halosisStatus.toLowerCase();
}
