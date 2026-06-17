let cachedToken: { token: string; expiresAt: number } | null = null;

const BASE_URL = "https://api.halosis.id";

async function login(): Promise<{ refresh_token: string }> {
  const email = process.env.HALOSIS_EMAIL;
  const password = process.env.HALOSIS_PASSWORD;

  if (!email || !password) {
    throw new Error("Halosis credentials not configured (HALOSIS_EMAIL / HALOSIS_PASSWORD)");
  }

  const res = await fetch(`${BASE_URL}/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Halosis login failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function refreshToken(refresh_token: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE_URL}/v1/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Halosis refresh token failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { token: data.long_lived_token };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 120_000) {
    return cachedToken.token;
  }

  const { refresh_token } = await login();
  const { token } = await refreshToken(refresh_token);

  const decoded = decodeJwtPayload(token);
  const expMs = Number(decoded?.exp || 0) * 1000;

  cachedToken = { token, expiresAt: expMs };
  return token;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64").toString());
  } catch {
    return null;
  }
}

interface HalosisContact {
  id: number;
  cell_phone: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  business_name: string | null;
  birth_date: string | null;
  gender: string | null;
  job_position: string | null;
  location_name: string | null;
  is_block: string;
  is_delete: string;
  chat_contact_wa_label: Array<{ name: string; color: string }>;
  create_time: string;
  update_time: string;
}

interface HalosisContactListResponse {
  status: boolean;
  message: string;
  data: {
    current_page: number;
    data: HalosisContact[];
    last_page: number;
    per_page: number;
    total: number;
  };
}

export async function getContacts(page = 1, limit = 100): Promise<HalosisContactListResponse> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/v1/contacts?limit=${limit}&page=${page}&is_delete=false`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Halosis getContacts failed: ${res.status} ${text}`);
  }

  return res.json();
}

interface HalosisMessage {
  wam_id: string;
  from_phone_number: string;
  to_phone_number: string;
  message: string;
  agent_name: string | null;
  template_name: string | null;
  attachment_file: string | null;
  conversation_id: string | null;
  session_status: string;
  created_time: string;
}

interface HalosisMessageListResponse {
  data: HalosisMessage[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  links: { first: string; last: string; prev: string | null; next: string | null };
}

export async function getMessageHistory(
  startDate: string,
  endDate: string,
  page = 1
): Promise<HalosisMessageListResponse> {
  const token = await getToken();

  const res = await fetch(
    `${BASE_URL}/v1/messages?page=${page}&start_date=${startDate}&end_date=${endDate}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Halosis getMessageHistory failed: ${res.status} ${text}`);
  }

  return res.json();
}

interface HalosisBalance {
  balance: number;
  currency: string;
}

export async function getBalance(): Promise<HalosisBalance> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/v1/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Halosis getBalance failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function syncAllContacts(): Promise<{
  added: number; updated: number; total: number;
  pagesProcessed: number; totalPages: number;
}> {
  const { createAdminClient } = await import("@/lib/supabase");
  const supabase = await createAdminClient();

  let page = 1;
  let added = 0;
  let updated = 0;
  let total = 0;
  let totalPages = 1;

  while (true) {
    const response = await getContacts(page, 100);
    const contacts = response.data.data;
    total = response.data.total;
    totalPages = response.data.last_page;

    if (!contacts || contacts.length === 0) break;

    for (const contact of contacts) {
      const contactId = String(contact.id);
      const existing = await supabase
        .from("halosis_contacts")
        .select("id")
        .eq("id", contactId)
        .maybeSingle();

      if (existing.data) {
        await supabase
          .from("halosis_contacts")
          .update({
            cell_phone: contact.cell_phone,
            name: contact.name,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            business_name: contact.business_name,
            gender: contact.gender,
            birth_date: contact.birth_date,
            job_position: contact.job_position,
            chat_contact_wa_label: contact.chat_contact_wa_label,
            raw_json: contact,
            synced_at: new Date().toISOString(),
          })
          .eq("id", contactId);
        updated++;
      } else {
        await supabase.from("halosis_contacts").insert({
          id: contactId,
          cell_phone: contact.cell_phone,
          name: contact.name,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          business_name: contact.business_name,
          gender: contact.gender,
          birth_date: contact.birth_date,
          job_position: contact.job_position,
          chat_contact_wa_label: contact.chat_contact_wa_label,
          raw_json: contact,
          synced_at: new Date().toISOString(),
        });
        added++;
      }
    }

    if (page >= response.data.last_page) break;
    page++;
  }

  return { added, updated, total, pagesProcessed: page, totalPages };
}


