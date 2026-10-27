import Link from "next/link";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon, PencilIcon, PlayIcon, TemplateIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { MESSAGES } from "@/lib/runs/messages";
import { NewTemplateDialog } from "./new-template-dialog";

export interface TemplateRow {
  id: string;
  name: string;
  /** Номер поточної версії; null — шаблон ще ніколи не збережено (видно лише адміністратору). */
  currentVersion: number | null;
  /** Є незбережені зміни (AC-EDITOR-01) — лише для адміністратора; менеджер їх ніколи не бачить (AC-EDITOR-02). */
  unpublished?: boolean;
}
export interface TemplateCounts {
  sections: number;
  total: number;
  required: number;
}
/** Секції поточної версії для короткого огляду на картці: назва й кількість задач. */
export type TemplateOutline = { name: string; tasks: number }[];

const OUTLINE_MAX = 4;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Галерея шаблонів: картка — назва, склад поточної версії й перелік її секцій, стан і дії. Назва — посилання на всю
 * картку (адміністратору — у редактор, менеджеру — на сторінку шаблону лише для читання, AC-EDITOR-02). Менеджер
 * бачить лише збережені шаблони й «Launch»; ще не збережений шаблон адміністратор бачить із вимкненим «Launch» і
 * приміткою «Save the template to launch it» (AC-EDITOR-10); адміністратор — ще «Unpublished changes», «Edit» і «Versions». Склад і секції — завжди з поточної версії,
 * а не з незбережених змін (AC-EDITOR-02).
 */
export function TemplatesList({
  templates,
  counts,
  outlines = {},
  canManage = false,
}: {
  templates: TemplateRow[];
  counts: Record<string, TemplateCounts>;
  outlines?: Record<string, TemplateOutline>;
  canManage?: boolean;
}) {
  // AC-EDITOR-17: менеджер — без таблиці й без дії; адміністратор — «Create a template» (той самий діалог, що й «New template»).
  if (!templates.length) {
    return canManage ? (
      <EmptyState title="No templates yet. Create a template to start." action={<NewTemplateDialog label="Create a template" />} />
    ) : (
      <EmptyState title="No templates yet. An administrator creates them." />
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t, index) => {
        const c = counts[t.id];
        const outline = outlines[t.id] ?? [];
        const href = canManage ? `/templates/${t.id}/edit` : t.currentVersion !== null ? `/templates/${t.id}` : null;
        const noteId = `${t.id}-launch-note`;
        return (
          <li key={t.id} className="animate-ui-rise" style={{ "--i": Math.min(index, 8) } as CSSProperties} data-testid="template-card">
            <Card className="group relative flex h-full flex-col transition-ui hover:border-border-strong hover:shadow-md has-focus-visible:border-ring">
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-state-selected text-primary" aria-hidden="true">
                    <TemplateIcon />
                  </span>
                  {canManage && t.unpublished ? (
                    <StatusBadge status="due-soon" data-testid="unpublished">
                      Unpublished changes
                    </StatusBadge>
                  ) : t.currentVersion !== null ? (
                    <Badge variant="outline" className="tabular">{`Version ${t.currentVersion}`}</Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-heading break-words">
                    {href ? (
                      <Link
                        href={href}
                        className="text-foreground no-underline outline-none after:absolute after:inset-0 after:rounded-md after:content-['']"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      t.name
                    )}
                  </h2>
                  <p className="tabular text-meta text-muted-foreground">
                    {t.currentVersion === null
                      ? "No saved version"
                      : `${plural(c?.sections ?? 0, "section", "sections")} · ${plural(c?.total ?? 0, "task", "tasks")} · ${c?.required ?? 0} required`}
                  </p>
                  {canManage && t.currentVersion === null ? (
                    <p id={noteId} className="text-meta text-muted-foreground">
                      {MESSAGES.TEMPLATE_NOT_PUBLISHED}
                    </p>
                  ) : null}
                </div>
                {outline.length ? (
                  <ol className="flex flex-col gap-1 border-t border-border pt-3 text-label font-normal">
                    {outline.slice(0, OUTLINE_MAX).map((s, i) => (
                      <li key={`${i}-${s.name}`} className="flex items-baseline gap-2">
                        <span className="w-4 shrink-0 tabular text-meta text-muted-foreground">{i + 1}</span>
                        <span className="min-w-0 flex-1 break-words">{s.name}</span>
                        <span className="tabular text-meta text-muted-foreground">{s.tasks}</span>
                      </li>
                    ))}
                    {outline.length > OUTLINE_MAX ? (
                      <li className="pl-6 text-meta text-muted-foreground">{`+${outline.length - OUTLINE_MAX} more`}</li>
                    ) : null}
                  </ol>
                ) : null}
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-end gap-1.5 border-t border-border px-3 py-2.5">
                {canManage ? (
                  <>
                    <Link
                      href={`/templates/${t.id}/versions`}
                      className={buttonVariants({ variant: "ghost", size: "sm", className: "mr-auto -ml-1 text-muted-foreground hover:text-foreground" })}
                    >
                      <HistoryIcon className="size-3.5" />
                      Versions
                    </Link>
                    <Link href={`/templates/${t.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Link>
                  </>
                ) : null}
                {t.currentVersion !== null ? (
                  <Link href={`/templates/${t.id}/launch`} className={buttonVariants({ variant: "soft", size: "sm" })}>
                    <PlayIcon className="size-3.5" />
                    Launch
                  </Link>
                ) : canManage ? (
                  <Button variant="soft" size="sm" disabled aria-describedby={noteId}>
                    <PlayIcon className="size-3.5" />
                    Launch
                  </Button>
                ) : null}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
