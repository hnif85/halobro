import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet, sbGetAll } from "@/lib/supabase-api";
import { normalizePhone } from "@/lib/waba";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { template } = await params;
    const templateName = decodeURIComponent(template);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Count total
    let countFilter = `template_name=eq.${encodeURIComponent(templateName)}&select=id`;
    const countRows: any[] = await sbGet(`halosis_messages?${countFilter}`);
    const total = countRows.length;
    const totalPages = Math.ceil(total / limit);

    // Fetch page
    let filter = `template_name=eq.${encodeURIComponent(templateName)}&select=to_phone,status,sent_at&order=sent_at.desc`;
    if (search) filter += `&to_phone=ilike.%${encodeURIComponent(search)}%`;
    const allRows: any[] = await sbGet(`halosis_messages?${filter}`);
    const pageRows = allRows.slice(from, from + limit);

    // Enrich with customer email & name
    const phones = [...new Set(pageRows.map((r: any) => r.to_phone).filter(Boolean))] as string[];
    const phoneMap: Record<string, { email: string; name: string }> = {};
    if (phones.length > 0) {
      const customers: any[] = await sbGetAll(
        "cms_customers", "phone_number,email,full_name", "phone_number=not.is.null"
      );
      for (const c of customers || []) {
        if (!c.phone_number) continue;
        const normalized = normalizePhone(c.phone_number);
        phoneMap[normalized] = {
          email: c.email || "",
          name: c.full_name || c.email || "",
        };
      }
    }

    const data = pageRows.map((r: any) => {
      const normalized = normalizePhone(r.to_phone || "");
      const customer = phoneMap[normalized];
      return {
        to_phone: r.to_phone || "",
        status: r.status || "",
        sent_at: r.sent_at || null,
        email: customer?.email || "",
        name: customer?.name || "",
      };
    });

    return NextResponse.json({ data, total, page, limit, totalPages, template_name: templateName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
