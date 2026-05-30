import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const BATCH = 100;

async function main() {
  const raw = fs.readFileSync("docs/pesertaSurakarta.csv", "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean))];

  // Fix typo
  const typoFix = (e: string) =>
    e === "herawatievita37@gmail.con" ? "herawatievita37@gmail.com" : e;

  // Get cms_customers
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("*")
    .in("email", emails.map(typoFix));
  const custByEmail = new Map((customers || []).map(c => [c.email?.toLowerCase(), c]));

  // Get transactions
  const guids = (customers || []).map(c => c.guid);
  const { data: txs } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, agent, amount, type, created_at")
    .in("user_id", guids);

  // Group transactions by user
  const userTx = new Map<string, typeof txs>();
  for (const tx of txs || []) {
    const list = userTx.get(tx.user_id) || [];
    list.push(tx);
    userTx.set(tx.user_id, list);
  }

  // Agent to app mapping
  const { data: products } = await supabase.from("products").select("agent_id, app_name");
  const agentToApp = new Map((products || []).filter(p => p.agent_id && p.app_name).map(p => [p.agent_id, p.app_name]));

  // Build analysis
  interface Analysis {
    email: string;
    name: string;
    city: string;
    industry: string;
    solution: string;
    registered_at: string;
    total_credit: number;
    total_debit: number;
    tx_count: number;
    apps_used: string[];
    has_usage: boolean;
    usage_level: string;
    attended: boolean;
  }

  // Get attendance — training_enrollments has email column
  const { data: event } = await supabase.from("training_events").select("id").eq("location", "Surakarta").maybeSingle();
  const attended = new Set<string>();
  if (event) {
    const { data: enrolled } = await supabase
      .from("training_enrollments")
      .select("email")
      .eq("event_id", event.id);
    for (const e of enrolled || []) {
      if (e.email) attended.add(e.email.toLowerCase());
    }
  }

  const results: Analysis[] = [];

  for (const email of emails) {
    const cust = custByEmail.get(email) || custByEmail.get(typoFix(email));
    if (!cust) continue;

    const txList = userTx.get(cust.guid) || [];
    let credit = 0, debit = 0;
    const apps = new Set<string>();
    for (const tx of txList) {
      if (tx.type === "credit" || ((tx.amount ?? 0) > 0 && tx.type !== "debit")) credit += tx.amount ?? 0;
      else if (tx.type === "debit" || (tx.amount ?? 0) < 0) debit += Math.abs(tx.amount ?? 0);
      if (tx.agent) {
        const app = agentToApp.get(tx.agent);
        if (app) apps.add(app);
      }
    }

    const usageLevel = debit === 0 ? "Tidak Pakai" : debit <= 10 ? "Rendah" : debit <= 30 ? "Sedang" : "Tinggi";

    results.push({
      email,
      name: cust.full_name || "",
      city: cust.city || "",
      industry: cust.industry_name || "",
      solution: cust.solution_corporate_needs || "",
      registered_at: cust.created_at?.slice(0, 10) || "",
      total_credit: credit,
      total_debit: debit,
      tx_count: txList.length,
      apps_used: [...apps],
      has_usage: debit > 0,
      usage_level: usageLevel,
      attended: attended.has(email),
    });
  }

  // ── CROSS TAB ANALYSIS ──
  console.log("=".repeat(80));
  console.log("📊 CROSS TAB ANALYSIS — PESERTA SURAKARTA");
  console.log("=".repeat(80));

  // 1. Overall stats
  const total = results.length;
  const withUsage = results.filter(r => r.has_usage).length;
  const noUsage = results.filter(r => !r.has_usage).length;
  const attendedCount = results.filter(r => r.attended).length;
  const avgDebit = results.reduce((s, r) => s + r.total_debit, 0) / total;
  const avgCredit = results.reduce((s, r) => s + r.total_credit, 0) / total;
  console.log(`\n📈 STATISTIK UMUM`);
  console.log(`   Total peserta: ${total}`);
  console.log(`   Hadir training: ${attendedCount} (${(attendedCount/total*100).toFixed(0)}%)`);
  console.log(`   Pernah pakai credit: ${withUsage} (${(withUsage/total*100).toFixed(0)}%)`);
  console.log(`   Tidak pernah pakai: ${noUsage} (${(noUsage/total*100).toFixed(0)}%)`);
  console.log(`   Rata-rata credit: ${avgCredit.toFixed(1)}`);
  console.log(`   Rata-rata debit (usage): ${avgDebit.toFixed(1)}`);

  // 2. Usage level distribution
  console.log(`\n📊 DISTRIBUSI LEVEL PEMAKAIAN`);
  for (const level of ["Tinggi", "Sedang", "Rendah", "Tidak Pakai"]) {
    const count = results.filter(r => r.usage_level === level).length;
    console.log(`   ${level.padEnd(12)}: ${count} peserta (${(count/total*100).toFixed(0)}%)`);
  }

  // 3. By city
  const cityGroups = new Map<string, Analysis[]>();
  for (const r of results) {
    const city = r.city || "(tidak diketahui)";
    if (!cityGroups.has(city)) cityGroups.set(city, []);
    cityGroups.get(city)!.push(r);
  }
  console.log(`\n📍 ANALISIS PER KOTA`);
  console.log(`   ${"Kota".padEnd(20)} ${"Peserta".padEnd(8)} ${"Pemakai".padEnd(8)} ${"Rata Debit".padEnd(12)} ${"Top Aplikasi"}`);
  console.log(`   ${"-".repeat(20)} ${"-".repeat(8)} ${"-".repeat(8)} ${"-".repeat(12)} ${"-".repeat(20)}`);
  for (const [city, group] of [...cityGroups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const users = group.filter(r => r.has_usage).length;
    const avgD = group.reduce((s, r) => s + r.total_debit, 0) / group.length;
    const appCounts = new Map<string, number>();
    for (const r of group) for (const a of r.apps_used) appCounts.set(a, (appCounts.get(a) || 0) + 1);
    const topApp = [...appCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([a]) => a).join(", ");
    console.log(`   ${city.padEnd(20)} ${String(group.length).padEnd(8)} ${String(users).padEnd(8)} ${avgD.toFixed(1).padEnd(12)} ${topApp}`);
  }

  // 4. By industry
  const indGroups = new Map<string, Analysis[]>();
  for (const r of results) {
    const ind = r.industry || "(tidak diketahui)";
    if (!indGroups.has(ind)) indGroups.set(ind, []);
    indGroups.get(ind)!.push(r);
  }
  console.log(`\n🏭 ANALISIS PER INDUSTRI`);
  console.log(`   ${"Industri".padEnd(25)} ${"Peserta".padEnd(8)} ${"Pemakai".padEnd(8)} ${"Rata Debit".padEnd(12)} ${"Rata Credit".padEnd(12)}`);
  console.log(`   ${"-".repeat(25)} ${"-".repeat(8)} ${"-".repeat(8)} ${"-".repeat(12)} ${"-".repeat(12)}`);
  for (const [ind, group] of [...indGroups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const users = group.filter(r => r.has_usage).length;
    const avgD = group.reduce((s, r) => s + r.total_debit, 0) / group.length;
    const avgC = group.reduce((s, r) => s + r.total_credit, 0) / group.length;
    console.log(`   ${ind.padEnd(25)} ${String(group.length).padEnd(8)} ${String(users).padEnd(8)} ${avgD.toFixed(1).padEnd(12)} ${avgC.toFixed(1).padEnd(12)}`);
  }

  // 5. Apps usage
  const appUserCounts = new Map<string, Set<string>>();
  for (const r of results) {
    for (const a of r.apps_used) {
      if (!appUserCounts.has(a)) appUserCounts.set(a, new Set());
      appUserCounts.get(a)!.add(r.email);
    }
  }
  console.log(`\n📱 POPULARITAS APLIKASI`);
  for (const [app, users] of [...appUserCounts.entries()].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`   ${app.padEnd(20)}: ${users.size} peserta (${(users.size/total*100).toFixed(0)}%)`);
  }

  // 6. Top 10 users by debit
  console.log(`\n🏆 TOP 10 PENGGUNA AKTIF (by total debit)`);
  console.log(`   ${"Nama".padEnd(25)} ${"Email".padEnd(35)} ${"Debit".padEnd(8)} ${"Credit".padEnd(8)} ${"Tx".padEnd(5)} ${"Apps".padEnd(25)} ${"Hadir"}`);
  console.log(`   ${"-".repeat(25)} ${"-".repeat(35)} ${"-".repeat(8)} ${"-".repeat(8)} ${"-".repeat(5)} ${"-".repeat(25)} ${"-".repeat(5)}`);
  for (const r of [...results].sort((a, b) => b.total_debit - a.total_debit).slice(0, 10)) {
    console.log(`   ${r.name.padEnd(25)} ${r.email.padEnd(35)} ${String(r.total_debit).padEnd(8)} ${String(r.total_credit).padEnd(8)} ${String(r.tx_count).padEnd(5)} ${r.apps_used.join(", ").padEnd(25)} ${r.attended ? "✓" : "✗"}`);
  }

  // 7. Bottom users (no usage)
  console.log(`\n⚠️  ${noUsage} PESERTA TIDAK PERNAH PAKAI CREDIT`);
  for (const r of results.filter(r => !r.has_usage)) {
    console.log(`   ${(r.name || "(tanpa nama)").padEnd(25)} ${r.email.padEnd(35)} ${r.city.padEnd(15)} ${r.industry || "-"}`);
  }

  // 8. Correlation: attendance vs usage
  console.log(`\n🔗 KORELASI KEHADIRAN VS PEMAKAIAN`);
  const attendedUsers = results.filter(r => r.attended);
  const notAttended = results.filter(r => !r.attended);
  const avgDebitAttended = attendedUsers.reduce((s, r) => s + r.total_debit, 0) / (attendedUsers.length || 1);
  const avgDebitNotAttended = notAttended.reduce((s, r) => s + r.total_debit, 0) / (notAttended.length || 1);
  const usageRateAttended = attendedUsers.filter(r => r.has_usage).length / (attendedUsers.length || 1) * 100;
  const usageRateNotAttended = notAttended.filter(r => r.has_usage).length / (notAttended.length || 1) * 100;
  console.log(`   ${"".padEnd(20)} ${"Peserta".padEnd(10)} ${"Pemakai".padEnd(10)} ${"Rate".padEnd(8)} ${"Rata Debit"}`);
  console.log(`   ${"Hadir".padEnd(20)} ${String(attendedUsers.length).padEnd(10)} ${String(attendedUsers.filter(r => r.has_usage).length).padEnd(10)} ${usageRateAttended.toFixed(0).padEnd(7)+"%".padEnd(1)} ${avgDebitAttended.toFixed(1)}`);
  console.log(`   ${"Tidak Hadir".padEnd(20)} ${String(notAttended.length).padEnd(10)} ${String(notAttended.filter(r => r.has_usage).length).padEnd(10)} ${usageRateNotAttended.toFixed(0).padEnd(7)+"%".padEnd(1)} ${avgDebitNotAttended.toFixed(1)}`);

  // 9. City + industry cross
  console.log(`\n📊 CROSS TAB KOTA × INDUSTRI`);
  const crossKey = (city: string, ind: string) => `${city}|${ind}`;
  const crossMap = new Map<string, Analysis[]>();
  for (const r of results) {
    const key = crossKey(r.city || "?", r.industry || "?");
    if (!crossMap.has(key)) crossMap.set(key, []);
    crossMap.get(key)!.push(r);
  }
  console.log(`   ${"Kota".padEnd(18)} ${"Industri".padEnd(22)} ${"Peserta".padEnd(8)} ${"Pemakai".padEnd(8)} ${"Rata Debit".padEnd(10)} ${"Rata Credit".padEnd(10)}`);
  console.log(`   ${"-".repeat(18)} ${"-".repeat(22)} ${"-".repeat(8)} ${"-".repeat(8)} ${"-".repeat(10)} ${"-".repeat(10)}`);
  for (const [key, group] of [...crossMap.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
    const [city, ind] = key.split("|");
    const users = group.filter(r => r.has_usage).length;
    const avgD = group.reduce((s, r) => s + r.total_debit, 0) / group.length;
    const avgC = group.reduce((s, r) => s + r.total_credit, 0) / group.length;
    console.log(`   ${city.padEnd(18)} ${ind.padEnd(22)} ${String(group.length).padEnd(8)} ${String(users).padEnd(8)} ${avgD.toFixed(1).padEnd(10)} ${avgC.toFixed(1).padEnd(10)}`);
  }

  // ── KESIMPULAN ──
  console.log(`\n${"=".repeat(80)}`);
  console.log("📋 KESIMPULAN");
  console.log("=".repeat(80));

  const topUser = [...results].sort((a, b) => b.total_debit - a.total_debit)[0];
  const highUsers = results.filter(r => r.usage_level === "Tinggi");
  const medUsers = results.filter(r => r.usage_level === "Sedang");

  console.log(`\n✅ PROFILE PALING AKTIF (${highUsers.length} peserta)`);
  for (const r of highUsers.slice(0, 5)) {
    console.log(`   • ${r.name || r.email} — ${r.city ? r.city + ", " : ""}${r.industry || "-"} — Debit: ${r.total_debit}, Apps: ${r.apps_used.join(", ")}`);
  }

  console.log(`\n⚠️  PROFILE KURANG AKTIF (${noUsage} peserta)`);
  for (const r of results.filter(r => !r.has_usage).slice(0, 5)) {
    console.log(`   • ${r.name || r.email} — ${r.city ? r.city + ", " : ""}${r.industry || "-"} — Credit diberikan: ${r.total_credit}, Tidak ada pemakaian`);
  }

  console.log(`\n📌 INSIGHT UTAMA`);
  console.log(`   1. ${usageRateAttended.toFixed(0)}% peserta HADIR training memakai credit vs ${usageRateNotAttended.toFixed(0)}% yang TIDAK hadir`);
  console.log(`   2. Rata-rata debit peserta hadir: ${avgDebitAttended.toFixed(1)} vs tidak hadir: ${avgDebitNotAttended.toFixed(1)}`);
  console.log(`   3. Aplikasi terpopuler: ${[...appUserCounts.entries()].sort((a,b) => b[1].size - a[1].size)[0]?.[0] || "-"}`);
  console.log(`   4. ${withUsage}/${total} peserta (${(withUsage/total*100).toFixed(0)}%) sudah aktif menggunakan credit`);
  console.log(`   5. Kota dengan pemakaian tertinggi: ${[...cityGroups.entries()].filter(([,g]) => g.some(r => r.has_usage)).sort(([,a],[,b]) => {
      const avgA = a.reduce((s,r) => s + r.total_debit, 0) / a.length;
      const avgB = b.reduce((s,r) => s + r.total_debit, 0) / b.length;
      return avgB - avgA;
    })[0]?.[0] || "-"}`);
}

main().catch(console.error);
