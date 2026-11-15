// Сторінка статусу машинним форматом (WS11): GET /api/status → { state, title, components, checkedAt }. Публічна, як
// /api/health, і так само без секретів і даних користувачів. Код 200 навіть при збої компонента: звіт сам каже, що
// не так (для «живий / ні» є /api/health з 503).
import { NextResponse } from "next/server";
import { checkStatus } from "@/lib/status-probes";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await checkStatus(), { headers: { "cache-control": "no-store" } });
}
