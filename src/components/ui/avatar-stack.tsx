import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

/** Виконавці стосом: до `max` ініціалів, що перекриваються, і «+N». Повний список — у `title` для наведення. */
export function AvatarStack({ emails, max = 3, className }: { emails: string[]; max?: number; className?: string }) {
  if (emails.length === 0) return <span className="text-muted-foreground">—</span>;
  const shown = emails.slice(0, max);
  const rest = emails.length - shown.length;
  return (
    <span className={cn("inline-flex items-center", className)} title={emails.join(", ")}>
      {shown.map((email, i) => (
        <Avatar key={email} email={email} className={cn("ring-2 ring-card", i > 0 && "-ml-1.5")} />
      ))}
      {rest > 0 ? <span className="tabular ml-1 text-meta font-medium text-muted-foreground">+{rest}</span> : null}
    </span>
  );
}
