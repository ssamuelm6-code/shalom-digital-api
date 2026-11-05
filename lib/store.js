import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { defaultEntries, defaultProfile } from "./knowledge";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const usingRedis = Boolean(redis);

const globalStore =
  globalThis.__WA_BOT_STORE__ || (globalThis.__WA_BOT_STORE__ = new Map());
const memory = globalStore;

const KEYS = {
  profile: "wa:kb:profile",
  entries: "wa:kb:entries",
  index: "wa:conv:index",
  conversation: (id) => `wa:conv:${id}`,
  seen: (id) => `wa:seen:${id}`,
};

const MAX_HISTORY = 20;
const MAX_CONVERSATIONS = 100;

// Keep locally trained knowledge across dev-server restarts when Redis is not configured.
const fileStoreEnabled = !redis && !process.env.VERCEL;
const FILE_PATH = path.join(process.cwd(), ".data", "knowledge.json");
let fileCache = null;

function isKnowledgeKey(key) {
  return key === KEYS.profile || key === KEYS.entries;
}

async function loadFileCache() {
  if (!fileStoreEnabled) return {};
  if (fileCache) return fileCache;
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    fileCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    fileCache = {};
  }
  return fileCache;
}

async function fileGet(key) {
  const cache = await loadFileCache();
  return cache[key];
}

async function fileSet(key, value) {
  if (!fileStoreEnabled) return;
  const cache = await loadFileCache();
  cache[key] = value;
  try {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.error("[store] failed to persist knowledge:", error?.message || error);
  }
}

function newId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getJSON(key, fallback) {
  let raw;
  if (redis) raw = await redis.get(key);
  else {
    raw = memory.get(key);
    if ((raw === null || raw === undefined) && isKnowledgeKey(key)) {
      raw = await fileGet(key);
    }
  }
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return raw;
}

async function setJSON(key, value) {
  if (redis) {
    await redis.set(key, JSON.stringify(value));
    return;
  }
  memory.set(key, value);
  if (isKnowledgeKey(key)) await fileSet(key, value);
}

async function removeKey(key) {
  if (redis) await redis.del(key);
  else memory.delete(key);
}

/* ------------------------------- Knowledge ------------------------------- */

export async function getProfile() {
  const profile = await getJSON(KEYS.profile, null);
  if (profile && typeof profile === "object") return profile;
  await setJSON(KEYS.profile, defaultProfile);
  return defaultProfile;
}

export async function saveProfile(input) {
  const current = await getProfile();
  const merged = { ...current, ...(input || {}) };
  await setJSON(KEYS.profile, merged);
  return merged;
}

export async function getEntries() {
  const entries = await getJSON(KEYS.entries, null);
  if (Array.isArray(entries)) return entries;
  await setJSON(KEYS.entries, defaultEntries);
  return defaultEntries;
}

export async function saveEntries(entries) {
  await setJSON(KEYS.entries, entries);
  return entries;
}

export async function addEntry(input) {
  const entries = await getEntries();
  const entry = {
    id: newId(),
    question: String(input?.question || "").trim(),
    answer: String(input?.answer || "").trim(),
    tags: normalizeTags(input?.tags),
    createdAt: Date.now(),
  };
  await saveEntries([entry, ...entries]);
  return entry;
}

export async function updateEntry(input) {
  const entries = await getEntries();
  const next = entries.map((entry) =>
    entry.id === input?.id
      ? {
          ...entry,
          question: String(input?.question ?? entry.question).trim(),
          answer: String(input?.answer ?? entry.answer).trim(),
          tags: normalizeTags(input?.tags ?? entry.tags),
        }
      : entry
  );
  await saveEntries(next);
  return next.find((entry) => entry.id === input?.id) || null;
}

export async function deleteEntry(id) {
  const entries = await getEntries();
  await saveEntries(entries.filter((entry) => entry.id !== id));
}

export async function resetKnowledge() {
  await setJSON(KEYS.entries, defaultEntries);
  await setJSON(KEYS.profile, defaultProfile);
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  return String(tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/* ----------------------------- Conversations ----------------------------- */

export async function getConversation(id) {
  const history = await getJSON(KEYS.conversation(id), []);
  return Array.isArray(history) ? history : [];
}

export async function appendMessage(id, role, content, name) {
  const key = KEYS.conversation(id);
  const history = await getConversation(id);
  history.push({ role, content, ts: Date.now() });
  const trimmed = history.slice(-MAX_HISTORY);
  await setJSON(key, trimmed);
  await touchIndex(id, name, content, role);
  return trimmed;
}

async function touchIndex(id, name, lastMessage, role) {
  const index = await getJSON(KEYS.index, []);
  const now = Date.now();
  const existing = index.find((item) => item.id === id);
  if (existing) {
    existing.lastMessage = lastMessage;
    existing.lastAt = now;
    existing.lastRole = role;
    if (name) existing.name = name;
  } else {
    index.push({ id, name: name || id, lastMessage, lastAt: now, lastRole: role });
  }
  index.sort((a, b) => b.lastAt - a.lastAt);
  await setJSON(KEYS.index, index.slice(0, MAX_CONVERSATIONS));
}

export async function listConversations() {
  const index = await getJSON(KEYS.index, []);
  return Array.isArray(index) ? index : [];
}

export async function resetConversation(id) {
  await removeKey(KEYS.conversation(id));
  const index = await getJSON(KEYS.index, []);
  await setJSON(
    KEYS.index,
    index.filter((item) => item.id !== id)
  );
}

/* ------------------------------ Deduplication ---------------------------- */

export async function markSeen(messageId) {
  const key = KEYS.seen(messageId);
  if (redis) {
    const result = await redis.set(key, "1", { nx: true, ex: 60 * 30 });
    return result === "OK";
  }
  const now = Date.now();
  const existing = memory.get(key);
  if (existing && existing.exp > now) return false;
  memory.set(key, { exp: now + 30 * 60 * 1000 });
  return true;
}
