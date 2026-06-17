const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

export async function sbGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: SB_HEADERS,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sbGetAll<T = any>(
  table: string,
  select: string,
  extraParams = ""
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const results: T[] = [];
  let offset = 0;
  while (true) {
    const path = `${table}?select=${select}&offset=${offset}&limit=${PAGE_SIZE}${extraParams ? `&${extraParams}` : ""}`;
    const data = await sbGet<T[]>(path);
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

export async function sbGetChunked<T = any>(
  table: string,
  select: string,
  column: string,
  values: string[],
  extraParams = ""
): Promise<T[]> {
  const CHUNK = 50;
  const results: T[] = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    const path = `${table}?select=${select}&${column}=in.(${chunk.join(",")})${extraParams ? `&${extraParams}` : ""}`;
    const data = await sbGet<T[]>(path);
    results.push(...data);
  }
  return results;
}
