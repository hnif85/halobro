import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

const PANEL_API = "https://drcxpanel.damcorp.id/api/v2/bussiness/message-template";

function extractBodyText(components: Record<string, unknown>[]): string {
  const body = components.find((c: Record<string, unknown>) => c.type === "BODY");
  return (body?.text as string) || "";
}

function extractVariables(text: string): string[] {
  const vars: string[] = [];
  const regex = /\{\{(\d+)\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (!vars.includes(match[1])) vars.push(match[1]);
  }
  return vars.sort((a, b) => parseInt(a) - parseInt(b));
}

function extractHeaderText(components: Record<string, unknown>[]): string | null {
  const header = components.find((c: Record<string, unknown>) => c.type === "HEADER");
  if (header?.format === "TEXT") return (header as Record<string, unknown>).text as string;
  if (header?.format) return `[${(header as Record<string, unknown>).format}]`;
  return null;
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.DAMCORP_PANEL_API_KEY;
  const ipPub = process.env.DAMCORP_PANEL_IP_PUB;

  if (!apiKey || !ipPub) {
    return NextResponse.json({ error: "Panel API key not configured" }, { status: 500 });
  }

  const supabase = await createAdminClient();
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${PANEL_API}?page=${page}`, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "api-key": apiKey,
        "ip-pub": ipPub,
        "Origin": "https://panel.damcorp.id",
        "Referer": "https://panel.damcorp.id/",
      },
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `Panel API HTTP ${res.status}`,
        page,
      }, { status: 502 });
    }

    const json: Record<string, unknown> = await res.json();
    const data = json.data as Record<string, unknown> | undefined;
    const result = (data?.result as Record<string, unknown>[]) || [];
    const total = (data?.total as number) || 0;

    for (const tmpl of result) {
      const name = (tmpl.name as string) || "";
      const status = (tmpl.status as string) || "UNKNOWN";
      const components = (tmpl.components as Record<string, unknown>[]) || [];
      const bodyText = extractBodyText(components);
      const variables = extractVariables(bodyText);
      const headerText = extractHeaderText(components);
      const language = (tmpl.language as string) || "id";
      const category = (tmpl.category as string) || "";
      const templateId = String(tmpl.templateId || "");

      // Display name: human-friendly
      const displayName = name
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .substring(0, 60);

      // Build content preview
      let content = bodyText;
      if (headerText) {
        content = `${headerText}\n\n${content}`;
      }

      // Check if template exists by name
      const { data: existing } = await supabase
        .from("wa_templates")
        .select("id")
        .eq("name", name)
        .maybeSingle();

      const payload = {
        name,
        display_name: displayName,
        content: content.substring(0, 1024),
        variables: { list: variables, count: variables.length, templateId, category, language },
        damcorp_status: status,
        is_active: status === "APPROVED",
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("wa_templates").update(payload).eq("id", existing.id);
        totalUpdated++;
      } else {
        await supabase.from("wa_templates").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
        totalInserted++;
      }
      totalProcessed++;
    }

    // Pagination
    const perPage = result.length;
    hasMore = page * perPage < total;
    page++;

    // Safety limit: max 10 pages
    if (page > 10) break;
  }

  return NextResponse.json({
    success: true,
    processed: totalProcessed,
    inserted: totalInserted,
    updated: totalUpdated,
    pages: page - 1,
  });
}