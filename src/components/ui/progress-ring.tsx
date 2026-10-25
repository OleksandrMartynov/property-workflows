import { cn } from "@/lib/utils";

/** Кільце «N з M»: заповнюється часткою, на завершенні стає зеленою галочкою. Число словами завжди поруч. */
export function ProgressRing({ done, total, className }: { done: number; total: number; className?: string }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const complete = total > 0 && done >= total;
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      {complete ? (
        <>
          <circle cx="8" cy="8" r="7" className="fill-status-done-mark" />
          <path d="M4.8 8.2l2.2 2.2 4.2-4.6" className="stroke-background" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6" className="stroke-border-strong/45" strokeWidth="2" />
          <circle
            cx="8"
            cy="8"
            r="6"
            pathLength={1}
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-ui-ring origin-center -rotate-90 stroke-primary transition-[stroke-dasharray] duration-(--duration-slow) ease-in-out-soft [transform-box:fill-box]"
            style={{ strokeDasharray: `${ratio} 1`, opacity: ratio > 0 ? 1 : 0 }}
          />
        </>
      )}
    </svg>
  );
}
