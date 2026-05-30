-- =============================================
-- Halosis Integration — Tables for Contact & Message Data
-- Jalankan di Supabase dashboard SQL Editor
-- =============================================

-- 1. Halosis Contacts — kontak & label dari Halosis
CREATE TABLE IF NOT EXISTS halosis_contacts (
  id                TEXT    PRIMARY KEY,
  cell_phone        TEXT,
  name              TEXT,
  first_name        TEXT,
  last_name         TEXT,
  email             TEXT,
  business_name     TEXT,
  description       TEXT,
  gender            TEXT,
  birth_date        TEXT,
  job_position      TEXT,
  chat_contact_wa_label JSONB DEFAULT '[]',
  raw_json          JSONB,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 2. Halosis Messages — riwayat pesan dari Halosis
CREATE TABLE IF NOT EXISTS halosis_messages (
  id                TEXT    PRIMARY KEY,
  from_phone        TEXT,
  to_phone          TEXT,
  type              TEXT,
  template_name     TEXT,
  status            TEXT,
  sent_at           TIMESTAMPTZ,
  raw_json          JSONB,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_halosis_contacts_phone  ON halosis_contacts(cell_phone);
CREATE INDEX IF NOT EXISTS idx_halosis_contacts_email   ON halosis_contacts(email);
CREATE INDEX IF NOT EXISTS idx_halosis_messages_phone   ON halosis_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_halosis_messages_date    ON halosis_messages(sent_at);
