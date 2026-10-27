import Link from "next/link";
import { shownName } from "@/lib/templates/display-name";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon, LayersIcon, PlusIcon, TemplateIcon } from "@/components/ui/icons";
import { InlineInput } from "@/components/ui/inline-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { requiredLabel } from "@/lib/runs/labels";
import {
  changeLines,
  draftChanges,
  type ItemChange,
} from "@/lib/templates/changes";
import type { VersionTask } from "@/lib/templates/current";
import { formatSavedAt, versionAuthor } from "@/lib/templates/editor";
import { SubmitButton } from "@/app/_components/submit-button";
import { Notice, PageShell } from "@/app/_components/ui";
import {
  addSection,
  addTask,
  renameSection,
  renameTemplate,
  updateTask,
} from "../actions";
import { CollapsibleSection } from "./collapsible-section";
import { EditorPreview } from "./editor-preview";
import { ItemActions } from "./item-actions";
import { ModeSwitch } from "./mode-switch";
import { PublishBar } from "./publish-bar";

export interface EditorTemplate {
  id: string;
  name: string;
  current_version: number | null;
  has_unpublished_changes: boolean;
}
export interface EditorSection {
  id: string;
  name: string;
}
export interface EditorTask {
  id: string;
  section_id: string;
  name: string;
  required: boolean;
}

const CHANGE_LABEL: Record<ItemChange, string> = {
  new: "New",
  edited: "Edited",
};
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Тіло редактора шаблону: секції й задачі як у чеклісті запуску, праворуч — «Details». Дані читає сторінка
 * (page.tsx), тут — лише вигляд. Назви редагуються на місці, «required» — одним кліком; кожна зміна — форма з server
 * action, що зберігає її одразу (AC-EDITOR-01). «Save» створює версію (AC-EDITOR-03, AC-EDITOR-04). Позначки
 * «New» / «Edited» і «Changes since Version N» — порівняння з поточною версією (lib/templates/changes).
 */
export function EditorView({
  template,
  sections,
  tasks,
  current,
  versionTasks,
  latest,
  authorEmail,
  message,
  savedNumber,
  mode = "edit",
}: {
  template: EditorTemplate;
  sections: EditorSection[];
  tasks: EditorTask[];
  current: { number: number } | null;
  versionTasks: VersionTask[] | null;
  latest: { saved_at: string; saved_by: string | null } | null;
  authorEmail: string | null;
  message?: string;
  savedNumber: string | null;
  /** «Preview» — чекліст, який отримає запуск після збереження версії; «Edit» — редагування. */
  mode?: "edit" | "preview";
}) {
  const id = template.id;
  const changes = draftChanges(sections, tasks, versionTasks);
  const changeList = template.has_unpublished_changes
    ? changeLines(changes.summary)
    : [];
  const required = tasks.filter((t) => t.required).length;
  const hidden = <input type="hidden" name="template_id" value={id} />;
  const savedBy = latest ? versionAuthor(latest.saved_by, authorEmail) : null;
  // Наскрізна нумерація задач у порядку секцій — як у чеклісті запуску.
  const numberOf = new Map(
    sections
      .flatMap((s) => tasks.filter((t) => t.section_id === s.id))
      .map((t, i) => [t.id, i + 1]),
  );

  return (
    <PageShell
      title={shownName(template.name, "template")}
      titleSlot={
        <div className="flex max-w-2xl items-center gap-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md bg-state-selected text-primary"
            aria-hidden="true"
          >
            <TemplateIcon />
          </span>
          <form action={renameTemplate} className="flex min-w-0 flex-1">
            {hidden}
            <InlineInput
              name="name"
              size="title"
              defaultValue={template.name}
              aria-label="Template name"
              placeholder="Template name"
              allowEmpty
            />
          </form>
        </div>
      }
      back={{ href: "/templates", label: "Templates" }}
      description={
        <span className="flex flex-wrap items-center gap-2">
          {template.has_unpublished_changes ? (
            <StatusBadge status="due-soon" data-testid="unpublished">
              Unpublished changes
            </StatusBadge>
          ) : null}
          <span className="tabular text-meta">
            {template.current_version === null
              ? "No saved version"
              : `Current version ${template.current_version}`}
          </span>
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ModeSwitch mode={mode} />
          <Link
            href={`/templates/${id}/versions`}
            className={buttonVariants({ variant: "ghost" })}
          >
            <HistoryIcon />
            Versions
          </Link>
        </div>
      }
    >
      {savedNumber ? (
        <Notice kind="success">{`Version ${savedNumber} saved`}</Notice>
      ) : null}
      {message ? <Notice kind="error">{message}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {mode === "preview" ? (
          <EditorPreview sections={sections} tasks={tasks} />
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            {sections.length === 0 ? (
              <EmptyState
                title="No sections yet."
                action={
                  <form
                    action={addSection}
                    className="flex w-full max-w-sm items-center gap-2"
                  >
                    {hidden}
                    <Input
                      name="name"
                      placeholder="Section name"
                      aria-label="New section"
                      autoComplete="off"
                    />
                    <SubmitButton pendingText="Adding…">
                      <PlusIcon className="size-3.5" />
                      Add section
                    </SubmitButton>
                  </form>
                }
              />
            ) : null}

            {sections.map((section, si) => {
              const own = tasks.filter((t) => t.section_id === section.id);
              const ownRequired = own.filter((t) => t.required).length;
              const sectionChange = changes.sections.get(section.id);
              const others = sections
                .filter((s) => s.id !== section.id)
                .map((s) => ({ id: s.id, name: s.name }));
              return (
                <section
                  key={section.id}
                  className="flex flex-col gap-2"
                  data-testid="editor-section"
                  aria-labelledby={`section-${section.id}`}
                >
                  <h2 id={`section-${section.id}`} className="sr-only">
                    {shownName(section.name, "section")}
                  </h2>
                  <CollapsibleSection
                    name={shownName(section.name, "section")}
                    header={
                      <>
                    <form
                      action={renameSection}
                      className="flex min-w-0 flex-1"
                    >
                      {hidden}
                      <input
                        type="hidden"
                        name="section_id"
                        value={section.id}
                      />
                      <InlineInput
                        name="name"
                        size="heading"
                        defaultValue={section.name}
                        aria-label="Section name"
                        placeholder="Section name"
                        allowEmpty
                      />
                    </form>
                    {sectionChange ? (
                      <Badge variant="changed" data-testid="section-change">
                        {CHANGE_LABEL[sectionChange]}
                      </Badge>
                    ) : null}
                    <span className="hidden tabular text-meta whitespace-nowrap text-muted-foreground sm:inline">
                      {plural(own.length, "task", "tasks")} · {ownRequired}{" "}
                      required
                    </span>
                    <ItemActions
                      templateId={id}
                      kind="section"
                      id={section.id}
                      name={shownName(section.name, "section")}
                      canMoveUp={si > 0}
                      canMoveDown={si < sections.length - 1}
                    />
                      </>
                    }
                  >
                  <Card className="overflow-hidden">
                    <ol className="flex flex-col divide-y divide-border">
                      {own.map((task, ti) => {
                        const change = changes.tasks.get(task.id);
                        return (
                          <li
                            key={task.id}
                            data-testid="editor-task"
                            className="group/item flex min-h-11 items-center gap-2 py-1 pr-2 pl-3 transition-ui hover:bg-state-hover"
                          >
                            <span
                              className="w-5 shrink-0 text-right tabular text-meta text-muted-foreground"
                              aria-hidden="true"
                            >
                              {numberOf.get(task.id)}
                            </span>
                            <form
                              action={updateTask}
                              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1"
                            >
                              {hidden}
                              <input
                                type="hidden"
                                name="task_id"
                                value={task.id}
                              />
                              <InlineInput
                                name="name"
                                defaultValue={task.name}
                                aria-label="Task name"
                                placeholder="Task name"
                                allowEmpty
                                containerClassName="basis-44"
                              />
                              <span className="flex items-center gap-2">
                                {change ? (
                                  <Badge
                                    variant="changed"
                                    data-testid="task-change"
                                  >
                                    {CHANGE_LABEL[change]}
                                  </Badge>
                                ) : null}
                                <ToggleChip
                                  name="required"
                                  defaultChecked={task.required}
                                  submitOnChange
                                  onLabel={requiredLabel(true)}
                                  offLabel={requiredLabel(false)}
                                  aria-label={`Required: ${shownName(task.name, "task")}`}
                                />
                              </span>
                            </form>
                            <ItemActions
                              templateId={id}
                              kind="task"
                              id={task.id}
                              name={shownName(task.name, "task")}
                              canMoveUp={ti > 0}
                              canMoveDown={ti < own.length - 1}
                              moveTargets={others}
                            />
                          </li>
                        );
                      })}
                      <li className="group/add bg-muted/30 py-1 pr-2 pl-3">
                        <form
                          action={addTask}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1"
                        >
                          {hidden}
                          <input
                            type="hidden"
                            name="section_id"
                            value={section.id}
                          />
                          <span
                            className="grid size-5 shrink-0 place-items-center rounded-full text-primary transition-ui group-focus-within/add:bg-primary group-focus-within/add:text-primary-foreground group-hover/add:bg-primary group-hover/add:text-primary-foreground"
                            aria-hidden="true"
                          >
                            <PlusIcon className="size-3.5" />
                          </span>
                          <InlineInput
                            name="name"
                            commit="enter"
                            tone="accent"
                            placeholder="Add a task"
                            aria-label={`New task in ${shownName(section.name, "section")}`}
                            containerClassName="basis-44"
                          />
                          <span className="flex items-center gap-2 transition-ui md:opacity-0 md:group-hover/add:opacity-100 md:group-focus-within/add:opacity-100">
                            <ToggleChip
                              name="required"
                              onLabel={requiredLabel(true)}
                              offLabel={requiredLabel(false)}
                              aria-label="Required"
                            />
                            <SubmitButton
                              size="sm"
                              variant="secondary"
                              pendingText="Adding…"
                            >
                              Add task
                            </SubmitButton>
                          </span>
                        </form>
                      </li>
                    </ol>
                  </Card>
                  </CollapsibleSection>
                </section>
              );
            })}

            {sections.length ? (
              <form
                action={addSection}
                className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-primary/40 py-1.5 pr-2 pl-3 transition-ui focus-within:border-ring focus-within:bg-card hover:border-primary/70 hover:bg-state-selected"
              >
                {hidden}
                <span
                  className="grid w-5 shrink-0 place-items-center text-primary"
                  aria-hidden="true"
                >
                  <LayersIcon />
                </span>
                <InlineInput
                  name="name"
                  commit="enter"
                  tone="accent"
                  size="heading"
                  placeholder="Add a section"
                  aria-label="New section"
                  containerClassName="basis-44"
                />
                <SubmitButton size="sm" variant="outline" pendingText="Adding…">
                  <PlusIcon className="size-3.5" />
                  Add section
                </SubmitButton>
              </form>
            ) : null}
          </div>
        )}

        <aside className="lg:sticky lg:top-6">
          <Card
            className="flex flex-col gap-4 p-4"
            data-testid="editor-details"
          >
            <h2 className="text-heading">Details</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Sections", sections.length],
                ["Tasks", tasks.length],
                ["Required", required],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 rounded-sm bg-muted/60 px-2.5 py-2"
                >
                  <span className="tabular text-heading">{value}</span>
                  <span className="text-meta text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {tasks.length ? (
              <div className="flex flex-col gap-1.5">
                {/* Частка обов'язкових задач: смужка — лише підсилення, число — словами поруч. */}
                <div
                  className="flex h-1.5 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="animate-ui-grow rounded-full bg-primary"
                    style={{ width: `${(required / tasks.length) * 100}%` }}
                  />
                </div>
                <span className="tabular text-meta text-muted-foreground">
                  {`${required} of ${tasks.length} required`}
                </span>
              </div>
            ) : null}
            <dl className="flex flex-col text-body [&>dd]:mb-3.5 [&>dd:last-child]:mb-0">
              <dt className="mb-1 text-meta text-muted-foreground">
                Current version
              </dt>
              <dd className="tabular">
                {current ? `Version ${current.number}` : "No saved version"}
              </dd>
              {latest ? (
                <>
                  <dt className="mb-1 text-meta text-muted-foreground">
                    Saved
                  </dt>
                  <dd className="tabular">{formatSavedAt(latest.saved_at)}</dd>
                  <dt className="mb-1 text-meta text-muted-foreground">
                    Saved by
                  </dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    {authorEmail ? <Avatar email={authorEmail} /> : null}
                    <span className="min-w-0 break-words">{savedBy}</span>
                  </dd>
                </>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>

      {template.has_unpublished_changes ? (
        <PublishBar
          templateId={id}
          lines={
            changeList.length && current
              ? [`Since Version ${current.number}`, ...changeList]
              : []
          }
        />
      ) : null}
    </PageShell>
  );
}
