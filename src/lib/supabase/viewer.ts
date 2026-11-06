// Хто відкрив сторінку: id з JWT (getClaims), роль з profiles (не з user_metadata).
// Лише для серверу (Server Components і Server Actions).
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NEXT_PATH_HEADER, loginPath } from "@/lib/auth/safe-next";
import { createClient } from "./server";

export type AppRole = "manager" | "admin" | "vendor";
export interface Viewer {
  id: string;
  role: AppRole;
  email: string | null;
}

// Ролі застосунку (requirements/product.md): vendor — підрядник із зрізу 3; requireViewer пускає кожну з них.
const ROLES: readonly AppRole[] = ["manager", "admin", "vendor"];
const isRole = (value: unknown): value is AppRole => ROLES.includes(value as AppRole);

/** Адреса входу з поверненням на поточну сторінку (шлях передає proxy; safeNext у loginPath відсіює чуже). */
export async function loginRedirectPath() {
  return loginPath((await headers()).get(NEXT_PATH_HEADER));
}

/**
 * Хто відкрив сторінку — один раз на запит (React cache): layout, сторінка й requireViewer беруть ті самі claims і
 * профіль, а не ходять в Auth і profiles кожен окремо. Лише читання; рішення «пускати чи ні» — у requireViewer.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  // getClaims() перевіряє підпис JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  if (!claims) return { supabase, claims: null, profile: null };
  // RLS: користувач бачить власний профіль. Роль — лише з profiles.role, ніколи з user_metadata.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();
  return { supabase, claims, profile };
});

/** Мої задачі «to do» (RLS лишає лише видимі) — один підрахунок на запит для нагадування в layout і головної. */
export const countMyOpenTasks = cache(async (userId: string) => {
  const { supabase } = await getViewer();
  const { count, error } = await supabase
    .from("run_tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", userId)
    .eq("status", "to_do");
  if (error) throw new Error(error.message);
  return count ?? 0;
});

/** Для сторінок і дій застосунку: без входу — на /login?next=…, без ролі manager/admin — на головну. */
export async function requireViewer() {
  const { supabase, claims, profile } = await getViewer();
  if (!claims) redirect(await loginRedirectPath());
  if (!isRole(profile?.role)) redirect("/");

  const viewer: Viewer = { id: claims.sub, role: profile.role, email: profile.email ?? claims.email ?? null };
  return { supabase, viewer };
}

/** Підрядник (vendor) бачить лише свої задачі й запуски з ними; шаблонів, версій і email інших не бачить (зріз 3). */
export const isVendor = (role: AppRole) => role === "vendor";

/** Шаблони створює, редагує й зберігає як версію лише admin (матриця прав «Create a template, edit it and save it…»). */
export const canManageTemplates = (role: AppRole) => role === "admin";

/**
 * Для дій адміністратора (редактор шаблону): getClaims() і роль із profiles — до будь-якого запису. Не admin — на
 * сторінку `deniedPath`, де показано «Not enough rights»; запис не відбувається (AC-EDITOR-08, AC-DSYS-02).
 */
export async function requireAdmin(deniedPath = "/templates") {
  const result = await requireViewer();
  if (!canManageTemplates(result.viewer.role)) redirect(deniedPath);
  return result;
}
