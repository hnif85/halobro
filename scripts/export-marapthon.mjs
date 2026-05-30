import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EVENT_ID = "3e188e87-cdcf-437b-aa00-b4dd0f47803c";

async function fetchData() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/query_data`;
  const body = { event_id: EVENT_ID };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC error ${res.status}: ${text}`);
  }

  return res.json();
}

const rows = await fetchData();

const data = rows.map((r, i) => ({
  No: i + 1,
  Nama: r.nama,
  Email: r.email,
  "Pakai Apps": r.has_usage,
  "Total Usage": r.usage_count,
  "Total Credit": r.credit_count,
  "Beli Produk": r.has_purchase,
  "Jumlah Pembelian": r.purchase_count,
  "Total Belanja (Rp)": Number(r.purchase_total),
  "Produk Dibeli": r.products_purchased === "-" ? "" : r.products_purchased,
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

ws["!cols"] = [
  { wch: 4 },   // No
  { wch: 32 },  // Nama
  { wch: 38 },  // Email
  { wch: 12 },  // Pakai Apps
  { wch: 14 },  // Total Usage
  { wch: 14 },  // Total Credit
  { wch: 12 },  // Beli Produk
  { wch: 18 },  // Jumlah Pembelian
  { wch: 18 },  // Total Belanja
  { wch: 30 },  // Produk Dibeli
];

XLSX.utils.book_append_sheet(wb, ws, "Marapthon");

const path = "D:\\CodinganDong\\myidea\\marapthon-participants.xlsx";
XLSX.writeFile(wb, path);

console.log(`Done! ${rows.length} rows written to ${path}`);
console.log(`Summary:
  Total peserta: ${rows.length}
  Pakai apps: ${rows.filter(r => r.has_usage === "Ya").length}
  Tidak pakai apps: ${rows.filter(r => r.has_usage === "Tidak").length}
  Beli produk: ${rows.filter(r => r.has_purchase === "Ya").length}
  Tidak beli: ${rows.filter(r => r.has_purchase === "Tidak").length}
`);
