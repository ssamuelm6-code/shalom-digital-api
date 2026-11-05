import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { appendMessage, getConversation, listConversations, resetConversation } from "@/lib/store";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const messages = await getConversation(id);
    return NextResponse.json({ id, messages });
  }

  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const message = String(body.message || "").trim();

  if (!id || !message) {
    return NextResponse.json({ error: "id and message are required" }, { status: 400 });
  }

  const isTest = id.startsWith("test:");
  let result = { ok: true, skipped: true };

  if (!isTest) {
    result = await sendWhatsAppText(id, message);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || result.reason || "Failed to send WhatsApp message" },
        { status: 502 }
      );
    }
  }

  await appendMessage(id, "assistant", message);
  return NextResponse.json({ ok: true, skipped: Boolean(result.skipped) });
}

export async function DELETE(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await resetConversation(id);
  return NextResponse.json({ ok: true });
}
