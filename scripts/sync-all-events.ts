import { createClient } from "@supabase/supabase-js";

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
  console.log("🔄 Universal sync: Credit Manager API → Supabase (all events)\n");

  // 1. Get all event participants from training_enrollments
  const { data: enrollments } = await supabase
    .from("training_enrollments")
    .select("event_id, user_guid, email")
    .not("user_guid", "is", null);

  const guidSet = new Set<string>();
  for (const enr of enrollments || []) {
    if (enr.user_guid) guidSet.add(enr.user_guid);
  }
  console.log(`📋 ${guidSet.size} unique peserta dari training_enrollments`);

  if (guidSet.size === 0) {
    console.log("❌ Tidak ada peserta ditemukan");
    return;
  }

  // 2. Get event dates to determine sync range
  const { data: events } = await supabase
    .from("training_events")
    .select("id, name, event_date, location")
    .order("event_date", { ascending: true });

  const dateStrings = (events || []).map((e) => e.event_date?.slice(0, 10)).filter(Boolean);
  const sorted = [...dateStrings].sort();
  const startDate = sorted[0] ? new Date(sorted[0]) : new Date("2026-04-01");
  const endDate = sorted[sorted.length - 1] ? new Date(sorted[sorted.length - 1]) : new Date("2026-05-23");

  // Extend range: 7 days before first event, 7 days after last event
  const rangeStart = new Date(startDate);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const startStr = rangeStart.toISOString().slice(0, 10);
  const endStr = rangeEnd.toISOString().slice(0, 10);
  console.log(`📅 Date range: ${startStr} → ${endStr}`);
  console.log(`   (berdasarkan ${events?.length || 0} event: ${sorted.join(", ")})`);

  // 3. Fetch all transactions from API with pagination
  let page = 1;
  let total = 999999;
  let totalFetched = 0;
  let totalOurTxs = 0;
  let successCount = 0;
  let failCount = 0;

  while (page * 100 <= total + 100) {
    const { txs, total: apiTotal } = await fetchPage(page, startStr, endStr);
    total = apiTotal;

    const ourTxs = txs.filter((t) => guidSet.has(t.user_id));
    totalFetched += txs.length;

    if (ourTxs.length > 0) {
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
      }
      totalOurTxs += ourTxs.length;
    }

    if (page === 1) {
      console.log(`📡 ${apiTotal} total txns in API, fetching page by page...`);
    }

    if (txs.length < 100) break;
    page++;
    if (page % 20 === 0) {
      console.log(`   ...page ${page}/${Math.ceil(total / 100)} (${totalFetched}/${total} fetched)`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // 4. Summary
  const { count: creditTotal } = await supabase
    .from("credit_manager_transactions")
    .select("id", { head: true, count: "exact" })
    .in("user_id", [...guidSet])
    .eq("type", "credit");

  const { count: creditWithAgent } = await supabase
    .from("credit_manager_transactions")
    .select("id", { head: true, count: "exact" })
    .in("user_id", [...guidSet])
    .eq("type", "credit")
    .not("agent", "is", null);

  const { count: debitTotal } = await supabase
    .from("credit_manager_transactions")
    .select("id", { head: true, count: "exact" })
    .in("user_id", [...guidSet])
    .eq("type", "debit");

  console.log(`\n✅ Selesai!`);
  console.log(`📡 ${totalFetched} total transaksi dari API`);
  console.log(`📥 ${totalOurTxs} milik ${guidSet.size} peserta event`);
  console.log(`   ✓ ${successCount} sukses di-upsert`);
  console.log(`   ❌ ${failCount} gagal`);
  console.log(`\n📊 Database stats untuk peserta event:`);
  console.log(`   💳 Credit: ${creditTotal || 0} total (${creditWithAgent || 0} dengan agent_id)`);
  console.log(`   💰 Debit:  ${debitTotal || 0}`);
}

main().catch(console.error);
