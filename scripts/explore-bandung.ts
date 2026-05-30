import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  // 1. Check Kab. Bandung Barat event
  const { data: events } = await supabase
    .from("training_events")
    .select("id, name, location, event_date")
    .ilike("location", "%bandung%");
  console.log("=== EVENT KAB. BANDUNG BARAT ===");
  for (const e of events || []) console.log(`  ${e.id} | ${e.name} | ${e.location} | ${e.event_date}`);

  const event = (events || [])[0];
  if (!event) { console.log("Event not found!"); return; }

  // 2. Check enrollments
  const { data: enrolled } = await supabase
    .from("training_enrollments")
    .select("email, user_guid, created_at")
    .eq("event_id", event.id);
  console.log(`\nEnrollments: ${enrolled?.length || 0}`);

  const enrolledEmails = new Set((enrolled || []).map(e => e.email?.toLowerCase()).filter(Boolean));

  // 3. Read participant emails
  const raw = fs.readFileSync("docs/pesertaKabBandungBarat.csv", "utf-8").trim();
  const participantEmails = new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean));
  console.log(`Participant emails: ${participantEmails.size}`);

  // 4. Overlap
  const overlap = [...enrolledEmails].filter(e => participantEmails.has(e));
  console.log(`\nOverlap: ${overlap.length}`);
  for (const e of overlap.slice(0, 10)) console.log(`  ${e}`);

  // 5. Check all profile-related data for these participants
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, email, full_name, city, industry_name, identity_number, is_identity_verified, solution_corporate_needs, is_free_trial_use, subscribe_list")
    .in("email", [...participantEmails]);
  console.log(`\nCustomers with data: ${customers?.length || 0}`);

  // Check which profile fields are filled
  let withIdentity = 0, withCity = 0, withIndustry = 0, withSolution = 0, withTrial = 0;
  for (const c of customers || []) {
    if (c.identity_number) withIdentity++;
    if (c.city) withCity++;
    if (c.industry_name) withIndustry++;
    if (c.solution_corporate_needs) withSolution++;
    if (c.is_free_trial_use) withTrial++;
  }
  console.log(`  identity_number terisi: ${withIdentity}/${customers?.length}`);
  console.log(`  city terisi: ${withCity}/${customers?.length}`);
  console.log(`  industry_name terisi: ${withIndustry}/${customers?.length}`);
  console.log(`  solution_corporate_needs terisi: ${withSolution}/${customers?.length}`);
  console.log(`  is_free_trial_use: ${withTrial}/${customers?.length}`);

  // Sample some profile data
  const filled = (customers || []).filter(c => c.city || c.industry_name || c.identity_number || c.solution_corporate_needs);
  console.log(`\nSample with profile data (${filled.length}):`);
  for (const c of filled.slice(0, 5)) {
    console.log(`  ${c.email}: city=${c.city}, industry=${c.industry_name}, identity=${c.identity_number ? "✓" : "✗"}, solution=${c.solution_corporate_needs?.slice(0, 30) || "-"}, trial=${c.is_free_trial_use}`);
  }

  // 6. Check event_registrations for this event
  const { data: regs } = await supabase
    .from("event_registrations")
    .select("email, full_name, business_name, business_line, monthly_net_profit, team_size, has_separate_account, whiz_solution_needed, city")
    .eq("event_id", event.id)
    .limit(5);
  console.log(`\nEvent registrations: ${regs?.length || 0}`);
  if (regs?.length) console.log("Sample:", JSON.stringify(regs[0], null, 2));

  // 7. Check profile table for these customers
  const guids = (customers || []).map(c => c.guid);
  const { data: profiles } = await supabase
    .from("profile")
    .select("customer_guid, classification, model_training, training_name, credit_usage, latest_balance, total_credit_tx, total_debit_tx")
    .in("customer_guid", guids)
    .limit(5);
  console.log(`\nProfile table: ${profiles?.length || 0}`);

  // 8. Check baseline_umkm_profiles 
  // These are linked by company_id, which we don't have directly from cms_customers
  // But app_users has customer_guid
  const { data: appUsers } = await supabase
    .from("app_users")
    .select("id, customer_guid, email, full_name, company_id")
    .in("customer_guid", guids)
    .limit(5);
  console.log(`\nApp users linked: ${appUsers?.length || 0}`);
  if (appUsers?.length) {
    const companyIds = [...new Set(appUsers.map(a => a.company_id).filter(Boolean))];
    const { data: umkm } = await supabase
      .from("baseline_umkm_profiles")
      .select("app_user_id, brand_name, business_type, readiness_score, process_score, business_score, ai_usage_freq")
      .in("company_id", companyIds)
      .limit(5);
    console.log(`Baseline UMKM profiles: ${umkm?.length || 0}`);
    if (umkm?.length) console.log("Sample:", JSON.stringify(umkm[0], null, 2));
  }
}

main().catch(console.error);
