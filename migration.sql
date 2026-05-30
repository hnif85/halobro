-- =============================================
-- HaloBro CRM — Database Migration
-- Jalankan SQL ini di Supabase dashboard SQL Editor
-- =============================================

-- 1. Tambah kolom untuk tracking balasan di crm_campaign_recipients
ALTER TABLE crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_text text;

-- 2. RLS policies — beri akses read/write untuk anon key (via service role key sudah bypass)
-- Tapi tetap perlu untuk development

ALTER TABLE cms_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cms_customers" ON cms_customers;
CREATE POLICY "anon_select_cms_customers" ON cms_customers FOR SELECT USING (true);

ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_crm_campaigns" ON crm_campaigns;
CREATE POLICY "anon_all_crm_campaigns" ON crm_campaigns FOR ALL USING (true);

ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_crm_campaign_recipients" ON crm_campaign_recipients;
CREATE POLICY "anon_all_crm_campaign_recipients" ON crm_campaign_recipients FOR ALL USING (true);

ALTER TABLE crm_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_crm_webhook_events" ON crm_webhook_events;
CREATE POLICY "anon_insert_crm_webhook_events" ON crm_webhook_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_crm_webhook_events" ON crm_webhook_events;
CREATE POLICY "anon_select_crm_webhook_events" ON crm_webhook_events FOR SELECT USING (true);

ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_crm_users" ON crm_users;
CREATE POLICY "anon_select_crm_users" ON crm_users FOR SELECT USING (true);

ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_crm_segments" ON crm_segments;
CREATE POLICY "anon_all_crm_segments" ON crm_segments FOR ALL USING (true);

ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_wa_templates" ON wa_templates;
CREATE POLICY "anon_all_wa_templates" ON wa_templates FOR ALL USING (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT USING (true);

ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transaction_details" ON transaction_details;
CREATE POLICY "anon_select_transaction_details" ON transaction_details FOR SELECT USING (true);

-- 3. Beri akses database untuk roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. Table untuk monitoring Yayasan Benar
CREATE TABLE IF NOT EXISTS user_benar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_guid text NOT NULL UNIQUE REFERENCES cms_customers(guid) ON DELETE CASCADE,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_benar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_user_benar" ON user_benar;
CREATE POLICY "anon_all_user_benar" ON user_benar FOR ALL USING (true);

-- 6. Verifikasi
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'crm_campaign_recipients' 
  AND column_name IN ('replied_at', 'reply_text');