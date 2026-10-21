// Хто бачить які запуски (RLS runs і run_tasks через private.can_see_run) і прогрес у списку запусків —
// на справжньому Postgres (PGlite) з усіма міграціями. Специфікація: openspec/specs/run-progress/spec.md.
import { beforeAll, describe, expect, it } from "vitest";
import { formatProgress } from "@/lib/runs/progress";
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

/** Так читає список сторінка /runs: від імені користувача, під RLS. */
const visibleRunIds = async (userId: string) =>
  (await t.asUser<{ id: string }>(userId, "select id from public.runs order by created_at")).map((r) => r.id);

describe("База: список запусків", () => {
  it("AC-TASK-06: два запуски менеджера A, один — менеджера B, B — виконавець задачі першого запуску A: B бачить 2 запуски", async () => {
    const firstOfA = await launch(t, MANAGER_A, "Apartment 40, move-in", { [TENANT_MOVE_IN.taskIds[2]]: MANAGER_B });
    const secondOfA = await launch(t, MANAGER_A, "Apartment 41, move-in");
    const ofB = await launch(t, MANAGER_B, "Apartment 42, move-in");

    const seenByB = await visibleRunIds(MANAGER_B);
    expect(seenByB).toHaveLength(2);
    expect(seenByB).toEqual(expect.arrayContaining([ofB, firstOfA]));
    expect(seenByB).not.toContain(secondOfA);
    // AC-TASK-09: виконавець B бачить і прогрес запуску A, де він виконавець (view run_progress під RLS).
    const [{ total }] = await t.asUser<{ total: number }>(MANAGER_B, "select total from public.run_progress where run_id = $1", [firstOfA]);
    expect(total).toBe(5);

    // Задачі другого запуску A менеджер B теж не читає.
    const [{ n }] = await t.asUser<{ n: number }>(MANAGER_B, "select count(*)::int as n from public.run_tasks where run_id = $1", [secondOfA]);
    expect(n).toBe(0);
  });

  it("AC-TASK-06: менеджер C без запусків і задач не бачить жодного; адміністратор бачить усі", async () => {
    expect(await visibleRunIds(MANAGER_C)).toEqual([]);
    const [{ n: all }] = await t.asService<{ n: number }>("select count(*)::int as n from public.runs");
    expect(await visibleRunIds(ADMIN)).toHaveLength(all);
  });

  it("AC-TASK-09: запуск менеджера A з 5 задачами, 2 «done» — у списку A прогрес «2 of 5 done» (view run_progress)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 43, move-in");
    const tasks = await t.asService<{ id: string }>(
      "select id from public.run_tasks where run_id = $1 order by section_position, position",
      [runId],
    );
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[0].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[3].id]);

    expect(await visibleRunIds(MANAGER_A)).toContain(runId);
    // Так читає прогрес сторінка /runs: один рядок на запуск, порахований базою.
    const [row] = await t.asUser<{ done: number; total: number }>(
      MANAGER_A,
      "select done, total from public.run_progress where run_id = $1",
      [runId],
    );
    expect(formatProgress(row)).toBe("2 of 5 done");
  });

  it("AC-TASK-09: прогрес чужого запуску view не віддає — діє RLS run_tasks (security_invoker)", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 44, move-in");
    expect(await t.asUser(MANAGER_C, "select * from public.run_progress where run_id = $1", [runId])).toEqual([]);
    await expect(t.asAnon("select * from public.run_progress")).rejects.toThrow("permission denied");
  });
});

describe("База: сторінка запуску для інших користувачів", () => {
  it("AC-TASK-10: менеджер C за прямим посиланням не отримує ні запуску, ні жодної задачі — сторінка «Run not found»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 50, move-in", { [TENANT_MOVE_IN.taskIds[0]]: MANAGER_B });
    // Так читає запуск сторінка /runs/[id]: немає рядка — notFound() і not-found.tsx з «Run not found».
    expect(await t.asUser(MANAGER_C, "select id from public.runs where id = $1", [runId])).toEqual([]);
    expect(await t.asUser(MANAGER_C, "select id from public.run_tasks where run_id = $1", [runId])).toEqual([]);
  });

  it("AC-TASK-11: виконавець B бачить email виконавця кожної задачі запуску A — без імен і ролей", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 51, move-in", { [TENANT_MOVE_IN.taskIds[0]]: MANAGER_B });
    const tasks = await t.asUser<{ assignee_id: string }>(MANAGER_B, "select assignee_id from public.run_tasks where run_id = $1 order by section_position, position", [runId]);
    expect(tasks).toHaveLength(5);
    // Так сторінка /runs/[id] бере email біля задач: list_assignable_users — лише id і email.
    const users = await t.asUser<Record<string, unknown>>(MANAGER_B, "select * from public.list_assignable_users()");
    const emailOf = new Map(users.map((u) => [u.id, u.email]));
    expect(tasks.map((x) => emailOf.get(x.assignee_id))).toEqual([
      "manager.b@example.test",
      "manager.a@example.test",
      "manager.a@example.test",
      "manager.a@example.test",
      "manager.a@example.test",
    ]);
    for (const u of users) expect(Object.keys(u).sort()).toEqual(["email", "id"]);
  });
});

describe("База: список запусків після відповідей PM", () => {
  /** Так читає список сторінка /runs: від нових до старих, з назвою випадку, шаблону й статусом. */
  const listedRuns = (userId: string) =>
    t.asUser<{ id: string; case_name: string; template_name: string; status: string }>(
      userId,
      "select id, case_name, template_name, status from public.runs order by created_at desc, id",
    );
  const progressOf = async (userId: string, runId: string) => {
    const [row] = await t.asUser<{ done: number; total: number }>(userId, "select done, total from public.run_progress where run_id = $1", [runId]);
    return formatProgress(row);
  };
  const tasksOf = (runId: string) =>
    t.asService<{ id: string; required: boolean }>("select id, required from public.run_tasks where run_id = $1 order by section_position, position", [runId]);

  it("AC-TASK-13: завершений запуск (4 з 5, 1 необов'язкова «to do») і запуск «in progress» — обидва в списку зі статусом і прогресом", async () => {
    const completed = await launch(t, MANAGER_A, "Apartment 60, move-in");
    const inProgress = await launch(t, MANAGER_A, "Apartment 61, move-in");
    const tasks = await tasksOf(completed);
    const optional = tasks.filter((x) => !x.required);
    const required = tasks.filter((x) => x.required);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [optional[0].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [required[0].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [required[1].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1, true)", [required[2].id]);

    const rows = await listedRuns(MANAGER_A);
    expect(rows.find((r) => r.id === completed)?.status).toBe("completed");
    expect(rows.find((r) => r.id === inProgress)?.status).toBe("in_progress");
    expect(await progressOf(MANAGER_A, completed)).toBe("4 of 5 done");
    expect(await progressOf(MANAGER_A, inProgress)).toBe("0 of 5 done");
  });

  it("AC-TASK-14: «Tenant move-in», а пізніше «Repair» для «Apartment 12» — «Repair» першим, з назвою випадку й шаблону", async () => {
    // Тестовий шаблон «Repair», як в AC (у міграції — «Apartment repair»); готує адміністратор.
    const [{ id: repair }] = await t.asUser<{ id: string }>(ADMIN, "insert into public.templates (name) values ('Repair') returning id");
    const [{ id: section }] = await t.asUser<{ id: string }>(
      ADMIN,
      "insert into public.template_sections (template_id, name, position) values ($1, 'Repair', 1) returning id",
      [repair],
    );
    await t.asUser(ADMIN, "insert into public.template_tasks (section_id, name, required, position) values ($1, 'Fix the tap', true, 1)", [section]);

    const moveIn = await launch(t, MANAGER_A, "Apartment 12");
    const repairRun = await launch(t, MANAGER_A, "Apartment 12", {}, repair);
    const rows = (await listedRuns(MANAGER_A)).filter((r) => r.id === moveIn || r.id === repairRun);
    expect(rows.map((r) => [r.case_name, r.template_name])).toEqual([
      ["Apartment 12", "Repair"],
      ["Apartment 12", "Tenant move-in"],
    ]);
  });

  it("AC-TASK-17: виконавець B бачить у списку запуск менеджера A з прогресом «2 of 5 done»", async () => {
    const runId = await launch(t, MANAGER_A, "Apartment 62, move-in", { [TENANT_MOVE_IN.taskIds[4]]: MANAGER_B });
    const tasks = await tasksOf(runId);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[0].id]);
    await t.asUser(MANAGER_A, "select public.complete_task($1)", [tasks[2].id]);

    expect((await listedRuns(MANAGER_B)).map((r) => r.id)).toContain(runId);
    expect(await progressOf(MANAGER_B, runId)).toBe("2 of 5 done");
  });
});

describe("База: політики RLS", () => {
  type Policy = { tablename: string; policyname: string; cmd: string; roles: string; qual: string | null; with_check: string | null };
  const policiesOf = (tables: string[]) =>
    t.asService<Policy>(
      "select tablename, policyname, cmd, roles::text as roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = any($1) order by tablename, policyname",
      [tables],
    );
  const expectAuthenticatedWithUid = (policies: Policy[]) => {
    for (const p of policies) {
      expect(p.roles, p.policyname).toBe("{authenticated}");
      // Предикат обов’язковий для кожної команди: SELECT / DELETE — using, INSERT — with check, UPDATE — обидва.
      if (p.cmd !== "INSERT") expect(p.qual, `${p.tablename}.${p.policyname}: using`).not.toBeNull();
      if (p.cmd === "INSERT" || p.cmd === "UPDATE") expect(p.with_check, `${p.tablename}.${p.policyname}: with check`).not.toBeNull();
      for (const expr of [p.qual, p.with_check].filter((x): x is string => x !== null)) {
        expect(expr, `${p.tablename}.${p.policyname}`).toMatch(/auth\.uid\(\)( as uid)?\s*\)?\s*is not null/i);
      }
    }
  };

  it("AC-TASK-06: політики runs і run_tasks — to authenticated, (select auth.uid()) is not null і private.can_see_run", async () => {
    const policies = await policiesOf(["runs", "run_tasks"]);
    expect(policies.map((p) => p.policyname)).toEqual(["run_tasks_select_visible", "runs_select_visible"]);
    expectAuthenticatedWithUid(policies);
    for (const p of policies) expect(p.qual).toContain("can_see_run");
  });

  it("AC-RUN-02: політики шаблонів — to authenticated з (select auth.uid()) is not null; змінює лише admin", async () => {
    const policies = await policiesOf(["templates", "template_sections", "template_tasks"]);
    expect(policies).toHaveLength(12);
    expectAuthenticatedWithUid(policies);
    for (const p of policies.filter((x) => !x.policyname.includes("_select_"))) {
      expect(p.qual ?? p.with_check, p.policyname).toContain("'admin'");
    }
  });

  it("AC-TASK-06: роль authenticated без ідентичності (auth.uid() = null) не бачить ні запусків, ні задач, ні шаблонів і не змінює їх", async () => {
    await launch(t, MANAGER_A, "Apartment 80, move-in");
    for (const table of ["runs", "run_tasks", "run_progress", "templates", "template_sections", "template_tasks"]) {
      expect(await t.asAuthenticatedWithoutUid(`select 1 from public.${table}`), table).toEqual([]);
    }
    await expect(t.asAuthenticatedWithoutUid("insert into public.templates (name) values ('x')")).rejects.toThrow(
      "row-level security",
    );
    await expect(t.asAuthenticatedWithoutUid("select public.launch_run($1, 'x', '{}')", [TENANT_MOVE_IN.id])).rejects.toThrow(
      "LAUNCH_NOT_ALLOWED",
    );
  });
});
