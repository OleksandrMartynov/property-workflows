// Зміна виконавця задачі в запуску (функція бази reassign_task) — на справжньому Postgres (PGlite) з усіма міграціями.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string, VENDOR_V: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  VENDOR_V = t.users["vendor.v@example.test"];
}, 60_000);

const [TASK_1, , TASK_3] = TENANT_MOVE_IN.taskIds;

type RunTask = { id: string; template_task_id: string; assignee_id: string; status: string };

const taskOf = async (runId: string, templateTaskId: string) =>
  (
    await t.asService<RunTask>("select id, template_task_id, assignee_id, status from public.run_tasks where run_id = $1", [runId])
  ).find((task) => task.template_task_id === templateTaskId)!;
const reassign = (userId: string, taskId: string, assigneeId: string) =>
  t.asUser(userId, "select public.reassign_task($1, $2)", [taskId, assigneeId]);
const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

/** Запуск менеджера A, де задача 3 — на підряднику V. */
const runOfA = (caseName: string) => launch(t, MANAGER_A, caseName, { [TASK_3]: VENDOR_V });

describe("База: зміна виконавця задачі", () => {
  it("менеджер запуску передає задачу 1 підряднику V — V тепер її виконавець", async () => {
    const runId = await runOfA("Apartment 21, move-in");
    const task1 = await taskOf(runId, TASK_1);
    await reassign(MANAGER_A, task1.id, VENDOR_V);
    expect((await taskOf(runId, TASK_1)).assignee_id).toBe(VENDOR_V);
  });

  it("адміністратор, який не запускав, передає задачу менеджеру B", async () => {
    const runId = await runOfA("Apartment 22, move-in");
    const task1 = await taskOf(runId, TASK_1);
    await reassign(ADMIN, task1.id, MANAGER_B);
    expect((await taskOf(runId, TASK_1)).assignee_id).toBe(MANAGER_B);
  });

  it("інший менеджер B — REASSIGN_NOT_ALLOWED, виконавець не змінився", async () => {
    const runId = await runOfA("Apartment 23, move-in");
    const task1 = await taskOf(runId, TASK_1);
    expect(await errorOf(reassign(MANAGER_B, task1.id, MANAGER_B))).toContain("REASSIGN_NOT_ALLOWED");
    expect((await taskOf(runId, TASK_1)).assignee_id).toBe(MANAGER_A);
  });

  it("підрядник не передає свою задачу іншому — REASSIGN_NOT_ALLOWED", async () => {
    const runId = await runOfA("Apartment 24, move-in");
    const task = await taskOf(runId, TASK_1);
    expect(await errorOf(reassign(VENDOR_V, task.id, MANAGER_B))).toContain("REASSIGN_NOT_ALLOWED");
    expect((await taskOf(runId, TASK_1)).assignee_id).toBe(MANAGER_A);
  });

  it("новий виконавець без ролі застосунку — INVALID_ASSIGNEE", async () => {
    const runId = await runOfA("Apartment 25, move-in");
    const task1 = await taskOf(runId, TASK_1);
    expect(await errorOf(reassign(MANAGER_A, task1.id, "00000000-0000-0000-0000-000000000000"))).toContain("INVALID_ASSIGNEE");
  });

  it("завершений запуск — RUN_COMPLETED", async () => {
    const runId = await runOfA("Apartment 26, move-in");
    await t.asService("update public.runs set status = 'completed', completed_at = now() where id = $1", [runId]);
    const task1 = await taskOf(runId, TASK_1);
    expect(await errorOf(reassign(MANAGER_A, task1.id, MANAGER_B))).toContain("RUN_COMPLETED");
  });
});
