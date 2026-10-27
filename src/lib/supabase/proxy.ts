// Оновлення сесії Supabase на кожен запит (викликається з src/proxy.ts).
// Офіційний патерн @supabase/ssr ≥ 0.10: setAll(cookies, headers) — заголовки
// Cache-Control/Expires/Pragma копіюємо у відповідь, щоб CDN не кешував auth-відповіді.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { NEXT_PATH_HEADER, loginPath, returnPath } from "@/lib/auth/safe-next";
import { isPublicPath } from "./public-paths";


export async function updateSession(request: NextRequest) {
  // Куди вело посилання: для redirect на вхід тут і в серверних компонентах (requireViewer, AC-DSYS-08). Заголовок
  // завжди перезаписуємо: значення від клієнта не довіряємо (а читач ще й проганяє його через safeNext).
  const target = returnPath(request.nextUrl.pathname, request.nextUrl.search);
  request.headers.set(NEXT_PATH_HEADER, target);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Між createServerClient і getClaims() не додавайте жодного коду:
  // інакше користувачів може випадково «розлогінювати».
  // getClaims() перевіряє підпис JWT; getSession() для авторизації НЕ використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const isPublic = isPublicPath(request.nextUrl.pathname);

  if (!claims && !isPublic) {
    // Вхід повертає на сторінку, на яку вело посилання (AC-DSYS-08): /login?next=<шлях і query>.
    return NextResponse.redirect(new URL(loginPath(target), request.url));
  }

  // Повертаємо саме supabaseResponse: у ньому оновлені cookie сесії.
  return supabaseResponse;
}
