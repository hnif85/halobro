import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(
  "https://udupiblnzlzjmaafvdtv.supabase.co",
  SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  // 1. Read participants
  const raw = fs.readFileSync("docs/pesertaSurakarta.csv", "utf-8").trim();
  const emails = [...new Set(raw.split("\n").slice(1).map(l => l.trim().toLowerCase()).filter(Boolean))];

  // 2. Get customers
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, email, full_name, city, industry_name, solution_corporate_needs, is_free_trial_use")
    .in("email", emails);
  const custMap = new Map((customers || []).map(c => [c.guid, c]));
  const guids = [...custMap.keys()];
  console.log(`Customers: ${guids.length}\n`);

  // 3. Check profile table
  const { data: profiles } = await supabase
    .from("profile")
    .select("*")
    .in("customer_guid", guids);
  console.log(`Profile rows: ${profiles?.length || 0}`);
  if (profiles?.length) {
    console.log("Sample:", JSON.stringify(profiles[0], null, 2));
  }

  // 4. Check tmp_training_data
  const { data: tmp } = await supabase
    .from("tmp_training_data")
    .select("*")
    .in("guid", guids);
  console.log(`\ntmp_training_data rows: ${tmp?.length || 0}`);
  if (tmp?.length) {
    const sample = { ...tmp[0] };
    console.log("Keys:", Object.keys(sample).join(", "));
    console.log("Sample (selected):", JSON.stringify({
      nama: sample.nama, email: sample.email, model_training: sample.model_training,
      klasifikasi: sample.klasifikasi, credit_usage: sample.credit_usage,
      latest_balance: sample.latest_balance, total_credit_tx: sample.total_credit_tx,
      total_debit_tx: sample.total_debit_tx, partner: sample.partner,
      hasil_feedback: sample.hasil_feedback, akun_aktif_expired: sample.akun_aktif_expired,
      solusi_crmwhiz: sample.solusi_crmwhiz, solusi_smartwhiz: sample.solusi_smartwhiz,
      solusi_createwhiz: sample.solusi_createwhiz, solusi_financewhiz: sample.solusi_financewhiz
    }, null, 2));
  }

  // 5. Check credit_manager_users
  const { data: cmUsers } = await supabase
    .from("credit_manager_users")
    .select("*")
    .in("email", emails);
  console.log(`\ncredit_manager_users rows: ${cmUsers?.length || 0}`);
  if (cmUsers?.length) console.log("Sample:", JSON.stringify(cmUsers[0]));

  // 6. Check app_usage_logs for these users
  const { data: appLogs } = await supabase
    .from("app_usage_logs")
    .select("user_id, event_type, event_name, created_at")
    .in("user_id", guids)
    .limit(5);
  console.log(`\napp_usage_logs for participants: ${appLogs?.length || 0}`);
  if (appLogs?.length) console.log("Sample:", JSON.stringify(appLogs[0]));

  // 7. Check crm_lead_pipeline
  const { data: pipeline } = await supabase
    .from("crm_lead_pipeline")
    .select("customer_guid, agent_id, tier, segmen, status")
    .in("customer_guid", guids)
    .limit(5);
  console.log(`\ncrm_lead_pipeline for participants: ${pipeline?.length || 0}`);
  if (pipeline?.length) console.log("Sample:", JSON.stringify(pipeline[0]));
}

main().catch(console.error);
