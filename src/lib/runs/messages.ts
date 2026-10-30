// Тексти повідомлень — дослівно з вимог PM (requirements/2-…, requirements/3-…) і коди помилок функцій бази.

export const CASE_NAME_MAX_LENGTH = 100;

export const MESSAGES = {
  // AC-RUN-03
  CASE_NAME_REQUIRED: "Enter a case name",
  // AC-RUN-07
  CASE_NAME_TOO_LONG: `Case name must be at most ${CASE_NAME_MAX_LENGTH} characters`,
  // AC-TASK-03
  NOT_ALLOWED: "Only the task's assignee, the run manager, or an administrator can mark a task as done",
  LAUNCH_NOT_ALLOWED: "Only a manager or an administrator can launch a template",
  INVALID_ASSIGNEE: "An assignee must be a manager, an administrator or a vendor",
  TEMPLATE_NOT_FOUND: "Template not found",
  TEMPLATE_EMPTY: "The template has no tasks",
  // Зріз 2 (AC-EDITOR-04, AC-EDITOR-07, AC-DSYS-02): тексти PM дослівно.
  TEMPLATE_NEEDS_REQUIRED_TASK: "A template needs at least one required task",
  NOT_ALLOWED_TEMPLATES: "Not enough rights",
  // Робочі припущення до відповіді PM (docs/spec-reading.md «Зріз 2»): секція без задач (QA), «Save» без змін (#22).
  SECTION_WITHOUT_TASKS: "Every section needs at least one task",
  NO_UNPUBLISHED_CHANGES: "There are no unpublished changes to save",
  NAME_REQUIRED: "Enter a name",
  // AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-23, AC-EDITOR-24: тексти PM дослівно (ADR 0007).
  TEMPLATE_NAME_REQUIRED: "Enter a template name",
  ITEM_NAME_REQUIRED: "Every section and task needs a name",
  TEMPLATE_NAME_TAKEN: "A template with this name already exists",
  // AC-EDITOR-10, AC-EDITOR-11: шаблон без збереженої версії не запускає ніхто; примітка — дослівно з AC.
  TEMPLATE_NOT_PUBLISHED: "Save the template to launch it",
  TASK_NOT_FOUND: "Task not found",
  // AC-TASK-10
  RUN_NOT_FOUND: "Run not found",
  RUN_COMPLETED: "The run is already completed",
  // AC-TASK-04, AC-TASK-16: без підтвердження остання обов'язкова задача лишається «to do».
  CONFIRMATION_REQUIRED: "Confirm marking the last required task as done: This cannot be undone",
  DB_ERROR: "Something went wrong. Try again.",
} as const;

export type ErrorCode = keyof typeof MESSAGES;

const CODES = Object.keys(MESSAGES) as ErrorCode[];

export const isErrorCode = (value: unknown): value is ErrorCode => CODES.includes(value as ErrorCode);

/** Текст для ?error=<CODE> у адресі сторінки; невідомий код — нічого не показуємо. */
export function errorMessage(code: unknown): string | undefined {
  return isErrorCode(code) ? MESSAGES[code] : undefined;
}

/** Помилка функції бази (raise exception '<CODE>') → код зі специфікації; решта — загальна помилка. */
export function dbErrorCode(error: { message?: string } | null | undefined): ErrorCode {
  const message = error?.message ?? "";
  // Найдовший збіг: NOT_ALLOWED — підрядок LAUNCH_NOT_ALLOWED.
  const matches = CODES.filter((code) => code !== "DB_ERROR" && message.includes(code));
  return matches.sort((a, b) => b.length - a.length)[0] ?? "DB_ERROR";
}

/**
 * ADR 0003: PostgREST не знайшов функцію з такими аргументами (PGRST202) — застосунок новіший за схему бази
 * (наприклад, вікно між деплоєм Vercel і db-deploy).
 */
export function isMissingRpcSignature(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PGRST202";
}
