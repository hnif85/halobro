import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1M3NByLIi_Ibo3Afgax6anSrHMvjisGH49DpxKoXKI9U/export?format=csv&gid=1257348039";

function normalizePhone(raw: string): string | null {
  let p = raw.trim().replace(/[\s\-\(\)]/g, "");
  if (!p || p === "-" || p === "") return null;
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (!p.startsWith("62")) p = "62" + p;
  return p;
}

async function main() {
  console.log("\n📞 Update phone_number from Google Sheet → cms_customers\n");

  // 1. Fetch CSV
  console.log("⏳ Fetching sheet...");
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  console.log(`   ${lines.length - 1} rows found\n`);

  // 2. Parse phone by email
  const emailPhoneMap: Record<string, string> = {};
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const email = (cols[2] || "").trim().toLowerCase();
    const rawPhone = (cols[3] || "").trim();
    if (!email || !rawPhone || rawPhone === "-") {
      skipped++;
      continue;
    }
    const normalized = normalizePhone(rawPhone);
    if (normalized) emailPhoneMap[email] = normalized;
  }
  console.log(`   ${Object.keys(emailPhoneMap).length} phone numbers to update`);
  console.log(`   ${skipped} rows skipped (no email or no phone)\n`);

  // 3. Fetch existing customers by email
  const emails = Object.keys(emailPhoneMap);
  const BATCH = 50;
  const found: Array<{ email: string; guid: string; phone_number: string | null }> = [];

  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const { data } = await supabase
      .from("cms_customers")
      .select("guid, email, phone_number")
      .in("email", batch);
    for (const c of data || []) {
      if (c.email) found.push({ email: c.email.toLowerCase(), guid: c.guid, phone_number: c.phone_number });
    }
  }
  console.log(`   ${found.length} emails matched in cms_customers`);
  console.log(`   ${emails.length - found.length} emails NOT found in cms_customers\n`);

  // 4. Update phone number where different
  let updated = 0;
  let alreadyCorrect = 0;
  let failed = 0;

  for (const c of found) {
    const newPhone = emailPhoneMap[c.email];
    if (!newPhone) continue;
    if (c.phone_number === newPhone) {
      alreadyCorrect++;
      continue;
    }
    const { error } = await supabase
      .from("cms_customers")
      .update({ phone_number: newPhone })
      .eq("guid", c.guid);
    if (error) {
      console.error(`   ✗ ${c.email}: ${error.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log("\n=== RESULT ===");
  console.log(`   ✅ Updated:       ${updated}`);
  console.log(`   ⏭ Already correct: ${alreadyCorrect}`);
  console.log(`   ❌ Failed:        ${failed}`);
  console.log(`   👻 Not in DB:     ${emails.length - found.length}`);
  console.log();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

main().catch(console.error);
