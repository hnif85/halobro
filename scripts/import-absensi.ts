import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Event definitions ────────────────────────────────────────────────────────
const EVENT_DEFS: Record<string, {
  name: string;
  location: string;
  event_date: string;
  event_type: string;
}> = {
  surakarta: {
    name: "Pelatihan Surakarta",
    location: "Surakarta",
    event_date: "2026-04-30",
    event_type: "offline",
  },
  pontianak: {
    name: "Pelatihan Pontianak",
    location: "Pontianak",
    event_date: "2026-05-12",
    event_type: "offline",
  },
  bandung: {
    name: "Pelatihan Kab. Bandung Barat",
    location: "Kabupaten Bandung Barat",
    event_date: "2026-05-21",
    event_type: "offline",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectEventKey(location: string): string | null {
  const l = location.toLowerCase();
  if (l.includes("surakarta")) return "surakarta";
  if (l.includes("pontianak")) return "pontianak";
  if (l.includes("bandung"))   return "bandung";
  return null;
}

const BATCH_SIZE = 100;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 HaloBro CRM — Import Absensi CSV\n");

  // ── 1. Baca & parse CSV ──────────────────────────────────────────────────
  const csvPath = path.join(process.cwd(), "docs", "absensiData - Absensi.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");

  // Parse sebagai array of array (bukan object) karena kolom tidak konsisten
  const rows: string[][] = parse(raw, {
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    from_line: 2, // skip header
  });

  console.log(`📄 ${rows.length} baris ditemukan\n`);

  // ── 2. Kelompokkan email per event ───────────────────────────────────────
  const emailsByEvent: Record<string, Set<string>> = {
    surakarta: new Set(),
    pontianak: new Set(),
    bandung: new Set(),
  };

  let skipped = 0;

  for (const cols of rows) {
    const email = (cols[1] || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped++;
      continue;
    }

    const col2 = (cols[2] || "").trim();
    const col3 = (cols[3] || "").trim();

    // Jika col2 berisi angka (nomor HP), lokasi ada di col3
    const isPhone = /^[0-9+]{8,}$/.test(col2);
    const location = isPhone ? col3 : (col2 || col3);

    if (!location) {
      skipped++;
      continue;
    }

    const key = detectEventKey(location);
    if (!key) {
      skipped++;
      continue;
    }

    emailsByEvent[key].add(email);
  }

  // Ringkasan distribusi
  const totalUnique = Object.values(emailsByEvent).reduce((s, e) => s + e.size, 0);
  console.log(`📊 Distribusi peserta unik per event:`);
  for (const [key, emails] of Object.entries(emailsByEvent)) {
    console.log(`   • ${EVENT_DEFS[key].name}: ${emails.size} email`);
  }
  console.log(`   ⚠  ${skipped} baris di-skip (email kosong / lokasi tidak dikenali)\n`);

  // ── 3. CLEAN: hapus semua enrollment & event ─────────────────────────────
  console.log("🗑  Membersihkan tabel...");

  // 3a. Hapus semua training_enrollments
  const { error: errEnroll } = await supabase
    .from("training_enrollments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (errEnroll) {
    console.error("   ❌ Gagal hapus training_enrollments:", errEnroll.message);
    process.exit(1);
  }
  console.log("   ✓ training_enrollments dihapus");

  // 3b. Null-kan profile.event_id dulu (FK: profile_event_id_fkey)
  const { error: errProfile } = await supabase
    .from("profile")
    .update({ event_id: null })
    .not("event_id", "is", null);

  if (errProfile) {
    console.error("   ❌ Gagal null-kan profile.event_id:", errProfile.message);
    process.exit(1);
  }
  console.log("   ✓ profile.event_id di-null-kan");

  // 3c. Hapus event_registrations (FK: event_registrations_event_id_fkey)
  const { error: errEventReg } = await supabase
    .from("event_registrations")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (errEventReg) {
    console.error("   ❌ Gagal hapus event_registrations:", errEventReg.message);
    process.exit(1);
  }
  console.log("   ✓ event_registrations dihapus");

  // 3d. Hapus semua training_events
  const { error: errEvents } = await supabase
    .from("training_events")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (errEvents) {
    console.error("   ❌ Gagal hapus training_events:", errEvents.message);
    process.exit(1);
  }
  console.log("   ✓ training_events dihapus\n");

  // ── 4. INSERT 3 events ───────────────────────────────────────────────────
  console.log("📅 Membuat event...");

  const eventIdMap: Record<string, string> = {};
  const now = new Date().toISOString();

  for (const [key, def] of Object.entries(EVENT_DEFS)) {
    const { data, error } = await supabase
      .from("training_events")
      .insert({
        name: def.name,
        location: def.location,
        event_date: def.event_date,
        event_type: def.event_type,
        is_active: true,
        created_by: "import_absensi",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`   ❌ Gagal insert event "${def.name}":`, error?.message);
      process.exit(1);
    }

    eventIdMap[key] = data.id;
    console.log(`   ✓ ${def.name} (${def.event_date}) — id: ${data.id}`);
  }
  console.log();

  // ── 5. Batch lookup email → user_guid di cms_customers ──────────────────
  console.log("🔍 Mencocokkan email ke cms_customers...");

  const allEmails = [...new Set([
    ...emailsByEvent.surakarta,
    ...emailsByEvent.pontianak,
    ...emailsByEvent.bandung,
  ])];

  const emailToGuid = new Map<string, string>();

  for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
    const batch = allEmails.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from("cms_customers")
      .select("guid, email")
      .in("email", batch);

    for (const c of data || []) {
      if (c.email) emailToGuid.set(c.email.toLowerCase(), c.guid);
    }
  }

  const matchedCount  = emailToGuid.size;
  const unmatchedCount = totalUnique - matchedCount;
  console.log(`   ✓ Cocok: ${matchedCount} / ${totalUnique} email`);
  console.log(`   ℹ  Tidak cocok (user_guid=null): ${unmatchedCount}\n`);

  // ── 6. INSERT training_enrollments ───────────────────────────────────────
  console.log("📝 Menyimpan enrollment...");

  let totalInserted = 0;

  for (const [key, emails] of Object.entries(emailsByEvent)) {
    const eventId = eventIdMap[key];
    const emailList = [...emails];

    const toInsert = emailList.map((email) => ({
      id: crypto.randomUUID(),
      event_id: eventId,
      user_guid: emailToGuid.get(email) ?? null,
      email,
      created_at: now,
    }));

    // Batch insert
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("training_enrollments").insert(batch);

      if (error) {
        // Jika kolom email belum ada (migrasi belum dijalankan), beri pesan jelas
        if (error.message?.includes("email")) {
          console.error("\n❌ Error: kolom 'email' belum ada di training_enrollments.");
          console.error("   Jalankan dulu migrations/003_absensi_enrollment_email.sql di Supabase SQL Editor.\n");
          process.exit(1);
        }
        console.error(`   ⚠ Batch error (${EVENT_DEFS[key].name}):`, error.message);
      } else {
        totalInserted += batch.length;
      }
    }

    console.log(`   ✓ ${EVENT_DEFS[key].name}: ${emailList.length} enrollment`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("  📊 HASIL IMPORT — absensiData - Absensi.csv");
  console.log("=".repeat(50));
  console.log(`  • ${rows.length} baris dibaca dari CSV`);
  console.log(`  • ${skipped} baris di-skip`);
  console.log(`  • 3 event dibuat`);
  for (const [key, emails] of Object.entries(emailsByEvent)) {
    console.log(`    - ${EVENT_DEFS[key].name}: ${emails.size} peserta unik`);
  }
  console.log(`  • ${matchedCount} peserta cocok dengan cms_customers`);
  console.log(`  • ${unmatchedCount} peserta tersimpan dengan user_guid=null`);
  console.log(`  • ${totalInserted} enrollment berhasil diinsert`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
