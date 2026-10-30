import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PencilIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { findTemplateDraft } from "@/lib/templates/current";
import { versionList } from "@/lib/templates/editor";
import { Forbidden } from "@/app/_components/forbidden";
import { PageShell } from "@/app/_components/ui";
import { VersionsTimeline } from "./_components/versions-timeline";

// Список версій шаблону (лише адміністратор): номер, дата й час за Києвом, email автора, від новішої (AC-EDITOR-05) —
// стрічкою: поточна версія позначена «Current». Менеджер — «Not enough rights» без жодної версії (AC-EDITOR-07);
// старих версій база йому й так не віддає. Шаблон без жодної версії — «No versions yet. Save the template to create
// version 1.» замість порожньої таблиці (AC-EDITOR-18).
export const metadata = { title: "Versions" };

export default async function TemplateVersionsPage({ params }: PageProps<"/templates/[id]/versions">) {
  const [{ id }, { supabase, viewer }] = await Promise.all([params, requireViewer()]);
  if (!canManageTemplates(viewer.role)) return <Forbidden title="Versions" role={viewer.role} />;

  const template = await findTemplateDraft(supabase, id);
  if (!template) notFound();

  const { data: versions, error } = await supabase.from("template_versions").select("number, saved_at, saved_by").eq("template_id", id);
  if (error) throw error;
  const authorIds = [...new Set((versions ?? []).map((v) => v.saved_by).filter((x): x is string => Boolean(x)))];
  // Адміністратор бачить профілі інших користувачів (матриця прав).
  const { data: authors, error: authorsError } = authorIds.length
    ? await supabase.from("profiles").select("id, email").in("id", authorIds)
    : { data: [] as { id: string; email: string | null }[], error: null };
  if (authorsError) throw authorsError;
  const emailOf = new Map((authors ?? []).map((a) => [a.id, a.email]));
  const rows = versionList(versions ?? [], emailOf);
  const currentLabel = template.current_version === null ? null : `Version ${template.current_version}`;

  return (
    <PageShell
      title={`Versions of “${template.name}”`}
      back={{ href: `/templates/${id}/edit`, label: "Editor" }}
      description={
        template.has_unpublished_changes ? (
          <StatusBadge status="due-soon" data-testid="unpublished">
            Unpublished changes
          </StatusBadge>
        ) : undefined
      }
      actions={
        <Link href={`/templates/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
          <PencilIcon />
          Edit
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No versions yet. Save the template to create version 1." />
      ) : (
        <VersionsTimeline rows={rows} currentLabel={currentLabel} />
      )}
    </PageShell>
  );
}
