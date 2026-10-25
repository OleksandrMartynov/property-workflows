import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { versionList } from "@/lib/templates/editor";
import { Forbidden } from "@/app/_components/forbidden";
import { PageShell } from "@/app/_components/ui";

// Список версій шаблону (лише адміністратор): номер, дата й час за Києвом, email автора, від новішої (AC-EDITOR-05).
// Менеджер — «Not enough rights» без жодної версії (AC-EDITOR-07); старих версій база йому й так не віддає.
export const metadata = { title: "Versions" };

export default async function TemplateVersionsPage({ params }: PageProps<"/templates/[id]/versions">) {
  const [{ id }, { supabase, viewer }] = await Promise.all([params, requireViewer()]);
  if (!canManageTemplates(viewer.role)) return <Forbidden title="Versions" />;

  const { data: drafts, error: draftsError } = await supabase.rpc("list_template_drafts");
  if (draftsError) throw draftsError;
  const template = (drafts ?? []).find((d) => d.id === id);
  if (!template) notFound();

  const { data: versions, error } = await supabase.from("template_versions").select("number, saved_at, saved_by").eq("template_id", id);
  if (error) throw error;
  const authorIds = [...new Set((versions ?? []).map((v) => v.saved_by).filter((x): x is string => Boolean(x)))];
  // Адміністратор бачить профілі інших користувачів (матриця прав).
  const { data: authors, error: authorsError } = authorIds.length
    ? await supabase.from("profiles").select("id, email").in("id", authorIds)
    : { data: [] as { id: string; email: string | null }[], error: null };
  if (authorsError) throw authorsError;
  const rows = versionList(versions ?? [], new Map((authors ?? []).map((a) => [a.id, a.email])));

  return (
    <PageShell title={`Versions of “${template.name}”`} back={{ href: `/templates/${id}/edit`, label: "Editor" }}>
      {rows.length === 0 ? (
        <EmptyState title="No versions yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Saved</TableHead>
              <TableHead>Saved by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.label} data-testid="version-row">
                <TableCell className="font-medium">{v.label}</TableCell>
                <TableCell className="tabular">{v.savedAt}</TableCell>
                <TableCell>{v.author}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageShell>
  );
}
