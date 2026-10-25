// Статуси — словами глосарію PM (requirements/product.md): Task status «to do» / «done», Run status «in progress» / «completed».

export const TASK_STATUS_LABELS: Record<string, string> = { to_do: "to do", done: "done" };
export const RUN_STATUS_LABELS: Record<string, string> = { in_progress: "in progress", completed: "completed" };

export const taskStatusLabel = (status: string) => TASK_STATUS_LABELS[status] ?? status;
export const runStatusLabel = (status: string) => RUN_STATUS_LABELS[status] ?? status;

/** AC-TASK-15: позначка біля статусу задачі — словами PM «required» / «optional». */
export const requiredLabel = (required: boolean) => (required ? "required" : "optional");

// AC-EDITOR-06: версія шаблону запуску — дослівно «Template version N» (припущення PM у вимозі #20).
export const templateVersionLabel = (version: number | null) => (version === null ? "—" : `Template version ${version}`);

// AC-DSYS-01: той самий статус — той самий колір на кожній сторінці («Вигляд і тон»): «in progress» — синій (progress),
// «completed» — зелений (done); слово статусу завжди поруч із кольором (StatusBadge показує і значок, і текст).
export const runStatusTone = (status: string) => (status === "completed" ? "done" : "progress") as "done" | "progress";

// AC-DSYS-04: порожній список запусків — дослівно з AC.
export const NO_RUNS_TITLE = "No runs yet. Launch a template to start one.";
export const NO_RUNS_ACTION = "Launch a template";
