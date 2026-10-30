"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { Segmented } from "./segmented";

/**
 * Рядок над списком: вигляди (`Segmented`) і пошук (`SearchInput`). Стан живе в адресі (`?view=`, `?q=`), тож вигляд
 * можна зберегти посиланням чи відкрити з головної; сторінка фільтрує на сервері. Пошук — із затримкою 300 мс, зміна
 * вигляду чи пошуку скидає сторінку пагінації.
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
  const [text, setText] = useState(query);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  const navigate = (next: { view?: string; q?: string }) => {
    const url = new URLSearchParams(params.toString());
    url.delete("page");
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "view" && value === views[0]?.value)) url.set(key, value);
      else url.delete(key);
    }
    const search = url.toString();
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }));
  };
  // Пошук із затримкою бере найсвіжішу navigate (актуальні params), не перезапускаючись на кожен рендер.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => navigateRef.current({ q: text.trim() }), 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)} aria-busy={pending || undefined}>
      <Segmented aria-label="View" options={views} value={view} onValueChange={(value) => navigate({ view: value })} />
      <SearchInput aria-label={searchLabel} placeholder={searchLabel} value={text} onValueChange={setText} className="sm:w-72" />
    </div>
  );
}
