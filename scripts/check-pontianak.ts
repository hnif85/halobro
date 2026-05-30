import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH = 100;
const EVENT_DATE = "2026-05-12";

interface Customer {
  guid: string;
  email: string;
  full_name: string | null;
}

interface CreditTx {
  id: string;
  type: string | null;
  amount: number | null;
  agent: string | null;
  created_at: string;
}

interface Product {
  agent_id: string;
  app_name: string;
}

async function main() {
  // 1. Read Pontianak emails
  const emailsRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs", "pontianak_emails.json"), "utf-8")) as string[];
  console.log(`Total Pontianak emails from absensi: ${emailsRaw.length}`);

  // 2. Find in cms_customers
  const emailToCustomer = new Map<string, Customer>();
  for (let i = 0; i < emailsRaw.length; i += BATCH) {
    const batch = emailsRaw.slice(i, i + BATCH);
    const { data } = await supabase.from("cms_customers").select("guid, email, full_name").in("email", batch);
    for (const c of data || []) {
      if (c.email) emailToCustomer.set(c.email.toLowerCase(), c);
    }
  }
  console.log(`Found in cms_customers: ${emailToCustomer.size} / ${emailsRaw.length}`);
  const notFound = emailsRaw.filter(e => !emailToCustomer.has(e));
  console.log(`Not found in cms_customers: ${notFound.length}`);
  notFound.forEach(e => console.log(`  NOT FOUND: ${e}`));

  // 3. Get event ID for Pontianak
  const { data: events } = await supabase.from("training_events").select("id").eq("location", "Pontianak");
  const pontianakEventId = events?.[0]?.id;
  console.log(`Pontianak event ID: ${pontianakEventId}`);

  // 4. Check enrollment
  const enrolledSet = new Set<string>();
  if (pontianakEventId) {
    const { data: enrollments } = await supabase.from("training_enrollments").select("email, user_guid").eq("event_id", pontianakEventId);
    for (const e of enrollments || []) {
      if (e.email) enrolledSet.add(e.email.toLowerCase());
      // Also by user_guid
    }
  }
  const enrolledCount = [...emailToCustomer.values()].filter(c => enrolledSet.has(c.email)).length;
  console.log(`Enrolled in Pontianak event: ${enrolledCount} / ${emailToCustomer.size}`);

  // 5. Fetch credit_manager_transactions for all found users
  const guids = [...emailToCustomer.values()].map(c => c.guid);
  const guidToTx = new Map<string, CreditTx[]>();
  for (let i = 0; i < guids.length; i += BATCH) {
    const batch = guids.slice(i, i + BATCH);
    const { data } = await supabase
      .from("credit_manager_transactions")
      .select("id, user_id, type, amount, agent, created_at")
      .in("user_id", batch)
      .order("created_at", { ascending: false });
    for (const tx of data || []) {
      const list = guidToTx.get(tx.user_id) || [];
      list.push(tx);
      guidToTx.set(tx.user_id, list);
    }
  }

  // 6. Get agent → app_name mapping
  const agentIds = [...new Set([...guidToTx.values()].flat().map(t => t.agent).filter(Boolean))];
  const { data: products } = await supabase.from("products").select("agent_id, app_name").in("agent_id", agentIds).not("app_name", "is", null);
  const agentToApp = new Map<string, string>();
  for (const p of products || []) {
    if (p.agent_id && p.app_name) agentToApp.set(p.agent_id, p.app_name);
  }

  // 7. Analyze per user
  interface UserSummary {
    email: string;
    name: string | null;
    adaDiCms: boolean;
    terdaftarEvent: boolean;
    totalCredit: number;
    totalDebit: number;
    debitSebelumEvent: number;
    debitHariEvent: number;
    debitSetelahEvent: number;
    appsDigunakan: string[];
    adaPenggunaan: boolean;
  }

  const results: UserSummary[] = [];
  for (const email of emailsRaw) {
    const cust = emailToCustomer.get(email);
    if (!cust) {
      results.push({
        email,
        name: null,
        adaDiCms: false,
        terdaftarEvent: false,
        totalCredit: 0,
        totalDebit: 0,
        debitSebelumEvent: 0,
        debitHariEvent: 0,
        debitSetelahEvent: 0,
        appsDigunakan: [],
        adaPenggunaan: false,
      });
      continue;
    }

    const txs = guidToTx.get(cust.guid) || [];
    const appsSet = new Set<string>();
    let totalCredit = 0, totalDebit = 0;
    let debitBefore = 0, debitOn = 0, debitAfter = 0;

    for (const tx of txs) {
      const amt = Math.abs(tx.amount || 0);
      if (tx.type === "credit") {
        totalCredit += amt;
      } else {
        totalDebit += amt;
        const appName = tx.agent ? agentToApp.get(tx.agent) : null;
        if (appName) appsSet.add(appName);

        const txDate = tx.created_at?.slice(0, 10);
        if (txDate && txDate < EVENT_DATE) debitBefore += amt;
        else if (txDate === EVENT_DATE) debitOn += amt;
        else if (txDate && txDate > EVENT_DATE) debitAfter += amt;
      }
    }

    results.push({
      email,
      name: cust.full_name,
      adaDiCms: true,
      terdaftarEvent: enrolledSet.has(email),
      totalCredit,
      totalDebit,
      debitSebelumEvent: debitBefore,
      debitHariEvent: debitOn,
      debitSetelahEvent: debitAfter,
      appsDigunakan: [...appsSet],
      adaPenggunaan: totalDebit > 0,
    });
  }

  // 8. Print summary
  const denganPenggunaan = results.filter(r => r.adaPenggunaan);
  const tanpaPenggunaan = results.filter(r => r.adaDiCms && !r.adaPenggunaan);
  const tidakDiCms = results.filter(r => !r.adaDiCms);

  console.log("\n==========================================");
  console.log("SUMMARY PONTIANAK");
  console.log("==========================================");
  console.log(`Total absensi Pontianak: ${emailsRaw.length}`);
  console.log(`Ada di cms_customers: ${results.filter(r => r.adaDiCms).length}`);
  console.log(`Tidak ada di cms_customers: ${tidakDiCms.length}`);
  console.log(`Terdaftar event: ${results.filter(r => r.terdaftarEvent).length}`);
  console.log(`Ada penggunaan (debit): ${denganPenggunaan.length}`);
  console.log(`Tidak ada penggunaan: ${tanpaPenggunaan.length}`);

  console.log("\n--- Yang ADA PENGGUNAAN ---");
  for (const r of denganPenggunaan) {
    console.log(`${r.email} | Credit: ${r.totalCredit} | Debit total: ${r.totalDebit} (before: ${r.debitSebelumEvent}, on: ${r.debitHariEvent}, after: ${r.debitSetelahEvent}) | Apps: ${r.appsDigunakan.join(", ")} | Terdaftar: ${r.terdaftarEvent}`);
  }

  console.log("\n--- Yang TIDAK ADA PENGGUNAAN (tapi ada di cms) ---");
  for (const r of tanpaPenggunaan) {
    console.log(`${r.email} | Credit: ${r.totalCredit} | Terdaftar: ${r.terdaftarEvent}`);
  }

  console.log("\n--- TIDAK ADA DI CMS_CUSTOMERS ---");
  for (const r of tidakDiCms) {
    console.log(r.email);
  }

  // Save to CSV
  const csvLines = [
    "Email,Nama,AdaDiCms,TerdaftarEvent,TotalCredit,TotalDebit,DebitSebelumEvent,DebitHariEvent,DebitSetelahEvent,AppsDigunakan,AdaPenggunaan",
    ...results.map(r =>
      `"${r.email}","${r.name || ""}","${r.adaDiCms}","${r.terdaftarEvent}","${r.totalCredit}","${r.totalDebit}","${r.debitSebelumEvent}","${r.debitHariEvent}","${r.debitSetelahEvent}","${r.appsDigunakan.join("; ")}","${r.adaPenggunaan}"`
    )
  ];
  fs.writeFileSync(path.join(process.cwd(), "docs", "pontianak-analysis.csv"), csvLines.join("\n"), "utf-8");
  console.log("\nCSV saved to docs/pontianak-analysis.csv");
}

main().catch(console.error);
