// Назви шаблону, секцій і задач у діях редактора (AC-EDITOR-19, 20, 23, 24; ADR 0007): порожню назву нового шаблону дія
// відхиляє до запису, а коди відмов бази (TEMPLATE_NAME_TAKEN, ITEM_NAME_REQUIRED, TEMPLATE_NAME_REQUIRED) стають
// повідомленнями PM дослівно. Справжні requireAdmin() і дії; заглушки — лише клієнт Supabase, redirect і cache.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dbErrorCode, errorMessage } from "@/lib/runs/messages";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const SECTION = "20000000-0000-0000-0000-000000000011";
const TASK = "30000000-0000-0000-0000-000000000111";
const writes: { table: string; op: string; values: unknown }[] = [];
const rpc = vi.fn(async (): Promise<{ data: unknown; error: { message: string } | null }> => ({ data: 2, error: null }));
let templatesError: { message: string } | null = null;

function query(table: string) {
  const chain: Record<string, unknown> = {};
  let result: unknown = { data: [], error: null };
  if (table === "profiles") result = { data: { email: "admin@example.test", role: "admin" }, error: null };
  for (const m of ["select", "eq", "in", "order", "maybeSingle", "single"]) chain[m] = () => chain;
  for (const m of ["insert", "update", "delete"]) {
    chain[m] = (values: unknown) => {
      writes.push({ table, op: m, values });
      result = templatesError ? { data: null, error: templatesError } : { data: { id: TEMPLATE }, error: null };
      return chain;
    };
  }
  chain.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "a0000000-0000-0000-0000-000000000003", email: "admin@example.test" } } }) },
    from: (table: string) => query(table),
    rpc,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const actions = await import("@/app/(app)/templates/[id]/edit/actions");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ template_id: TEMPLATE, ...fields })) fd.set(k, v);
  return fd;
};
const run = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );
const editPath = `NEXT_REDIRECT /templates/${TEMPLATE}/edit`;

beforeEach(() => {
  writes.length = 0;
  templatesError = null;
  rpc.mockClear();
});

describe("Назви: тексти PM і коди бази", () => {
  it("AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-23: коди відмов бази → повідомлення PM дослівно (довший код не губиться в NAME_REQUIRED)", () => {
    expect(errorMessage("TEMPLATE_NAME_REQUIRED")).toBe("Enter a template name");
    expect(errorMessage("ITEM_NAME_REQUIRED")).toBe("Every section and task needs a name");
    expect(errorMessage("TEMPLATE_NAME_TAKEN")).toBe("A template with this name already exists");
    expect(dbErrorCode({ message: "TEMPLATE_NAME_REQUIRED" })).toBe("TEMPLATE_NAME_REQUIRED");
    expect(dbErrorCode({ message: "ITEM_NAME_REQUIRED" })).toBe("ITEM_NAME_REQUIRED");
    expect(dbErrorCode({ message: "TEMPLATE_NAME_TAKEN" })).toBe("TEMPLATE_NAME_TAKEN");
    // Назва нової секції чи задачі — як було.
    expect(errorMessage("NAME_REQUIRED")).toBe("Enter a name");
  });
});

describe("Дії: створення шаблону з назвою", () => {
  it("AC-EDITOR-19: порожня назва чи лише з пробілів — жодного запису, повідомлення «Enter a template name» на сторінці створення", async () => {
    for (const name of ["", "   "]) {
      expect(await run(actions.createTemplate(form({ name })))).toBe("NEXT_REDIRECT /templates/new?error=TEMPLATE_NAME_REQUIRED");
    }
    expect(writes).toEqual([]);
  });

  it("AC-EDITOR-23: база відмовила (назва вже зайнята) — повідомлення «A template with this name already exists», не загальна помилка", async () => {
    templatesError = { message: "TEMPLATE_NAME_TAKEN" };
    expect(await run(actions.createTemplate(form({ name: " tenant MOVE-IN " })))).toBe("NEXT_REDIRECT /templates/new?error=TEMPLATE_NAME_TAKEN");
    // Дія надсилає назву без пробілів на краях; порівняння без регістру — справа бази (тести бази).
    expect(writes).toEqual([{ table: "templates", op: "insert", values: { name: "tenant MOVE-IN" } }]);
  });

  it("AC-EDITOR-19: звичайна назва створює шаблон і відкриває редактор", async () => {
    expect(await run(actions.createTemplate(form({ name: " Repair " })))).toBe(editPath);
    expect(writes).toEqual([{ table: "templates", op: "insert", values: { name: "Repair" } }]);
  });
});

describe("Дії: стерті назви в редакторі й відмови збереження", () => {
  it("AC-EDITOR-20: стерта назва задачі, секції чи шаблону зберігається в незбережених змінах (не відхиляється на вході)", async () => {
    expect(await run(actions.updateTask(form({ task_id: TASK, name: "   ", required: "on" })))).toBe(editPath);
    expect(rpc).toHaveBeenCalledWith("update_template_task", { p_template_id: TEMPLATE, p_task_id: TASK, p_name: "", p_required: true });
    expect(await run(actions.renameSection(form({ section_id: SECTION, name: "" })))).toBe(editPath);
    expect(rpc).toHaveBeenCalledWith("rename_template_section", { p_template_id: TEMPLATE, p_section_id: SECTION, p_name: "" });
    expect(await run(actions.renameTemplate(form({ name: "  " })))).toBe(editPath);
    expect(writes).toEqual([{ table: "templates", op: "update", values: { name: "" } }]);
  });

  it("AC-EDITOR-20: нову секцію чи задачу з порожньою назвою додати не можна — «Enter a name», жодного виклику бази", async () => {
    expect(await run(actions.addTask(form({ section_id: SECTION, name: " " })))).toBe(`${editPath}?error=NAME_REQUIRED`);
    expect(await run(actions.addSection(form({ name: "" })))).toBe(`${editPath}?error=NAME_REQUIRED`);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("AC-EDITOR-20, AC-EDITOR-24: збереження відмовлено базою — на сторінку редактора з кодом відмови, версії немає", async () => {
    for (const code of ["ITEM_NAME_REQUIRED", "TEMPLATE_NAME_REQUIRED", "TEMPLATE_NAME_TAKEN"]) {
      rpc.mockResolvedValueOnce({ data: null, error: { message: code } });
      expect(await run(actions.saveVersion(form({}))), code).toBe(`${editPath}?error=${code}`);
    }
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(writes).toEqual([]);
  });
});
