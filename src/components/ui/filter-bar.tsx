"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { Segmented } from "./segmented";

type Draft = { view: string; q: string };

/** Адреса списку з вигляду й пошуку: інші параметри лишаються, сторінка пагінації скидається; вигляд за замовчуванням — без параметра. */
export function filterHref(pathname: string, current: string, draft: Draft, defaultView: string) {
  const url = new URLSearchParams(current);
  for (const key of ["page", "view", "q"]) url.delete(key);
  if (draft.view && draft.view !== defaultView) url.set("view", draft.view);
  if (draft.q) url.set("q", draft.q);
  const search = url.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** Текст поля пошуку: власний під час набору, але якщо адреса змінилась ззовні («назад», посилання) — її пошук. */
function useSearchText(query: string, view: string) {
  const [text, setText] = useState(query);
  const [synced, setSynced] = useState({ view, query });
  if (synced.view !== view || synced.query !== query) {
    setSynced({ view, query });
    if (text.trim() !== query) setText(query);
  }
  return [text, setText] as const;
}

/**
 * Рядок над списком: вигляди (`Segmented`) і пошук (`SearchInput`). Стан живе в адресі (`?view=`, `?q=`), тож вигляд
 * можна зберегти посиланням чи відкрити з головної; сторінка фільтрує на сервері. Пошук — із затримкою 300 мс, зміна
 * вигляду чи пошуку скидає сторінку пагінації. Наступна адреса будується з поточних чернеток вигляду й пошуку, а не з
 * параметрів незавершеного переходу.
 */
export function FilterBar({
  views,
  view,
  query,
  searchLabel,
  className,
}: {
  views: { value: string; label: string }[];
  view: string;
  query: string;
  searchLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useSearchText(query, view);
  const [pending, startTransition] = useTransition();
  const draft = useRef<Draft>({ view, q: query });
  useEffect(() => {
    draft.current = { view, q: query };
  }, [view, query]);

  const navigate = (next: Partial<Draft>) => {
    draft.current = { ...draft.current, ...next };
    const href = filterHref(pathname, params.toString(), draft.current, views[0]?.value ?? "");
    startTransition(() => router.replace(href, { scroll: false }));
  };
  // Пошук із затримкою бере найсвіжішу navigate, не перезапускаючись на кожен рендер.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  useEffect(() => {
    const q = text.trim();
    if (q === draft.current.q) return;
    const timer = setTimeout(() => navigateRef.current({ q }), 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)} aria-busy={pending || undefined}>
      <Segmented aria-label="View" options={views} value={view} onValueChange={(value) => navigate({ view: value })} />
      <SearchInput aria-label={searchLabel} placeholder={searchLabel} value={text} onValueChange={setText} className="sm:w-72" />
    </div>
  );
}
