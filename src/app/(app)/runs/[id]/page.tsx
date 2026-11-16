import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { runStatusLabel, runStatusTone } from "@/lib/runs/labels";
import { canParseDocuments } from "@/lib/runs/access";
import { errorMessage } from "@/lib/runs/messages";
import { isVendor, requireViewer } from "@/lib/supabase/viewer";
import { isUuid } from "@/lib/templates/current";
import { PageShell } from "@/app/_components/ui";
import { morphName } from "@/components/ui/motion";
import { FlashNotice } from "@/components/ui/flash-notice";
import { DoneTaskNotice } from "./_components/done-task-notice";
import { completeTask } from "../actions";
import { requestDocumentDraft, saveRunDocument } from "./document-actions";
import { RunDetail } from "./_components/run-detail";
import { VendorRunPage } from "./_components/vendor-run-page";

// «Parse a document» (зріз 4, AC-DOCAI-01…16): дії передаємо в дерево явно — клієнтський блок без імпорту серверного коду.
const DOCUMENT_ACTIONS = { requestDraft: requestDocumentDraft, save: saveRunDocument };

// Сторінка запуску: AC-RUN-02, AC-RUN-12 (задачі й секції — копія на момент запуску), AC-RUN-04…09 (менеджер запуску й
// виконавці), AC-TASK-05 (прогрес «N of M done»), AC-TASK-08 (статус кожної задачі), AC-TASK-01…03, 07, 18 (позначка
// виконаною лише на дозволених задачах), AC-TASK-11 (email виконавця), AC-TASK-12 (групи за секціями), AC-TASK-15
// («required» / «optional»). Чужий запуск RLS не віддає — notFound() і «Run not found» (AC-TASK-10, not-found.tsx).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const [{ id }, { error, done, task }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();
  const message = errorMessage(error);

  // AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06: сторінка запуску очима підрядника — окремий компонент.
  // Серверний компонент без хуків — викликаємо як функцію: сторінка повертає вже готове дерево.
  if (isVendor(viewer.role)) return await VendorRunPage({ id, message, doneTaskId: done === "task" && typeof task === "string" ? task : null, supabase, viewer });

  // Некоректний id — одразу «Run not found», без запитів (інакше Postgres дав би загальну помилку).
  if (!isUuid(id)) notFound();
  // Запуск, задачі й користувачі — одним кроком: задачі від рядка запуску не залежать (−1 round-trip). Чужий запуск
  // RLS не віддає ні рядком, ні задачами.
  const [{ data: run }, { data: tasks }, { data: users }] = await Promise.all([
    supabase
      .from("runs")
      .select("id, case_name, template_name, template_version, status, run_manager_id, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("run_tasks")
      .select("id, section_name, section_position, position, name, required, assignee_id, status")
      .eq("run_id", id)
      .order("section_position")
      .order("position"),
    supabase.rpc("list_assignable_users"),
  ]);
  if (!run) notFound();
  const emailOf = new Map((users ?? []).map((u) => [u.id, u.email]));
  // AC-DOCAI-14, 15: блок і записи — лише менеджеру цього запуску й адміністратору; RLS run_documents те саме.
  const canParse = canParseDocuments(viewer, run);
  const { data: documentRows, error: documentsError } = canParse
    ? await supabase
        .from("run_documents")
        .select("id, kind, phone, description, category, urgency, items, total, saved_by, saved_at")
        .eq("run_id", run.id)
        .order("saved_at", { ascending: false })
    : { data: null, error: null };
  if (documentsError) throw new Error(documentsError.message);

  return (
    <PageShell
      title={run.case_name}
      titleMorph={morphName("run", run.id)}
      description={run.template_name}
      back={{ href: "/runs", label: "Runs" }}
      actions={<StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>}
    >
      {done === "launched" ? (
        <FlashNotice kind="success" clear={["done"]}>
          Run launched.
        </FlashNotice>
      ) : null}
      <DoneTaskNotice tasks={tasks ?? []} done={done} task={task} />
      {message ? (
        <FlashNotice kind="error" clear={["error"]}>
          {message}
        </FlashNotice>
      ) : null}
      <RunDetail run={run} tasks={tasks ?? []} emailOf={emailOf} viewer={viewer} completeTask={completeTask}
        documents={canParse ? { actions: DOCUMENT_ACTIONS, rows: documentRows ?? [] } : undefined}
      />
    </PageShell>
  );
}
