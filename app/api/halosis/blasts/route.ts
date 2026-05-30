import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet } from "@/lib/supabase-api";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Fetch distinct template_names (non-null)
    let templateQuery = "halosis_messages?select=template_name&template_name=not.is.null&order=template_name.asc";
    const allTemplateRows: any[] = await sbGet(templateQuery);

    // Deduplicate & filter
    let templates = [...new Set(allTemplateRows.map((r: any) => r.template_name).filter(Boolean))] as string[];

    if (search) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.toLowerCase().includes(q));
    }

    const total = templates.length;
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const pageTemplates = templates.slice(from, from + limit);

    // Fetch stats per template
    const data: any[] = [];
    for (const tpl of pageTemplates) {
      let filter = `template_name=eq.${encodeURIComponent(tpl)}`;
      if (startDate) filter += `&sent_at=gte.${startDate}`;
      if (endDate) filter += `&sent_at=lte.${endDate}`;

      const rows: any[] = await sbGet(`halosis_messages?select=status,sent_at&${filter}`);

      let totalSent = 0, totalDelivered = 0, totalRead = 0, totalFailed = 0;
      let firstSent: string | null = null, lastSent: string | null = null;

      for (const r of rows) {
        totalSent++;
        if (r.status === "delivered" || r.status === "read") totalDelivered++;
        if (r.status === "read") totalRead++;
        if (r.status === "failed") totalFailed++;
        if (r.sent_at) {
          if (!firstSent || r.sent_at < firstSent) firstSent = r.sent_at;
          if (!lastSent || r.sent_at > lastSent) lastSent = r.sent_at;
        }
      }

      data.push({
        template_name: tpl,
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_read: totalRead,
        total_failed: totalFailed,
        first_sent: firstSent,
        last_sent: lastSent,
      });
    }

    return NextResponse.json({ data, total, page, limit, totalPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
