import { NextResponse } from "next/server";
import { usingRedis } from "@/lib/store";
import { whatsappConfigured } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    storage: usingRedis ? "redis" : "memory",
    whatsapp: whatsappConfigured(),
    openai: Boolean(process.env.OPENAI_API_KEY),
    adminPasswordSet: Boolean(process.env.ADMIN_PASSWORD),
  });
}
