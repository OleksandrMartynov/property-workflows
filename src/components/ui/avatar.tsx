import { cn } from "@/lib/utils";

const tones = [
  "bg-status-progress text-status-progress-foreground",
  "bg-status-done text-status-done-foreground",
  "bg-status-due-soon text-status-due-soon-foreground",
  "bg-ai text-ai-foreground",
  "bg-variable text-variable-foreground",
];

/** Ініціали з email; колір — з хешу адреси, щоб людина була впізнаваною між сторінками. Ім'я завжди видно поруч. */
export function Avatar({ email, className }: { email: string; className?: string }) {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn("inline-grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold", tones[hash % tones.length], className)}
    >
      {initial}
    </span>
  );
}
