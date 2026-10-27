// Правила зрізу 2 «Редактор шаблону», що живуть у базі: відмови (шаблон без версії, збереження без змін, секція без
// задач, відвідувач без входу, менеджер і старі версії) й дані версій (назва, перенесення задачі, версія запуску).
// Справжній Postgres (PGlite) з усіма міграціями; кожен відмовний тест перевіряє і відмову, і те, що дані не змінились
// (asService — в обхід RLS). Специфікація: openspec/specs/template-editor/spec.md.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { templateVersionLabel } from "@/lib/runs/labels";
import { createTestDb, launch, publish, SUPABASE_SHIM, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string, MANAGER_B: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

interface Built {
  id: string;
  sections: string[];
  tasks: string[];
}

/** Шаблон, який адміністратор будує в редакторі: секції із задачами [назва, обов'язкова]. Без збереження версії. */
async function build(name: string, sections: [string, [string, boolean][]][]): Promise<Built> {
  const [{ id }] = await t.asUser<{ id: string }>(ADMIN, "insert into public.templates (name) values ($1) returning id", [name]);
  const built: Built = { id, sections: [], tasks: [] };
  for (const [i, [sectionName, tasks]] of sections.entries()) {
    const [{ id: sectionId }] = await t.asUser<{ id: string }>(
      ADMIN,
      "insert into public.template_sections (template_id, name, position) values ($1, $2, $3) returning id",
      [id, sectionName, i + 1],
    );
    built.sections.push(sectionId);
    for (const [j, [taskName, required]] of tasks.entries()) {
      const [{ id: taskId }] = await t.asUser<{ id: string }>(
        ADMIN,
        "insert into public.template_tasks (section_id, name, required, position) values ($1, $2, $3, $4) returning id",
        [sectionId, taskName, required, j + 1],
      );
      built.tasks.push(taskId);
    }
  }
  return built;
}

/** «Tenant move-in» як в AC-EDITOR-28, 13, 14: «Before move-in» (2 задачі) і «Move-in day» (3 задачі), збережено як версію 1. */
async function tenantMoveIn(name: string): Promise<Built> {
  const built = await build(name, [
    ["Before move-in", [["Sign the lease agreement", true], ["Inspect the apartment", true]]],
    ["Move-in day", [["Hand over the keys", true], ["Record meter readings", false], ["Order cleaning", false]]],
  ]);
  expect(await publish(t, ADMIN, built.id)).toBe(1);
  return built;
}

const state = async (templateId: string) =>
  (
    await t.asService<{ current_version: number | null; has_unpublished_changes: boolean; versions: number; draft_tasks: number; draft_sections: number }>(
      `select t.current_version, t.has_unpublished_changes,
              (select count(*)::int from public.template_versions as v where v.template_id = t.id) as versions,
              (select count(*)::int from public.template_tasks as tt join public.template_sections as s on s.id = tt.section_id
                where s.template_id = t.id) as draft_tasks,
              (select count(*)::int from public.template_sections as s where s.template_id = t.id) as draft_sections
       from public.templates as t where t.id = $1`,
      [templateId],
    )
  )[0];

const runsCount = async () => (await t.asService<{ n: number }>("select count(*)::int as n from public.runs"))[0].n;

/** Секції версії й кількість задач у кожній — від імені користувача (під RLS). */
const versionSections = (userId: string, templateId: string, number: number) =>
  t.asUser<{ section_name: string; tasks: number }>(
    userId,
    `select vt.section_name, count(*)::int as tasks
     from public.template_version_tasks as vt join public.template_versions as v on v.id = vt.version_id
     where v.template_id = $1 and v.number = $2 group by vt.section_name, vt.section_position order by vt.section_position`,
    [templateId, number],
  );

const addTask = (templateId: string, sectionId: string, name: string) =>
  t.asUser(ADMIN, "select public.add_template_task($1, $2, $3, false)", [templateId, sectionId, name]);

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

describe("База: шаблон без збереженої версії", () => {
  it("AC-EDITOR-11: адміністратор запускає новий «Repair» без версії напряму — запуску не створено, список запусків не змінився", async () => {
    const repair = await build("Repair (AC-EDITOR-11)", [["Repair", [["Inspect", true]]]]);
    const before = await runsCount();
    const stateBefore = await state(repair.id);

    expect(await errorOf(launch(t, ADMIN, "Apartment 15", {}, repair.id))).toContain("TEMPLATE_NOT_PUBLISHED");
    expect(await runsCount()).toBe(before);
    expect(await state(repair.id)).toEqual(stateBefore);
  });

  it("AC-EDITOR-11: менеджер запускає шаблон без версії напряму — відмова, запуску немає й шаблон без змін", async () => {
    const repair = await build("Repair (AC-EDITOR-11 manager)", [["Repair", [["Inspect", true]]]]);
    const before = await runsCount();
    const stateBefore = await state(repair.id);

    expect(await errorOf(launch(t, MANAGER_A, "Apartment 16", {}, repair.id))).toMatch(/TEMPLATE_NOT_(FOUND|PUBLISHED)/);
    expect(await runsCount()).toBe(before);
    expect(await state(repair.id)).toEqual(stateBefore);
  });
});

describe("База: збереження без змін і секція без задач", () => {
  it("AC-EDITOR-12: збереження без незбережених змін на версії 2 — версію 3 не створено, версія 2 лишається поточною", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-12)");
    await addTask(tpl.id, tpl.sections[1], "Sign handover act");
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    const before = await state(tpl.id);
    expect(before).toMatchObject({ current_version: 2, has_unpublished_changes: false, versions: 2 });

    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("NO_UNPUBLISHED_CHANGES");
    expect(await state(tpl.id)).toEqual(before);
    expect(await versionSections(ADMIN, tpl.id, 3)).toEqual([]);
  });

  it("AC-EDITOR-12: пряме збереження менеджером без змін — відмова, версія 2 поточна, версії 3 немає", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-12 manager)");
    await addTask(tpl.id, tpl.sections[1], "Sign handover act");
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    const before = await state(tpl.id);

    expect(await errorOf(publish(t, MANAGER_A, tpl.id))).toContain("NOT_ALLOWED");
    expect(await state(tpl.id)).toEqual(before);
  });

  it("AC-EDITOR-15: третя секція «After move-in» без задач — версії 2 немає, незбережені зміни й позначка лишаються", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-15)");
    await t.asUser(ADMIN, "select public.add_template_section($1, 'After move-in')", [tpl.id]);
    const before = await state(tpl.id);
    expect(before).toEqual({ current_version: 1, has_unpublished_changes: true, versions: 1, draft_tasks: 5, draft_sections: 3 });

    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("SECTION_WITHOUT_TASKS");
    expect(await state(tpl.id)).toEqual(before);
    expect(await versionSections(ADMIN, tpl.id, 2)).toEqual([]);
    const names = await t.asService<{ name: string }>("select name from public.template_sections where template_id = $1 order by position", [tpl.id]);
    expect(names.map((s) => s.name)).toEqual(["Before move-in", "Move-in day", "After move-in"]);
  });
});

describe("База: відвідувач без входу", () => {
  it("AC-EDITOR-26: відвідувач без входу не змінює шаблон і не зберігає версію — шаблон на версії 1 з 5 задачами без незбережених змін", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-26)");
    const before = await state(tpl.id);
    expect(before).toEqual({ current_version: 1, has_unpublished_changes: false, versions: 1, draft_tasks: 5, draft_sections: 2 });

    for (const [sql, params] of [
      ["update public.templates set name = 'x' where id = $1", [tpl.id]],
      ["update public.template_tasks set name = 'x' where id = $1", [tpl.tasks[0]]],
      ["delete from public.template_tasks where id = $1", [tpl.tasks[0]]],
      ["insert into public.template_tasks (section_id, name, required, position) values ($1, 'x', true, 9)", [tpl.sections[0]]],
      ["select public.save_template_version($1)", [tpl.id]],
      ["select public.add_template_task($1, $2, 'x', true)", [tpl.id, tpl.sections[0]]],
      ["select public.move_template_task_to_section($1, $2, $3)", [tpl.id, tpl.tasks[0], tpl.sections[1]]],
    ] as const) {
      await expect(t.asAnon(sql, [...params]), sql).rejects.toThrow("permission denied");
    }
    expect(await state(tpl.id)).toEqual(before);
    expect(await versionSections(ADMIN, tpl.id, 1)).toEqual([
      { section_name: "Before move-in", tasks: 2 },
      { section_name: "Move-in day", tasks: 3 },
    ]);
  });
});

describe("База: менеджер напряму запитує старі версії й незбережені зміни", () => {
  it("AC-EDITOR-29: менеджер B (версії 1 і 2, незбережені зміни із 7 задач) не отримує нічого, крім поточної версії 2; шаблон без змін", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-29)");
    await addTask(tpl.id, tpl.sections[1], "Sign handover act");
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    await addTask(tpl.id, tpl.sections[0], "Photograph the rooms");
    const before = await state(tpl.id);
    expect(before).toEqual({ current_version: 2, has_unpublished_changes: true, versions: 2, draft_tasks: 7, draft_sections: 2 });

    // Версія 1 і список версій: менеджер бачить лише поточну версію 2.
    expect(await t.asUser(MANAGER_B, "select number from public.template_versions where template_id = $1 order by number", [tpl.id])).toEqual([{ number: 2 }]);
    expect(await t.asUser(MANAGER_B, "select number from public.template_versions where template_id = $1 and number = 1", [tpl.id])).toEqual([]);
    expect(await versionSections(MANAGER_B, tpl.id, 1)).toEqual([]);
    expect(await versionSections(MANAGER_B, tpl.id, 2)).toEqual([
      { section_name: "Before move-in", tasks: 2 },
      { section_name: "Move-in day", tasks: 4 },
    ]);
    // Незбережені зміни: робочі таблиці, функція списку й позначка — відмова або порожньо.
    expect(await t.asUser(MANAGER_B, "select id from public.template_sections where template_id = $1", [tpl.id])).toEqual([]);
    expect(await t.asUser(MANAGER_B, "select id from public.template_tasks where section_id = any($1::uuid[])", [tpl.sections])).toEqual([]);
    expect(await errorOf(t.asUser(MANAGER_B, "select * from public.list_template_drafts()"))).toContain("NOT_ALLOWED");
    await expect(t.asUser(MANAGER_B, "select has_unpublished_changes from public.templates where id = $1", [tpl.id])).rejects.toThrow(
      "permission denied",
    );
    // Збереження й зміни напряму — відмова, дані ті самі.
    expect(await errorOf(publish(t, MANAGER_B, tpl.id))).toContain("NOT_ALLOWED");
    expect(await t.asUser(MANAGER_B, "update public.template_tasks set name = 'x' where id = $1 returning id", [tpl.tasks[0]])).toEqual([]);

    expect(await state(tpl.id)).toEqual(before);
  });
});

describe("База: назва шаблону у версії й у запусках", () => {
  it("AC-EDITOR-21: «Tenant move-in» перейменовано на «Tenant move-in (2026)» і збережено — версія 2 з новою назвою, менеджер B бачить її", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-21)");
    const publishedName = (userId: string) =>
      t.asUser<{ name: string }>(
        userId,
        "select v.name from public.template_versions as v join public.templates as tt on tt.id = v.template_id and tt.current_version = v.number where tt.id = $1",
        [tpl.id],
      );
    // До збереження менеджер бачить стару назву: перейменування — незбережена зміна.
    await t.asUser(ADMIN, "update public.templates set name = 'Tenant move-in (2026)' where id = $1", [tpl.id]);
    expect(await publishedName(MANAGER_B)).toEqual([{ name: "Tenant move-in (AC-EDITOR-21)" }]);

    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    const versions = await t.asService<{ number: number; name: string }>("select number, name from public.template_versions where template_id = $1 order by number", [tpl.id]);
    expect(versions).toEqual([
      { number: 1, name: "Tenant move-in (AC-EDITOR-21)" },
      { number: 2, name: "Tenant move-in (2026)" },
    ]);
    expect(await publishedName(MANAGER_B)).toEqual([{ name: "Tenant move-in (2026)" }]);
  });

  it("AC-EDITOR-22: запуск із версії 1 показує «Tenant move-in», запуск із версії 2 — «Tenant move-in (2026)»", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-22)");
    const runV1 = await launch(t, MANAGER_B, "Apartment 12, move-in", {}, tpl.id);
    await t.asUser(ADMIN, "update public.templates set name = 'Tenant move-in (AC-EDITOR-22) (2026)' where id = $1", [tpl.id]);
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    const runV2 = await launch(t, MANAGER_B, "Apartment 13, move-in", {}, tpl.id);

    // Рядок списку запусків читає runs.template_name: назву версії, з якої запущено запуск.
    const rows = await t.asUser<{ id: string; template_name: string; template_version: number }>(
      MANAGER_B,
      "select id, template_name, template_version from public.runs where id = any($1::uuid[])",
      [[runV1, runV2]],
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(runV1)).toMatchObject({ template_name: "Tenant move-in (AC-EDITOR-22)", template_version: 1 });
    expect(byId.get(runV2)).toMatchObject({ template_name: "Tenant move-in (AC-EDITOR-22) (2026)", template_version: 2 });
  });
});

describe("База: перенесення задачі між секціями", () => {
  it("AC-EDITOR-28: задачу перенесено з «Move-in day» у «Before move-in» і збережено — нова версія 3 і 2 задачі; версія 1 без змін", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-28)");
    // tasks[2] — «Hand over the keys», перша задача «Move-in day».
    await t.asUser(ADMIN, "select public.move_template_task_to_section($1, $2, $3)", [tpl.id, tpl.tasks[2], tpl.sections[0]]);
    expect(await publish(t, ADMIN, tpl.id)).toBe(2);

    expect(await versionSections(ADMIN, tpl.id, 2)).toEqual([
      { section_name: "Before move-in", tasks: 3 },
      { section_name: "Move-in day", tasks: 2 },
    ]);
    const moved = await t.asUser<{ section_name: string }>(
      ADMIN,
      `select vt.section_name from public.template_version_tasks as vt join public.template_versions as v on v.id = vt.version_id
       where v.template_id = $1 and v.number = 2 and vt.name = 'Hand over the keys'`,
      [tpl.id],
    );
    expect(moved).toEqual([{ section_name: "Before move-in" }]);
    expect(await versionSections(ADMIN, tpl.id, 1)).toEqual([
      { section_name: "Before move-in", tasks: 2 },
      { section_name: "Move-in day", tasks: 3 },
    ]);
  });
});

describe("База: підтвердження видалення секції (дія після «OK»)", () => {
  it("AC-EDITOR-13: видалення скасовано (функцію видалення не викликано) — секція «Move-in day» і її 3 задачі лишаються", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-13)");
    expect(await state(tpl.id)).toEqual({ current_version: 1, has_unpublished_changes: false, versions: 1, draft_tasks: 5, draft_sections: 2 });
    const [{ n }] = await t.asService<{ n: number }>("select count(*)::int as n from public.template_tasks where section_id = $1", [tpl.sections[1]]);
    expect(n).toBe(3);
  });

  it("AC-EDITOR-14: підтверджене видалення «Move-in day» — секції й 3 задач немає в незбережених змінах, версія 1 має 2 секції і 5 задач", async () => {
    const tpl = await tenantMoveIn("Tenant move-in (AC-EDITOR-14)");
    await t.asUser(ADMIN, "select public.remove_template_section($1, $2)", [tpl.id, tpl.sections[1]]);

    expect(await state(tpl.id)).toEqual({ current_version: 1, has_unpublished_changes: true, versions: 1, draft_tasks: 2, draft_sections: 1 });
    const left = await t.asService<{ name: string }>("select name from public.template_sections where template_id = $1", [tpl.id]);
    expect(left).toEqual([{ name: "Before move-in" }]);
    expect(await versionSections(ADMIN, tpl.id, 1)).toEqual([
      { section_name: "Before move-in", tasks: 2 },
      { section_name: "Move-in day", tasks: 3 },
    ]);
  });
});

describe("База: запуски до появи версій", () => {
  it("AC-EDITOR-27: запуск «Apartment 12, move-in», запущений до міграції версій, після неї — «Template version 1» і ті самі 5 задач", async () => {
    // База на момент до версій: усі міграції, старіші за template_versions.
    const root = new URL("../../", import.meta.url);
    const files = readdirSync(new URL("supabase/migrations/", root)).filter((f) => f.endsWith(".sql")).sort();
    const versionsFile = files.find((f) => f.includes("template_versions"));
    expect(versionsFile).toBeDefined();
    const apply = async (db: PGlite, list: string[]) => {
      for (const f of list) await db.exec(readFileSync(new URL(`supabase/migrations/${f}`, root), "utf8"));
    };
    const db = new PGlite();
    await db.exec(SUPABASE_SHIM);
    await apply(db, files.filter((f) => f < (versionsFile as string)));

    // Користувач-менеджер, як у createTestDb: Auth → тригер профілю → роль.
    const managerId = "a0000000-0000-0000-0000-0000000000aa";
    await db.exec("begin; set local role supabase_auth_admin;");
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'old.manager@example.test', '{}')", [managerId]);
    await db.exec("commit; begin; set local role service_role;");
    await db.query("update public.profiles set role = 'manager' where id = $1", [managerId]);
    await db.exec("commit");

    // Запуск «до версій»: функція launch_run тієї версії схеми, від імені менеджера.
    await db.exec("begin; set local role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [managerId]);
    const [{ id: runId }] = (await db.query<{ id: string }>("select public.launch_run($1, 'Apartment 12, move-in', '{}'::jsonb) as id", ["10000000-0000-0000-0000-000000000001"])).rows;
    await db.exec("commit");
    const tasksSql =
      "select section_name, name, required, status from public.run_tasks where run_id = $1 order by section_position, position";
    const tasksBefore = (await db.query(tasksSql, [runId])).rows;
    expect(tasksBefore).toHaveLength(5);

    // Міграція версій: усі наявні запуски стають запусками з версії 1, задачі запуску не змінюються.
    await apply(db, files.filter((f) => f >= (versionsFile as string)));
    const [run] = (await db.query<{ template_version: number; case_name: string }>("select template_version, case_name from public.runs where id = $1", [runId])).rows;
    expect(run).toEqual({ template_version: 1, case_name: "Apartment 12, move-in" });
    expect(templateVersionLabel(run.template_version)).toBe("Template version 1");
    expect((await db.query(tasksSql, [runId])).rows).toEqual(tasksBefore);
    await db.close();
  }, 120_000);
});
