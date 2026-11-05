import { NextResponse } from "next/server";
import { buildReply } from "@/lib/ai";
import { appendMessage, getConversation, markSeen } from "@/lib/store";
import { extractMessageText, markMessageRead, sendWhatsAppText, verifySignature } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Meta webhook verification (GET).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Incoming messages / status updates (POST).
 */
export async function POST(request) {
  const rawBody = await request.text();
  const signature = verifySignature(rawBody, request.headers.get("x-hub-signature-256"));

  if (!signature.ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};
        const contacts = value?.contacts || [];
        for (const message of value?.messages || []) {
          await handleMessage(message, contacts[0]);
        }
      }
    }
  } catch (error) {
    console.error("[webhook] processing error:", error);
  }

  // Always acknowledge quickly so Meta does not retry.
  return NextResponse.json({ received: true });
}

async function handleMessage(message, contact) {
  if (!message?.from) return;

  const waId = message.from;
  const name = contact?.profile?.name || waId;

  // Ignore duplicate deliveries of the same message id.
  if (message.id) {
    const isNew = await markSeen(message.id);
    if (!isNew) return;
    markMessageRead(message.id);
  }

  const text = extractMessageText(message);

  if (!text) {
    await sendWhatsAppText(
      waId,
      "Sorry, I can only read text messages right now. Could you type your question?"
    );
    return;
  }

  await appendMessage(waId, "user", text, name);
  const history = await getConversation(waId);
  const reply = await buildReply({ text, history });
  await appendMessage(waId, "assistant", reply, name);

  const result = await sendWhatsAppText(waId, reply);
  if (!result.ok) {
    console.error("[webhook] failed to send reply:", result.error || result.reason);
  }
}
