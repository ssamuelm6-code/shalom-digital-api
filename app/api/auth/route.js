import { NextResponse } from "next/server";
import {
  authConfigured,
  COOKIE_NAME,
  isAuthorized,
  isValidPassword,
  sessionToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return NextResponse.json({
    authenticated: isAuthorized(request),
    configured: authConfigured,
  });
}

export async function POST(request) {
  if (!authConfigured) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));

  if (!isValidPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
