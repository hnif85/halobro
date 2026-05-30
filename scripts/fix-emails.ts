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
  const emails = [...new Set(raw.split("\n").slice(1).map((l) => l.trim().toLowerCase()).filter(Boolean))];

  const { data: customers } = await supabase
    .from("cms_customers")
    .select("email")
    .in("email", emails);

  const found = new Set((customers || []).map((c) => c.email.toLowerCase()));
  const missing = emails.filter((e) => !found.has(e));

  console.log("=== EMAIL TIDAK DITEMUKAN DI cms_customers ===");
  for (const e of missing) {
    console.log(`  ${e}`);
    // Try common fixes
    const fixes = [
      e.replace("@gmai.com", "@gmail.com"),
      e.replace("@gmail.con", "@gmail.com"),
      e.replace("@yahoo.co.id", "@yahoo.com"),
      e.replace("@yaho.co.id", "@yahoo.com"),
      e.replace("@gmail.c", "@gmail.com"),
      e.replace("@yahoo.c", "@yahoo.com"),
    ];
    for (const f of [...new Set(fixes)].filter((x) => x !== e)) {
      const { data: check } = await supabase
        .from("cms_customers")
        .select("email, guid, full_name")
        .eq("email", f)
        .maybeSingle();
      if (check) {
        console.log(`     → FIX: ${f} → ${check.full_name || "?"} (${check.guid})`);
      }
    }
  }
}

main().catch(console.error);
