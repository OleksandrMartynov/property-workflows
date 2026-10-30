// Правила підрядника (vendor), які виконує база: призначення, вибір виконавця, лише свої задачі, позначка своєї й
// відмова для чужої, запуск без його задач, прямий запуск шаблону — на справжньому Postgres (PGlite) з усіма
// міграціями. Специфікація: openspec/specs/vendor-access/spec.md, openspec/specs/run-launch/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, VENDOR_V: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  VENDOR_V = t.users["vendor.v@example.test"];
}, 60_000);

// Задачі «Tenant move-in» у порядку шаблону: 1 і 2 обов'язкові, 3 необов'язкова, 4 обов'язкова, 5 необов'язкова.
const [TASK_1, TASK_2, TASK_3, TASK_4, TASK_5] = TENANT_MOVE_IN.taskIds;

type RunTask = { id: string; template_task_id: string; assignee_id: string; status: string };

const tasksOf = (runId: string) =>
  t.asService<RunTask>(
    "select id, template_task_id, assignee_id, status from public.run_tasks where run_id = $1 order by section_position, position",
    [runId],
  );
const taskOf = async (runId: string, templateTaskId: string) =>
  (await tasksOf(runId)).find((task) => task.template_task_id === templateTaskId)!;
const runsCount = async () => Number((await t.asService<{ n: string }>("select count(*) as n from public.runs"))[0].n);
const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

/** «Apartment 12, move-in»-подібний запуск менеджера A, де задачі 3 і 4 — на підряднику V. */
const runWithVendorTasks = (caseName: string) => launch(t, MANAGER_A, caseName, { [TASK_3]: VENDOR_V, [TASK_4]: VENDOR_V });

describe("База: підрядник як виконавець", () => {
  it("AC-VENDOR-01: A призначає V виконавцем задач 3 і 4 — вони на V, задачі 1, 2 і 5 — на A", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in");
    const byTemplate = Object.fromEntries((await tasksOf(runId)).map((task) => [task.template_task_id, task.assignee_id]));
    expect(byTemplate[TASK_3]).toBe(VENDOR_V);
    expect(byTemplate[TASK_4]).toBe(VENDOR_V);
    expect([byTemplate[TASK_1], byTemplate[TASK_2], byTemplate[TASK_5]]).toEqual([MANAGER_A, MANAGER_A, MANAGER_A]);
  });

  it("AC-VENDOR-02: у виборі виконавця A бачить email B, адміністратора і V — лише id та email", async () => {
    const rows = await t.asUser<Record<string, string>>(MANAGER_A, "select * from public.list_assignable_users()");
    const emails = rows.map((row) => row.email);
    expect(emails).toEqual(expect.arrayContaining(["manager.b@example.test", "admin@example.test", "vendor.v@example.test"]));
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(["email", "id"]);
  });

  it("AC-VENDOR-02: підрядник не отримує email інших користувачів через вибір виконавця", async () => {
    expect(await t.asUser(VENDOR_V, "select * from public.list_assignable_users()")).toEqual([]);
  });
});

describe("База: що бачить підрядник", () => {
  it("AC-VENDOR-04: напряму V читає лише задачі 3 і 4 запуску з 5 задач", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (04)");
    const visible = await t.asUser<{ template_task_id: string; assignee_id: string }>(
      VENDOR_V,
      "select template_task_id, assignee_id from public.run_tasks where run_id = $1 order by section_position, position",
      [runId],
    );
    expect(visible.map((task) => task.template_task_id)).toEqual([TASK_3, TASK_4]);
    expect(visible.every((task) => task.assignee_id === VENDOR_V)).toBe(true);
  });

  it("AC-VENDOR-04: прогрес для V рахує лише його задачі, а не 5 задач запуску", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (progress)");
    const progress = await t.asUser<{ done: string; total: string }>(
      VENDOR_V,
      "select done, total from public.run_progress where run_id = $1",
      [runId],
    );
    expect(progress.map((p) => [Number(p.done), Number(p.total)])).toEqual([[0, 2]]);
  });

  it("AC-VENDOR-04: рядок запуску (шаблон і версія) V напряму не читає — лише vendor_runs без шаблону", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (row)");
    expect(await t.asUser(VENDOR_V, "select template_name, template_version from public.runs where id = $1", [runId])).toEqual([]);
    const rows = await t.asUser<Record<string, unknown>>(VENDOR_V, "select * from public.vendor_runs($1)", [runId]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["case_name", "created_at", "done", "id", "status", "total"]);
    expect([rows[0].case_name, Number(rows[0].done), Number(rows[0].total)]).toEqual(["Apartment 12, move-in (row)", 0, 2]);
  });

  it("AC-VENDOR-06: запуск без задач V — 0 рядків запуску й задач (сторінка — «Run not found»)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 14, repair");
    expect(await t.asUser(VENDOR_V, "select id from public.vendor_runs($1)", [runId])).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select id from public.run_tasks where run_id = $1", [runId])).toEqual([]);
  });

  it("AC-VENDOR-06: vendor_runs нічого не дає менеджеру й адміністратору (лише для підрядника)", async () => {
    await runWithVendorTasks("Apartment 12, move-in (06)");
    expect(await t.asUser(MANAGER_A, "select id from public.vendor_runs()")).toEqual([]);
    expect(await t.asUser(ADMIN, "select id from public.vendor_runs()")).toEqual([]);
  });

  it("AC-VENDOR-04: менеджер запуску й далі бачить усі 5 задач, зокрема задачі V", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (manager)");
    expect(await t.asUser(MANAGER_A, "select id from public.run_tasks where run_id = $1", [runId])).toHaveLength(5);
  });
});

describe("База: позначка задачі підрядником", () => {
  it("AC-VENDOR-05: V позначає свою задачу 3 (не остання обов'язкова) — «done», лічильник V — 1 з 2", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (05)");
    const task3 = await taskOf(runId, TASK_3);
    expect(await t.asUser(VENDOR_V, "select * from public.complete_task($1, false)", [task3.id])).toEqual([
      { task_status: "done", run_status: "in_progress" },
    ]);
    expect((await taskOf(runId, TASK_3)).status).toBe("done");
    const [mine] = await t.asUser<{ done: string; total: string }>(VENDOR_V, "select done, total from public.vendor_runs($1)", [runId]);
    expect([Number(mine.done), Number(mine.total)]).toEqual([1, 2]);
  });

  it("AC-VENDOR-07: прямий запит V на задачу 1 менеджера A — NOT_ALLOWED, задача лишається «to do»", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (07)");
    const task1 = await taskOf(runId, TASK_1);
    expect(await errorOf(t.asUser(VENDOR_V, "select * from public.complete_task($1, true)", [task1.id]))).toContain("NOT_ALLOWED");
    expect((await taskOf(runId, TASK_1)).status).toBe("to_do");
  });

  it("AC-VENDOR-07: прямий update рядка задачі підрядником нічого не змінює", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (07 update)");
    const task1 = await taskOf(runId, TASK_1);
    await errorOf(t.asUser(VENDOR_V, "update public.run_tasks set status = 'done' where id = $1", [task1.id]));
    expect((await taskOf(runId, TASK_1)).status).toBe("to_do");
  });

  it("AC-VENDOR-07: менеджер, переведений у vendor, не позначає задачу свого колишнього запуску", async () => {
    const MANAGER_C = t.users["manager.c@example.test"];
    const runId = await launch(t, MANAGER_C, "Apartment 15, repair", { [TASK_1]: MANAGER_A });
    const task1 = await taskOf(runId, TASK_1);
    await t.asService("update public.profiles set role = 'vendor' where id = $1", [MANAGER_C]);
    try {
      expect(await errorOf(t.asUser(MANAGER_C, "select * from public.complete_task($1, false)", [task1.id]))).toContain("NOT_ALLOWED");
      expect((await taskOf(runId, TASK_1)).status).toBe("to_do");
    } finally {
      await t.asService("update public.profiles set role = 'manager' where id = $1", [MANAGER_C]);
    }
  });

  it("AC-VENDOR-05: остання обов'язкова задача й для V лише з підтвердженням; run_last_required_task дає її id", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (last)");
    for (const id of [TASK_1, TASK_2]) await t.asUser(MANAGER_A, "select * from public.complete_task($1, false)", [(await taskOf(runId, id)).id]);
    const task4 = await taskOf(runId, TASK_4);
    const [{ id: lastForVendor }] = await t.asUser<{ id: string }>(VENDOR_V, "select public.run_last_required_task($1) as id", [runId]);
    expect(lastForVendor).toBe(task4.id);
    expect(await errorOf(t.asUser(VENDOR_V, "select * from public.complete_task($1, false)", [task4.id]))).toContain(
      "CONFIRMATION_REQUIRED",
    );
    expect((await taskOf(runId, TASK_4)).status).toBe("to_do");
  });

  it("AC-VENDOR-04: run_last_required_task не розкриває підряднику чужу задачу", async () => {
    const runId = await runWithVendorTasks("Apartment 12, move-in (last of A)");
    for (const id of [TASK_2, TASK_4]) await t.asUser(MANAGER_A, "select * from public.complete_task($1, false)", [(await taskOf(runId, id)).id]);
    const [{ id }] = await t.asUser<{ id: string | null }>(VENDOR_V, "select public.run_last_required_task($1) as id", [runId]);
    expect(id).toBeNull();
    const [{ id: forManager }] = await t.asUser<{ id: string }>(MANAGER_A, "select public.run_last_required_task($1) as id", [runId]);
    expect(forManager).toBe((await taskOf(runId, TASK_1)).id);
  });
});

describe("База: підрядник не запускає шаблонів і не бачить їх", () => {
  it("AC-VENDOR-09: прямий запуск «Tenant move-in» підрядником — LAUNCH_NOT_ALLOWED, кількість запусків не змінилась", async () => {
    const before = await runsCount();
    expect(await errorOf(launch(t, VENDOR_V, "Apartment 12, move-in"))).toContain("LAUNCH_NOT_ALLOWED");
    expect(await runsCount()).toBe(before);
  });

  it("AC-VENDOR-08: напряму V не читає жодного шаблону, версії чи задачі шаблону", async () => {
    expect(await t.asUser(VENDOR_V, "select id from public.templates")).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select id from public.template_versions")).toEqual([]);
    expect(await t.asUser(VENDOR_V, "select id from public.template_tasks")).toEqual([]);
  });

  it("AC-VENDOR-01: підрядник ніколи не менеджер запуску й не змінює собі роль", async () => {
    await errorOf(t.asUser(VENDOR_V, "update public.profiles set role = 'admin' where id = $1", [VENDOR_V]));
    const [{ role }] = await t.asService<{ role: string }>("select role from public.profiles where id = $1", [VENDOR_V]);
    expect(role).toBe("vendor");
    expect(await t.asService("select id from public.runs where run_manager_id = $1", [VENDOR_V])).toEqual([]);
  });
});
