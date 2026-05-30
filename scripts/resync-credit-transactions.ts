import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CREDIT_API = "https://credit-manager.mwxmarket.ai/api/v1/transactions";
const CREDIT_AUTH = process.env.CREDIT_MANAGER_AUTH!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
  reason: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchPage(page: number, start: string, end: string): Promise<{ txs: ApiTx[]; total: number }> {
  const url = `${CREDIT_API}?page=${page}&limit=100&start_date=${start}&end_date=${end}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: CREDIT_AUTH,
      "X-API-KEY": CREDIT_AUTH,
    },
  });
  const body = await res.json();
  return { txs: body?.data || [], total: body?.total || 0 };
}

async function main() {
  console.log("🔄 Re-sync all transactions from Credit Manager API → Supabase\n");

  // 1. Get all participant guids
  const csvPath = "docs/pesertaSurakarta.csv";
  const raw = fs.readFileSync(csvPath, "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map((l) => l.trim().toLowerCase()).filter(Boolean))];

  const guidSet = new Set<string>();
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data } = await supabase.from("cms_customers").select("guid, email").in("email", batch);
    for (const c of data || []) guidSet.add(c.guid);
  }
  console.log(`📧 ${emails.length} emails → ${guidSet.size} guids\n`);

  // 2. Fetch from API in date ranges covering all their transactions
  const ranges = [
    { start: "2026-05-20", end: "2026-05-22" },
    // add more ranges if needed
  ];

  let totalFetched = 0;
  let totalUpserted = 0;
  let successCount = 0;
  let failCount = 0;

  for (const range of ranges) {
    console.log(`📡 Fetching ${range.start} → ${range.end}...`);
    let page = 1;
    let total = 999999;

    while (page * 100 <= total + 100) {
      const { txs, total: apiTotal } = await fetchPage(page, range.start, range.end);
      total = apiTotal;

      // Filter for our participants
      const ourTxs = txs.filter((t) => guidSet.has(t.user_id));
      totalFetched += txs.length;

      if (ourTxs.length > 0) {
        // Upsert batch
        const records = ourTxs.map((t) => ({
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
        }));

        const { error } = await supabase
          .from("credit_manager_transactions")
          .upsert(records, { onConflict: "id" });

        if (error) {
          console.error(`  ❌ Page ${page}: ${error.message}`);
          failCount += ourTxs.length;
        } else {
          successCount += ourTxs.length;
          for (const t of ourTxs) {
            const agent = t.agent_id ? t.agent_id.slice(0, 8) : "null";
            console.log(`  ✓ ${t.type.padEnd(6)} amt=${t.amount} agent=${agent} user=${t.user_id.slice(0, 8)}`);
          }
        }
        totalUpserted += ourTxs.length;
      }

      // Stop if last page
      if (txs.length < 100) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n✅ Selesai!`);
  console.log(`📡 ${totalFetched} total transaksi dari API`);
  console.log(`📥 ${totalUpserted} milik peserta Surakarta`);
  console.log(`   ✓ ${successCount} sukses di-upsert`);
  console.log(`   ❌ ${failCount} gagal`);
  console.log(`\n🚀 Jalankan ulang: npx tsx scripts/report-credit-usage.ts`);
}

main().catch(console.error);
