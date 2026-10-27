// Дії редактора шаблону (src/app/(app)/templates/[id]/edit/actions.ts) — публічні POST-ендпойнти: менеджер, що викликає
// їх напряму, оминаючи сторінки, не доходить до жодного запису (AC-EDITOR-08, AC-DSYS-02). Справжні requireViewer()
// і requireAdmin(); заглушки — лише клієнт Supabase (записує, до яких таблиць і функцій звернулась дія), redirect і cache.
import { beforeEach, describe, expect, it, vi } from "vitest";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const SECTION = "20000000-0000-0000-0000-000000000011";
let role = "manager";
const touched: string[] = [];
const rpc = vi.fn(async () => ({ data: 2, error: null }));

/** Ланцюжок запиту supabase-js: будь-який метод повертає той самий ланцюжок, await — результат. */
function query(table: string) {
  const result =
    table === "profiles"
      ? { data: { email: `${role}@example.test`, role }, error: null }
      : table === "template_sections"
        ? { data: [{ id: SECTION, position: 1 }], error: null }
        : { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "insert", "update", "delete", "maybeSingle", "single"]) {
    chain[m] = (...args: unknown[]) => {
      if (["insert", "update", "delete"].includes(m)) touched.push(`${m} ${table}`);
      void args;
      return chain;
    };
  }
  chain.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "a0000000-0000-0000-0000-000000000003", email: "x@example.test" } } }) },
    from: (table: string) => {
      touched.push(`read ${table}`);
      return query(table);
    },
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

beforeEach(() => {
  touched.length = 0;
  rpc.mockClear();
});

describe("Дії редактора: виклик з клієнта (client=1)", () => {
  it("AC-EDITOR-25: збій запису з клієнта — результат «не збережено» без redirect (error.tsx не показується), успіх — { ok: true }", async () => {
    role = "admin";
    const fields = { section_id: SECTION, name: "Sign handover act", client: "1" };
    expect(await actions.addTask(form(fields))).toEqual({ ok: true });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "connection lost" } } as never);
    expect(await actions.addTask(form(fields))).toEqual({ ok: false, code: "DB_ERROR" });
  });

  it("AC-EDITOR-08: менеджер напряму з client=1 — усе одно відмова redirect-ом і жодного запису", async () => {
    role = "manager";
    expect(await run(actions.addTask(form({ section_id: SECTION, name: "x", client: "1" })))).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit`);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Дії редактора: менеджер напряму", () => {
  it("AC-EDITOR-08: менеджер додає задачу чи зберігає версію напряму — жодного запису, шаблон без змін", async () => {
    role = "manager";
    for (const [name, fields] of [
      ["addTask", { section_id: SECTION, name: "Sign handover act" }],
      ["renameTemplate", { name: "x" }],
      ["removeTask", { task_id: "30000000-0000-0000-0000-000000000111" }],
      ["moveSection", { section_id: SECTION, direction: "up" }],
      ["saveVersion", {}],
    ] as const) {
      const result = await run((actions as Record<string, (fd: FormData) => Promise<unknown>>)[name](form(fields)));
      expect(result, name).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit`);
    }
    // Лише читання власного профілю (роль) — жодної таблиці шаблону й жодної функції збереження.
    expect(touched.every((t) => t === "read profiles")).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("AC-DSYS-02: менеджер напряму створює шаблон — жодного запису, повертається на сторінку з «Not enough rights»", async () => {
    role = "manager";
    expect(await run(actions.createTemplate(form({ name: "Repair" })))).toBe("NEXT_REDIRECT /templates/new");
    expect(touched).toEqual(["read profiles"]);
  });

  it("AC-EDITOR-01: адміністратор додає задачу — запис іде функцією бази (позиція в кінці атомарно), зміна зберігається одразу", async () => {
    role = "admin";
    expect(await run(actions.addTask(form({ section_id: SECTION, name: " Sign handover act ", required: "on" })))).toBe(
      `NEXT_REDIRECT /templates/${TEMPLATE}/edit`,
    );
    expect(rpc).toHaveBeenCalledWith("add_template_task", {
      p_template_id: TEMPLATE,
      p_section_id: SECTION,
      p_name: "Sign handover act",
      p_required: true,
    });
  });

  it("AC-EDITOR-01: адміністратор видаляє чи перейменовує секцію або задачу — лише функції бази (блокування шаблону першим), без прямих записів", async () => {
    role = "admin";
    const TASK = "30000000-0000-0000-0000-000000000111";
    for (const [name, fields, fn, args] of [
      ["removeSection", { section_id: SECTION }, "remove_template_section", { p_template_id: TEMPLATE, p_section_id: SECTION }],
      ["removeTask", { task_id: TASK }, "remove_template_task", { p_template_id: TEMPLATE, p_task_id: TASK }],
      ["renameSection", { section_id: SECTION, name: " Handover " }, "rename_template_section", { p_template_id: TEMPLATE, p_section_id: SECTION, p_name: "Handover" }],
      ["updateTask", { task_id: TASK, name: "Clean", required: "on" }, "update_template_task", { p_template_id: TEMPLATE, p_task_id: TASK, p_name: "Clean", p_required: true }],
    ] as const) {
      rpc.mockClear();
      const result = await run((actions as Record<string, (fd: FormData) => Promise<unknown>>)[name](form(fields)));
      expect(result, name).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit`);
      expect(rpc, name).toHaveBeenCalledWith(fn, args);
    }
    expect(touched.filter((t) => !t.startsWith("read ")), "прямі записи").toEqual([]);
    expect(touched.filter((t) => t !== "read profiles"), "прямі читання таблиць шаблону").toEqual([]);
  });

  it("AC-EDITOR-08: роль змінилась між перевіркою й записом — база відмовила у видаленні (NOT_ALLOWED), на сторінці «Not enough rights»", async () => {
    role = "admin";
    rpc.mockResolvedValueOnce({ data: null, error: { message: "NOT_ALLOWED" } } as never);
    expect(await run(actions.removeSection(form({ section_id: SECTION })))).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit?error=NOT_ALLOWED_TEMPLATES`);
  });

  it("AC-EDITOR-03: адміністратор зберігає версію — функція бази, повідомлення «Version 2 saved»", async () => {
    role = "admin";
    expect(await run(actions.saveVersion(form({})))).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit?saved=2`);
    expect(rpc).toHaveBeenCalledWith("save_template_version", { p_template_id: TEMPLATE });
  });

  it("AC-EDITOR-04: база відмовила без обов'язкової задачі — на сторінку з кодом повідомлення PM", async () => {
    role = "admin";
    rpc.mockResolvedValueOnce({ data: null, error: { message: "TEMPLATE_NEEDS_REQUIRED_TASK" } } as never);
    expect(await run(actions.saveVersion(form({})))).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit?error=TEMPLATE_NEEDS_REQUIRED_TASK`);
  });
});
