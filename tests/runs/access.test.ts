import { describe, expect, it } from "vitest";
import { canCompleteTask } from "@/lib/runs/access";
import { MESSAGES, dbErrorCode, errorMessage } from "@/lib/runs/messages";

const A = { id: "a", role: "manager" as const };
const B = { id: "b", role: "manager" as const };
const C = { id: "c", role: "manager" as const };
const ADMIN = { id: "admin", role: "admin" as const };
const run = { run_manager_id: "a", status: "in_progress" };
const taskOfB = { assignee_id: "b", status: "to_do" };

describe("Хто бачить кнопку «Mark as done»", () => {
  it("AC-TASK-01: виконавець задачі — так", () => {
    expect(canCompleteTask(B, taskOfB, run)).toBe(true);
  });

  it("AC-TASK-02: менеджер запуску — так, і для задачі іншого виконавця", () => {
    expect(canCompleteTask(A, taskOfB, run)).toBe(true);
  });

  it("AC-TASK-07: адміністратор, який не створював запуск, — так", () => {
    expect(canCompleteTask(ADMIN, taskOfB, run)).toBe(true);
  });

  it("AC-TASK-03: інший менеджер — ні; відмова бази показує текст PM", () => {
    expect(canCompleteTask(C, taskOfB, run)).toBe(false);
    expect(errorMessage(dbErrorCode({ message: "NOT_ALLOWED" }))).toBe(
      "Only the task's assignee, the run manager, or an administrator can mark a task as done",
    );
    expect(MESSAGES.NOT_ALLOWED).toBe(errorMessage("NOT_ALLOWED"));
  });

  it("AC-TASK-01: уже «done» задачу чи задачу завершеного запуску кнопка не пропонує", () => {
    expect(canCompleteTask(B, { ...taskOfB, status: "done" }, run)).toBe(false);
    expect(canCompleteTask(B, taskOfB, { ...run, status: "completed" })).toBe(false);
  });
});
