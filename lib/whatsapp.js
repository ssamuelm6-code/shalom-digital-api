import crypto from "node:crypto";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Send a plain text WhatsApp message through the Cloud API.
 */
export async function sendWhatsAppText(to, body) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    return { ok: false, skipped: true, reason: "WhatsApp credentials are not configured" };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: String(body).slice(0, 4096) },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error?.message || `HTTP ${response.status}`,
        data,
      };
    }

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

/**
 * Mark an incoming message as read (optional, improves UX).
 */
export async function markMessageRead(messageId) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token || !messageId) return;

  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
    // Non-critical, ignore.
  }
}

/**
 * Verify the X-Hub-Signature-256 header sent by Meta.
 * Returns { ok, skipped }. If WHATSAPP_APP_SECRET is unset, verification is skipped.
 */
export function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return { ok: true, skipped: true };
  if (!signatureHeader) return { ok: false };

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return { ok: false };

  return { ok: crypto.timingSafeEqual(a, b) };
}

/**
 * Extract readable text from a Cloud API message object.
 */
export function extractMessageText(message) {
  if (!message) return null;

  switch (message.type) {
    case "text":
      return message.text?.body?.trim() || null;
    case "button":
      return message.button?.text?.trim() || null;
    case "interactive": {
      const interactive = message.interactive || {};
      return (
        interactive.button_reply?.title?.trim() ||
        interactive.list_reply?.title?.trim() ||
        null
      );
    }
    case "reaction":
      return null;
    default:
      return null;
  }
}
