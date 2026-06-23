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
    let totalPages = 0;

    // Partition date range into 3-day chunks to avoid Halosis API timeout
    const chunkDays = 3;
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const chunks: { start: string; end: string }[] = [];
    let cursor = new Date(startDateObj);
    while (cursor < endDateObj) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + chunkDays * 86400000, endDateObj.getTime()));
      chunks.push({
        start: cursor.toISOString().split("T")[0],
        end: chunkEnd.toISOString().split("T")[0],
      });
      cursor = chunkEnd;
    }

    for (const range of chunks) {
      let page = 1;
      while (true) {
        let response;
        try {
          response = await getMessageHistory(range.start, range.end, page);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Halosis API error for ${range.start}-${range.end} page ${page}:`, msg);
          break;
        }
        const messages = response.data;
        const meta = response.meta;

        if (!messages || messages.length === 0) break;

        const newMessages = messages
          .filter((msg: any) => msg.wam_id)
          .map((msg: any) => ({
            id: msg.wam_id,
            from_phone: msg.from_phone_number,
            to_phone: msg.to_phone_number,
            type: msg.session_status,
            template_name: msg.template_name,
            status: mapStatus(msg.session_status),
            sent_at: msg.created_time,
            raw_json: msg,
            synced_at: new Date().toISOString(),
          }));

        if (newMessages.length > 0) {
          const { error } = await supabase
            .from("halosis_messages")
            .upsert(newMessages, { onConflict: "id", ignoreDuplicates: true });

          if (error) {
            console.error("Upsert error:", error);
          }
        }

        totalFetched += messages.length;
        totalPages++;
        if (page >= meta.last_page) break;
        page++;
      }
    }

    // Mark inbound messages as read (optimized: batch update without fetching all first)
    const { data: repliers } = await supabase
      .from("halosis_messages")
      .select("from_phone")
      .not("from_phone", "is", null)
      .neq("status", "read")
      .neq("status", "failed");
    const replyPhones = [...new Set((repliers || []).map((r: any) => r.from_phone).filter(Boolean))] as string[];
    if (replyPhones.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < replyPhones.length; i += chunkSize) {
        const chunk = replyPhones.slice(i, i + chunkSize);
        await supabase
          .from("halosis_messages")
          .update({ status: "read" })
          .in("to_phone", chunk)
          .neq("status", "failed")
          .neq("status", "read");
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync selesai: ${totalFetched} pesan dari Halosis (${start} - ${end}).`,
      totalFetched,
      pagesProcessed: totalPages,
      dateChunks: chunks.length,
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
    NEED_FU: "delivered",
    AUTO_REPLY: "delivered",
  };
  return map[halosisStatus] || halosisStatus.toLowerCase();
}
