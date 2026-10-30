// Вигляди списку запусків (docs/ux/ux-plan.md, партія 3): «All» — усі видимі запуски (AC-TASK-06, порядок AC-TASK-14
// без змін), «Mine» — запуски, де в мене є задача «to do» (мої задачі між запусками), «In progress» / «Completed» — за
// статусом запуску. Пошук — за назвою випадку. Стан — в адресі (?view=, ?q=), тож лічильники головної ведуть на вигляд.

export const RUN_VIEWS = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

export type RunView = (typeof RUN_VIEWS)[number]["value"];

const isView = (value: unknown): value is RunView => RUN_VIEWS.some((v) => v.value === value);

/** Вигляд з параметра адреси; невідомий чи відсутній — «all». */
export const parseRunView = (value: unknown): RunView => (isView(value) ? value : "all");

/** Пошуковий рядок з адреси: обрізаний, не довший за назву випадку (100 символів, AC-RUN-07). */
export const parseRunQuery = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 100) : "");

/** Шаблон для ilike: «%» і «_» з рядка користувача — буквальні символи, а не підстановки. */
export const ilikePattern = (query: string) => `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Чи звужено список: тоді порожній результат — «No runs found.», а не «No runs yet…» (AC-DSYS-04 — лише без фільтрів). */
export const isFiltered = (view: RunView, query: string) => view !== "all" || query !== "";

export const NO_RUNS_FOUND = "No runs found.";
