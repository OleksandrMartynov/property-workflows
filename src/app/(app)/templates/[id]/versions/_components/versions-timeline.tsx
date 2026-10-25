import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/** Стрічка версій (AC-EDITOR-05): від новішої, дата й час за Києвом, автор; поточна версія — вузол primary і «Current». */
export function VersionsTimeline({ rows, currentLabel }: { rows: { label: string; savedAt: string; author: string }[]; currentLabel: string | null }) {
  return (
    <Card className="max-w-3xl">
      <ol className="flex flex-col">
        {rows.map((v, i) => {
          const isCurrent = v.label === currentLabel;
          return (
            <li key={v.label} data-testid="version-row" className="relative flex gap-4 px-4 py-3.5">
              {/* Стрічка: вузол версії на вертикальній лінії; поточна — суцільний вузол кольору primary. */}
              <span className="relative flex w-3 shrink-0 justify-center" aria-hidden="true">
                {i < rows.length - 1 ? <span className="absolute top-4 -bottom-3.5 w-px bg-border" /> : null}
                {i > 0 ? <span className="absolute -top-3.5 h-4 w-px bg-border" /> : null}
                <span className={isCurrent ? "relative mt-1 size-3 rounded-full bg-primary ring-4 ring-state-selected" : "relative mt-1 size-3 rounded-full border-2 border-border-strong bg-card"} />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-heading">{v.label}</span>
                  {isCurrent ? <Badge variant="primary">Current</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label font-normal text-muted-foreground">
                  <span className="tabular">{v.savedAt}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                    {v.author.includes("@") ? <Avatar email={v.author} /> : null}
                    <span className="min-w-0 break-words">{v.author}</span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
