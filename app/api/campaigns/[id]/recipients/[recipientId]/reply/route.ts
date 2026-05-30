import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recipientId } = await params;
  const body = await req.json();
  const replyText = (body.reply_text || "").trim();

  if (!replyText) {
    return NextResponse.json({ error: "Reply text required" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { data: recipient, error } = await supabase
    .from("crm_campaign_recipients")
    .update({
      send_status: "replied",
      reply_text: replyText,
      replied_at: new Date().toISOString(),
    })
    .eq("id", recipientId)
    .eq("campaign_id", Number(id))
    .select("id, phone_number, reply_text, replied_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipient });
}