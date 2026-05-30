import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH_SIZE = 100;

interface Customer {
  guid: string;
  email: string;
  full_name: string | null;
}

interface CreditTx {
  user_id: string;
  agent: string | null;
  amount: number | null;
  type: string | null;
  product_name: string | null;
  product_package: string | null;
  created_at: string | null;
}

async function main() {
  console.log("\n📊 HaloBro CRM — Report Credit Usage Peserta Surakarta\n");

  // ── 0. Build agent→app_name map from products table ──
  console.log("📦 Membangun mapping agent → aplikasi...");
  const { data: allProducts } = await supabase
    .from("products")
    .select("agent_id, app_name, application_name");

  const agentToApp = new Map<string, string>();
  const agentToAppFull = new Map<string, string>();
  for (const p of allProducts || []) {
    if (p.agent_id && p.app_name) {
      agentToApp.set(p.agent_id, p.app_name);
      agentToAppFull.set(p.agent_id, p.application_name || p.app_name);
    }
  }
  console.log(`   ✓ ${agentToApp.size} mapping agent → aplikasi\n`);

  // ── 1. Read participant emails ──
  const csvPath = path.join(process.cwd(), "docs", "pesertaSurakarta.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ pesertaSurakarta.csv not found");
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map((l) => l.trim().toLowerCase()).filter(Boolean))];
  console.log(`📧 ${emails.length} peserta email (unique)\n`);

  // ── 2. Find in cms_customers ──
  console.log("🔍 Mencocokkan email ke cms_customers...");
  const emailToCustomer = new Map<string, Customer>();
  const typoFixMap = new Map<string, string>();

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from("cms_customers")
      .select("guid, email, full_name")
      .in("email", batch);

    for (const c of data || []) {
      if (c.email) emailToCustomer.set(c.email.toLowerCase(), c);
    }
  }

  // Coba fix typo untuk yang tidak ditemukan
  const typoRules = [
    (e: string) => e.replace(/@gmai\.com$/, "@gmail.com"),
    (e: string) => e.replace(/@gmail\.con$/, "@gmail.com"),
    (e: string) => e.replace(/@gmail\.c$/, "@gmail.com"),
    (e: string) => e.replace(/@yahoo\.co\.id$/, "@yahoo.com"),
  ];

  for (const email of emails) {
    if (emailToCustomer.has(email)) continue;
    for (const fix of typoRules) {
      const fixed = fix(email);
      if (fixed !== email) {
        const { data: found } = await supabase
          .from("cms_customers")
          .select("guid, email, full_name")
          .eq("email", fixed)
          .maybeSingle();
        if (found && found.email) {
          emailToCustomer.set(email, { guid: found.guid, email: found.email, full_name: found.full_name });
          typoFixMap.set(email, fixed);
          break;
        }
      }
    }
  }

  const fixedCount = typoFixMap.size;
  console.log(`   ✓ ${emailToCustomer.size} / ${emails.length} ditemukan di cms_customers`);
  if (fixedCount > 0) {
    for (const [orig, fixed] of typoFixMap) {
      console.log(`   🔧 ${orig} → ${fixed}`);
    }
  }
  console.log();

  // ── 3. Fetch credit_manager_transactions (with agent column) ──
  console.log("💰 Mengambil data transaksi kredit...");
  const guids = [...emailToCustomer.values()].map((c) => c.guid);
  const guidToTx = new Map<string, CreditTx[]>();

  for (let i = 0; i < guids.length; i += BATCH_SIZE) {
    const batch = guids.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from("credit_manager_transactions")
      .select("user_id, agent, amount, type, product_name, product_package, created_at")
      .in("user_id", batch)
      .order("created_at", { ascending: false });

    for (const tx of data || []) {
      const list = guidToTx.get(tx.user_id) || [];
      list.push(tx);
      guidToTx.set(tx.user_id, list);
    }
  }

  // Stats agent mapping
  let totalWithAgent = 0;
  const agentSet = new Set<string>();
  for (const [, txs] of guidToTx) {
    for (const tx of txs) {
      if (tx.agent) {
        totalWithAgent++;
        agentSet.add(tx.agent);
      }
    }
  }
  console.log(`   ✓ ${guidToTx.size} users memiliki transaksi kredit`);
  console.log(`   📌 ${totalWithAgent} transaksi memiliki agent (${agentSet.size} unique agents)`);
  for (const a of agentSet) {
    console.log(`      ${a.slice(0, 8)}... → ${agentToApp.get(a) || "UNKNOWN"}`);
  }
  console.log();

  // ── 4. Fetch profile ──
  console.log("📋 Mengambil data profile...");
  const guidToProfile = new Map<string, { credit_usage: string | null; latest_balance: number | null }>();

  for (let i = 0; i < guids.length; i += BATCH_SIZE) {
    const batch = guids.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from("profile")
      .select("customer_guid, credit_usage, latest_balance")
      .in("customer_guid", batch);

    for (const p of data || []) {
      if (p.customer_guid) guidToProfile.set(p.customer_guid, p);
    }
  }
  console.log(`   ✓ ${guidToProfile.size} profile ditemukan\n`);

  // ── 5. Fetch absensi Surakarta ──
  console.log("🎯 Mengambil data kehadiran Surakarta...");
  const { data: surakartaEvent } = await supabase
    .from("training_events")
    .select("id, name, event_date")
    .eq("location", "Surakarta")
    .maybeSingle();

  const enrolledEmails = new Set<string>();
  if (surakartaEvent) {
    const { data: enrollments } = await supabase
      .from("training_enrollments")
      .select("email")
      .eq("event_id", surakartaEvent.id);

    for (const e of enrollments || []) {
      if (e.email) enrolledEmails.add(e.email.toLowerCase());
    }
  }
  console.log(`   ${surakartaEvent ? `✓ Event: ${surakartaEvent.name}` : "⚠ Event tidak ditemukan"}`);
  console.log(`   ✅ ${enrolledEmails.size} peserta terdaftar\n`);

  // ── 6. Generate report ──
  console.log("=".repeat(70));
  console.log("📊 LAPORAN CREDIT USAGE — PESERTA SURAKARTA");
  console.log("=".repeat(70));

  const rows: string[][] = [];
  const sortedCustomers = [...emailToCustomer.values()].sort((a, b) =>
    (a.full_name || a.email).localeCompare(b.full_name || b.email)
  );

  for (const cust of sortedCustomers) {
    const email = cust.email.toLowerCase();
    const txList = guidToTx.get(cust.guid) || [];
    const profile = guidToProfile.get(cust.guid);
    const hadir = enrolledEmails.has(email) ? "Ya" : "Tidak";

    // Aggregate credit/debit
    let totalCredit = 0;
    let totalDebit = 0;
    const appsUsed = new Set<string>();
    const txWithAgent: string[] = [];

    for (const tx of txList) {
      // Count credit/debit
      if (tx.type === "credit" || ((tx.amount ?? 0) > 0 && tx.type !== "debit")) {
        totalCredit += tx.amount ?? 0;
      } else if (tx.type === "debit" || (tx.amount ?? 0) < 0) {
        totalDebit += Math.abs(tx.amount ?? 0);
      }

      // Map agent → app_name
      if (tx.agent) {
        const appName = agentToApp.get(tx.agent);
        if (appName) {
          appsUsed.add(appName);
          txWithAgent.push(
            `${appName}: ${tx.type} ${tx.amount} (${(tx.created_at || "").slice(0, 10)})`
          );
        } else {
          txWithAgent.push(
            `agent:${tx.agent.slice(0, 8)}: ${tx.type} ${tx.amount} (${(tx.created_at || "").slice(0, 10)})`
          );
        }
      }
    }

    const lastTx = txList.length > 0 ? (txList[0].created_at?.slice(0, 19).replace("T", " ") ?? "") : "";
    const appNames = [...appsUsed].join("; ") || (txList.length > 0 ? "(agent NULL)" : "-");

    // Detail agent-based transactions
    const agentDetail = txWithAgent.length > 0
      ? txWithAgent.slice(0, 5).join(" | ")
      : (txList.length > 0 ? "transaksi tanpa agent" : "-");

    // Summary of all transactions
    const txSummary = txList.slice(0, 5).map((tx) =>
      `${tx.type} ${tx.amount} (${(tx.created_at || "").slice(0, 10)})`
    ).join("; ");

    rows.push([
      cust.full_name || "",
      email,
      hadir,
      totalCredit.toString(),
      totalDebit.toString(),
      txList.length.toString(),
      lastTx,
      appNames,
      agentDetail,
      txSummary,
      profile?.credit_usage || "",
      profile?.latest_balance?.toString() || "",
    ]);
  }

  // ── 7. Output ──
  const headers = [
    "Nama", "Email", "Hadir",
    "Total Credit", "Total Debit", "Jumlah Transaksi", "Transaksi Terakhir",
    "Aplikasi (via Agent)", "Detail Agent",
    "Ringkasan Transaksi",
    "Credit Usage (Profile)", "Latest Balance",
  ];

  console.log("\n" + headers.join(" | "));
  console.log("-".repeat(160));
  for (const row of rows.slice(0, 20)) {
    console.log(row.join(" | "));
  }
  if (rows.length > 20) {
    console.log(`... dan ${rows.length - 20} baris lainnya`);
  }

  const outPath = path.join(process.cwd(), "docs", "laporan-credit-peserta-v2.csv");
  const csvLines = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
  ];
  fs.writeFileSync(outPath, csvLines.join("\n"), "utf-8");

  console.log(`\n✅ Laporan disimpan ke: ${outPath}`);
  console.log(`📊 ${rows.length} peserta dengan data`);
  console.log(`ℹ️  ${emails.length - emailToCustomer.size} peserta tidak ditemukan di cms_customers`);
  console.log(`ℹ️  ${rows.length - guidToTx.size} peserta tidak punya data transaksi\n`);
}

main().catch(console.error);
