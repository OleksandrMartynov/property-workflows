"use client";

import { createContext, useContext, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui/button";
import { StatusBadge, StatusIcon } from "@/components/ui/status-badge";
import { requiredLabel } from "@/lib/runs/labels";
import {
  createSaveStore,
  keepTypedValues,
  saveStatusText,
  withOutcome,
  type ActionOutcome,
  type SaveSnapshot,
  type SaveStore,
  type UnkeptItem,
} from "@/lib/templates/save-state";

// Стан збереження редактора (AC-EDITOR-25): один стан на сторінку, фіксоване місце для тексту, рядки змін, що ще не
// збережені, і форма, що викликає server action з клієнта й не пускає збій на error.tsx.

const SaveContext = createContext<SaveStore | null>(null);

function useStore(): SaveStore {
  const store = useContext(SaveContext);
  if (!store) throw new Error("EditorSaveProvider відсутній");
  return store;
}

function useSnapshot(): SaveSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Обгортка редактора: тримає сховище стану збереження. `store` — готове сховище (у тестах); зазвичай створюється тут. */
export function EditorSaveProvider({ store, children }: { store?: SaveStore; children: ReactNode }) {
  const [own] = useState(() => store ?? createSaveStore());
  return <SaveContext value={own}>{children}</SaveContext>;
}

/**
 * Фіксоване місце стану змін: у шапці редактора, завжди в тому самому рядку. «All changes kept», «Saving…» зі спінером
 * або повідомлення AC-EDITOR-25 кольором помилки зі значком (статус не лише кольором: форма значка й слова).
 */
export function SaveStatus() {
  const { status } = useSnapshot();
  const text = saveStatusText(status);
  return (
    <p
      role="status"
      aria-live="polite"
      data-testid="save-status"
      data-state={status}
      className={`flex min-h-8 items-center gap-1.5 text-label break-words ${status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
    >
      {status === "pending" ? <Spinner /> : status === "failed" ? <StatusIcon status="overdue" className="text-destructive" /> : <StatusIcon status="done" />}
      <span>{text}</span>
    </p>
  );
}

/**
 * Зміни, що ще не збережені, у тому місці, де вони мають бути (нова задача — у своїй секції, нова секція — внизу):
 * текст лишається на екрані, поки сервер не прийме його; після збою — «Not kept» і «Try again».
 */
export function UnkeptItems({ scope, as: Tag = "li" }: { scope: string; as?: "li" | "div" }) {
  const store = useStore();
  const { items } = useSnapshot();
  const own = items.filter((item) => item.scope === scope);
  if (!own.length) return null;
  return (
    <>
      {own.map((item) => (
        <UnkeptRow key={item.id} item={item} Tag={Tag} onRetry={() => void store.retry(item.id)} />
      ))}
    </>
  );
}

function UnkeptRow({ item, Tag, onRetry }: { item: UnkeptItem; Tag: "li" | "div"; onRetry: () => void }) {
  const failed = item.state === "failed";
  return (
    <Tag data-testid="unkept-item" data-state={item.state} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 py-1 pr-2 pl-3">
      <span className="min-w-0 flex-1 basis-44 break-words text-body">{item.name}</span>
      {item.scope !== "sections" ? <span className="text-meta text-muted-foreground">{requiredLabel(item.required)}</span> : null}
      {failed ? (
        <>
          <StatusBadge status="overdue">Not kept</StatusBadge>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
          <Spinner />
          Saving…
        </span>
      )}
    </Tag>
  );
}

type TrackedAction = (formData: FormData) => Promise<ActionOutcome>;

/**
 * Форма дії редактора. Те саме, що `<form action>`, але дія викликається з клієнта: мережева помилка чи збій сервера
 * стають станом «не збережено» (а не error.tsx); відмова з поясненням (NAME_REQUIRED…) — повідомленням над редактором,
 * як і раніше; успіх прибирає застаре повідомлення з адреси. `track` — де показати рядок із текстом (поле name) на екрані, поки зміна не
 * збережена (нова задача чи секція). Перевірку ролі й запис, як і раніше, робить сервер.
 */
export function TrackedForm({
  action,
  track,
  ...props
}: Omit<ComponentProps<"form">, "action"> & {
  action: TrackedAction;
  /** Дані, а не функція: пропси з серверного компонента мають серіалізуватись. Рядок — з полів форми. */
  track?: { scope: string; required?: boolean };
}) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

  const form = useRef<HTMLFormElement>(null);

  const submit = async (formData: FormData) => {
    // Копія з client=1: повторна спроба надсилає те саме, а форма за цей час уже скинута.
    const copy = new FormData();
    for (const [key, value] of formData) copy.append(key, value);
    copy.set("client", "1");
    const name = String(copy.get("name") ?? "").trim();
    const item = track && name ? { scope: track.scope, name, required: track.required ? copy.get("required") === "on" : false } : null;
    // Результат обробляється всередині спроби: так само для першої та для кожної повторної («Try again»).
    const perform = withOutcome(() => action(copy), (outcome) => {
      if (outcome.ok) {
        if (/[?&](error|saved)=/.test(window.location.search)) router.replace(pathname, { scroll: false });
      } else if (outcome.code !== "DB_ERROR") {
        router.replace(`${pathname}?error=${outcome.code}`, { scroll: false });
      }
    });
    const outcome = await store.run(item, perform);
    // Збій без пояснення: введена назва лишається в полі (рядок «Not kept» є лише в нових задач і секцій, `track`).
    if (!outcome.ok && outcome.code === "DB_ERROR" && !item && form.current) {
      keepTypedValues(Array.from(form.current.elements) as HTMLInputElement[], copy);
    }
  };

  return <form ref={form} action={submit} {...props} />;
}
