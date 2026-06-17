import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet } from "@/lib/supabase-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { phone } = await params;
    const decodedPhone = decodeURIComponent(phone);

    const sentTo = await sbGet(
      `halosis_messages?select=from_phone,to_phone,status,sent_at,raw_json&to_phone=eq.${encodeURIComponent(decodedPhone)}&order=sent_at.asc`
    );
    const sentFrom = await sbGet(
      `halosis_messages?select=from_phone,to_phone,status,sent_at,raw_json&from_phone=eq.${encodeURIComponent(decodedPhone)}&order=sent_at.asc`
    );

    const all = [...(sentTo || []), ...(sentFrom || [])];
    all.sort((a: any, b: any) => (a.sent_at || "").localeCompare(b.sent_at || ""));

    const seen = new Set<string>();
    const messages: any[] = [];
    for (const r of all) {
      const raw = typeof r.raw_json === "string" ? JSON.parse(r.raw_json) : r.raw_json;
      const wamId = raw?.wam_id || r.sent_at + (r.from_phone || "") + (r.to_phone || "");
      if (seen.has(wamId)) continue;
      seen.add(wamId);

      const isCustomer = r.from_phone === decodedPhone;
      messages.push({
        message: raw?.message || "",
        direction: isCustomer ? "in" : "out",
        agent_name: raw?.agent_name || null,
        status: r.status || "",
        sent_at: r.sent_at || "",
        from_phone: r.from_phone || "",
        to_phone: r.to_phone || "",
      });
    }

    let customerName = "";
    let customerEmail = "";
    try {
      const customers: any[] = await sbGet(
        `cms_customers?select=full_name,email&phone_number=ilike.%25${encodeURIComponent(decodedPhone.slice(-10))}`
      );
      if (customers?.length) {
        customerName = customers[0].full_name || "";
        customerEmail = customers[0].email || "";
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      customer: { phone: decodedPhone, name: customerName, email: customerEmail },
      messages,
      total: messages.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
