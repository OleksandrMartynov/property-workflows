import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

// Спільний каркас сторінок після входу: AppShell (сайдбар, акаунт, ⌘K) монтується один раз на сегмент і не
// перемонтовується під час навігації між сторінками — фокус, палітра й вікно акаунта не скидаються (рев'ю PR #18).
// Це лише вигляд: кожна сторінка й дія сама перевіряє вхід і роль (requireViewer → getClaims).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // RLS: користувач бачить власний профіль.
  const { data: profile } = await supabase.from("profiles").select("email, role").eq("id", claims.sub).maybeSingle();

  return (
    <AppShell email={profile?.email ?? claims.email ?? null} role={profile?.role} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
