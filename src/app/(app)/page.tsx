import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/app/_components/ui";
import { HomeView } from "@/app/_components/home-view";
import { loadRunSummaries } from "./runs/_lib/summaries";

// Головна: хто увійшов і куди далі. Сторінка читає cookies, тому рендериться динамічно.
export const metadata = { title: "Home" };

export default async function Home() {
  const supabase = await createClient();

  // getClaims() перевіряє JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/login");
  }

  // RLS: користувач бачить лише власний профіль, а запуски й задачі — лише дозволені йому.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  // Підрядник не бачить запусків агенції й шаблонів: його головна — список запусків зі своїми задачами (AC-VENDOR-03).
  if (profile?.role === "vendor") redirect("/runs");

  const count = { count: "exact", head: true } as const;
  const [active, completed, mine, recent] = await Promise.all([
    supabase.from("runs").select("id", count).eq("status", "in_progress"),
    supabase.from("runs").select("id", count).eq("status", "completed"),
    supabase.from("run_tasks").select("id", count).eq("assignee_id", claims.sub).eq("status", "to_do"),
    supabase
      .from("runs")
      .select("id, case_name, template_name, status, run_manager_id")
      .order("created_at", { ascending: false })
      .order("id")
      .limit(5),
  ]);
  const failed = [active, completed, mine, recent].find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  const runs = recent.data ?? [];
  const { summary, emailOf } = profile ? await loadRunSummaries(supabase, runs.map((r) => r.id)) : { summary: {}, emailOf: new Map<string, string | null>() };
  const managerOf = (run: { run_manager_id: string }) => (run.run_manager_id === claims.sub ? "me" : (emailOf.get(run.run_manager_id) ?? "—"));

  return (
    <PageShell
      title="Home"
      actions={
        profile ? (
          <Link href="/templates" className={buttonVariants({ variant: "default" })}>
            Launch a template
          </Link>
        ) : undefined
      }
    >
      {profile ? (
        <HomeView
          active={active.count ?? 0}
          mine={mine.count ?? 0}
          completed={completed.count ?? 0}
          runs={runs}
          summary={summary}
          managerOf={managerOf}
        />
      ) : (
        // copy-ok: стан помилки профілю, не пояснення
        <p className="text-body text-muted-foreground">Profile not found — ask an administrator.</p>
      )}
    </PageShell>
  );
}
