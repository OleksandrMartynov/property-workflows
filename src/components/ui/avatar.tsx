import { cn } from "@/lib/utils";

const tones = [
  "bg-status-progress text-status-progress-foreground",
  "bg-status-done text-status-done-foreground",
  "bg-status-due-soon text-status-due-soon-foreground",
  "bg-ai text-ai-foreground",
  "bg-variable text-variable-foreground",
];

// Розмір — явним пропом, а не класом ззовні: `cn` лише склеює класи, тож `size-5` і переданий `size-8` конфліктували б
// і переможця визначав би порядок правил у CSS (рев'ю CodeRabbit у PR #18).
const sizes = {
  xs: "size-[18px] text-[9px]",
  sm: "size-5 text-[10px]",
  md: "size-8 text-xs",
} as const;

/** Ініціали з email; колір — з хешу адреси, щоб людина була впізнаваною між сторінками. Ім'я завжди видно поруч. */
export function Avatar({ email, size = "sm", className }: { email: string; size?: keyof typeof sizes; className?: string }) {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", sizes[size], tones[hash % tones.length], className)}
    >
      {initial}
    </span>
  );
}
