import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { BackLink } from "@/components/ui/back-link";
import { ContentEnter, SharedTitle } from "@/components/ui/motion";

/** Заголовок сторінки застосунку. Сайдбар, акаунт і вихід — у спільному layout сегмента (app). */
export function PageShell({
  title,
  titleSlot,
  description,
  actions,
  back,
  titleMorph,
  children,
}: {
  title: string;
  /** Заголовок, що редагується на місці (назва шаблону): видно його, а `h1` з `title` лишається для читача екрана. */
  titleSlot?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Ім'я морфа (motion.tsx, morphName): заголовок «приходить» з рядка списку, з якого відкрили сторінку. */
  titleMorph?: string;
  children: ReactNode;
}) {
  return (
    // Зміст приходить м'яким підйомом (після скелета чи попередньої сторінки); проміжки — як у main (gap-6).
    <ContentEnter>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 grow basis-72 flex-col gap-1">
            {back ? (
              <BackLink href={back.href} label={back.label} className="inline-flex w-fit items-center gap-1 text-label text-muted-foreground no-underline transition-ui hover:text-foreground" />
            ) : null}
            <h1 className={titleSlot ? "sr-only" : "text-title"}>{titleMorph ? <SharedTitle name={titleMorph}>{title}</SharedTitle> : title}</h1>
            {titleSlot}
            {description ? <div className="text-body text-muted-foreground">{description}</div> : null}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </ContentEnter>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return <Alert variant={kind}>{children}</Alert>;
}
