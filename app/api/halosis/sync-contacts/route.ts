import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncAllContacts } from "@/lib/halosis";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncAllContacts();

    return NextResponse.json({
      success: true,
      message: `Sync selesai: ${result.added} kontak baru, ${result.updated} diperbarui, ${result.total} total dari Halosis.`,
      ...result,
      pagesProcessed: result.pagesProcessed,
      totalPages: result.totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
