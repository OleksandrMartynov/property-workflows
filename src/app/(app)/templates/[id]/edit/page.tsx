import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { requiredLabel } from "@/lib/runs/labels";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { Forbidden } from "@/app/_components/forbidden";
import { SubmitButton } from "@/app/_components/submit-button";
import { Notice, PageShell } from "@/app/_components/ui";
import {
  addSection,
  addTask,
  moveSection,
  moveTask,
  moveTaskToSection,
  removeSection,
  removeTask,
  renameSection,
  renameTemplate,
  saveVersion,
  updateTask,
} from "./actions";

// Редактор шаблону (адміністратор, задача 2): секції, задачі, позначка «Required». Кожна зміна — окрема форма з дією,
// яка зберігає її одразу (AC-EDITOR-01); «Save» створює версію (AC-EDITOR-03, AC-EDITOR-04). Менеджер бачить лише
// «Not enough rights» без вмісту редактора (AC-DSYS-02); відвідувача без входу proxy веде на /login (AC-EDITOR-09).
export const metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/edit">) {
  const [{ id }, { error, saved }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();
  // Перевірка ролі — до будь-якого запиту незбережених змін.
  if (!canManageTemplates(viewer.role)) return <Forbidden title="Edit template" />;

  const { data: drafts, error: draftsError } = await supabase.rpc("list_template_drafts");
  if (draftsError) throw draftsError;
  const template = (drafts ?? []).find((d) => d.id === id);
  if (!template) notFound();

  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id, name, position")
    .eq("template_id", id)
    .order("position");
  if (sectionsError) throw sectionsError;
  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: tasks, error: tasksError } = sectionIds.length
    ? await supabase.from("template_tasks").select("id, section_id, name, required, position").in("section_id", sectionIds).order("position")
    : { data: [] as { id: string; section_id: string; name: string; required: boolean; position: number }[], error: null };
  if (tasksError) throw tasksError;

  const message = errorMessage(error);
  const savedNumber = typeof saved === "string" && /^\d+$/.test(saved) ? saved : null;
  const hidden = <input type="hidden" name="template_id" value={id} />;
  const sectionOptions = (sections ?? []).map((s) => ({ value: s.id, label: s.name }));

  return (
    <PageShell
      title={`Edit “${template.name}”`}
      back={{ href: "/templates", label: "Templates" }}
      description={template.current_version === null ? "No saved version" : `Current version ${template.current_version}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {template.has_unpublished_changes ? (
            <StatusBadge status="due-soon" data-testid="unpublished">
              Unpublished changes
            </StatusBadge>
          ) : null}
          <Link href={`/templates/${id}/versions`} className={buttonVariants({ variant: "ghost" })}>
            Versions
          </Link>
          <form action={saveVersion}>
            {hidden}
            <SubmitButton pendingText="Saving…" disabled={!template.has_unpublished_changes}>
              Save
            </SubmitButton>
          </form>
        </div>
      }
    >
      {savedNumber ? <Notice kind="success">{`Version ${savedNumber} saved`}</Notice> : null}
      {message ? <Notice kind="error">{message}</Notice> : null}

      <Card>
        <CardContent className="pt-4">
          <form action={renameTemplate} className="flex flex-wrap items-end gap-2">
            {hidden}
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-label">
              Template name
              <Input name="name" defaultValue={template.name} required autoComplete="off" />
            </label>
            <Button type="submit" variant="outline">
              Rename
            </Button>
          </form>
        </CardContent>
      </Card>

      {(sections ?? []).length === 0 ? <EmptyState title="No sections yet." /> : null}

      {(sections ?? []).map((section, si) => {
        const own = (tasks ?? []).filter((t) => t.section_id === section.id);
        return (
          <Card key={section.id} data-testid="editor-section">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <form action={renameSection} className="flex min-w-64 flex-1 items-end gap-2">
                  {hidden}
                  <input type="hidden" name="section_id" value={section.id} />
                  <label className="flex flex-1 flex-col gap-1 text-label">
                    Section
                    <Input name="name" defaultValue={section.name} required autoComplete="off" />
                  </label>
                  <Button type="submit" variant="outline">
                    Rename
                  </Button>
                </form>
                <form action={moveSection}>
                  {hidden}
                  <input type="hidden" name="section_id" value={section.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" disabled={si === 0} aria-label={`Move section ${section.name} up`}>
                    Move up
                  </Button>
                </form>
                <form action={moveSection}>
                  {hidden}
                  <input type="hidden" name="section_id" value={section.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" disabled={si === (sections ?? []).length - 1} aria-label={`Move section ${section.name} down`}>
                    Move down
                  </Button>
                </form>
                <form action={removeSection}>
                  {hidden}
                  <input type="hidden" name="section_id" value={section.id} />
                  <Button type="submit" variant="ghost" aria-label={`Remove section ${section.name}`}>
                    Remove
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {own.map((task, ti) => (
                <div key={task.id} data-testid="editor-task" className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  <form action={updateTask} className="flex min-w-64 flex-1 flex-wrap items-end gap-3">
                    {hidden}
                    <input type="hidden" name="task_id" value={task.id} />
                    <label className="flex min-w-48 flex-1 flex-col gap-1 text-label">
                      Task
                      <Input name="name" defaultValue={task.name} required autoComplete="off" />
                    </label>
                    <Checkbox name="required" defaultChecked={task.required} label="Required" />
                    <Button type="submit" variant="outline">
                      Update
                    </Button>
                    <span className="text-meta text-muted-foreground">{requiredLabel(task.required)}</span>
                  </form>
                  <form action={moveTask}>
                    {hidden}
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="ghost" disabled={ti === 0} aria-label={`Move task ${task.name} up`}>
                      Up
                    </Button>
                  </form>
                  <form action={moveTask}>
                    {hidden}
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" variant="ghost" disabled={ti === own.length - 1} aria-label={`Move task ${task.name} down`}>
                      Down
                    </Button>
                  </form>
                  {sectionOptions.length > 1 ? (
                    <form action={moveTaskToSection} className="flex items-end gap-2">
                      {hidden}
                      <input type="hidden" name="task_id" value={task.id} />
                      <Select
                        name="target_section_id"
                        defaultValue={section.id}
                        options={sectionOptions}
                        aria-label={`Section of task ${task.name}`}
                      />
                      <Button type="submit" variant="ghost">
                        Move
                      </Button>
                    </form>
                  ) : null}
                  <form action={removeTask}>
                    {hidden}
                    <input type="hidden" name="task_id" value={task.id} />
                    <Button type="submit" variant="ghost" aria-label={`Remove task ${task.name}`}>
                      Remove
                    </Button>
                  </form>
                </div>
              ))}
              <form action={addTask} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                {hidden}
                <input type="hidden" name="section_id" value={section.id} />
                <label className="flex min-w-48 flex-1 flex-col gap-1 text-label">
                  New task
                  <Input name="name" required autoComplete="off" />
                </label>
                <Checkbox name="required" label="Required" />
                <Button type="submit" variant="outline">
                  Add task
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}

      <form action={addSection} className="flex flex-wrap items-end gap-2">
        {hidden}
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-label">
          New section
          <Input name="name" required autoComplete="off" />
        </label>
        <Button type="submit" variant="outline">
          Add section
        </Button>
      </form>
    </PageShell>
  );
}
