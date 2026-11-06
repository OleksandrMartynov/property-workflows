"use client";

// Посилання «← <список>» у шапці сторінки: веде на останню адресу цього списку у вкладці (вигляд, пошук, сторінка),
// якщо список її запам'ятав, інакше — на сам список. На сервері й до гідратації — звичайне посилання на список.
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readListUrl, returnHref } from "@/lib/nav/list-return";

const noSubscribe = () => () => {};

export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const target = useSyncExternalStore(
    noSubscribe,
    () => returnHref(href, readListUrl(href, window.sessionStorage)),
    () => href,
  );
  return (
    <Link href={target} className={className}>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}
