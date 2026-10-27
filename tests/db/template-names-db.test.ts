// Назви шаблону, секцій і задач (міграція 20261027120752_template_names.sql, ADR 0007) — на справжньому Postgres
// (PGlite) з усіма міграціями. Специфікація: openspec/specs/template-editor/spec.md (AC-EDITOR-19, 20, 23, 24).
// Відмовні тести перевіряють і відмову, і те, що дані не змінились (asService — в обхід RLS).
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, publish, type TestDb } from "./supabase-pglite";

let t: TestDb;
let ADMIN: string, MANAGER_A: string;

beforeAll(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
}, 60_000);

const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

interface Built {
  id: string;
  sections: string[];
  tasks: string[];
}

/** Шаблон адміністратора: дві секції, три задачі (дві обов'язкові); версія 1 збережена. */
async function published(name: string): Promise<Built> {
  const [{ id }] = await t.asUser<{ id: string }>(ADMIN, "insert into public.templates (name) values ($1) returning id", [name]);
  const built: Built = { id, sections: [], tasks: [] };
  for (const [i, [sectionName, tasks]] of (
    [
      ["Before move-in", [["Sign the lease agreement", true], ["Order cleaning", false]]],
      ["Move-in day", [["Hand over the keys", true]]],
    ] as [string, [string, boolean][]][]
  ).entries()) {
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
  expect(await publish(t, ADMIN, id)).toBe(1);
  return built;
}

const state = async (templateId: string) =>
  (
    await t.asService<{ name: string; current_version: number | null; has_unpublished_changes: boolean; versions: number }>(
      `select t.name, t.current_version, t.has_unpublished_changes,
              (select count(*)::int from public.template_versions as v where v.template_id = t.id) as versions
       from public.templates as t where t.id = $1`,
      [templateId],
    )
  )[0];

const versionName = async (templateId: string, number: number) =>
  (await t.asService<{ name: string }>("select name from public.template_versions where template_id = $1 and number = $2", [templateId, number]))[0]?.name;

const templatesNamed = async (name: string) =>
  (
    await t.asService<{ n: number }>("select count(*)::int as n from public.templates where lower(btrim(name)) = lower(btrim($1))", [name])
  )[0].n;

const createTemplate = (name: string, by = ADMIN) =>
  t.asUser<{ id: string }>(by, "insert into public.templates (name) values ($1) returning id", [name]);

describe("База: назва нового шаблону", () => {
  it("AC-EDITOR-19: порожня назва чи лише з пробілів — шаблон не створено, код TEMPLATE_NAME_REQUIRED", async () => {
    const before = (await t.asService<{ n: number }>("select count(*)::int as n from public.templates"))[0].n;
    for (const name of ["", "   "]) {
      expect(await errorOf(createTemplate(name)), JSON.stringify(name)).toContain("TEMPLATE_NAME_REQUIRED");
    }
    expect((await t.asService<{ n: number }>("select count(*)::int as n from public.templates"))[0].n).toBe(before);
    // Контроль: звичайна назва створюється.
    expect(await createTemplate("Template names (AC-EDITOR-19)")).toHaveLength(1);
  });

  it("AC-EDITOR-23: назва, що збігається з наявною без регістру й пробілів на краях, — шаблон не створено, код TEMPLATE_NAME_TAKEN", async () => {
    const existing = await published("Tenant move-in (AC-EDITOR-23)");
    expect(await errorOf(createTemplate(" tenant MOVE-IN (ac-editor-23) "))).toContain("TEMPLATE_NAME_TAKEN");
    expect(await templatesNamed("Tenant move-in (AC-EDITOR-23)")).toBe(1);
    expect(await state(existing.id)).toMatchObject({ name: "Tenant move-in (AC-EDITOR-23)", current_version: 1, versions: 1 });
    // Ще не збережений шаблон теж «існує»: його назву займає назва чернетки.
    await createTemplate("Fresh draft (AC-EDITOR-23)");
    expect(await errorOf(createTemplate("  FRESH DRAFT (ac-editor-23)"))).toContain("TEMPLATE_NAME_TAKEN");
    expect(await templatesNamed("Fresh draft (AC-EDITOR-23)")).toBe(1);
    // Контроль: інша назва створюється.
    expect(await createTemplate("Tenant move-in (AC-EDITOR-23) copy")).toHaveLength(1);
  });

  it("AC-EDITOR-23: менеджер напряму не створює шаблон і не дізнається назв незбережених шаблонів — відмова RLS, а не «назву зайнято»", async () => {
    await createTemplate("Hidden draft (AC-EDITOR-23)");
    const message = await errorOf(createTemplate(" hidden DRAFT (ac-editor-23)", MANAGER_A));
    expect(message).toContain("row-level security");
    expect(message).not.toContain("TEMPLATE_NAME_TAKEN");
    expect(await templatesNamed("Hidden draft (AC-EDITOR-23)")).toBe(1);
  });
});

describe("База: збереження версії з назвами", () => {
  it("AC-EDITOR-24: «Repair» перейменовано на наявну назву й збережено — TEMPLATE_NAME_TAKEN, версії 2 немає, чернетка й «Unpublished changes» лишаються", async () => {
    const a = await published("Tenant move-in (AC-EDITOR-24)");
    const repair = await published("Repair (AC-EDITOR-24)");
    // Перейменування дозволене й лишається в чернетці: назву перевіряє збереження (PM #30).
    await t.asUser(ADMIN, "update public.templates set name = $2 where id = $1", [repair.id, " tenant move-in (AC-EDITOR-24) "]);
    expect(await state(repair.id)).toMatchObject({ has_unpublished_changes: true, current_version: 1 });

    expect(await errorOf(publish(t, ADMIN, repair.id))).toContain("TEMPLATE_NAME_TAKEN");

    expect(await state(repair.id)).toEqual({
      name: " tenant move-in (AC-EDITOR-24) ",
      current_version: 1,
      has_unpublished_changes: true,
      versions: 1,
    });
    expect(await versionName(repair.id, 1)).toBe("Repair (AC-EDITOR-24)");
    expect(await state(a.id)).toMatchObject({ name: "Tenant move-in (AC-EDITOR-24)", current_version: 1, versions: 1 });

    // Після виправлення назви збереження проходить: нова версія з новою назвою.
    await t.asUser(ADMIN, "update public.templates set name = 'Repair (AC-EDITOR-24) 2026' where id = $1", [repair.id]);
    expect(await publish(t, ADMIN, repair.id)).toBe(2);
    expect(await versionName(repair.id, 2)).toBe("Repair (AC-EDITOR-24) 2026");
  });

  it("AC-EDITOR-24: два шаблони перейменовано на одну назву — перше збереження проходить, друге відмовляє; регістр власної назви не заважає", async () => {
    const first = await published("Cleaning (AC-EDITOR-24)");
    const second = await published("Inspection (AC-EDITOR-24)");
    for (const id of [first.id, second.id]) {
      await t.asUser(ADMIN, "update public.templates set name = 'Turnover (AC-EDITOR-24)' where id = $1", [id]);
    }
    expect(await publish(t, ADMIN, first.id)).toBe(2);
    expect(await errorOf(publish(t, ADMIN, second.id))).toContain("TEMPLATE_NAME_TAKEN");
    expect(await state(second.id)).toMatchObject({ current_version: 1, has_unpublished_changes: true, versions: 1 });

    // Той самий шаблон змінює лише регістр власної назви — це не конфлікт із самим собою.
    await t.asUser(ADMIN, "update public.templates set name = 'TURNOVER (AC-EDITOR-24)' where id = $1", [first.id]);
    expect(await publish(t, ADMIN, first.id)).toBe(3);
  });

  it("AC-EDITOR-20: задача зі стертою назвою (порожньою чи з пробілів) — ITEM_NAME_REQUIRED, версії 2 немає, чернетка й позначка лишаються", async () => {
    for (const blank of ["", "   "]) {
      const tpl = await published(`Tenant move-in (AC-EDITOR-20 task ${blank.length})`);
      // Стерта назва зберігається в чернетці (функція редактора її приймає).
      await t.asUser(ADMIN, "select public.update_template_task($1, $2, $3, true)", [tpl.id, tpl.tasks[1], blank]);
      expect(await state(tpl.id)).toMatchObject({ has_unpublished_changes: true, current_version: 1 });

      expect(await errorOf(publish(t, ADMIN, tpl.id)), JSON.stringify(blank)).toContain("ITEM_NAME_REQUIRED");

      expect(await state(tpl.id)).toMatchObject({ current_version: 1, has_unpublished_changes: true, versions: 1 });
      const [task] = await t.asService<{ name: string }>("select name from public.template_tasks where id = $1", [tpl.tasks[1]]);
      expect(task.name).toBe("");
      const vt = await t.asService<{ name: string }>(
        `select vt.name from public.template_version_tasks as vt join public.template_versions as v on v.id = vt.version_id
         where v.template_id = $1 order by vt.section_position, vt.position`,
        [tpl.id],
      );
      expect(vt.map((r) => r.name)).toEqual(["Sign the lease agreement", "Order cleaning", "Hand over the keys"]);

      // Після повернення назви збереження проходить.
      await t.asUser(ADMIN, "select public.update_template_task($1, $2, 'Order deep cleaning', true)", [tpl.id, tpl.tasks[1]]);
      expect(await publish(t, ADMIN, tpl.id)).toBe(2);
    }
  });

  it("AC-EDITOR-20: секція чи шаблон зі стертою назвою — відмова зі своїм кодом, версії 2 немає, чернетка лишається", async () => {
    const tpl = await published("Tenant move-in (AC-EDITOR-20 section)");
    await t.asUser(ADMIN, "select public.rename_template_section($1, $2, '   ')", [tpl.id, tpl.sections[1]]);
    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("ITEM_NAME_REQUIRED");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, has_unpublished_changes: true, versions: 1 });
    const [section] = await t.asService<{ name: string }>("select name from public.template_sections where id = $1", [tpl.sections[1]]);
    expect(section.name).toBe("");

    await t.asUser(ADMIN, "select public.rename_template_section($1, $2, 'Move-in day')", [tpl.id, tpl.sections[1]]);
    await t.asUser(ADMIN, "update public.templates set name = '  ' where id = $1", [tpl.id]);
    expect(await errorOf(publish(t, ADMIN, tpl.id))).toContain("TEMPLATE_NAME_REQUIRED");
    expect(await state(tpl.id)).toMatchObject({ name: "  ", current_version: 1, has_unpublished_changes: true, versions: 1 });
    expect(await versionName(tpl.id, 1)).toBe("Tenant move-in (AC-EDITOR-20 section)");
  });

  it("AC-EDITOR-20: нову секцію чи задачу з порожньою назвою додати не можна (NAME_REQUIRED) — дозволена лише стерта назва наявної", async () => {
    const tpl = await published("Tenant move-in (AC-EDITOR-20 add)");
    expect(await errorOf(t.asUser(ADMIN, "select public.add_template_section($1, '   ')", [tpl.id]))).toContain("NAME_REQUIRED");
    expect(await errorOf(t.asUser(ADMIN, "select public.add_template_task($1, $2, '', false)", [tpl.id, tpl.sections[0]]))).toContain("NAME_REQUIRED");
    expect(await state(tpl.id)).toMatchObject({ current_version: 1, has_unpublished_changes: false, versions: 1 });
  });
});
