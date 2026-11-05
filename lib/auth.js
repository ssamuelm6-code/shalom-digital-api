import crypto from "node:crypto";

export const COOKIE_NAME = "wa_admin";

export const authConfigured = Boolean(process.env.ADMIN_PASSWORD);

function signingSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "insecure-dev-secret";
}

export function sessionToken() {
  return crypto
    .createHmac("sha256", signingSecret())
    .update("wa-admin-session-v1")
    .digest("hex");
}

export function isValidPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;

  const a = Buffer.from(String(password || ""));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Returns true when the request carries a valid admin session cookie.
 * In development without ADMIN_PASSWORD the dashboard is open; in production
 * it stays locked until ADMIN_PASSWORD is configured.
 */
export function isAuthorized(request) {
  if (!authConfigured) return process.env.NODE_ENV !== "production";

  const cookie = request.cookies?.get?.(COOKIE_NAME)?.value;
  if (!cookie) return false;

  const expected = sessionToken();
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
