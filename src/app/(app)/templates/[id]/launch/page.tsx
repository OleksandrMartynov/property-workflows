import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { errorMessage, MESSAGES } from "@/lib/runs/messages";
import { findTemplateDraft, isUuid, loadCurrentVersions, loadVersionTasks, toLaunchSections } from "@/lib/templates/current";
import { canManageTemplates, isVendor, requireViewer } from "@/lib/supabase/viewer";
import { Forbidden } from "@/app/_components/forbidden";
import { PageShell } from "@/app/_components/ui";
import { ClearSearchParams, FlashNotice } from "@/components/ui/flash-notice";
import { launchRun } from "../../../runs/actions";
import { LaunchForm } from "./_components/launch-form";

// AC-RUN-01, AC-RUN-03, AC-RUN-04, AC-RUN-07…09: назва випадку і виконавець кожної задачі
// (за замовчуванням — той, хто запускає; він же менеджер запуску). Шаблон без збереженої версії: адміністратор бачить
// примітку замість форми (AC-EDITOR-10), менеджер — «Template not found» (AC-EDITOR-16); запуску з нього немає ні в кого.
export default async function LaunchTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/launch">) {
  const [{ id }, { error, case_name }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();
  // Q12 (add-vendor), AC-VENDOR-09: підрядник не запускає шаблон — форми запуску не показуємо.
  if (isVendor(viewer.role)) return <Forbidden title="Launch a template" role={viewer.role} />;
  if (!isUuid(id)) notFound();

  // Запускаємо лише поточну версію (AC-EDITOR-06): назва, секції й задачі — зі знімка версії, не з незбережених змін.
  const [template] = await loadCurrentVersions(supabase, [id]);
  if (!template) {
    if (canManageTemplates(viewer.role)) {
      // Лише адміністратор бачить незбережений шаблон (функція бази перевіряє роль сама).
      const draft = await findTemplateDraft(supabase, id);
      if (draft) {
        return (
          <PageShell title={`Launch “${draft.name}”`} back={{ href: "/templates", label: "Templates" }}>
            <Alert variant="info">{MESSAGES.TEMPLATE_NOT_PUBLISHED}</Alert>
          </PageShell>
        );
      }
    }
    notFound();
  }

  const [versionTasks, { data: users }] = await Promise.all([
    loadVersionTasks(supabase, [template.versionId]),
    // Робоче припущення Q1: у списку — лише email менеджерів і адміністраторів.
    supabase.rpc("list_assignable_users"),
  ]);
  const { sections, tasks } = toLaunchSections(versionTasks);
  const others = (users ?? []).filter((u) => u.id !== viewer.id);
  // AC-RUN-03, AC-RUN-07: помилка назви випадку — під самим полем (з фокусом), решта — повідомленням над формою.
  const fieldError = error === "CASE_NAME_REQUIRED" || error === "CASE_NAME_TOO_LONG" ? errorMessage(error) : undefined;
  const message = fieldError ? undefined : errorMessage(error);

  return (
    <PageShell title={`Launch “${template.name}”`} back={{ href: `/templates/${template.templateId}`, label: template.name }}>
      {/* Помилку поля показує сама форма; параметр із адреси прибираємо так само, щоб не поверталась після перезавантаження. */}
      {fieldError ? <ClearSearchParams names={["error"]} /> : null}
      {message ? (
        <FlashNotice kind="error" clear={["error"]}>
          {message}
        </FlashNotice>
      ) : null}
      <LaunchForm
        templateId={template.templateId}
        templateName={template.name}
        sections={sections}
        tasks={tasks}
        viewer={viewer}
        others={others}
        caseName={typeof case_name === "string" ? case_name : ""}
        caseNameError={fieldError}
        action={launchRun}
      />
    </PageShell>
  );
}
