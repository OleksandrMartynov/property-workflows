// Правила позначки задач і завершення запуску, які виконує база (функція complete_task, RLS), — на справжньому
// Postgres (PGlite) з усіма міграціями. Специфікація: openspec/specs/run-progress/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { countProgress, formatProgress } from "@/lib/runs/progress";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string, MANAGER_C: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  MANAGER_C = t.users["manager.c@example.test"];
}, 60_000);

type Task = { id: string; template_task_id: string; status: string; required: boolean };

const tasksOf = (runId: string) =>
  t.asService<Task>(
    "select id, template_task_id, status, required from public.run_tasks where run_id = $1 order by section_position, position",
    [runId],
  );
const taskStatus = async (taskId: string) =>
  (await t.asService<{ status: string }>("select status from public.run_tasks where id = $1", [taskId]))[0].status;
const runStatus = async (runId: string) =>
  (await t.asService<{ status: string }>("select status from public.runs where id = $1", [runId]))[0].status;
const complete = (userId: string, taskId: string) =>
  t.asUser<{ task_status: string; run_status: string }>(userId, "select * from public.complete_task($1)", [taskId]);
const completeError = (userId: string, taskId: string) =>
  complete(userId, taskId).then(
    () => "",
    (e: Error) => e.message,
  );

/** Запуск менеджера A, де перша задача (обов'язкова) — на менеджері B. */
async function runOfAWithTaskOfB(caseName: string) {
  const runId = await launch(t, MANAGER_A, caseName, { [TENANT_MOVE_IN.taskIds[0]]: MANAGER_B });
  const tasks = await tasksOf(runId);
  return { runId, tasks, taskOfB: tasks[0].id };
}

describe("База: хто позначає задачу виконаною", () => {
  it("AC-TASK-01: виконавець (менеджер B) позначає свою задачу в запуску менеджера A — «done»", async () => {
    const { runId, taskOfB } = await runOfAWithTaskOfB("Apartment 1, move-in");
    expect(await runStatus(runId)).toBe("in_progress");
    expect(await complete(MANAGER_B, taskOfB)).toEqual([{ task_status: "done", run_status: "in_progress" }]);
    expect(await taskStatus(taskOfB)).toBe("done");
  });

  it("AC-TASK-02: менеджер запуску A позначає задачу, виконавець якої — менеджер B, — «done»", async () => {
    const { taskOfB } = await runOfAWithTaskOfB("Apartment 2, move-in");
    await complete(MANAGER_A, taskOfB);
    expect(await taskStatus(taskOfB)).toBe("done");
  });

  it("AC-TASK-03: менеджер C (не менеджер запуску й не виконавець) — задача лишається «to do», помилка NOT_ALLOWED", async () => {
    const { taskOfB } = await runOfAWithTaskOfB("Apartment 3, move-in");
    expect(await completeError(MANAGER_C, taskOfB)).toContain("NOT_ALLOWED");
    expect(await taskStatus(taskOfB)).toBe("to_do");
  });

  it("AC-TASK-03: прямий update статусу задачі клієнту заборонено — обійти функцію не можна", async () => {
    const { taskOfB } = await runOfAWithTaskOfB("Apartment 4, move-in");
    await expect(
      t.asUser(MANAGER_B, "update public.run_tasks set status = 'done' where id = $1", [taskOfB]),
    ).rejects.toThrow("permission denied");
    expect(await taskStatus(taskOfB)).toBe("to_do");
  });

  it("AC-TASK-07: адміністратор, який не створював запуск, позначає задачу менеджера B — «done»", async () => {
    const { taskOfB } = await runOfAWithTaskOfB("Apartment 5, move-in");
    await complete(ADMIN, taskOfB);
    expect(await taskStatus(taskOfB)).toBe("done");
  });

  it("AC-TASK-01: повторна позначка вже «done» задачі нічого не змінює (припущення PM)", async () => {
    const { taskOfB } = await runOfAWithTaskOfB("Apartment 6, move-in");
    await complete(MANAGER_B, taskOfB);
    const [{ done_at: first }] = await t.asService<{ done_at: string }>("select done_at from public.run_tasks where id = $1", [taskOfB]);
    expect(await complete(MANAGER_B, taskOfB)).toEqual([{ task_status: "done", run_status: "in_progress" }]);
    const [{ done_at: second }] = await t.asService<{ done_at: string }>("select done_at from public.run_tasks where id = $1", [taskOfB]);
    expect(second).toEqual(first);
  });
});

describe("База: завершення запуску", () => {
  it("AC-TASK-04: 2 з 3 обов'язкових уже «done», виконавець позначає третю — запуск «completed»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 7, move-in");
    const tasks = await tasksOf(runId);
    const required = tasks.filter((x) => x.required);
    expect(tasks).toHaveLength(5);
    expect(required).toHaveLength(3);

    await complete(MANAGER_A, required[0].id);
    await complete(MANAGER_A, required[1].id);
    expect(await runStatus(runId)).toBe("in_progress");

    expect(await complete(MANAGER_A, required[2].id)).toEqual([{ task_status: "done", run_status: "completed" }]);
    expect(await runStatus(runId)).toBe("completed");
    // Завершення запуску не змінює статусу необов'язкових задач (припущення PM).
    const optional = (await tasksOf(runId)).filter((x) => !x.required);
    expect(optional.map((x) => x.status)).toEqual(["to_do", "to_do"]);
  });

  it("AC-TASK-04: необов'язкові задачі не завершують запуск", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 8, move-in");
    for (const task of (await tasksOf(runId)).filter((x) => !x.required)) await complete(MANAGER_A, task.id);
    expect(await runStatus(runId)).toBe("in_progress");
  });

  it("AC-TASK-04: статус запуску клієнт сам не змінює — лише через виконання задач", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 9, move-in");
    await expect(
      t.asUser(MANAGER_A, "update public.runs set status = 'completed' where id = $1", [runId]),
    ).rejects.toThrow("permission denied");
    expect(await runStatus(runId)).toBe("in_progress");
  });
});

describe("База: прогрес і статуси задач на сторінці запуску", () => {
  /** Так читає задачі сторінка /runs/[id]: від імені користувача, під RLS. */
  const visibleTasks = (userId: string, runId: string) =>
    t.asUser<{ status: string }>(userId, "select status from public.run_tasks where run_id = $1 order by section_position, position", [runId]);

  it("AC-TASK-05: запуск з 5 задачами, 2 «done» — менеджер запуску бачить «2 of 5 done»", async () => {
    const { runId, tasks } = await runOfAWithTaskOfB("Apartment 10, move-in");
    await complete(MANAGER_B, tasks[0].id);
    await complete(MANAGER_A, tasks[2].id);
    expect(formatProgress(countProgress(await visibleTasks(MANAGER_A, runId)))).toBe("2 of 5 done");
  });

  it("AC-TASK-08: менеджер запуску бачить статус кожної з 5 задач; виконавець B — теж усі 5, не лише свою", async () => {
    const { runId, tasks } = await runOfAWithTaskOfB("Apartment 11, move-in");
    await complete(MANAGER_B, tasks[0].id);
    await complete(MANAGER_A, tasks[1].id);
    const expected = ["done", "done", "to_do", "to_do", "to_do"];
    expect((await visibleTasks(MANAGER_A, runId)).map((x) => x.status)).toEqual(expected);
    expect((await visibleTasks(MANAGER_B, runId)).map((x) => x.status)).toEqual(expected);
    expect(await visibleTasks(MANAGER_C, runId)).toEqual([]);
  });
});
