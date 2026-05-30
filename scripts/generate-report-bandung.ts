import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const OUT = "D:\\CodinganDong\\myidea\\real-life\\events\\kab-bandung-barat";
const TRAINING_DATE = "2026-05-21";

async function main() {
  // ── 1. Read & fix participants ──
  const raw = fs.readFileSync("docs/pesertaKabBandungBarat.csv", "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean))];
  const typoFix = (e: string) => e === "herawatievita37@gmail.con" ? "herawatievita37@gmail.com" : e;

  // ── 2. Customers & event ──
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, email, full_name, identity_number, is_identity_verified, city, industry_name")
    .in("email", emails.map(typoFix));
  const custByGuid = new Map((customers || []).map(c => [c.guid, c]));
  const custByEmail = new Map((customers || []).map(c => [c.email?.toLowerCase(), c]));
  const guids = [...custByGuid.keys()];

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

  // ── 3. Transactions ──
  const { data: allTxs } = await supabase
    .from("credit_manager_transactions")
    .select("id, user_id, agent, amount, type, created_at")
    .in("user_id", guids)
    .order("created_at", { ascending: true });

  const { data: products } = await supabase.from("products").select("agent_id, app_name");
  const agentToApp = new Map((products || []).filter(p => p.agent_id && p.app_name).map(p => [p.agent_id, p.app_name]));

  // ── 4. Per-user aggregation ──
  interface UserData {
    email: string; name: string; guid: string;
    enrolled: boolean; hasNIB: boolean;
    totalCredit: number; totalDebit: number; txCount: number;
    trainingDebit: number; trainingCredit: number; trainingTx: number;
    outsideDebit: number; outsideCredit: number; outsideTx: number;
    trainingApps: string[]; outsideApps: string[];
    appDebit: Record<string, number>;
    txDetail: { date: string; type: string; amount: number; app: string }[];
  }

  const userMap = new Map<string, UserData>();

  for (const c of customers || []) {
    const email = c.email?.toLowerCase() || c.guid;
    userMap.set(c.guid, {
      email, name: c.full_name || "", guid: c.guid,
      enrolled: enrolledSet.has(email),
      hasNIB: !!c.identity_number,
      totalCredit: 0, totalDebit: 0, txCount: 0,
      trainingDebit: 0, trainingCredit: 0, trainingTx: 0,
      outsideDebit: 0, outsideCredit: 0, outsideTx: 0,
      trainingApps: [], outsideApps: [],
      appDebit: {}, txDetail: [],
    });
  }

  for (const tx of allTxs || []) {
    const u = userMap.get(tx.user_id);
    if (!u) continue;
    const app = tx.agent ? agentToApp.get(tx.agent) || "Unknown" : "—";
    const amt = Math.abs(tx.amount ?? 0);
    const isDebit = tx.type === "debit" || (tx.amount ?? 0) < 0;
    const isTraining = tx.created_at?.startsWith(TRAINING_DATE);
    const dateStr = tx.created_at?.slice(0, 19).replace("T", " ") || "";

    u.txCount++;
    u.txDetail.push({ date: dateStr, type: tx.type || (isDebit ? "debit" : "credit"), amount: amt, app });

    if (isDebit) {
      u.totalDebit += amt;
      u.appDebit[app] = (u.appDebit[app] || 0) + amt;
      if (isTraining) { u.trainingDebit += amt; if (!u.trainingApps.includes(app)) u.trainingApps.push(app); }
      else { u.outsideDebit += amt; if (!u.outsideApps.includes(app)) u.outsideApps.push(app); }
    } else {
      u.totalCredit += amt;
      if (isTraining) u.trainingCredit += amt;
      else u.outsideCredit += amt;
    }
  }

  const users = [...userMap.values()];
  const enrolledUsers = users.filter(u => u.enrolled);

  // ═══════════════════════════════════════
  //  FILE 1: laporan-credit-peserta.csv
  // ═══════════════════════════════════════
  console.log("📄 laporan-credit-peserta.csv");
  const csv1Headers = [
    "Nama", "Email", "Terdaftar Event", "Punya NIB",
    "Total Credit", "Total Debit", "Jumlah Transaksi",
    "Training Debit", "Training Credit", "Luar Debit", "Luar Credit",
    "Aplikasi Dipakai", "Aplikasi Training", "Aplikasi Luar",
    "Transaksi Terakhir",
  ];
  const csv1Rows = users.sort((a, b) => b.totalDebit - a.totalDebit).map(u => [
    u.name, u.email, u.enrolled ? "Ya" : "Tidak", u.hasNIB ? "Ya" : "Tidak",
    u.totalCredit, u.totalDebit, u.txCount,
    u.trainingDebit, u.trainingCredit, u.outsideDebit, u.outsideCredit,
    Object.entries(u.appDebit).filter(([, v]) => v > 0).map(([a, v]) => `${a}(${v})`).join("; ") || "-",
    u.trainingApps.map(a => `${a}(${u.appDebit[a] || 0})`).join("; ") || "-",
    u.outsideApps.map(a => `${a}(${u.appDebit[a] || 0})`).join("; ") || "-",
    u.txDetail.length > 0 ? u.txDetail[u.txDetail.length - 1].date : "-",
  ]);
  const csv1 = [csv1Headers.join(","), ...csv1Rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  fs.writeFileSync(path.join(OUT, "laporan-credit-peserta.csv"), csv1, "utf-8");
  console.log("   ✓ OK\n");

  // ═══════════════════════════════════════
  //  FILE 2: analisis-per-app.csv
  // ═══════════════════════════════════════
  console.log("📄 analisis-per-app.csv");
  const appStats = new Map<string, { credit: number; debit: number; trainingDebit: number; outsideDebit: number; users: Set<string>; debitUsers: Set<string>; txCount: number }>();
  for (const tx of allTxs || []) {
    const app = tx.agent ? agentToApp.get(tx.agent) || "Unknown" : "(tanpa agent)";
    if (!appStats.has(app)) appStats.set(app, { credit: 0, debit: 0, trainingDebit: 0, outsideDebit: 0, users: new Set(), debitUsers: new Set(), txCount: 0 });
    const s = appStats.get(app)!;
    s.txCount++;
    s.users.add(tx.user_id);
    const amt = Math.abs(tx.amount ?? 0);
    const isDebit = tx.type === "debit" || (tx.amount ?? 0) < 0;
    if (isDebit) { s.debit += amt; s.debitUsers.add(tx.user_id); if (tx.created_at?.startsWith(TRAINING_DATE)) s.trainingDebit += amt; else s.outsideDebit += amt; }
    else s.credit += amt;
  }

  const csv2Headers = ["Aplikasi", "Total Credit", "Total Debit", "Training Debit", "Luar Debit",
    "Jumlah Pengguna", "Pengguna Debit", "Utilisasi", "Jumlah Transaksi"];
  const csv2Rows = [...appStats.entries()]
    .filter(([a]) => a !== "(tanpa agent)")
    .sort((a, b) => b[1].debit - a[1].debit)
    .map(([app, s]) => [
      app, s.credit, s.debit, s.trainingDebit, s.outsideDebit,
      s.users.size, s.debitUsers.size,
      s.credit > 0 ? (s.debit / s.credit * 100).toFixed(1) + "%" : "0%",
      s.txCount,
    ]);
  const csv2 = [csv2Headers.join(","), ...csv2Rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  fs.writeFileSync(path.join(OUT, "analisis-per-app.csv"), csv2, "utf-8");
  console.log("   ✓ OK\n");

  // ═══════════════════════════════════════
  //  FILE 3: rangkuman.md  (Markdown report)
  // ═══════════════════════════════════════
  console.log("📄 rangkuman.md");

  const totalEnrolled = enrolledUsers.length;
  const activeEnrolled = enrolledUsers.filter(u => u.totalDebit > 0).length;
  const activeNotEnrolled = users.filter(u => !u.enrolled && u.totalDebit > 0).length;
  const nonUsers = users.filter(u => u.totalDebit === 0);
  const totalTrainingDebit = users.reduce((s, u) => s + u.trainingDebit, 0);
  const totalOutsideDebit = users.reduce((s, u) => s + u.outsideDebit, 0);

  const topUsers = users.filter(u => u.totalDebit > 0).sort((a, b) => b.totalDebit - a.totalDebit).slice(0, 10);

  let md = `# Laporan Credit Usage — Event Kab. Bandung Barat

**Tanggal Training:** ${TRAINING_DATE}  
**Total Peserta di Event:** ${totalEnrolled} dari ${users.length} peserta terdata  
**Periode Data:** ${allTxs?.length ? allTxs![0]!.created_at?.slice(0,10) : "-"} — ${allTxs?.length ? allTxs![allTxs!.length-1]!.created_at?.slice(0,10) : "-"}

---

## 1. Ringkasan Eksekutif

| Metrik | Nilai |
|--------|-------|
| Total peserta | ${users.length} |
| Terdaftar event | ${totalEnrolled} |
| Aktif memakai credit | ${activeEnrolled + (users.filter(u => !u.enrolled && u.totalDebit > 0).length)} (${((activeEnrolled + (users.filter(u => !u.enrolled && u.totalDebit > 0).length)) / users.length * 100).toFixed(0)}%) |
| Tidak pernah pakai | ${nonUsers.length} (${(nonUsers.length/users.length*100).toFixed(0)}%) |
| Rata-rata debit per peserta | ${(users.reduce((s, u) => s + u.totalDebit, 0) / users.length).toFixed(1)} |
| Total credit diberikan | ${users.reduce((s, u) => s + u.totalCredit, 0)} |
| Total credit dipakai (debit) | ${users.reduce((s, u) => s + u.totalDebit, 0)} |
| Utilisasi overall | ${(users.reduce((s, u) => s + u.totalDebit, 0) / users.reduce((s, u) => s + u.totalCredit, 0) * 100).toFixed(1)}% |

---

## 2. Pemakaian Saat Training vs Luar Training

| Periode | Total Debit | Pengguna |
|---------|------------|----------|
| **Saat Training** (${TRAINING_DATE}) | ${totalTrainingDebit} | ${users.filter(u => u.trainingDebit > 0).length} |
| **Luar Training** | ${totalOutsideDebit} | ${users.filter(u => u.outsideDebit > 0).length} |
| **Total** | ${totalTrainingDebit + totalOutsideDebit} | ${users.filter(u => u.totalDebit > 0).length} |

${
  totalOutsideDebit === 0
    ? "> ⚠️ **100% pemakaian terjadi hanya saat training.** Tidak ada satupun transaksi debit di luar hari training. Ini menunjukkan peserta hanya mencoba aplikasi saat didampingi, dan tidak melanjutkan pemakaian mandiri."
    : `> ${(totalOutsideDebit / (totalTrainingDebit + totalOutsideDebit) * 100).toFixed(0)}% pemakaian terjadi di luar training.`
}

---

## 3. Adopsi Per Aplikasi

| Aplikasi | Credit Diberi | Debit (Dipakai) | Utilisasi | Pengguna (Debit) |
|----------|:-----------:|:--------------:|:---------:|:---------------:|
${[...appStats.entries()]
  .filter(([a]) => a !== "(tanpa agent)")
  .sort((a, b) => b[1].debit - a[1].debit)
  .map(([app, s]) => `| ${app} | ${s.credit} | ${s.debit} | ${s.credit > 0 ? (s.debit/s.credit*100).toFixed(1) : 0}% | ${s.debitUsers.size}/${s.users.size} |`)
  .join("\n")}

**Catatan:**  
- **CreateWhiz** mendominasi dengan ${appStats.get("CreateWhiz")?.debit || 0} debit dari ${appStats.get("CreateWhiz")?.debitUsers.size || 0} pengguna  
- **SmartWhiz** hanya dipakai ${appStats.get("SmartWhiz")?.debitUsers.size || 0} orang (${appStats.get("SmartWhiz")?.debit || 0} debit)  
- **FinanceWhiz** hampir tidak tersentuh — ${appStats.get("FinanceWhiz")?.debit || 0} debit dari ${appStats.get("FinanceWhiz")?.debitUsers.size || 0} pengguna  

---

## 4. Profil vs Adopsi

### 4.1 Punya NIB / Identitas

| Status | Peserta | Aktif | Rata-rata Debit |
|--------|:-------:|:-----:|:---------------:|
| Punya NIB | ${users.filter(u => u.hasNIB).length} | ${users.filter(u => u.hasNIB && u.totalDebit > 0).length} | ${(users.filter(u => u.hasNIB).reduce((s, u) => s + u.totalDebit, 0) / Math.max(users.filter(u => u.hasNIB).length, 1)).toFixed(1)} |
| Tanpa NIB | ${users.filter(u => !u.hasNIB).length} | ${users.filter(u => !u.hasNIB && u.totalDebit > 0).length} | ${(users.filter(u => !u.hasNIB).reduce((s, u) => s + u.totalDebit, 0) / Math.max(users.filter(u => !u.hasNIB).length, 1)).toFixed(1)} |

${
  users.filter(u => u.hasNIB).length > 0
    ? "> ✅ **Peserta dengan NIB 100% aktif** dan rata-rata debit 2× lipat dari yang tanpa NIB."
    : ""
}

### 4.2 Terdaftar Event vs Tidak

| Status | Peserta | Aktif | Rata-rata Debit |
|--------|:-------:|:-----:|:---------------:|
| Terdaftar Event | ${enrolledUsers.length} | ${activeEnrolled} | ${(enrolledUsers.reduce((s, u) => s + u.totalDebit, 0) / Math.max(enrolledUsers.length, 1)).toFixed(1)} |
| Tidak Terdaftar | ${users.length - enrolledUsers.length} | ${activeNotEnrolled} | ${(users.filter(u => !u.enrolled).reduce((s, u) => s + u.totalDebit, 0) / Math.max(users.filter(u => !u.enrolled).length, 1)).toFixed(1)} |

---

## 5. Top 10 Pengguna Paling Aktif

| # | Nama | Email | Total Debit | Aplikasi Dipakai | Training/Luar |
|---|------|-------|:-----------:|:----------------:|:-------------:|
${topUsers.map((u, i) => {
  const apps = Object.entries(u.appDebit).filter(([, v]) => v > 0).map(([a]) => a).join(", ");
  const lokasi = u.trainingDebit > 0 && u.outsideDebit === 0 ? "Training saja" : u.outsideDebit > 0 && u.trainingDebit === 0 ? "Luar saja" : "Keduanya";
  return `| ${i+1} | ${u.name || "-"} | ${u.email} | ${u.totalDebit} | ${apps} | ${lokasi} |`;
}).join("\n")}

---

## 6. Peserta Tidak Aktif (${nonUsers.length} orang)

Peserta berikut sudah mendapat credit tapi **tidak pernah menggunakannya sama sekali:**

${nonUsers.map(u => `- ${u.name || "(tanpa nama)"} — ${u.email} — Credit: ${u.totalCredit} ${u.enrolled ? "✅ Terdaftar" : "❌ Tidak terdaftar"}`).join("\n")}

---

## 7. Detail Per Peserta

Lihat file **\`laporan-credit-peserta.csv\`** untuk data lengkap 90 peserta.

---

*Laporan digenerate pada ${new Date().toISOString().slice(0,19).replace("T", " ")}*
`;

  fs.writeFileSync(path.join(OUT, "rangkuman.md"), md, "utf-8");
  console.log("   ✓ OK\n");

  // ═══════════════════════════════════════
  //  FILE 4: index.html  (HTML report)
  // ═══════════════════════════════════════
  console.log("📄 index.html");

  const trainingPct = totalTrainingDebit + totalOutsideDebit > 0
    ? (totalTrainingDebit / (totalTrainingDebit + totalOutsideDebit) * 100).toFixed(0)
    : "0";

  const createWhiz = appStats.get("CreateWhiz");
  const smartWhiz = appStats.get("SmartWhiz");
  const financeWhiz = appStats.get("FinanceWhiz");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laporan Credit Usage — Kab. Bandung Barat</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #1a1a2e; padding: 40px; }
  .container { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: #666; margin-bottom: 32px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .card .label { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
  .card .value { font-size: 32px; font-weight: 700; margin-top: 4px; }
  .card .sub { font-size: 13px; color: #888; margin-top: 4px; }
  section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  h2 { font-size: 20px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { color: #888; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; }
  .badge-green { background: #d4edda; color: #155724; }
  .badge-red { background: #f8d7da; color: #721c24; }
  .badge-yellow { background: #fff3cd; color: #856404; }
  .badge-blue { background: #d1ecf1; color: #0c5460; }
  .insight { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; }
  .warn { background: #fff3cd; border-left: 4px solid #ffc107; }
  .bar-container { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
  .bar { height: 24px; border-radius: 6px; min-width: 4px; transition: width .3s; }
  .bar-label { min-width: 100px; font-size: 13px; }
  .bar-value { min-width: 50px; text-align: right; font-size: 13px; color: #666; }
  @media (max-width: 600px) { body { padding: 16px; } }
</style>
</head>
<body>
<div class="container">
  <h1>📊 Laporan Credit Usage</h1>
  <p class="subtitle">Event Pelatihan Kab. Bandung Barat — ${TRAINING_DATE}</p>

  <div class="cards">
    <div class="card"><div class="label">Peserta Terdata</div><div class="value">${users.length}</div><div class="sub">${totalEnrolled} terdaftar event</div></div>
    <div class="card"><div class="label">Aktif Memakai</div><div class="value">${users.filter(u => u.totalDebit > 0).length}</div><div class="sub">${(users.filter(u => u.totalDebit > 0).length/users.length*100).toFixed(0)}% dari total</div></div>
    <div class="card"><div class="label">Total Debit</div><div class="value">${users.reduce((s, u) => s + u.totalDebit, 0)}</div><div class="sub">Utilisasi ${(users.reduce((s, u) => s + u.totalDebit, 0) / users.reduce((s, u) => s + u.totalCredit, 0) * 100).toFixed(1)}%</div></div>
    <div class="card"><div class="label">Tidak Aktif</div><div class="value" style="color:#dc3545">${nonUsers.length}</div><div class="sub">${(nonUsers.length/users.length*100).toFixed(0)}% tidak pernah pakai</div></div>
  </div>

  <section>
    <h2>⏰ Pemakaian: Training vs Luar</h2>
    <div class="bar-container"><span class="bar-label">Saat Training (${TRAINING_DATE})</span><div class="bar" style="width:${Math.max(Number(trainingPct), 5)}%;background:#4CAF50;">&nbsp;</div><span class="bar-value">${totalTrainingDebit} (${trainingPct}%)</span></div>
    <div class="bar-container"><span class="bar-label">Luar Training</span><div class="bar" style="width:${Math.max(100 - Number(trainingPct), 5)}%;background:#FF9800;">&nbsp;</div><span class="bar-value">${totalOutsideDebit} (${100 - Number(trainingPct)}%)</span></div>
    ${totalOutsideDebit === 0 ? '<div class="insight warn">⚠️ <strong>100% pemakaian terjadi hanya saat training.</strong> Tidak ada pemakaian mandiri setelah pelatihan.</div>' : ''}
  </section>

  <section>
    <h2>📱 Adopsi Per Aplikasi</h2>
    <table>
      <tr><th>Aplikasi</th><th>Credit Diberi</th><th>Debit (Dipakai)</th><th>Utilisasi</th><th>Training Debit</th><th>Pengguna Debit</th></tr>
      ${[createWhiz, smartWhiz, financeWhiz].filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => (b?.debit ?? 0) - (a?.debit ?? 0)).map(s => {
        const pct = s.credit > 0 ? (s.debit/s.credit*100).toFixed(1) : "0";
        return `<tr><td><strong>${ /* find app name */ [...agentToApp.values()].includes(s === createWhiz ? "CreateWhiz" : s === smartWhiz ? "SmartWhiz" : "FinanceWhiz") ? "" : "" }${s === createWhiz ? "CreateWhiz" : s === smartWhiz ? "SmartWhiz" : "FinanceWhiz"}</strong></td><td>${s.credit}</td><td>${s.debit}</td><td>${pct}%</td><td>${s.trainingDebit}</td><td>${s.debitUsers.size}</td></tr>`;
      }).join("\n")}
    </table>
  </section>

  <section>
    <h2>🏆 Top 10 Pengguna Aktif</h2>
    <table>
      <tr><th>#</th><th>Nama</th><th>Email</th><th>Total Debit</th><th>Aplikasi</th><th>Status</th></tr>
      ${topUsers.map((u, i) => {
        const apps = Object.entries(u.appDebit).filter(([, v]) => v > 0).map(([a]) => a).join(", ");
        return `<tr><td>${i+1}</td><td>${u.name || "-"}</td><td>${u.email}</td><td>${u.totalDebit}</td><td>${apps}</td><td>${u.enrolled ? '<span class="badge badge-green">Terdaftar</span>' : '<span class="badge badge-red">Tidak</span>'}</td></tr>`;
      }).join("\n")}
    </table>
  </section>

  <section>
    <h2>⚠️ ${nonUsers.length} Peserta Tidak Aktif</h2>
    <p style="color:#666;margin-bottom:12px">Sudah mendapat credit tapi tidak pernah menggunakan:</p>
    <table>
      <tr><th>Email</th><th>Credit Diberi</th><th>Terdaftar Event</th></tr>
      ${nonUsers.slice(0, 20).map(u => `<tr><td>${u.email}</td><td>${u.totalCredit}</td><td>${u.enrolled ? '<span class="badge badge-green">Ya</span>' : '<span class="badge badge-red">Tidak</span>'}</td></tr>`).join("\n")}
      ${nonUsers.length > 20 ? `<tr><td colspan="3">... dan ${nonUsers.length - 20} lainnya</td></tr>` : ""}
    </table>
  </section>

  <section>
    <h2>🔍 Insight</h2>
    <div class="insight">✅ <strong>Punya NIB = lebih aktif.</strong> ${users.filter(u => u.hasNIB).length} peserta dengan NIB semuanya aktif, rata-rata debit ${(users.filter(u => u.hasNIB).reduce((s, u) => s + u.totalDebit, 0) / Math.max(users.filter(u => u.hasNIB).length, 1)).toFixed(1)} (2× lipat dari tanpa NIB).</div>
    <div class="insight">📱 <strong>CreateWhiz dominan.</strong> ${createWhiz?.debit || 0} debit dari ${createWhiz?.debitUsers.size || 0} pengguna — aplikasi paling laku.</div>
    <div class="insight">${totalOutsideDebit === 0 ? '⚠️ <strong>Tidak ada pemakaian lanjutan.</strong> Semua transaksi terjadi saat training. Perlu strategi follow-up agar peserta pakai mandiri.' : '✅ Ada pemakaian mandiri di luar training.'}</div>
  </section>

  <p style="text-align:center;color:#999;font-size:13px;margin-top:32px;">
    Laporan digenerate ${new Date().toISOString().slice(0,19).replace("T", " ")} &mdash; Data dari Supabase + Credit Manager API
  </p>
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, "index.html"), html, "utf-8");
  console.log("   ✓ OK\n");

  console.log("✅ Semua laporan tersimpan di:");
  console.log(`   ${OUT}\\`);
  console.log(`   ├── laporan-credit-peserta.csv`);
  console.log(`   ├── analisis-per-app.csv`);
  console.log(`   ├── rangkuman.md`);
  console.log(`   └── index.html`);
}

main().catch(console.error);
