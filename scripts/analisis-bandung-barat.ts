import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const BATCH = 100;
const TRAINING_DATE = "2026-05-21";

async function main() {
  const raw = fs.readFileSync("docs/pesertaKabBandungBarat.csv", "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean))];
  const typoFix = (e: string) => e === "herawatievita37@gmail.con" ? "herawatievita37@gmail.com" : e;

  // ── CUSTOMERS ──
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, email, full_name, identity_number, is_identity_verified, city, industry_name")
    .in("email", emails.map(typoFix));
  const custMap = new Map((customers || []).map(c => [c.guid, c]));
  const emailToGuid = new Map((customers || []).map(c => [c.email?.toLowerCase(), c.guid]));
  const guids = [...custMap.keys()];
  console.log(`📧 ${emails.length} emails → ${guids.length} customers\n`);

  // ── EVENT & ENROLLMENT ──
  const { data: events } = await supabase
    .from("training_events")
    .select("id, name, event_date")
    .ilike("location", "%bandung%");
  const event = events?.[0];
  const enrolledSet = new Set<string>();
  if (event) {
    const { data: enrolled } = await supabase
      .from("training_enrollments")
      .select("email")
      .eq("event_id", event.id);
    for (const e of enrolled || []) if (e.email) enrolledSet.add(e.email.toLowerCase());
  }
  console.log(`🎯 ${event?.name || "?"} — ${event?.event_date || "?"}`);
  console.log(`   Terdaftar: ${enrolledSet.size} peserta`);
  const enrolledCount = [...emails].filter(e => enrolledSet.has(e)).length;
  console.log(`   Cocok dengan peserta: ${enrolledCount}/${emails.length}\n`);

  // ── TRANSACTIONS ──
  const { data: allTxs } = await supabase
    .from("credit_manager_transactions")
    .select("user_id, agent, amount, type, created_at")
    .in("user_id", guids);

  const { data: products } = await supabase.from("products").select("agent_id, app_name");
  const agentToApp = new Map((products || []).filter(p => p.agent_id && p.app_name).map(p => [p.agent_id, p.app_name]));

  // ── BUILD PER-USER ANALYSIS ──
  interface UserAnalysis {
    email: string;
    name: string;
    guid: string;
    enrolled: boolean;
    hasIdentity: boolean;
    // Overall
    totalCredit: number;
    totalDebit: number;
    txCount: number;
    // During training (May 21)
    trainingDebit: number;
    trainingCredit: number;
    trainingTx: number;
    trainingApps: string[];
    // Outside training
    outsideDebit: number;
    outsideCredit: number;
    outsideTx: number;
    outsideApps: string[];
    // Per app debit
    appDebit: Record<string, number>;
  }

  const userMap = new Map<string, UserAnalysis>();

  for (const c of customers || []) {
    const email = c.email?.toLowerCase() || c.guid;
    userMap.set(c.guid, {
      email,
      name: c.full_name || "",
      guid: c.guid,
      enrolled: enrolledSet.has(email),
      hasIdentity: !!c.identity_number,
      totalCredit: 0, totalDebit: 0, txCount: 0,
      trainingDebit: 0, trainingCredit: 0, trainingTx: 0, trainingApps: [],
      outsideDebit: 0, outsideCredit: 0, outsideTx: 0, outsideApps: [],
      appDebit: {},
    });
  }

  for (const tx of allTxs || []) {
    const ua = userMap.get(tx.user_id);
    if (!ua) continue;
    const app = tx.agent ? agentToApp.get(tx.agent) || "UNKNOWN" : "NO_AGENT";
    const amount = Math.abs(tx.amount ?? 0);
    const isDebit = tx.type === "debit" || (tx.amount ?? 0) < 0;
    const isTraining = tx.created_at?.startsWith(TRAINING_DATE);

    ua.txCount++;
    if (isDebit) {
      ua.totalDebit += amount;
      ua.appDebit[app] = (ua.appDebit[app] || 0) + amount;
      if (isTraining) {
        ua.trainingDebit += amount;
        if (!ua.trainingApps.includes(app)) ua.trainingApps.push(app);
      } else {
        ua.outsideDebit += amount;
        if (!ua.outsideApps.includes(app)) ua.outsideApps.push(app);
      }
    } else {
      ua.totalCredit += amount;
      if (isTraining) ua.trainingCredit += amount;
      else ua.outsideCredit += amount;
    }
  }

  const users = [...userMap.values()];

  // ══════════════════════════════════════════════
  //  ANALISIS 1: PROFIL vs PEMAKAIAN
  // ══════════════════════════════════════════════
  console.log("=".repeat(80));
  console.log("📊 ANALISIS PROFIL vs PEMAKAIAN — KAB. BANDUNG BARAT");
  console.log("=".repeat(80));

  // A. Identity holder analysis
  const withIdentity = users.filter(u => u.hasIdentity);
  const withoutIdentity = users.filter(u => !u.hasIdentity);
  const avg = (arr: UserAnalysis[], fn: (u: UserAnalysis) => number) =>
    arr.length ? arr.reduce((s, u) => s + fn(u), 0) / arr.length : 0;
  const countActive = (arr: UserAnalysis[]) => arr.filter(u => u.totalDebit > 0).length;

  console.log(`\n📋 A. PUNYA NIB/IDENTITAS (${withIdentity.length} peserta)`);
  console.log(`   ${"Nama".padEnd(22)} ${"Email".padEnd(35)} ${"Total Debit".padEnd(12)} ${"Training".padEnd(12)} ${"Luar".padEnd(10)} ${"Apps Dipakai"}`);
  console.log(`   ${"-".repeat(22)} ${"-".repeat(35)} ${"-".repeat(12)} ${"-".repeat(12)} ${"-".repeat(10)} ${"-".repeat(20)}`);
  for (const u of withIdentity.sort((a, b) => b.totalDebit - a.totalDebit)) {
    const apps = Object.entries(u.appDebit).filter(([, v]) => v > 0).map(([a]) => a).join(", ");
    console.log(`   ${u.name.padEnd(22)} ${u.email.padEnd(35)} ${String(u.totalDebit).padEnd(12)} ${String(u.trainingDebit).padEnd(12)} ${String(u.outsideDebit).padEnd(10)} ${apps}`);
  }

  console.log(`\n   Perbandingan:`);
  console.log(`   ${"".padEnd(22)} ${"Punya NIB".padEnd(14)} ${"Tanpa NIB".padEnd(14)}`);
  console.log(`   ${"Peserta".padEnd(22)} ${String(withIdentity.length).padEnd(14)} ${String(withoutIdentity.length).padEnd(14)}`);
  console.log(`   ${"Pemakai".padEnd(22)} ${String(countActive(withIdentity)).padEnd(14)} ${String(countActive(withoutIdentity)).padEnd(14)}`);
  console.log(`   ${"Rata Debit".padEnd(22)} ${avg(withIdentity, u => u.totalDebit).toFixed(1).padEnd(14)} ${avg(withoutIdentity, u => u.totalDebit).toFixed(1).padEnd(14)}`);

  // B. Enrolled vs not enrolled
  const enrolled = users.filter(u => u.enrolled);
  const notEnrolled = users.filter(u => !u.enrolled);

  console.log(`\n📋 B. TERDAFTAR TRAINING vs TIDAK`);
  console.log(`   ${"".padEnd(22)} ${"Terdaftar".padEnd(14)} ${"Tidak".padEnd(14)}`);
  console.log(`   ${"Peserta".padEnd(22)} ${String(enrolled.length).padEnd(14)} ${String(notEnrolled.length).padEnd(14)}`);
  console.log(`   ${"Pemakai".padEnd(22)} ${String(countActive(enrolled)).padEnd(14)} ${String(countActive(notEnrolled)).padEnd(14)}`);
  console.log(`   ${"Rata Debit".padEnd(22)} ${avg(enrolled, u => u.totalDebit).toFixed(1).padEnd(14)} ${avg(notEnrolled, u => u.totalDebit).toFixed(1).padEnd(14)}`);
  console.log(`   ${"Rata Training".padEnd(22)} ${avg(enrolled, u => u.trainingDebit).toFixed(1).padEnd(14)} ${avg(notEnrolled, u => u.trainingDebit).toFixed(1).padEnd(14)}`);
  console.log(`   ${"Rata Luar".padEnd(22)} ${avg(enrolled, u => u.outsideDebit).toFixed(1).padEnd(14)} ${avg(notEnrolled, u => u.outsideDebit).toFixed(1).padEnd(14)}`);

  // ══════════════════════════════════════════════
  //  ANALISIS 2: PEMAKAIAN SAAT TRAINING vs LUAR
  // ══════════════════════════════════════════════
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📊 PEMAKAIAN SAAT TRAINING (${TRAINING_DATE}) vs LUAR TRAINING`);
  console.log("=".repeat(80));

  // Aggregate per app
  const appStats = new Map<string, { trainingDebit: number; outsideDebit: number; trainingUsers: Set<string>; outsideUsers: Set<string> }>();

  for (const tx of allTxs || []) {
    const app = tx.agent ? agentToApp.get(tx.agent) || "UNKNOWN" : "NO_AGENT";
    if (!appStats.has(app)) appStats.set(app, { trainingDebit: 0, outsideDebit: 0, trainingUsers: new Set(), outsideUsers: new Set() });
    const s = appStats.get(app)!;
    const amt = Math.abs(tx.amount ?? 0);
    const isDebit = tx.type === "debit" || (tx.amount ?? 0) < 0;
    if (!isDebit) continue;
    if (tx.created_at?.startsWith(TRAINING_DATE)) {
      s.trainingDebit += amt;
      s.trainingUsers.add(tx.user_id);
    } else {
      s.outsideDebit += amt;
      s.outsideUsers.add(tx.user_id);
    }
  }

  console.log(`\n${"Aplikasi".padEnd(18)} ${"Training Debit".padEnd(16)} ${"Training User".padEnd(14)} ${"Luar Debit".padEnd(14)} ${"Luar User".padEnd(12)} ${"Total Debit"}`);
  console.log("-".repeat(80));
  for (const [app, s] of [...appStats.entries()].sort((a, b) => (b[1].trainingDebit + b[1].outsideDebit) - (a[1].trainingDebit + a[1].outsideDebit))) {
    const total = s.trainingDebit + s.outsideDebit;
    console.log(`${app.padEnd(18)} ${String(s.trainingDebit).padEnd(16)} ${String(s.trainingUsers.size).padEnd(14)} ${String(s.outsideDebit).padEnd(14)} ${String(s.outsideUsers.size).padEnd(12)} ${String(total)}`);
  }

  // Per-user: training vs outside
  console.log(`\n📋 DETAIL PER PESERTA — TRAINING vs LUAR`);
  console.log(`\n${"Nama".padEnd(22)} ${"Email".padEnd(35)} ${"Saat Training".padEnd(14)} ${"Luar Training".padEnd(14)} ${"Total".padEnd(8)} ${"Aplikasi Training".padEnd(22)} ${"Aplikasi Luar"}`);
  console.log("-".repeat(120));
  for (const u of users.filter(u => u.totalDebit > 0).sort((a, b) => b.totalDebit - a.totalDebit)) {
    console.log(`${u.name.padEnd(22)} ${u.email.padEnd(35)} ${String(u.trainingDebit).padEnd(14)} ${String(u.outsideDebit).padEnd(14)} ${String(u.totalDebit).padEnd(8)} ${(u.trainingApps.join(", ") || "-").padEnd(22)} ${u.outsideApps.join(", ") || "-"}`);
  }

  // ══════════════════════════════════════════════
  //  ANALISIS 3: NON-USERS (never used)
  // ══════════════════════════════════════════════
  console.log(`\n${"=".repeat(80)}`);
  console.log("⚠️  PESERTA TIDAK PERNAH PAKAI CREDIT");
  console.log("=".repeat(80));

  const nonUsers = users.filter(u => u.totalDebit === 0);
  console.log(`\n${nonUsers.length}/${users.length} peserta (${(nonUsers.length/users.length*100).toFixed(0)}%) tidak pernah pakai`);
  console.log(`   ${"Email".padEnd(35)} ${"Terdaftar".padEnd(12)} ${"Punya NIB".padEnd(12)} ${"Credit Diberi"}`);
  console.log(`   ${"-".repeat(35)} ${"-".repeat(12)} ${"-".repeat(12)} ${"-".repeat(14)}`);
  for (const u of nonUsers) {
    console.log(`   ${u.email.padEnd(35)} ${(u.enrolled ? "✓" : "✗").padEnd(12)} ${(u.hasIdentity ? "✓" : "✗").padEnd(12)} ${String(u.totalCredit)}`);
  }

  // ══════════════════════════════════════════════
  //  KESIMPULAN
  // ══════════════════════════════════════════════
  console.log(`\n${"=".repeat(80)}`);
  console.log("📋 KESIMPULAN & REKOMENDASI");
  console.log("=".repeat(80));

  const enrolledActive = countActive(enrolled);
  const notEnrolledActive = countActive(notEnrolled);

  console.log(`\n🔍 PROFIL VS ADOPSI:`);
  console.log(`   1. Peserta terdaftar training: ${enrolledActive}/${enrolled.length} aktif (${(enrolledActive/enrolled.length*100).toFixed(0)}%)`);
  console.log(`      vs tidak terdaftar: ${notEnrolledActive}/${notEnrolled.length} aktif (${(notEnrolledActive/notEnrolled.length*100).toFixed(0)}%)`);
  if (withIdentity.length > 0) {
    const idActive = countActive(withIdentity);
    console.log(`   2. Punya NIB/identitas: ${idActive}/${withIdentity.length} aktif (${(idActive/withIdentity.length*100).toFixed(0)}%)`);
  }
  console.log(`   3. Rata-rata debit: ${avg(users, u => u.totalDebit).toFixed(1)} per peserta`);
  console.log(`   4. ${nonUsers.length} peserta (${(nonUsers.length/users.length*100).toFixed(0)}%) tidak pernah menyentuh credit sama sekali`);

  console.log(`\n📱 ADOPSI PER APLIKASI:`);
  for (const [app, s] of [...appStats.entries()].sort((a, b) => (b[1].trainingDebit + b[1].outsideDebit) - (a[1].trainingDebit + a[1].outsideDebit))) {
    const allUsers = new Set([...s.trainingUsers, ...s.outsideUsers]);
    console.log(`   ${app.padEnd(18)}: ${allUsers.size} pengguna, ${s.trainingDebit + s.outsideDebit} total debit (training: ${s.trainingDebit}, luar: ${s.outsideDebit})`);
  }

  console.log(`\n⏰ SAAT TRAINING VS LUAR:`);
  const totalTrainingDebit = users.reduce((s, u) => s + u.trainingDebit, 0);
  const totalOutsideDebit = users.reduce((s, u) => s + u.outsideDebit, 0);
  const trainingUsers = users.filter(u => u.trainingDebit > 0).length;
  const outsideUsers = users.filter(u => u.outsideDebit > 0).length;
  console.log(`   Saat training (${TRAINING_DATE}): ${totalTrainingDebit} debit, ${trainingUsers} pengguna`);
  console.log(`   Luar training: ${totalOutsideDebit} debit, ${outsideUsers} pengguna`);
  console.log(`   ${totalTrainingDebit > 0 ? `   ${(totalTrainingDebit/(totalTrainingDebit+totalOutsideDebit)*100).toFixed(0)}% pemakaian terjadi SAAT training` : "   Semua pemakaian terjadi di luar training"}`);

  // ── SAVE CSV ──
  const csvPath = "docs/laporan-analisis-bandung-barat.csv";
  const csvHeaders = ["Nama", "Email", "Terdaftar Training", "Punya NIB",
    "Total Credit", "Total Debit", "Training Debit", "Luar Debit",
    "Aplikasi di Training", "Aplikasi di Luar", "Apps Dipakai Semua"];
  const csvRows = users.sort((a, b) => b.totalDebit - a.totalDebit).map(u => [
    u.name, u.email, u.enrolled ? "Ya" : "Tidak", u.hasIdentity ? "Ya" : "Tidak",
    u.totalCredit, u.totalDebit, u.trainingDebit, u.outsideDebit,
    u.trainingApps.join("; ") || "-", u.outsideApps.join("; ") || "-",
    Object.entries(u.appDebit).filter(([, v]) => v > 0).map(([a]) => a).join("; ") || "-",
  ]);
  const csv = [csvHeaders.join(","), ...csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  fs.writeFileSync(csvPath, csv, "utf-8");
  console.log(`\n✅ CSV: ${csvPath}`);
}

main().catch(console.error);
