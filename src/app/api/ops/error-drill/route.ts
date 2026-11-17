// WS11, трек B: навмисна помилка сервера, щоб довести, що трекер помилок (onRequestError у src/instrumentation.ts)
// надсилає повідомлення в чат команди. Закрито двічі: лише адміністратор і лише не на проді (preview / staging);
// усім іншим — 404, ніби маршруту немає. Помилка не містить даних користувача: у чат іде лише назва й стек.
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/supabase/viewer";

export const dynamic = "force-dynamic";

class ErrorDrill extends Error {
  override name = "ErrorDrill";
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { claims, profile } = await getViewer();
  if (!claims || profile?.role !== "admin") return NextResponse.json({ error: "Not found" }, { status: 404 });
  throw new ErrorDrill("error drill");
}
