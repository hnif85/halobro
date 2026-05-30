let cachedToken: { token: string; expiresAt: number } | null = null;

async function getDamcorpToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const username = process.env.DAMCORP_USERNAME!;
  const password = process.env.DAMCORP_PASSWORD!;
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch("https://waba.damcorp.id/v2/users/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Damcorp login failed: ${res.status}`);
  }

  const data = await res.json();
  const token = data.users?.[0]?.token;
  if (!token) throw new Error("No token in Damcorp response");

  const expiresAfter = new Date(data.users[0].expires_after).getTime();
  cachedToken = { token, expiresAt: expiresAfter };

  return token;
}

export interface SendTemplatePayload {
  to: string;
  templateName: string;
  language?: string;
  components?: Record<string, unknown>[];
}

export interface SendResult {
  wamid: string;
  wa_id: string;
  success: boolean;
  error?: string;
}

export async function sendTemplateMessage(payload: SendTemplatePayload): Promise<SendResult> {
  const token = await getDamcorpToken();

  const templateBody: Record<string, unknown> = {
    name: payload.templateName,
    language: { code: payload.language || "id" },
  };

  if (payload.components && payload.components.length > 0) {
    templateBody.components = payload.components;
  }

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: payload.to,
    type: "template",
    template: templateBody,
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      wamid: "",
      wa_id: "",
      success: false,
      error: data.errors?.[0]?.details || data.errors?.[0]?.title || data.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    wamid: data.messages?.[0]?.id || "",
    wa_id: data.contacts?.[0]?.wa_id || "",
    success: true,
  };
}

export async function sendTextMessage(to: string, text: string): Promise<SendResult> {
  const token = await getDamcorpToken();

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: text.includes("http"),
      body: text,
    },
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      wamid: "",
      wa_id: "",
      success: false,
      error: data.errors?.[0]?.details || data.errors?.[0]?.title || data.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    wamid: data.messages?.[0]?.id || "",
    wa_id: data.contacts?.[0]?.wa_id || "",
    success: true,
  };
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (!p.startsWith("62")) {
    if (p.startsWith("0")) p = "62" + p.slice(1);
    else p = "62" + p;
  }
  return p;
}

export function formatPhoneDisplay(phone: string): string {
  return phone.replace(/^\+/, "").replace(/^62/, "0");
}