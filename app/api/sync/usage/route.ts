import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const CREDIT_API = process.env.CREDIT_MANAGER_URL || "https://credit-manager.mwxmarket.ai/api/v1/transactions";
const CREDIT_AUTH = process.env.CREDIT_MANAGER_AUTH as string;

interface ApiTx {
  id: string;
  user_id: string;
  user_product_id: string | null;
  amount: number;
  agent_id: string | null;
  type: string;
  product_name: string | null;
  product_package: string | null;
  action_id: string | null;
  created_at: string;
  updated_at: string;
}

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

async function fetchDebitTransactions(startDate: string, endDate: string): Promise<ApiTx[]> {
  const all: ApiTx[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const url = `${CREDIT_API}?page=${page}&limit=${limit}&start_date=${startDate}&end_date=${endDate}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: CREDIT_AUTH,
        "X-API-KEY": CREDIT_AUTH,
      },
    });

    if (!res.ok) {
      throw new Error(`Credit Manager API error: ${res.status} ${res.statusText}`);
    }

    const body = await res.json();
    const txs: ApiTx[] = body?.data || [];

    const filtered = txs.filter((t) => t.type === "debit");
    all.push(...filtered);

    if (txs.length < limit) break;
    page++;
    if (page > 500) break;
  }

  return all;
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!CREDIT_AUTH) throw new Error("CREDIT_MANAGER_AUTH environment variable is required");
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate } = body;

    const lastRes = await supabaseFetch(
      "/rest/v1/credit_manager_transactions?select=created_at&type=eq.debit&order=created_at.desc&limit=1"
    );
    const lastRows = await lastRes.json();
    const lastDate = lastRows?.[0]?.created_at
      ? new Date(lastRows[0].created_at).toISOString().split("T")[0]
      : null;

    const start = startDate || lastDate || "2026-01-01";
    const end = endDate || new Date().toISOString().split("T")[0];

    console.log(`Syncing usage (debit) from ${start} to ${end}...`);

    const transactions = await fetchDebitTransactions(start, end);
    console.log(`Fetched ${transactions.length} debit transactions from API`);

    if (transactions.length === 0) {
      return NextResponse.json({
        status: "sync_completed",
        total_processed: 0,
        success_count: 0,
        error_count: 0,
        message: "No debit transactions to sync",
      });
    }

    const results: Array<{ id: string; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (const t of transactions) {
      try {
        await supabaseFetch("/rest/v1/credit_manager_transactions", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify([
            {
              id: t.id,
              created_at: t.created_at,
              updated_at: t.updated_at,
              agent: t.agent_id,
              amount: t.amount,
              user_product_id: t.user_product_id,
              product_name: t.product_name,
              product_package: t.product_package,
              type: t.type,
              user_id: t.user_id,
              action_id: t.action_id,
              inserted_at: new Date().toISOString(),
            },
          ]),
        });
        results.push({ id: t.id, status: "success" });
        successCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ id: t.id, status: "error", error: msg });
        errorCount++;
      }
    }

    return NextResponse.json({
      status: "sync_completed",
      total_processed: transactions.length,
      success_count: successCount,
      error_count: errorCount,
      errors: results.filter((r) => r.status === "error").slice(0, 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, status: "error" }, { status: 500 });
  }
}
