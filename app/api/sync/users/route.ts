import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${path}: ${res.status} ${body}`);
  }
  return res;
}

export async function POST() {
  try {
    const results: Array<{ id: string | undefined; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const customersRes = await supabaseFetch(
        `/rest/v1/cms_customers?select=guid,full_name,email&email=not.is.null&email=neq.&order=guid.asc&offset=${from}&limit=${pageSize}`
      );
      const customers = await customersRes.json();

      if (!customers || customers.length === 0) break;

      for (const c of customers) {
        try {
          await supabaseFetch("/rest/v1/credit_manager_users", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify([
              {
                id: c.guid,
                name: c.full_name,
                email: c.email,
                updated_at: new Date().toISOString(),
              },
            ]),
          });
          results.push({ id: c.guid, status: "success" });
          successCount++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.push({ id: c.guid, status: "error", error: msg });
          errorCount++;
        }
      }

      if (customers.length < pageSize) break;
      page++;
    }

    return NextResponse.json({
      status: "sync_completed",
      total_processed: results.length,
      success_count: successCount,
      error_count: errorCount,
      errors: results.filter((r) => r.status === "error").slice(0, 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, status: "error" }, { status: 500 });
  }
}
