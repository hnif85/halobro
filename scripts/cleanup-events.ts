import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://udupiblnzlzjmaafvdtv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface TrainingEvent {
  id: string;
  name: string;
  event_type: string | null;
  location: string | null;
  event_date: string | null;
  created_at: string | null;
}

function scoreEvent(ev: TrainingEvent): number {
  let score = 0;
  if (ev.location) score += 10;
  if (ev.event_type) score += 5;
  if (ev.event_date) score += 3;
  if (ev.created_at) {
    score += Math.max(0, 100 - (Date.now() - new Date(ev.created_at).getTime()) / 86400000);
  }
  return score;
}

async function main() {
  console.log("\n🧹 HaloBro CRM — Cleanup Training Events (batch)\n");

  const { data: events } = await supabase
    .from("training_events")
    .select("id, name, event_type, location, event_date, created_at")
    .order("name");

  if (!events) {
    console.log("No events found.");
    return;
  }

  console.log(`📋 ${events.length} total events\n`);

  // Group by name
  const groups: Record<string, TrainingEvent[]> = {};
  for (const ev of events) {
    if (!groups[ev.name]) groups[ev.name] = [];
    groups[ev.name].push(ev);
  }

  const duplicates = Object.values(groups).filter((g) => g.length > 1);
  const unique = Object.values(groups).filter((g) => g.length === 1);

  console.log(`✅ ${unique.length} unique, ⚠️  ${duplicates.length} duplicate groups\n`);

  if (duplicates.length === 0) {
    console.log("🎉 Database sudah bersih!\n");
    return;
  }

  // Build map: duplicate_id → survivor_id
  const idMap: Record<string, string> = {};
  for (const list of duplicates) {
    const scored = list.map((ev) => ({ ev, score: scoreEvent(ev) }));
    scored.sort((a, b) => b.score - a.score);
    const survivorId = scored[0].ev.id;
    for (const s of scored.slice(1)) {
      idMap[s.ev.id] = survivorId;
    }
  }

  const allDeleteIds = Object.keys(idMap);
  console.log(`🔄 ${allDeleteIds.length} duplicate IDs akan dihapus\n`);

  // ── Step 1: Update profile references (batch per event) ──
  let profileUpdated = 0;
  for (const [delId, survivorId] of Object.entries(idMap)) {
    const { data } = await supabase
      .from("profile")
      .update({ event_id: survivorId })
      .eq("event_id", delId)
      .select("id");
    if (data) profileUpdated += data.length;
  }
  console.log(`👤 ${profileUpdated} profile references diupdate`);

  // ── Step 2: Move enrollments (batch per event) ──
  let enrollMoved = 0;
  for (const [delId, survivorId] of Object.entries(idMap)) {
    const { data } = await supabase
      .from("training_enrollments")
      .update({ event_id: survivorId })
      .eq("event_id", delId)
      .select("id");
    if (data) enrollMoved += data.length;
  }
  console.log(`📝 ${enrollMoved} enrollment dipindahkan`);

  // ── Step 3: Delete duplicate events ──
  const { error: delErr } = await supabase
    .from("training_events")
    .delete()
    .in("id", allDeleteIds);

  if (delErr) {
    console.error(`❌ Gagal hapus: ${delErr.message}`);
    return;
  }

  console.log(`🗑️  ${allDeleteIds.length} events duplikat dihapus\n`);

  // ── Summary ──
  const { count: finalCount } = await supabase
    .from("training_events")
    .select("id", { count: "exact", head: true });

  console.log("=".repeat(42));
  console.log("  📊 HASIL CLEANUP");
  console.log("=".repeat(42));
  console.log(`  • ${duplicates.length} grup duplikat`);
  console.log(`  • ${profileUpdated} profile references`);
  console.log(`  • ${enrollMoved} enrollment`);
  console.log(`  • ${allDeleteIds.length} events dihapus`);
  console.log(`  • Final: ${finalCount} events`);
  console.log("=".repeat(42) + "\n");
}

main().catch(console.error);
