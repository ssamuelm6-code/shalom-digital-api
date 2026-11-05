import { getEntries, getProfile } from "./store";
import {
  buildSystemPrompt,
  fallbackReply,
  greetingReply,
  isGreeting,
  searchEntries,
  smallTalkReply,
} from "./knowledge";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Build a reply for an incoming message.
 * Uses OpenAI when configured, otherwise a keyword-matching FAQ bot.
 */
export async function buildReply({ text, history = [] }) {
  const [profile, entries] = await Promise.all([getProfile(), getEntries()]);
  const apiKey = process.env.OPENAI_API_KEY;

  if (isGreeting(text)) return greetingReply(profile, entries);

  const smallTalk = smallTalkReply(profile, text);
  if (smallTalk) return smallTalk;

  if (apiKey) {
    try {
      const reply = await callOpenAI({ apiKey, profile, entries, text, history });
      if (reply) return reply;
    } catch (error) {
      console.error("[ai] OpenAI request failed:", error?.message || error);
    }
  }

  return fallbackReply(profile, entries, text);
}

async function callOpenAI({ apiKey, profile, entries, text, history }) {
  const relevant = searchEntries(text, entries, 6);
  const systemPrompt = buildSystemPrompt(profile, entries, relevant);

  const messages = [{ role: "system", content: systemPrompt }];

  for (const item of history.slice(-12)) {
    if (item?.role === "user" || item?.role === "assistant") {
      if (typeof item.content === "string" && item.content.trim()) {
        messages.push({ role: item.role, content: item.content });
      }
    }
  }

  // Guarantee the latest customer message is present exactly once at the end.
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== text) {
    messages.push({ role: "user", content: text });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 500,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : null;
  } finally {
    clearTimeout(timeout);
  }
}
