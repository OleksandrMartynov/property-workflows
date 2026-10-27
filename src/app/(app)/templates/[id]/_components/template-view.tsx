import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requiredLabel } from "@/lib/runs/labels";
import { groupBySection } from "@/lib/runs/sections";

export interface TemplateViewTask {
  template_task_id: string;
  section_name: string;
  section_position: number;
  position: number;
  name: string;
  required: boolean;
}

/**
 * Поточна версія шаблону лише для читання (AC-EDITOR-02): секції за порядком, у кожній — задачі з позначкою
 * «required» / «optional». Дані — знімок версії, а не незбережені зміни, тож тут їх немає й бути не може.
 */
export function TemplateView({ tasks }: { tasks: TemplateViewTask[] }) {
  const groups = groupBySection(tasks);
  return (
    <div className="flex flex-col gap-6" data-testid="template-view">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2" aria-labelledby={`section-${group.key}`}>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 id={`section-${group.key}`} className="text-heading break-words">
              {group.name}
            </h2>
            <span className="tabular text-meta text-muted-foreground">{group.tasks.length}</span>
          </div>
          <Card>
            <ul className="flex flex-col divide-y divide-border">
              {group.tasks.map((task) => (
                <li key={task.template_task_id} className="flex items-center gap-3 px-4 py-2.5" data-testid="template-task">
                  <span className="min-w-0 flex-1 break-words">{task.name}</span>
                  <Badge variant="outline">{requiredLabel(task.required)}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
