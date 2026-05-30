import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet, sbGetAll } from "@/lib/supabase-api";
import { normalizePhone } from "@/lib/waba";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Fetch all templates
    let templateQuery = "halosis_messages?select=template_name&template_name=not.is.null&order=template_name.asc";
    const allTemplateRows: any[] = await sbGet(templateQuery);
    const templates = [...new Set(allTemplateRows.map((r: any) => r.template_name).filter(Boolean))] as string[];

    // Build phone → customer map
    const allCustomers: any[] = await sbGetAll(
      "cms_customers", "phone_number,email,full_name", "phone_number=not.is.null"
    );
    const phoneMap: Record<string, { email: string; name: string }> = {};
    for (const c of allCustomers || []) {
      if (!c.phone_number) continue;
      const normalized = normalizePhone(c.phone_number);
      phoneMap[normalized] = {
        email: c.email || "",
        name: c.full_name || c.email || "",
      };
    }

    const wb = XLSX.utils.book_new();
    const ringkasanRows: any[] = [];
    const detailRows: any[] = [];

    for (const tpl of templates) {
      let filter = `template_name=eq.${encodeURIComponent(tpl)}&select=to_phone,status,sent_at`;
      if (startDate) filter += `&sent_at=gte.${startDate}`;
      if (endDate) filter += `&sent_at=lte.${endDate}`;

      const rows: any[] = await sbGet(`halosis_messages?${filter}`);

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
        const normalized = normalizePhone(r.to_phone || "");
        const customer = phoneMap[normalized];
        detailRows.push({
          Template: tpl,
          Nomor: r.to_phone || "",
          Nama: customer?.name || "",
          Email: customer?.email || "",
          Status: r.status || "",
          Waktu: r.sent_at || "",
        });
      }

      ringkasanRows.push({
        Template: tpl,
        "Total Kirim": totalSent,
        Terkirim: totalSent - totalFailed,
        Terbaca: totalRead,
        Gagal: totalFailed,
        "Pertama Kirim": firstSent || "",
        "Terakhir Kirim": lastSent || "",
      });
    }

    const sheet1 = XLSX.utils.json_to_sheet(ringkasanRows);
    XLSX.utils.book_append_sheet(wb, sheet1, "Ringkasan Blast");

    const sheet2 = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, sheet2, "Detail Penerima");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `blast-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buf.byteLength.toString(),
      },
    });
  } catch (e: any) {
    console.error("❌ Blast export error:", e);
    return NextResponse.json({ error: "Export failed", message: e?.message || String(e) }, { status: 500 });
  }
}
