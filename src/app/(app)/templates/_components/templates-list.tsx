import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface TemplateRow {
  id: string;
  name: string;
}
export interface TemplateCounts {
  sections: number;
  total: number;
  required: number;
}

/** Список шаблонів: назва, склад («N sections · M tasks, K required») і «Launch». */
export function TemplatesList({ templates, counts }: { templates: TemplateRow[]; counts: Record<string, TemplateCounts> }) {
  if (!templates.length) {
    return <EmptyState title="No templates yet." />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {templates.map((t) => {
        const c = counts[t.id];
        return (
          <li key={t.id}>
            <Card className="flex items-center justify-between gap-4 p-4 transition-ui hover:border-border-strong hover:shadow-md">
              <div className="min-w-0">
                <p className="text-heading">{t.name}</p>
                <p className="tabular text-body text-muted-foreground">
                  {c?.sections ?? 0} sections · {c?.total ?? 0} tasks, {c?.required ?? 0} required
                </p>
              </div>
              <Link href={`/templates/${t.id}/launch`} className={buttonVariants({ variant: "default" })}>
                Launch
              </Link>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
