import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import {
  addEntry,
  deleteEntry,
  getEntries,
  getProfile,
  resetKnowledge,
  saveProfile,
  updateEntry,
  usingRedis,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, entries] = await Promise.all([getProfile(), getEntries()]);
  return NextResponse.json({
    profile,
    entries,
    storage: usingRedis ? "redis" : "memory",
  });
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    switch (body.action) {
      case "saveProfile": {
        const profile = await saveProfile(body.profile || {});
        return NextResponse.json({ ok: true, profile });
      }
      case "addEntry": {
        const entry = await addEntry(body.entry || {});
        return NextResponse.json({ ok: true, entry });
      }
      case "updateEntry": {
        const entry = await updateEntry(body.entry || {});
        return NextResponse.json({ ok: true, entry });
      }
      case "deleteEntry": {
        await deleteEntry(body.id);
        return NextResponse.json({ ok: true });
      }
      case "reset": {
        await resetKnowledge();
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
