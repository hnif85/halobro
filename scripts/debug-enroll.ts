import { createClient } from "@supabase/supabase-js";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  // Check events
  const { data: events } = await supabase.from("training_events").select("id, name, location, event_date");
  console.log("=== TRAINING EVENTS ===");
  for (const e of events || []) console.log(`  ${e.id} | ${e.name} | ${e.location} | ${e.event_date}`);

  // Check enrollments for Surakarta
  const surakarta = (events || []).find(e => e.location?.toLowerCase().includes("surakarta"));
  if (surakarta) {
    console.log(`\n=== ENROLLMENTS for ${surakarta.name} (${surakarta.id}) ===`);
    const { data: enroll } = await supabase
      .from("training_enrollments")
      .select("*")
      .eq("event_id", surakarta.id)
      .limit(5);
    console.log(`Total: ${enroll?.length || 0}`);
    for (const e of enroll || []) console.log(`  ${JSON.stringify(e)}`);

    // Check if user_guid matches any cms_customers.guid
    const guids = [...new Set((enroll || []).map(e => e.user_guid).filter(Boolean))];
    if (guids.length > 0) {
      const { data: cms } = await supabase
        .from("cms_customers")
        .select("guid, email, full_name")
        .in("guid", guids)
        .limit(5);
      console.log(`\nMatching cms_customers for enrolled user_guids:`);
      for (const c of cms || []) console.log(`  ${c.guid} | ${c.email} | ${c.full_name}`);
      console.log(`Found: ${cms?.length || 0} / ${guids.length}`);
    }

    // Check event_registrations
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("email, full_name, status")
      .eq("event_id", surakarta.id)
      .limit(5);
    console.log(`\n=== EVENT REGISTRATIONS (sample 5) ===`);
    console.log(`Found: ${regs?.length || 0}`);
    for (const r of regs || []) console.log(`  ${r.email} | ${r.full_name} | ${r.status}`);
  }

  // Check cms_customers for city/industry data
  const { data: sample } = await supabase
    .from("cms_customers")
    .select("guid, email, city, industry_name")
    .not("city", "is", null)
    .limit(5);
  console.log(`\n=== CMS CUSTOMERS WITH CITY DATA (sample 5) ===`);
  console.log(`Found: ${sample?.length || 0}`);
  for (const c of sample || []) console.log(`  ${c.email} | city=${c.city} | industry=${c.industry_name}`);
}

main().catch(console.error);
