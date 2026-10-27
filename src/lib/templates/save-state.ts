// Стан збереження змін редактора шаблону (AC-EDITOR-25): одне фіксоване місце показує «All changes kept», коротке
// «Saving…» або повідомлення PM про зміну, яку не вдалося зберегти. Тут лише чиста логіка без React і мережі: сховище
// стану, текст за станом, розрізнення «не збережено» і «відмова з поясненням». Вигляд — _components/save-status.tsx.

export type SaveStatus = "idle" | "pending" | "kept" | "failed";

// Тексти PM дослівно (requirements/20-…: «All changes kept» і AC-EDITOR-25).
export const ALL_KEPT = "All changes kept";
export const NOT_KEPT = "Your last change was not kept. Try again.";
export const SAVING = "Saving…";

export function saveStatusText(status: SaveStatus): string {
  switch (status) {
    case "failed":
      return NOT_KEPT;
    case "pending":
      return SAVING;
    default:
      return ALL_KEPT;
  }
}

/** Результат дії редактора, викликаної з клієнта (`client=1`): без redirect, щоб помилка не кидала на error.tsx. */
export type ActionOutcome = { ok: true } | { ok: false; code: string };

/** Відмова бази без пояснення (мережа, збій) — «не збережено»; решта кодів (NAME_REQUIRED…) — повідомлення над редактором. */
export function isNotKept(outcome: ActionOutcome): boolean {
  return !outcome.ok && outcome.code === "DB_ERROR";
}

/** redirect() із server action на клієнті приходить помилкою з digest NEXT_REDIRECT: її не ковтаємо, а віддаємо Next. */
export function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

/** Зміна, що ще не збережена: лишається на екрані рядком із «Try again», доки сервер її не прийме. */
export interface UnkeptItem {
  id: string;
  /** Де показати рядок: id секції (нова задача) або "sections" (нова секція). */
  scope: string;
  name: string;
  required: boolean;
  state: "pending" | "failed";
}

/**
 * Дія з обробкою результату: обробник виконується після кожної спроби — і першої, і «Try again» (повтор бере саме цю
 * функцію зі сховища), тож відмова з поясненням при повторі не зникає мовчки.
 */
export function withOutcome(action: Perform, onOutcome: (outcome: ActionOutcome) => void): Perform {
  return async () => {
    const outcome = await action();
    onOutcome(outcome);
    return outcome;
  };
}

/**
 * Після збою React скидає неконтрольовані поля форми до `defaultValue`. Щоб введена назва не зникла, `defaultValue`
 * текстових полів стає надісланим значенням (скидання тоді повертає саме його); успішне збереження цього не робить.
 */
export function keepTypedValues(fields: Iterable<{ name: string; type: string; defaultValue: string }>, sent: FormData): void {
  for (const field of fields) {
    if (field.type !== "text" || !field.name || !sent.has(field.name)) continue;
    field.defaultValue = String(sent.get(field.name));
  }
}

export interface SaveSnapshot {
  status: SaveStatus;
  items: readonly UnkeptItem[];
}

export type Perform = () => Promise<ActionOutcome>;

export interface SaveStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SaveSnapshot;
  /**
   * Виконати зміну. `item` — що показати на екрані, поки зміна не збережена (нова задача чи секція); без нього лише
   * стан у фіксованому місці. Помилка мережі чи збій сервера не кидається далі, а стає станом «failed»
   * (redirect Next — кидається). Повертає результат дії: відмову з поясненням показує викликач.
   */
  run(item: Omit<UnkeptItem, "id" | "state"> | null, perform: Perform): Promise<ActionOutcome>;
  /** «Try again»: повторити збережену дію рядка. */
  retry(id: string): Promise<ActionOutcome | null>;
}

export function createSaveStore(initial?: Partial<SaveSnapshot> & { performs?: Map<string, Perform> }): SaveStore {
  let items: readonly UnkeptItem[] = initial?.items ?? [];
  let pending = 0;
  // Остання завершена зміна не збереглась: «last change» з AC-EDITOR-25.
  let lastFailed = initial?.status === "failed";
  let seq = 0;
  const performs = initial?.performs ?? new Map<string, Perform>();
  const listeners = new Set<() => void>();
  let snapshot: SaveSnapshot = compute();

  function compute(): SaveSnapshot {
    const status: SaveStatus = pending > 0 ? "pending" : lastFailed || items.some((i) => i.state === "failed") ? "failed" : "kept";
    return { status, items };
  }
  function emit() {
    snapshot = compute();
    for (const listener of listeners) listener();
  }
  const setState = (id: string, state: UnkeptItem["state"]) => {
    items = items.map((i) => (i.id === id ? { ...i, state } : i));
  };
  const drop = (id: string) => {
    items = items.filter((i) => i.id !== id);
    performs.delete(id);
  };

  async function execute(id: string | null, perform: Perform): Promise<ActionOutcome> {
    pending++;
    if (id) setState(id, "pending");
    emit();
    let outcome: ActionOutcome;
    try {
      outcome = await perform();
    } catch (error) {
      if (isRedirectError(error)) {
        pending--;
        if (id) drop(id);
        emit();
        throw error;
      }
      outcome = { ok: false, code: "DB_ERROR" };
    }
    pending--;
    if (outcome.ok || !isNotKept(outcome)) {
      lastFailed = false;
      if (id) drop(id);
    } else {
      lastFailed = true;
      if (id) setState(id, "failed");
    }
    emit();
    return outcome;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    run(item, perform) {
      if (!item) return execute(null, perform);
      const id = `unkept-${++seq}`;
      items = [...items, { ...item, id, state: "pending" }];
      performs.set(id, perform);
      return execute(id, perform);
    },
    async retry(id) {
      const perform = performs.get(id);
      return perform ? execute(id, perform) : null;
    },
  };
}
