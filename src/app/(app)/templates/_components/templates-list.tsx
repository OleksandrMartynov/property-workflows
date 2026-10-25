import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

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

/**
 * Список шаблонів: назва, склад поточної версії («N sections · M tasks, K required») і дії. Менеджер бачить лише
 * збережені шаблони й «Launch»; адміністратор — ще позначку «Unpublished changes», «Edit» і «Versions».
 */
export function TemplatesList({
  templates,
  counts,
  canManage = false,
}: {
  templates: TemplateRow[];
  counts: Record<string, TemplateCounts>;
  canManage?: boolean;
}) {
  if (!templates.length) {
    return <EmptyState title="No templates yet." />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {templates.map((t) => {
        const c = counts[t.id];
        return (
          <li key={t.id}>
            <Card className="flex flex-wrap items-center justify-between gap-4 p-4 transition-ui hover:border-border-strong hover:shadow-md">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-heading">{t.name}</p>
                  {canManage && t.unpublished ? (
                    <StatusBadge status="due-soon" data-testid="unpublished">
                      Unpublished changes
                    </StatusBadge>
                  ) : null}
                </div>
                <p className="tabular text-body text-muted-foreground">
                  {t.currentVersion === null
                    ? "No saved version"
                    : `Version ${t.currentVersion} · ${c?.sections ?? 0} sections · ${c?.total ?? 0} tasks, ${c?.required ?? 0} required`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canManage ? (
                  <>
                    <Link href={`/templates/${t.id}/versions`} className={buttonVariants({ variant: "ghost" })}>
                      Versions
                    </Link>
                    <Link href={`/templates/${t.id}/edit`} className={buttonVariants({ variant: "outline" })}>
                      Edit
                    </Link>
                  </>
                ) : null}
                {t.currentVersion !== null ? (
                  <Link href={`/templates/${t.id}/launch`} className={buttonVariants({ variant: "default" })}>
                    Launch
                  </Link>
                ) : null}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
