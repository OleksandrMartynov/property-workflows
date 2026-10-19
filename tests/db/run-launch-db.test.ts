// Правила запуску шаблону, які виконує база (функція launch_run, RLS, check), — на справжньому Postgres (PGlite)
// з усіма міграціями. Специфікація: openspec/specs/run-launch/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, TENANT_MOVE_IN, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

type RunRow = { id: string; status: string; run_manager_id: string; case_name: string };
type TaskRow = { template_task_id: string; name: string; status: string; assignee_id: string; required: boolean };

const runById = async (userId: string, id: string) =>
  (await t.asUser<RunRow>(userId, "select id, status, run_manager_id, case_name from public.runs where id = $1", [id]))[0];
const tasksOf = (userId: string, runId: string) =>
  t.asUser<TaskRow>(
    userId,
    `select template_task_id, name, status, assignee_id, required from public.run_tasks
     where run_id = $1 order by section_position, position`,
    [runId],
  );
const runsCount = async () => (await t.asService<{ n: number }>("select count(*)::int as n from public.runs"))[0].n;
const launchError = (userId: string, caseName: string, assignees: Record<string, string> = {}) =>
  launch(t, userId, caseName, assignees).then(
    () => "",
    (e: Error) => e.message,
  );

describe("База: запуск шаблону", () => {
  it("AC-RUN-01: запуск «Tenant move-in» (2 секції, 5 задач, 3 обов'язкові) дає один запуск «in progress» з 5 задачами «to do»", async () => {
    const before = await runsCount();
    const id = await launch(t, MANAGER_A, "Apartment 12, move-in");

    expect(await runsCount()).toBe(before + 1);
    const run = await runById(MANAGER_A, id);
    expect(run.status).toBe("in_progress");
    expect(run.case_name).toBe("Apartment 12, move-in");
    const tasks = await tasksOf(MANAGER_A, id);
    expect(tasks).toHaveLength(5);
    expect(tasks.every((x) => x.status === "to_do")).toBe(true);
    expect(tasks.filter((x) => x.required)).toHaveLength(3);
    expect(tasks.map((x) => x.template_task_id)).toEqual([...TENANT_MOVE_IN.taskIds]);
  });

  it("AC-RUN-02: шосту задачу додано й першу перейменовано в шаблоні — запуск і далі має 5 задач з початковими назвами", async () => {
    const id = await launch(t, MANAGER_A, "Apartment 15, move-in");
    const before = (await tasksOf(MANAGER_A, id)).map((x) => x.name);

    // Шаблон змінює адміністратор (матриця прав: «Create and change templates»).
    await t.asUser(ADMIN, "update public.template_tasks set name = 'Sign the lease (v2)' where id = $1", [
      TENANT_MOVE_IN.taskIds[0],
    ]);
    await t.asUser(
      ADMIN,
      `insert into public.template_tasks (section_id, name, required, position)
       values ('20000000-0000-0000-0000-000000000012', 'Collect the deposit', false, 3)`,
    );
    try {
      const after = (await tasksOf(MANAGER_A, id)).map((x) => x.name);
      expect(after).toHaveLength(5);
      expect(after).toEqual(before);
      expect(after[0]).toBe("Sign the lease agreement");
    } finally {
      await t.asService("delete from public.template_tasks where name = 'Collect the deposit'");
      await t.asService("update public.template_tasks set name = 'Sign the lease agreement' where id = $1", [
        TENANT_MOVE_IN.taskIds[0],
      ]);
    }
  });

  it("AC-RUN-02: менеджер не може змінити шаблон — 0 рядків", async () => {
    const updated = await t.asUser(MANAGER_A, "update public.template_tasks set name = 'x' where id = $1 returning id", [
      TENANT_MOVE_IN.taskIds[0],
    ]);
    expect(updated).toEqual([]);
  });

  it("AC-RUN-03: функція запуску відхиляє порожню назву й назву лише з пробілів — запуску немає", async () => {
    const before = await runsCount();
    expect(await launchError(MANAGER_A, "")).toContain("CASE_NAME_REQUIRED");
    expect(await launchError(MANAGER_A, "    ")).toContain("CASE_NAME_REQUIRED");
    expect(await runsCount()).toBe(before);
  });

  it("AC-RUN-07: функція запуску відхиляє назву довжиною 101 символ, а 100 символів приймає", async () => {
    const before = await runsCount();
    expect(await launchError(MANAGER_A, "a".repeat(101))).toContain("CASE_NAME_TOO_LONG");
    expect(await runsCount()).toBe(before);
    await launch(t, MANAGER_A, "b".repeat(100));
    expect(await runsCount()).toBe(before + 1);
  });

  it("AC-RUN-01: прямий insert у runs клієнту заборонено — запуск лише функцією з копією задач", async () => {
    await expect(
      t.asUser(
        MANAGER_A,
        "insert into public.runs (template_name, case_name, run_manager_id) values ('x', 'y', $1)",
        [MANAGER_A],
      ),
    ).rejects.toThrow("permission denied");
  });
});

describe("База: менеджер запуску й виконавці", () => {
  it("AC-RUN-04: менеджер A призначає менеджера B виконавцем двох задач — 2 задачі на B, решта 3 на A", async () => {
    const [first, second] = TENANT_MOVE_IN.taskIds;
    const id = await launch(t, MANAGER_A, "Apartment 21, move-in", { [first]: MANAGER_B, [second]: MANAGER_B });
    const tasks = await tasksOf(MANAGER_A, id);
    expect(tasks.filter((x) => x.assignee_id === MANAGER_B).map((x) => x.template_task_id)).toEqual([first, second]);
    expect(tasks.filter((x) => x.assignee_id === MANAGER_A)).toHaveLength(3);
  });

  it("AC-RUN-04: виконавцем можна призначити лише менеджера чи адміністратора і лише задачу цього шаблону", async () => {
    const before = await runsCount();
    const [first] = TENANT_MOVE_IN.taskIds;
    expect(await launchError(MANAGER_A, "Apartment 22", { [first]: "a0000000-0000-0000-0000-999999999999" })).toContain(
      "INVALID_ASSIGNEE",
    );
    expect(await launchError(MANAGER_A, "Apartment 22", { "30000000-0000-0000-0000-000000000211": MANAGER_B })).toContain(
      "INVALID_TASK",
    );
    expect(await runsCount()).toBe(before);
  });

  it("AC-RUN-05: адміністратор запускає «Tenant move-in» для «Apartment 14, move-in» — один запуск, менеджер запуску — адміністратор", async () => {
    const before = await runsCount();
    const id = await launch(t, ADMIN, "Apartment 14, move-in");
    expect(await runsCount()).toBe(before + 1);
    expect((await runById(ADMIN, id)).run_manager_id).toBe(ADMIN);
  });

  it("AC-RUN-06: менеджер A запускає шаблон — менеджер A є менеджером запуску", async () => {
    const id = await launch(t, MANAGER_A, "Apartment 12, move-in");
    expect((await runById(MANAGER_A, id)).run_manager_id).toBe(MANAGER_A);
  });

  it("AC-RUN-06: менеджером запуску не можна записати іншого — run_manager_id ставить функція з auth.uid()", async () => {
    // Клієнт не має права update на runs: підмінити менеджера запуску неможливо.
    const id = await launch(t, MANAGER_A, "Apartment 16, move-in");
    await expect(
      t.asUser(MANAGER_A, "update public.runs set run_manager_id = $2 where id = $1", [id, MANAGER_B]),
    ).rejects.toThrow("permission denied");
  });

  it("AC-RUN-08: менеджер A без призначень — виконавець усіх 5 задач", async () => {
    const id = await launch(t, MANAGER_A, "Apartment 30, move-in");
    const tasks = await tasksOf(MANAGER_A, id);
    expect(tasks).toHaveLength(5);
    expect(tasks.every((x) => x.assignee_id === MANAGER_A)).toBe(true);
  });

  it("AC-RUN-09: адміністратор без призначень — виконавець усіх 5 задач", async () => {
    const id = await launch(t, ADMIN, "Apartment 31, move-in");
    const tasks = await tasksOf(ADMIN, id);
    expect(tasks).toHaveLength(5);
    expect(tasks.every((x) => x.assignee_id === ADMIN)).toBe(true);
  });
});

describe("База: доступ до шаблонів і запусків", () => {
  it("AC-RUN-04: менеджер бачить шаблони; список виконавців — лише id і email менеджерів та адміністраторів", async () => {
    const templates = await t.asUser<{ name: string }>(MANAGER_A, "select name from public.templates order by name");
    expect(templates.map((x) => x.name)).toEqual(["Apartment repair", "Tenant move-in"]);
    const assignable = await t.asUser<{ email: string }>(MANAGER_A, "select * from public.list_assignable_users()");
    expect(assignable.map((x) => x.email)).toEqual(
      expect.arrayContaining(["admin@example.test", "manager.a@example.test", "manager.b@example.test"]),
    );
    expect(Object.keys(assignable[0]).sort()).toEqual(["email", "id"]);
  });

  it("AC-TASK-06: анонімний відвідувач не читає шаблони й запуски і не запускає шаблон", async () => {
    await expect(t.asAnon("select count(*) from public.runs")).rejects.toThrow("permission denied");
    await expect(t.asAnon("select count(*) from public.templates")).rejects.toThrow("permission denied");
    await expect(t.asAnon("select public.launch_run($1, 'x', '{}')", [TENANT_MOVE_IN.id])).rejects.toThrow(
      "permission denied",
    );
  });

  it("AC-TASK-06: менеджер B не бачить запуску A без своїх задач, але бачить запуск, де він виконавець", async () => {
    const [first] = TENANT_MOVE_IN.taskIds;
    const withoutAssignment = await launch(t, MANAGER_A, "Apartment 45, move-in");
    expect(await runById(MANAGER_B, withoutAssignment)).toBeUndefined();
    expect(await tasksOf(MANAGER_B, withoutAssignment)).toEqual([]);

    const withAssignment = await launch(t, MANAGER_A, "Apartment 46, move-in", { [first]: MANAGER_B });
    expect(await runById(MANAGER_B, withAssignment)).toMatchObject({ id: withAssignment });
    const visible = await tasksOf(MANAGER_B, withAssignment);
    expect(visible).toHaveLength(5);
    expect(visible.find((task) => task.template_task_id === first)?.assignee_id).toBe(MANAGER_B);
  });
});
