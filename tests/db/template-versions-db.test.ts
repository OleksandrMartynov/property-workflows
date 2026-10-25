// Незбережені зміни й версії шаблону (міграція 20261025151836_template_versions.sql, ADR 0006) — на справжньому
// Postgres (PGlite) з усіма міграціями. Специфікація: openspec/specs/template-editor/spec.md.
// Відмовні тести перевіряють і відмову, і те, що дані не змінились (asService — в обхід RLS).
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, launch, publish, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, ADMIN_C: string, MANAGER_A: string, MANAGER_B: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  ADMIN_C = t.users["admin.c@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

interface Built {
  id: string;
  sections: string[];
  tasks: string[];
}

/** Шаблон, який адміністратор будує в редакторі: секції з задачами [назва, обов'язкова]. Без збереження версії. */
async function build(name: string, sections: [string, [string, boolean][]][], by = ADMIN): Promise<Built> {
  const [{ id }] = await t.asUser<{ id: string }>(by, "insert into public.templates (name) values ($1) returning id", [name]);
  const built: Built = { id, sections: [], tasks: [] };
  for (const [i, [sectionName, tasks]] of sections.entries()) {
    const [{ id: sectionId }] = await t.asUser<{ id: string }>(
      by,
      "insert into public.template_sections (template_id, name, position) values ($1, $2, $3) returning id",
      [id, sectionName, i + 1],
    );
    built.sections.push(sectionId);
    for (const [j, [taskName, required]] of tasks.entries()) {
      const [{ id: taskId }] = await t.asUser<{ id: string }>(
        by,
        "insert into public.template_tasks (section_id, name, required, position) values ($1, $2, $3, $4) returning id",
        [sectionId, taskName, required, j + 1],
      );
      built.tasks.push(taskId);
    }
  }
  return built;
}

/** «Tenant move-in» як в AC: 2 секції, 5 задач (3 обов'язкові), збережено як версію 1. */
async function tenantMoveInV1(name: string): Promise<Built> {
  const built = await build(name, [
    ["Before move-in", [["Sign the lease agreement", true], ["Inspect the apartment", true], ["Order cleaning", false]]],
    ["Move-in day", [["Hand over the keys", true], ["Record meter readings", false]]],
  ]);
  expect(await publish(t, ADMIN, built.id)).toBe(1);
  return built;
}

const state = async (templateId: string) =>
  (
    await t.asService<{ current_version: number | null; has_unpublished_changes: boolean; versions: number; draft_tasks: number }>(
      `select t.current_version, t.has_unpublished_changes,
              (select count(*)::int from public.template_versions as v where v.template_id = t.id) as versions,
              (select count(*)::int from public.template_tasks as tt join public.template_sections as s on s.id = tt.section_id
                where s.template_id = t.id) as draft_tasks
       from public.templates as t where t.id = $1`,
      [templateId],
    )
  )[0];

/** Задачі збереженої версії від імені користувача (під RLS). */
const versionTasks = (userId: string, templateId: string, number: number) =>
  t.asUser<{ name: string }>(
    userId,
    `select vt.name from public.template_version_tasks as vt
     join public.template_versions as v on v.id = vt.version_id
     where v.template_id = $1 and v.number = $2 order by vt.section_position, vt.position`,
    [templateId, number],
  );

const addSixthTask = (templateId: string, moveInDay: string) =>
  t.asUser(
    ADMIN,
    "insert into public.template_tasks (section_id, name, required, position) values ($1, 'Sign handover act', false, 3)",
    [moveInDay],
  ).then(() => templateId);

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

describe("База: незбережені зміни шаблону", () => {
  it("AC-EDITOR-01: адміністратор додав шосту задачу й вийшов без збереження — «Unpublished changes», у редакторі 6 задач", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-01)");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, has_unpublished_changes: false });

    await addSixthTask(tpl.id, tpl.sections[1]);

    // Зміна збережена одразу (вийти без збереження нічого не втрачає): адміністратор знову бачить 6 задач і позначку.
    const [{ n }] = await t.asUser<{ n: number }>(
      ADMIN,
      "select count(*)::int as n from public.template_tasks as tt join public.template_sections as s on s.id = tt.section_id where s.template_id = $1",
      [tpl.id],
    );
    expect(n).toBe(6);
    const [flag] = await t.asUser<{ has_unpublished_changes: boolean; current_version: number }>(
      ADMIN,
      "select has_unpublished_changes, current_version from public.list_template_drafts() where id = $1",
      [tpl.id],
    );
    expect(flag).toEqual({ has_unpublished_changes: true, current_version: 1 });
  });

  it("AC-EDITOR-01: перейменування шаблону — теж незбережена зміна (назва — частина версії)", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (rename)");
    await t.asUser(ADMIN, "update public.templates set name = 'Tenant move-in (furnished)' where id = $1", [tpl.id]);
    expect((await state(tpl.id)).has_unpublished_changes).toBe(true);
    const [v1] = await t.asService<{ name: string }>("select name from public.template_versions where template_id = $1", [tpl.id]);
    expect(v1.name).toBe("Tenant move-in (rename)");
  });
});

describe("База: менеджер бачить лише поточну версію", () => {
  it("AC-EDITOR-02: незбережену назву шаблону менеджер не читає — лише опубліковану назву поточної версії", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (published name)");
    await t.asUser(ADMIN, "update public.templates set name = 'Tenant move-in (renamed draft)' where id = $1", [tpl.id]);
    await expect(t.asUser(MANAGER_B, "select name from public.templates where id = $1", [tpl.id])).rejects.toThrow("permission denied");
    await expect(t.asUser(MANAGER_B, "select has_unpublished_changes from public.templates where id = $1", [tpl.id])).rejects.toThrow(
      "permission denied",
    );
    expect(await errorOf(t.asUser(MANAGER_B, "select * from public.list_template_drafts()"))).toContain("NOT_ALLOWED");
    const [published] = await t.asUser<{ name: string }>(
      MANAGER_B,
      "select v.name from public.template_versions as v join public.templates as t on t.id = v.template_id and t.current_version = v.number where t.id = $1",
      [tpl.id],
    );
    expect(published.name).toBe("Tenant move-in (published name)");
  });

  it("AC-EDITOR-02: адміністратор додав шосту задачу без збереження — менеджер B бачить версію 1 з 5 задачами і не бачить незбережених змін", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-02)");
    await addSixthTask(tpl.id, tpl.sections[1]);

    const [seen] = await t.asUser<{ current_version: number }>(MANAGER_B, "select current_version from public.templates where id = $1", [tpl.id]);
    expect(seen.current_version).toBe(1);
    expect(await versionTasks(MANAGER_B, tpl.id, 1)).toHaveLength(5);
    // Незбережених змін менеджер не читає взагалі: ні секцій, ні задач.
    expect(await t.asUser(MANAGER_B, "select id from public.template_sections where template_id = $1", [tpl.id])).toEqual([]);
    expect(await t.asUser(MANAGER_B, "select id from public.template_tasks where section_id = any($1::uuid[])", [tpl.sections])).toEqual([]);
  });

  it("AC-EDITOR-02: шаблон без жодної збереженої версії менеджеру не показано", async () => {
    const draft = await build("Draft only (AC-EDITOR-02)", [["Steps", [["Do it", true]]]]);
    expect(await t.asUser(MANAGER_B, "select id from public.templates where id = $1", [draft.id])).toEqual([]);
    const [admin] = await t.asUser<{ id: string }>(ADMIN, "select id from public.templates where id = $1", [draft.id]);
    expect(admin.id).toBe(draft.id);
  });
});

describe("База: збереження версії", () => {
  it("AC-EDITOR-03: незбережені зміни (6 задач) з версії 1 збережено — поточна версія 2 з 6 задачами, позначки немає", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-03)");
    await addSixthTask(tpl.id, tpl.sections[1]);

    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    expect(await state(tpl.id)).toMatchObject({ current_version: 2, has_unpublished_changes: false, versions: 2 });
    expect(await versionTasks(ADMIN, tpl.id, 2)).toHaveLength(6);
    // Збережена версія ніколи не змінюється: версія 1 — ті самі 5 задач.
    expect(await versionTasks(ADMIN, tpl.id, 1)).toHaveLength(5);
  });

  it("AC-EDITOR-03: збережену версію не змінить і не видалить навіть адміністратор", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (immutable)");
    await expect(
      t.asUser(ADMIN, "update public.template_versions set name = 'x' where template_id = $1", [tpl.id]),
    ).rejects.toThrow("permission denied");
    await expect(
      t.asUser(ADMIN, "delete from public.template_version_tasks where version_id in (select id from public.template_versions where template_id = $1)", [tpl.id]),
    ).rejects.toThrow("permission denied");
    expect(await versionTasks(ADMIN, tpl.id, 1)).toHaveLength(5);
  });

  it("AC-EDITOR-03: адміністратор видаляє задачу з незбережених змін — знімок збереженої версії не змінюється", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (delete source task)");
    await t.asUser(ADMIN, "delete from public.template_tasks where id = $1", [tpl.tasks[2]]);
    const names = (await versionTasks(ADMIN, tpl.id, 1)).map((x) => x.name);
    expect(names).toHaveLength(5);
    expect(names).toContain("Order cleaning");
    expect((await state(tpl.id)).has_unpublished_changes).toBe(true);
  });

  it("AC-EDITOR-03: збереження без незбережених змін нової версії не створює (робоче припущення, #22)", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (no changes)");
    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("NO_UNPUBLISHED_CHANGES");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, versions: 1 });
  });

  it("AC-EDITOR-04: новий «Repair» (1 секція, 3 необов'язкові задачі) — версії немає, 1 секція, 3 задачі й позначка лишаються", async () => {
    const repair = await build("Repair (AC-EDITOR-04)", [["Repair", [["Inspect", false], ["Quote", false], ["Fix", false]]]]);
    expect(await errorOf(publish(t, ADMIN, repair.id))).toContain("TEMPLATE_NEEDS_REQUIRED_TASK");
    expect(await state(repair.id)).toEqual({ current_version: null, has_unpublished_changes: true, versions: 0, draft_tasks: 3 });
    const [{ n: sections }] = await t.asService<{ n: number }>("select count(*)::int as n from public.template_sections where template_id = $1", [repair.id]);
    expect(sections).toBe(1);
  });

  it("AC-EDITOR-04: секція без задач у версію не йде — версії немає (робоче припущення QA)", async () => {
    const tpl = await build("Empty section", [["Steps", [["Do it", true]]], ["Later", []]]);
    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("SECTION_WITHOUT_TASKS");
    expect((await state(tpl.id)).versions).toBe(0);
  });

  it("AC-EDITOR-05: версії від різних адміністраторів — номер, автор і час збереження в кожної", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-05)");
    await addSixthTask(tpl.id, tpl.sections[1]);
    expect(await publish(t, ADMIN_C, tpl.id)).toBe(2);
    const rows = await t.asUser<{ number: number; email: string; saved: boolean }>(
      ADMIN,
      `select v.number, p.email, v.saved_at is not null as saved
       from public.template_versions as v join public.profiles as p on p.id = v.saved_by
       where v.template_id = $1 order by v.number desc`,
      [tpl.id],
    );
    expect(rows).toEqual([
      { number: 2, email: "admin.c@example.test", saved: true },
      { number: 1, email: "admin@example.test", saved: true },
    ]);
  });
});

describe("База: версія запуску", () => {
  it("AC-EDITOR-06: запуск з версії 1 (5 задач) після збереження версії 2 (6 задач) — «Template version 1» і 5 задач", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-06)");
    const runV1 = await launch(t, MANAGER_A, "Apartment 12, move-in", {}, tpl.id);
    await addSixthTask(tpl.id, tpl.sections[1]);
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);

    const [run] = await t.asUser<{ template_version: number }>(MANAGER_A, "select template_version from public.runs where id = $1", [runV1]);
    expect(run.template_version).toBe(1);
    const [{ n }] = await t.asUser<{ n: number }>(MANAGER_A, "select count(*)::int as n from public.run_tasks where run_id = $1", [runV1]);
    expect(n).toBe(5);

    // Новий запуск — уже з поточної версії 2.
    const runV2 = await launch(t, MANAGER_A, "Apartment 13, move-in", {}, tpl.id);
    const [run2] = await t.asUser<{ template_version: number }>(MANAGER_A, "select template_version from public.runs where id = $1", [runV2]);
    expect(run2.template_version).toBe(2);
  });

  it("AC-EDITOR-06: незбережені зміни в запуск не потрапляють — запуск бере поточну версію", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (draft not launched)");
    await addSixthTask(tpl.id, tpl.sections[1]);
    const run = await launch(t, MANAGER_A, "Apartment 14, move-in", {}, tpl.id);
    const tasks = await t.asUser<{ name: string }>(MANAGER_A, "select name from public.run_tasks where run_id = $1", [run]);
    expect(tasks).toHaveLength(5);
    expect(tasks.map((x) => x.name)).not.toContain("Sign handover act");
  });

  it("AC-EDITOR-06: шаблон без збереженої версії запустити не можна — запуску немає (робоче припущення, #21)", async () => {
    const draft = await build("Never saved", [["Steps", [["Do it", true]]]]);
    const before = (await t.asService<{ n: number }>("select count(*)::int as n from public.runs"))[0].n;
    expect(await errorOf(launch(t, ADMIN, "Apartment 15", {}, draft.id))).toContain("TEMPLATE_NOT_PUBLISHED");
    expect((await t.asService<{ n: number }>("select count(*)::int as n from public.runs"))[0].n).toBe(before);
  });
});

describe("База: відмови менеджеру й відвідувачу", () => {
  it("AC-EDITOR-07: менеджер B не бачить старих версій — лише поточну", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-07)");
    await addSixthTask(tpl.id, tpl.sections[1]);
    await publish(t, ADMIN, tpl.id);
    const seen = await t.asUser<{ number: number }>(MANAGER_B, "select number from public.template_versions where template_id = $1", [tpl.id]);
    expect(seen).toEqual([{ number: 2 }]);
    expect(await versionTasks(MANAGER_B, tpl.id, 1)).toEqual([]);
  });

  it("AC-EDITOR-08: менеджер B напряму змінює шаблон чи зберігає версію — шаблон лишається на версії 1 з 5 задачами без незбережених змін", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-08)");
    const before = await state(tpl.id);
    expect(before).toEqual({ current_version: 1, has_unpublished_changes: false, versions: 1, draft_tasks: 5 });

    // Зміни робочих таблиць: RLS не показує їх менеджеру (0 рядків) і не пускає вставку.
    expect(await t.asUser(MANAGER_B, "update public.template_tasks set name = 'x' where id = $1 returning id", [tpl.tasks[0]])).toEqual([]);
    expect(await t.asUser(MANAGER_B, "delete from public.template_tasks where id = $1 returning id", [tpl.tasks[0]])).toEqual([]);
    await expect(
      t.asUser(MANAGER_B, "insert into public.template_tasks (section_id, name, required, position) values ($1, 'x', true, 9)", [tpl.sections[0]]),
    ).rejects.toThrow("row-level security");
    expect(await t.asUser(MANAGER_B, "update public.templates set name = 'x' where id = $1 returning id", [tpl.id])).toEqual([]);
    // Номер версії й позначку не змінює ніхто напряму (column grant лише на name).
    await expect(
      t.asUser(MANAGER_B, "update public.templates set current_version = 2 where id = $1", [tpl.id]),
    ).rejects.toThrow("permission denied");
    // Збереження версії напряму, оминаючи сторінки.
    expect(await errorOf(publish(t, MANAGER_B, tpl.id))).toContain("NOT_ALLOWED");
    await expect(
      t.asUser(MANAGER_B, "insert into public.template_versions (template_id, number, name) values ($1, 2, 'x')", [tpl.id]),
    ).rejects.toThrow("permission denied");

    expect(await state(tpl.id)).toEqual(before);
  });

  it("AC-EDITOR-08: навіть адміністратор не ставить номер версії чи позначку напряму — лише функцією збереження", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (column grants)");
    await expect(
      t.asUser(ADMIN, "update public.templates set has_unpublished_changes = false, current_version = 7 where id = $1", [tpl.id]),
    ).rejects.toThrow("permission denied");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, has_unpublished_changes: false });
  });

  it("AC-EDITOR-09: відвідувач без входу не читає шаблонів, версій і незбережених змін і не зберігає версію", async () => {
    const tpl = await tenantMoveInV1("Tenant move-in (AC-EDITOR-09)");
    for (const table of ["templates", "template_versions", "template_version_tasks", "template_sections", "template_tasks"]) {
      await expect(t.asAnon(`select 1 from public.${table}`), table).rejects.toThrow("permission denied");
    }
    await expect(t.asAnon("select public.save_template_version($1)", [tpl.id])).rejects.toThrow("permission denied");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, versions: 1 });
  });
});
