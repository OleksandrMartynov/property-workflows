import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { createClient } from "@/lib/supabase/server";
import { loginRedirectPath } from "@/lib/supabase/viewer";
import { signOut } from "../login/actions";
import { searchWorkspace } from "./search/actions";

// Спільний каркас сторінок після входу: AppShell (сайдбар, акаунт, ⌘K) монтується один раз на сегмент і не
// перемонтовується під час навігації між сторінками — фокус, палітра й вікно акаунта не скидаються (рев'ю PR #18).
// Це лише вигляд: кожна сторінка й дія сама перевіряє вхід і роль (requireViewer → getClaims).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(await loginRedirectPath());

  // RLS: користувач бачить власний профіль.
  const [{ data: profile }, { count: openTasks }] = await Promise.all([
    supabase.from("profiles").select("email, role").eq("id", claims.sub).maybeSingle(),
    // Нагадування в застосунку (замість листів, поза scope PM): мої задачі «to do» — той самий підрахунок, що й
    // «Your open tasks» на головній; RLS лишає лише видимі.
    supabase.from("run_tasks").select("id", { count: "exact", head: true }).eq("assignee_id", claims.sub).eq("status", "to_do"),
  ]);

  return (
    <AppShell email={profile?.email ?? claims.email ?? null} role={profile?.role} signOutAction={signOut} search={searchWorkspace} openTasks={openTasks ?? 0}>
      {children}
    </AppShell>
  );
}
