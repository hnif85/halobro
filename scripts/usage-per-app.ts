import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const raw = fs.readFileSync("docs/pesertaSurakarta.csv", "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean))];

  // Fix typo
  const typoFix = (e: string) => e === "herawatievita37@gmail.con" ? "herawatievita37@gmail.com" : e;
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, email, full_name")
    .in("email", emails.map(typoFix));
  const guids = (customers || []).map(c => c.guid);

  // Get transactions
  const { data: txs } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, agent, amount, type")
    .in("user_id", guids);

  // Agent → app mapping
  const { data: products } = await supabase.from("products").select("agent_id, app_name");
  const agentToApp = new Map((products || []).filter(p => p.agent_id && p.app_name).map(p => [p.agent_id, p.app_name]));

  // Per-app aggregation
  const appStats = new Map<string, { credit: number; debit: number; users: Set<string>; debitUsers: Set<string>; txCount: number }>();

  for (const tx of txs || []) {
    if (!tx.agent) continue;
    const app = agentToApp.get(tx.agent) || tx.agent;
    if (!appStats.has(app)) appStats.set(app, { credit: 0, debit: 0, users: new Set(), debitUsers: new Set(), txCount: 0 });

    const s = appStats.get(app)!;
    s.txCount++;
    s.users.add(tx.user_id);

    if (tx.type === "debit" || (tx.amount ?? 0) < 0) {
      s.debit += Math.abs(tx.amount ?? 0);
      s.debitUsers.add(tx.user_id);
    } else {
      s.credit += tx.amount ?? 0;
    }
  }

  console.log("=".repeat(70));
  console.log("📊 PEMAKAIAN CREDIT PER APLIKASI");
  console.log("=".repeat(70));

  console.log(`\n${"Aplikasi".padEnd(18)} ${"Total Credit".padEnd(14)} ${"Total Debit".padEnd(13)} ${"Pemakai".padEnd(9)} ${"User Debit".padEnd(11)} ${"Tx".padEnd(5)} ${"Utilisasi".padEnd(10)}`);
  console.log("-".repeat(80));
  for (const [app, s] of [...appStats.entries()].sort((a, b) => b[1].debit - a[1].debit)) {
    const utilization = s.credit > 0 ? (s.debit / s.credit * 100).toFixed(1) : "0.0";
    console.log(`${app.padEnd(18)} ${String(s.credit).padEnd(14)} ${String(s.debit).padEnd(13)} ${String(s.users.size).padEnd(9)} ${String(s.debitUsers.size).padEnd(11)} ${String(s.txCount).padEnd(5)} ${utilization.padEnd(9)}%`);
  }

  // Per-user breakdown: which apps they actually USED (debit) vs just received
  console.log("\n" + "=".repeat(70));
  console.log("📋 DETAIL PER PESERTA — APLIKASI YANG DIPAKAI (DEBIT)");
  console.log("=".repeat(70));

  const emailToGuid = new Map((customers || []).map(c => [c.guid, c.email || ""]));
  const nameMap = new Map((customers || []).map(c => [c.guid, c.full_name || ""]));

  // Group txs by user
  const userTx = new Map<string, typeof txs>();
  for (const tx of txs || []) {
    if (!userTx.has(tx.user_id)) userTx.set(tx.user_id, []);
    userTx.get(tx.user_id)!.push(tx);
  }

  console.log(`\n${"Nama".padEnd(22)} ${"Email".padEnd(35)} ${"Aplikasi Terpakai".padEnd(22)} ${"Total Debit".padEnd(11)} ${"Aplikasi Tidak Dipakai"}`);
  console.log("-".repeat(110));

  // Sort by total debit descending
  const userDebitTotal = new Map<string, number>();
  const userAppDebit = new Map<string, Set<string>>();
  const userAppCredit = new Map<string, Set<string>>();
  for (const [uid, txList] of userTx) {
    let totalDebit = 0;
    const appsDebit = new Set<string>();
    const appsCredit = new Set<string>();
    for (const tx of txList ?? []) {
      const app = tx.agent ? agentToApp.get(tx.agent) : null;
      if (!app) continue;
      if (tx.type === "debit" || (tx.amount ?? 0) < 0) {
        totalDebit += Math.abs(tx.amount ?? 0);
        appsDebit.add(app);
      } else {
        appsCredit.add(app);
      }
    }
    userDebitTotal.set(uid, totalDebit);
    userAppDebit.set(uid, appsDebit);
    userAppCredit.set(uid, appsCredit);
  }

  const sortedUsers = [...userTx.keys()].sort((a, b) => (userDebitTotal.get(b) || 0) - (userDebitTotal.get(a) || 0));

  for (const uid of sortedUsers) {
    const email = emailToGuid.get(uid) || uid;
    const name = nameMap.get(uid) || "";
    const totalDebit = userDebitTotal.get(uid) || 0;
    const used = userAppDebit.get(uid) || new Set();
    const received = userAppCredit.get(uid) || new Set();
    const notUsed = [...received].filter(a => !used.has(a));

    if (totalDebit === 0) continue; // skip non-users

    console.log(`${name.padEnd(22)} ${email.padEnd(35)} ${[...used].join(", ").padEnd(22)} ${String(totalDebit).padEnd(11)} ${notUsed.join(", ") || "-"}`);
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📌 RINGKASAN");
  console.log("=".repeat(70));

  const totalUsers = guids.length;
  const debitUsers = new Set<string>();
  for (const [, s] of appStats) for (const u of s.debitUsers) debitUsers.add(u);

  for (const [app, s] of [...appStats.entries()].sort((a, b) => b[1].debit - a[1].debit)) {
    const pct = (s.debitUsers.size / totalUsers * 100).toFixed(0);
    console.log(`\n${app}:`);
    console.log(`  Credit diberikan: ${s.credit}`);
    console.log(`  Credit dipakai:   ${s.debit} (${s.credit > 0 ? (s.debit/s.credit*100).toFixed(1) : 0}% utilisasi)`);
    console.log(`  Pengguna:         ${s.debitUsers.size}/${totalUsers} peserta (${pct}%)`);
    if (s.debit === 0) console.log(`  ⚠️  TIDAK ADA PEMAKAIAN`);
  }
}

main().catch(console.error);
