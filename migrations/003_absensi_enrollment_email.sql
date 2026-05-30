-- Tambah kolom email ke training_enrollments
-- agar peserta yang belum ada di cms_customers tetap bisa disimpan
-- (user_guid = null, email tersimpan untuk cross-pairing nanti)
ALTER TABLE training_enrollments
  ADD COLUMN IF NOT EXISTS email text;
