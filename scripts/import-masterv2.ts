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

interface RowData {
  email: string;
  name: string;
  phone: string | null;
  eventName: string;
  eventDate: string | null;
  bidangUsaha: string;
  namaUsaha: string;
}

function normalizePhone(raw: string): string | null {
  let p = raw.trim().replace(/[\s\-\(\)]/g, "");
  if (!p || p === "-" || p === "") return null;
  if (p.startsWith("+62")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (!p.startsWith("62")) p = "62" + p;
  return p;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "-") return null;
  const parts = dateStr.trim().split("/");
  if (parts.length === 3) {
    return `20${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return null;
}

function generateGuid(): string {
  return crypto.randomUUID();
}

async function main() {
  console.log("\n🚀 HaloBro CRM — Import masterv2.csv (batch mode)\n");

  const csvPath = path.join(process.cwd(), "docs", "masterv2.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  console.log(`📄 ${records.length} rows ditemukan\n`);

  // ── Collect & deduplicate rows by email ──
  const rowMap = new Map<string, RowData>();
  for (const r of records) {
    const email = (r.Email || "").trim().toLowerCase();
    if (!email) continue;
    if (rowMap.has(email)) continue;

    const phone = normalizePhone(r["Nomor Telepon"] || "");
    const eventName = (r.Event || "").trim();
    const isSurakarta = eventName.toLowerCase().includes("surakarta");

    rowMap.set(email, {
      email,
      name: (r.Nama || "").trim(),
      phone,
      eventName,
      eventDate: parseDate(r["Tanggal Input Data"]),
      bidangUsaha: (r["Bidang Usaha"] || "").replace(/^-$/, "").trim(),
      namaUsaha: (r["Nama Usaha"] || "").replace(/^-$/, "").trim(),
    });
  }

  const rows = [...rowMap.values()];
  console.log(`👤 ${rows.length} unique emails (${records.length - rows.length} duplicate rows skipped)\n`);

  // ── Step 1: Create training_events ──
  const eventConfigs: Record<string, { location: string | null; type: string }> = {};
  for (const row of rows) {
    if (!row.eventName) continue;
    if (!eventConfigs[row.eventName]) {
      const isSurakarta = row.eventName.toLowerCase().includes("surakarta");
      eventConfigs[row.eventName] = {
        location: isSurakarta ? "Surakarta" : null,
        type: isSurakarta ? "offline" : "online",
      };
    }
  }

  const eventNameToId: Record<string, string> = {};

  for (const [name, config] of Object.entries(eventConfigs)) {
    const { data: existing } = await supabase
      .from("training_events")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      eventNameToId[name] = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from("training_events")
        .insert({
          name,
          event_type: config.type,
          location: config.location,
          is_active: true,
          created_at: new Date().toISOString(),
          created_by: "system_import",
        })
        .select("id")
        .single();

      if (!error && inserted) {
        eventNameToId[name] = inserted.id;
      }
    }
  }
  console.log(`📅 ${Object.keys(eventNameToId).length} events ready\n`);

  // ── Step 2: Batch fetch existing customers by email ──
  const emails = rows.map(r => r.email);
  const existingMap = new Map<string, { guid: string; phone_number: string | null; full_name: string | null }>();

  const BATCH_SIZE = 100;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from("cms_customers")
      .select("guid, email, full_name, phone_number")
      .in("email", batch);

    if (data) {
      for (const c of data) {
        existingMap.set(c.email.toLowerCase(), c);
      }
    }
  }

  console.log(`🔍 ${existingMap.size} existing customers found by email\n`);

  // ── Step 3: Prepare batch operations ──
  const toUpdate: { guid: string; email: string; phone: string | null; name: string }[] = [];
  const toInsert: { guid: string; email: string; name: string; phone: string | null; bidangUsaha: string; namaUsaha: string }[] = [];
  const toEnroll: { user_guid: string; event_id: string; email: string }[] = [];

  for (const row of rows) {
    const existing = existingMap.get(row.email);

    if (existing) {
      // Only update if we have a phone or they're missing a name
      if (row.phone || !existing.full_name) {
        toUpdate.push({ guid: existing.guid, email: row.email, phone: row.phone, name: row.name });
      }
    } else {
      toInsert.push({
        guid: generateGuid(),
        email: row.email,
        name: row.name,
        phone: row.phone,
        bidangUsaha: row.bidangUsaha,
        namaUsaha: row.namaUsaha,
      });
    }

    if (row.eventName && eventNameToId[row.eventName]) {
      const guid = existing?.guid || toInsert[toInsert.length - 1]?.guid;
      if (guid) {
        toEnroll.push({ user_guid: guid, event_id: eventNameToId[row.eventName], email: row.email });
      }
    }
  }

  // ── Step 4: Batch INSERT new customers ──
  if (toInsert.length > 0) {
    const insertBatches = [];
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      insertBatches.push(toInsert.slice(i, i + BATCH_SIZE));
    }

    for (const batch of insertBatches) {
      const { error } = await supabase.from("cms_customers").insert(
        batch.map(r => ({
          guid: r.guid,
          email: r.email,
          full_name: r.name || null,
          phone_number: r.phone || null,
          status: "active",
          is_active: "active",
          industry_name: r.bidangUsaha || null,
          corporate_name: r.namaUsaha || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );
      if (error) console.error("   ❌ Batch insert error:", error.message);
    }
  }

  // ── Step 5: Batch UPDATE phone numbers ──
  let phoneUpdated = 0;
  if (toUpdate.length > 0) {
    for (const u of toUpdate) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      let shouldUpdate = false;

      if (u.phone) {
        updateData.phone_number = u.phone;
        shouldUpdate = true;
      }
      if (u.name) {
        updateData.full_name = u.name;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const { error } = await supabase
          .from("cms_customers")
          .update(updateData)
          .eq("guid", u.guid);

        if (!error) phoneUpdated++;
      }
    }
  }

  // ── Step 6: Batch INSERT enrollments ──
  let enrolled = 0;
  if (toEnroll.length > 0) {
    const enrollBatches = [];
    for (let i = 0; i < toEnroll.length; i += BATCH_SIZE) {
      enrollBatches.push(toEnroll.slice(i, i + BATCH_SIZE));
    }

    for (const batch of enrollBatches) {
      const { error } = await supabase.from("training_enrollments").insert(
        batch.map(r => ({
          user_guid: r.user_guid,
          event_id: r.event_id,
          created_at: new Date().toISOString(),
        }))
      );
      if (error && !error.message?.includes?.("duplicate") && !error.message?.includes?.("unique")) {
        console.error("   ⚠ Enrollment error:", error.message);
      } else {
        enrolled += batch.length;
      }
    }
  }

  // ── Summary ──
  console.log("\n" + "=".repeat(42));
  console.log("  📊 HASIL IMPORT — masterv2.csv");
  console.log("=".repeat(42));
  console.log(`  • ${rows.length} unique emails diproses`);
  console.log(`  • ${toInsert.length} customer baru ditambahkan`);
  console.log(`  • ${phoneUpdated} nomor telepon diupdate`);
  console.log(`  • ${enrolled} enrollment training dicatat`);
  console.log(`  • ${Object.keys(eventNameToId).length} events diproses`);
  console.log("=".repeat(42) + "\n");
}

main().catch(console.error);
