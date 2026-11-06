import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { countMyOpenTasks, getViewer } from "@/lib/supabase/viewer";
import { PageShell } from "@/app/_components/ui";
import { HomeView, type MyTask } from "@/app/_components/home-view";
import { loadRunSummaries } from "./runs/_lib/summaries";

// Головна: хто увійшов і куди далі. Сторінка читає cookies, тому рендериться динамічно.
export const metadata = { title: "Home" };

const MY_TASKS_MAX = 5;

type Supabase = Awaited<ReturnType<typeof getViewer>>["supabase"];

/** Мої задачі «to do» для блоку «Your tasks» (RLS лишає лише видимі) з назвою запуску — одним запитом. */
async function loadMyTasks(supabase: Supabase, userId: string): Promise<MyTask[]> {
  const { data, error } = await supabase
    .from("run_tasks")
    .select("id, name, run_id, runs(case_name)")
    .eq("assignee_id", userId)
    .eq("status", "to_do")
    .order("run_id")
    .order("section_position")
    .order("position")
    .limit(MY_TASKS_MAX);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, run_id: t.run_id, run_name: t.runs?.case_name ?? "—" }));
}

export default async function Home() {
  // Claims і профіль — ті самі, що вже прочитав layout (getViewer кешує їх на запит).
  // RLS: користувач бачить лише власний профіль, а запуски й задачі — лише дозволені йому.
  const { supabase, claims, profile } = await getViewer();
  if (!claims) {
    redirect("/login");
  }

  // Підрядник не бачить запусків агенції й шаблонів: його головна — список запусків зі своїми задачами (AC-VENDOR-03).
  if (profile?.role === "vendor") redirect("/runs");

  const count = { count: "exact", head: true } as const;
  const [active, completed, mine, recent, myTasks] = await Promise.all([
    supabase.from("runs").select("id", count).eq("status", "in_progress"),
    supabase.from("runs").select("id", count).eq("status", "completed"),
    // Той самий підрахунок, що й нагадування біля «Runs» у layout — без другого запиту.
    countMyOpenTasks(claims.sub),
    supabase
      .from("runs")
      .select("id, case_name, template_name, status, run_manager_id")
      .order("created_at", { ascending: false })
      .order("id")
      .limit(5),
    loadMyTasks(supabase, claims.sub),
  ]);
  const failed = [active, completed, recent].find((result) => result.error);
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
          mine={mine}
          completed={completed.count ?? 0}
          myTasks={myTasks}
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
