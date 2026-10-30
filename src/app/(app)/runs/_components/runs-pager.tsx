import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Сторінки списку запусків: «Newer» / «Older»; вигляд і пошук (?view=, ?q=) зберігаються в посиланнях. */
export function RunsPager({ page, total, pageSize, params }: { page: number; total: number; pageSize: number; params: Record<string, string> }) {
  const hasNext = page * pageSize < total;
  if (page <= 1 && !hasNext) return null;
  const href = (to: number) => `/runs?${new URLSearchParams({ ...params, page: String(to) }).toString()}`;
  return (
    <nav className="flex items-center justify-between text-body" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="tabular text-muted-foreground">
        Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      {hasNext ? (
        <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Older
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
