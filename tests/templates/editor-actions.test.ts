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

describe("Дії редактора: менеджер напряму", () => {
  it("AC-EDITOR-08: менеджер додає задачу чи зберігає версію напряму — жодного запису, шаблон без змін", async () => {
    role = "manager";
    for (const [name, fields] of [
      ["addTask", { section_id: SECTION, name: "Sign handover act" }],
      ["renameTemplate", { name: "x" }],
      ["removeTask", { task_id: "30000000-0000-0000-0000-000000000111" }],
      ["saveVersion", {}],
    ] as const) {
      const result = await run((actions as Record<string, (fd: FormData) => Promise<void>>)[name](form(fields)));
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

  it("AC-EDITOR-01: адміністратор додає задачу — запис іде (зміна зберігається одразу)", async () => {
    role = "admin";
    expect(await run(actions.addTask(form({ section_id: SECTION, name: "Sign handover act" })))).toBe(`NEXT_REDIRECT /templates/${TEMPLATE}/edit`);
    expect(touched).toContain("insert template_tasks");
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
