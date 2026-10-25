import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskCheck } from "@/components/ui/task-check";
import { requiredLabel } from "@/lib/runs/labels";
import type { EditorSection, EditorTask } from "./editor-view";

/**
 * «Preview» редактора: незбережені зміни так, як їх отримає запуск після збереження версії, — чекліст за секціями з
 * «required» / «optional», як на сторінці запуску (AC-RUN-12, AC-TASK-12). Лише вигляд, без дій.
 */
export function EditorPreview({ sections, tasks }: { sections: EditorSection[]; tasks: EditorTask[] }) {
  if (!sections.length) return <EmptyState title="No sections yet." />;
  const numbered = sections.map((section) => ({ section, tasks: tasks.filter((t) => t.section_id === section.id) }));
  return (
    <div className="flex flex-col gap-6" data-testid="editor-preview">
      {numbered.map(({ section, tasks: own }) => (
        <section key={section.id} className="flex flex-col gap-2" aria-labelledby={`preview-${section.id}`}>
          <div className="flex items-center justify-between px-1">
            <h2 id={`preview-${section.id}`} className="text-heading">
              {section.name}
            </h2>
            <span className="tabular text-meta text-muted-foreground">{own.length}</span>
          </div>
          <Card>
            <ul className="flex flex-col divide-y divide-border">
              {own.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                  <TaskCheck done={false} />
                  <span className="min-w-0 flex-1 break-words">
                    {task.name}
                    <Badge variant="outline" className="ml-2 align-middle">
                      {requiredLabel(task.required)}
                    </Badge>
                  </span>
                </li>
              ))}
              {own.length === 0 ? <li className="px-4 py-2.5 text-body text-muted-foreground">—</li> : null}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
