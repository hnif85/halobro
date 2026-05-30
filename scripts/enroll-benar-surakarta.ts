import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;

const EMAILS = [
  "theresiaesi80@gmail.com",
  "tante337@gmail.com",
  "hanahizkiashop@gmail.com",
  "azamifelt.creation@gmail.com",
  "kristizahra650@gmail.com",
  "arlanoaffandi@gmail.com",
  "dewisusilowati617@gmail.com",
  "nerlinda@hotmail.com",
  "oxzifayatimah@gmail.com",
  "tlenikbatik@gmail.com",
  "supriatinaji83@gmail.com",
  "bien.craft@gmail.com",
  "lenthosoloofficial@gmail.com",
  "ardinmayasari@gmail.com",
  "leoniebunga@yahoo.com",
  "anindyadewidewi@gmail.com",
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Cari event Surakarta
  const { data: events, error: evErr } = await supabase
    .from("training_events")
    .select("id, name")
      .ilike("name", "%surakarta%");

  if (evErr || !events || events.length === 0) {
    console.error("❌ Event Surakarta tidak ditemukan");
    process.exit(1);
  }

  const event = events[0];
  console.log(`📍 Event: ${event.name} (${event.id})`);

  // 2. Cari customer GUID dari 16 email
  const { data: customers } = await supabase
    .from("cms_customers")
    .select("guid, full_name, email")
    .in("email", EMAILS);

  const emailToGuid = new Map<string, { guid: string; name: string }>();
  const notFound: string[] = [];

  for (const email of EMAILS) {
    const c = (customers || []).find(
      (c) => c.email?.toLowerCase() === email.toLowerCase()
    );
    if (c && c.guid) {
      emailToGuid.set(email, { guid: c.guid, name: c.full_name || "" });
    } else {
      notFound.push(email);
    }
  }

  if (notFound.length > 0) {
    console.log("⚠ Email tidak ditemukan di cms_customers:");
    notFound.forEach((e) => console.log(`   - ${e}`));
  }

  console.log(`\n📧 Ditemukan: ${emailToGuid.size} / ${EMAILS.length}`);

  // 3. Cek yang sudah terdaftar
  const guids = [...emailToGuid.values()].map((c) => c.guid);
  const { data: existing } = await supabase
    .from("training_enrollments")
    .select("user_guid, email")
    .eq("event_id", event.id)
    .in("user_guid", guids);

  const existingGuids = new Set((existing || []).map((e) => e.user_guid));
  const existingEmails = new Set((existing || []).map((e) => e.email?.toLowerCase()));

  // 4. Siapkan data insert (skip duplikat)
  const toInsert: Array<{
    id: string;
    event_id: string;
    user_guid: string | null;
    email: string;
    created_at: string;
  }> = [];

  for (const [email, c] of emailToGuid) {
    if (existingGuids.has(c.guid) || existingEmails.has(email.toLowerCase())) {
      console.log(`⏭  Sudah terdaftar: ${c.name || email}`);
      continue;
    }
    toInsert.push({
      id: crypto.randomUUID(),
      event_id: event.id,
      user_guid: c.guid,
      email,
      created_at: new Date().toISOString(),
    });
  }

  if (toInsert.length === 0) {
    console.log("\n✅ Semua sudah terdaftar. Tidak ada yang perlu di-insert.");
    return;
  }

  // 5. Insert batch
  console.log(`\n📝 Mendaftarkan ${toInsert.length} peserta baru...`);

  const { error: insertErr } = await supabase
    .from("training_enrollments")
    .insert(toInsert);

  if (insertErr) {
    console.error("❌ Gagal insert:", insertErr.message);
    process.exit(1);
  }

  console.log(`✅ Berhasil mendaftarkan ${toInsert.length} peserta ke "${event.name}"`);
}

main().catch(console.error);
