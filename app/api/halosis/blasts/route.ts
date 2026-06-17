import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet } from "@/lib/supabase-api";
import { normalizePhone } from "@/lib/waba";

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

    let templateQuery = "halosis_messages?select=template_name&template_name=not.is.null&order=template_name.asc";
    const allTemplateRows: any[] = await sbGet(templateQuery);

    let templates = [...new Set(allTemplateRows.map((r: any) => r.template_name).filter(Boolean))] as string[];

    if (search) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.toLowerCase().includes(q));
    }

    const total = templates.length;
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const pageTemplates = templates.slice(from, from + limit);

    const data: any[] = [];
    const templateRecipients: Record<string, string[]> = {};

    for (const tpl of pageTemplates) {
      let filter = `template_name=eq.${encodeURIComponent(tpl)}`;
      if (startDate) filter += `&sent_at=gte.${startDate}`;
      if (endDate) filter += `&sent_at=lte.${endDate}`;

      const rows: any[] = await sbGet(`halosis_messages?select=status,sent_at,to_phone&${filter}`);

      let totalSent = 0, totalDelivered = 0, totalRead = 0, totalFailed = 0;
      let firstSent: string | null = null, lastSent: string | null = null;
      const phones: string[] = [];

      for (const r of rows) {
        totalSent++;
        if (r.status === "delivered" || r.status === "read" || r.status === "need_fu" || r.status === "auto_reply") totalDelivered++;
        if (r.status === "read") totalRead++;
        if (r.status === "failed") totalFailed++;
        if (r.sent_at) {
          if (!firstSent || r.sent_at < firstSent) firstSent = r.sent_at;
          if (!lastSent || r.sent_at > lastSent) lastSent = r.sent_at;
        }
        if (r.to_phone) phones.push(normalizePhone(r.to_phone));
      }

      templateRecipients[tpl] = [...new Set(phones)];

      data.push({
        template_name: tpl,
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_read: totalRead,
        total_failed: totalFailed,
        first_sent: firstSent,
        last_sent: lastSent,
        total_replied: 0,
      });
    }

    const allRecipientPhones = [...new Set(Object.values(templateRecipients).flat())];
    let replySet = new Set<string>();
    if (allRecipientPhones.length > 0) {
      const batches: string[][] = [];
      for (let i = 0; i < allRecipientPhones.length; i += 100) {
        batches.push(allRecipientPhones.slice(i, i + 100));
      }
      for (const batch of batches) {
        const phoneIn = batch.map((p) => encodeURIComponent(p)).join(",");
        const replyRows: any[] = await sbGet(`halosis_messages?select=from_phone&from_phone=in.(${phoneIn})&limit=1000`);
        for (const r of replyRows) {
          if (r.from_phone) replySet.add(normalizePhone(r.from_phone));
        }
      }
    }

    for (const item of data) {
      const recipients = templateRecipients[item.template_name] || [];
      item.total_replied = recipients.filter((p) => replySet.has(p)).length;
    }

    return NextResponse.json({ data, total, page, limit, totalPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
