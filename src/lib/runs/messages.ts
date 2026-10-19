// Тексти повідомлень — дослівно з вимог PM (requirements/2-…, requirements/3-…) і коди помилок функцій бази.

export const CASE_NAME_MAX_LENGTH = 100;

export const MESSAGES = {
  // AC-RUN-03
  CASE_NAME_REQUIRED: "Enter a case name",
  // AC-RUN-07
  CASE_NAME_TOO_LONG: `Case name must be at most ${CASE_NAME_MAX_LENGTH} characters`,
  // AC-TASK-03
  NOT_ALLOWED: "Only the task's assignee, the run manager, or an administrator can mark a task as done",
  INVALID_ASSIGNEE: "An assignee must be a manager or an administrator",
  INVALID_TASK: "The task does not belong to this template",
  TEMPLATE_NOT_FOUND: "Template not found",
  TEMPLATE_EMPTY: "The template has no tasks",
  TASK_NOT_FOUND: "Task not found",
  RUN_COMPLETED: "The run is already completed",
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
  return CODES.find((code) => code !== "DB_ERROR" && message.includes(code)) ?? "DB_ERROR";
}
