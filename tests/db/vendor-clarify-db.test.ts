// Уточнення зрізу 3 після відповідей PM (openspec/changes/impl-clarify-vendor, задача 1): відмова з текстом PM,
// «Run not found» на задачу чужого запуску, необов'язкова задача завершеного запуску, прямі запити підрядника — на
// справжньому Postgres (PGlite) з усіма міграціями. Специфікація: openspec/specs/vendor-access/spec.md,
// openspec/specs/run-progress/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let MANAGER_A: string, MANAGER_B: string, VENDOR_V: string;

beforeAll(async () => {
  t = await createTestDb();
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  VENDOR_V = t.users["vendor.v@example.test"];
}, 60_000);

// Задачі «Tenant move-in» у порядку шаблону: 1 і 2 обов'язкові, 3 необов'язкова, 4 обов'язкова, 5 необов'язкова.
const [TASK_1, TASK_2, TASK_3, TASK_4, TASK_5] = TENANT_MOVE_IN.taskIds;
const NOT_ALLOWED = "Only the task's assignee, the run manager, or an administrator can mark a task as done";

type RunTask = { id: string; template_task_id: string; status: string; done_by: string | null };
const tasksOf = (runId: string) =>
  t.asService<RunTask>(
    "select id, template_task_id, status, done_by from public.run_tasks where run_id = $1 order by section_position, position",
    [runId],
  );
const taskOf = async (runId: string, templateTaskId: string) =>
  (await tasksOf(runId)).find((task) => task.template_task_id === templateTaskId)!;
const runOf = async (runId: string) =>
  (await t.asService<{ status: string; completed_at: string | null }>("select status, completed_at from public.runs where id = $1", [runId]))[0];
/** Помилка прямого запиту: код (message) і текст для людини (detail), як їх бачить клієнт PostgREST. */
const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => ({ message: "", detail: "" }),
    (e: Error & { detail?: string }) => ({ message: e.message, detail: e.detail ?? "" }),
  );
const complete = (userId: string, taskId: string, confirmed = false) =>
  t.asUser(userId, "select * from public.complete_task($1, $2)", [taskId, confirmed]);

/** Менеджер A позначає свої обов'язкові задачі 1, 2 і 4 (остання — з підтвердженням): запуск стає «completed». */
async function completeRequired(runId: string) {
  await complete(MANAGER_A, (await taskOf(runId, TASK_1)).id);
  await complete(MANAGER_A, (await taskOf(runId, TASK_2)).id);
  await complete(MANAGER_A, (await taskOf(runId, TASK_4)).id, true);
}

describe("База: позначка задачі після уточнень PM", () => {
  it("AC-VENDOR-07: прямий запит V на задачу 1 менеджера A — відмова з текстом PM, задача 1 лишається «to do»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 12, move-in (07)", { [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });
    const task1 = await taskOf(runId, TASK_1);
    const error = await errorOf(complete(VENDOR_V, task1.id, true));
    expect(error.message).toBe("NOT_ALLOWED");
    expect(error.detail).toBe(NOT_ALLOWED);
    expect((await taskOf(runId, TASK_1)).status).toBe("to_do");
  });

  it("AC-VENDOR-15: прямий запит V на задачу 1 запуску «Apartment 14, repair», де в нього немає задач — «Run not found», задача «to do»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 14, repair");
    const task1 = await taskOf(runId, TASK_1);
    const error = await errorOf(complete(VENDOR_V, task1.id, true));
    expect(error.message).toBe("RUN_NOT_FOUND");
    expect(error.detail).toBe("Run not found");
    const after = await taskOf(runId, TASK_1);
    expect([after.status, after.done_by]).toEqual(["to_do", null]);
  });

  it("AC-VENDOR-15: відповідь на задачу чужого запуску не розкриває, чи є там задача (те саме, що й для неіснуючого запуску)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 14, repair (15)");
    const error = await errorOf(complete(VENDOR_V, (await taskOf(runId, TASK_2)).id));
    expect(error.detail).toBe("Run not found");
    expect(error.detail).not.toBe(NOT_ALLOWED);
  });

  it("AC-VENDOR-16: V позначає необов'язкову задачу 3 завершеного запуску — «done», «Your tasks: 1 of 1 done», запуск лишається «completed»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 12, move-in (16)", { [TASK_3]: VENDOR_V });
    await completeRequired(runId);
    const completed = await runOf(runId);
    expect(completed.status).toBe("completed");

    const [result] = await complete(VENDOR_V, (await taskOf(runId, TASK_3)).id);
    expect(result).toEqual({ task_status: "done", run_status: "completed" });
    const task3 = await taskOf(runId, TASK_3);
    expect([task3.status, task3.done_by]).toEqual(["done", VENDOR_V]);
    const [mine] = await t.asUser<{ done: number; total: number }>(VENDOR_V, "select done, total from public.vendor_runs($1)", [runId]);
    expect(`Your tasks: ${mine.done} of ${mine.total} done`).toBe("Your tasks: 1 of 1 done");
    expect(await runOf(runId)).toEqual(completed);
  });

  it("AC-TASK-19: виконавець позначає необов'язкову задачу «Order a part» завершеного запуску — «done», запуск «completed», прогрес її рахує", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 3, repair (19)", { [TASK_5]: MANAGER_B });
    await completeRequired(runId);
    const completed = await runOf(runId);
    const before = (await t.asUser<{ done: number; total: number }>(MANAGER_A, "select done, total from public.run_progress where run_id = $1", [runId]))[0];

    await complete(MANAGER_B, (await taskOf(runId, TASK_5)).id);
    expect((await taskOf(runId, TASK_5)).status).toBe("done");
    expect(await runOf(runId)).toEqual(completed);
    const after = (await t.asUser<{ done: number; total: number }>(MANAGER_A, "select done, total from public.run_progress where run_id = $1", [runId]))[0];
    expect(after).toEqual({ done: before.done + 1, total: before.total });
  });

  it("AC-TASK-19: повторна позначка вже «done» задачі завершеного запуску нічого не змінює", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 3, repair (19 repeat)");
    await completeRequired(runId);
    const task1 = await taskOf(runId, TASK_1);
    const [result] = await complete(MANAGER_A, task1.id);
    expect(result).toEqual({ task_status: "done", run_status: "completed" });
    expect(await taskOf(runId, TASK_1)).toEqual(task1);
  });
});

describe("База: прямі запити підрядника", () => {
  it("AC-VENDOR-17: V запитує задачі запуску «Apartment 12, move-in» напряму — отримує лише задачі 3 і 4", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 12, move-in (17)", { [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });
    const byRun = await t.asUser<{ template_task_id: string }>(VENDOR_V, "select template_task_id from public.run_tasks where run_id = $1", [runId]);
    expect(byRun.map((row) => row.template_task_id).sort()).toEqual([TASK_3, TASK_4].sort());
    const byId = await t.asUser(VENDOR_V, "select id from public.run_tasks where id = $1", [(await taskOf(runId, TASK_1)).id]);
    expect(byId).toEqual([]);
  });

  it("AC-VENDOR-18: V напряму не отримує нічого про інших користувачів і про запуск «Apartment 14, repair»", async () => {
    await launch(t, MANAGER_A, "Apartment 12, move-in (18)", { [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });
    const foreign = await launch(t, MANAGER_A, "Apartment 14, repair (18)");

    expect(await t.asUser<{ id: string }>(VENDOR_V, "select id from public.profiles where id <> $1", [VENDOR_V])).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select * from public.list_assignable_users()")).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select id from public.runs where id = $1", [foreign])).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select id from public.run_tasks where run_id = $1", [foreign])).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select * from public.vendor_runs($1)", [foreign])).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select * from public.run_progress where run_id = $1", [foreign])).toEqual([]);
  });
});
