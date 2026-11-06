import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/ui/app-shell";
import { countMyOpenTasks, getViewer, loginRedirectPath } from "@/lib/supabase/viewer";
import { signOut } from "../login/actions";
import { searchWorkspace } from "./search/actions";

// Спільний каркас сторінок після входу: AppShell (сайдбар, акаунт, ⌘K) монтується один раз на сегмент і не
// перемонтовується під час навігації між сторінками — фокус, палітра й вікно акаунта не скидаються (рев'ю PR #18).
// Це лише вигляд: кожна сторінка й дія сама перевіряє вхід і роль (requireViewer → getClaims).
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Claims і профіль — ті самі, що візьме сторінка (getViewer кешує їх на запит).
  const { claims, profile } = await getViewer();
  if (!claims) redirect(await loginRedirectPath());
  // Нагадування в застосунку (замість листів, поза scope PM): мої задачі «to do» — той самий підрахунок, що й
  // «Your open tasks» на головній (один на запит).
  const openTasks = await countMyOpenTasks(claims.sub);

  return (
    <AppShell email={profile?.email ?? claims.email ?? null} role={profile?.role} signOutAction={signOut} search={searchWorkspace} openTasks={openTasks}>
      {children}
    </AppShell>
  );
}
