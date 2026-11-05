import { NextResponse } from "next/server";
import { buildReply } from "@/lib/ai";
import { isAuthorized } from "@/lib/auth";
import { appendMessage, getConversation, resetConversation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  const sessionId = String(body.sessionId || "admin-test").slice(0, 64);

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const waId = `test:${sessionId}`;
  await appendMessage(waId, "user", message, "Test User");
  const history = await getConversation(waId);
  const reply = await buildReply({ text: message, history });
  await appendMessage(waId, "assistant", reply, "Test User");

  return NextResponse.json({ reply });
}

export async function DELETE(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") || "admin-test";
  await resetConversation(`test:${sessionId}`);

  return NextResponse.json({ ok: true });
}
