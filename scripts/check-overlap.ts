import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  // Get enrolled emails
  const { data: event } = await supabase.from("training_events").select("id").eq("location", "Surakarta").maybeSingle();
  const { data: enrolled } = await supabase
    .from("training_enrollments")
    .select("email")
    .eq("event_id", event!.id);

  const enrolledEmails = new Set((enrolled || []).map(e => e.email?.toLowerCase()).filter(Boolean));
  console.log(`Enrolled emails: ${enrolledEmails.size}`);

  // Read participant emails
  const raw = fs.readFileSync("docs/pesertaSurakarta.csv", "utf-8").trim();
  const participantEmails = new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean));
  console.log(`Participant emails: ${participantEmails.size}`);

  // Find overlap
  const overlap = [...enrolledEmails].filter(e => participantEmails.has(e));
  console.log(`\nOverlap (participant yang terdaftar hadir): ${overlap.length}`);
  for (const e of overlap.slice(0, 10)) console.log(`  ${e}`);

  // Show some enrolled emails to understand the dataset
  console.log(`\nSample enrolled emails (first 10):`);
  for (const e of [...enrolledEmails].slice(0, 10)) console.log(`  ${e}`);

  // Check if participant IDs map differently
  // Maybe training_enrollments.user_guid maps to source_guid or something else
  const { data: enrollFull } = await supabase
    .from("training_enrollments")
    .select("*")
    .eq("event_id", event!.id)
    .limit(20);
  console.log(`\nSample enrollments with user_guid:`);
  for (const e of enrollFull || []) {
    // Check if this user_guid is in our cms_customers
    if (e.user_guid) {
      const { data: cust } = await supabase
        .from("cms_customers")
        .select("email")
        .eq("guid", e.user_guid)
        .maybeSingle();
      console.log(`  enrolled_email=${e.email} user_guid=${e.user_guid?.slice(0, 8)}... cms_match=${cust?.email || "NONE"}`);
    }
  }
}

main().catch(console.error);
