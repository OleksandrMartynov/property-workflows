// Дії редактора шаблону без входу (AC-EDITOR-26): відвідувач, що надсилає форму напряму, оминаючи сторінки, одразу
// отримує перенаправлення на /login — жодного звернення до таблиць і функцій бази (тож шаблон не змінюється й нічого про
// нього не повертається). Справжній requireViewer(); заглушки — клієнт Supabase без claims, redirect і cache.
import { beforeEach, describe, expect, it, vi } from "vitest";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const SECTION = "20000000-0000-0000-0000-000000000011";
const TASK = "30000000-0000-0000-0000-000000000111";
const calls: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    // Відвідувач без входу: getClaims() не віддає claims.
    auth: { getClaims: async () => ({ data: null, error: null }) },
    from: (table: string) => {
      calls.push(`from ${table}`);
      throw new Error(`unexpected from ${table}`);
    },
    rpc: async (fn: string) => {
      calls.push(`rpc ${fn}`);
      throw new Error(`unexpected rpc ${fn}`);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// requireViewer() бере шлях повернення з заголовка proxy (AC-DSYS-08); у прямому запиті без proxy заголовка немає.
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));

const actions = await import("@/app/(app)/templates/[id]/edit/actions");
const { launchRun } = await import("@/app/(app)/runs/actions");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ template_id: TEMPLATE, ...fields })) fd.set(k, v);
  return fd;
};
const outcome = (p: Promise<unknown>) =>
  p.then(
    () => "returned",
    (e: Error) => e.message,
  );

beforeEach(() => {
  calls.length = 0;
});

describe("Дії редактора: відвідувач без входу", () => {
  it("AC-EDITOR-26: відвідувач змінює шаблон чи зберігає версію напряму — кожна дія веде на /login, жодного запиту до бази", async () => {
    const attempts = [
      ["createTemplate", { name: "Repair" }],
      ["renameTemplate", { name: "x" }],
      ["addSection", { name: "After move-in" }],
      ["renameSection", { section_id: SECTION, name: "x" }],
      ["moveSection", { section_id: SECTION, direction: "up" }],
      ["removeSection", { section_id: SECTION }],
      ["addTask", { section_id: SECTION, name: "Sign handover act" }],
      ["updateTask", { task_id: TASK, name: "x", required: "on" }],
      ["moveTask", { task_id: TASK, direction: "down" }],
      ["moveTaskToSection", { task_id: TASK, target_section_id: SECTION }],
      ["removeTask", { task_id: TASK }],
      ["saveVersion", {}],
    ] as const;
    // Усі дії модуля покрито: нова дія без перевірки входу тут не пройшла б повз список.
    expect(attempts.map(([name]) => name).sort()).toEqual(Object.keys(actions).sort());

    for (const [name, fields] of attempts) {
      const result = await outcome((actions as Record<string, (fd: FormData) => Promise<void>>)[name](form(fields)));
      expect(result, name).toBe("NEXT_REDIRECT /login");
    }
    // Нічого не прочитано й не записано: шаблон лишається на версії 1 без незбережених змін.
    expect(calls).toEqual([]);
  });

  it("AC-EDITOR-26: відвідувач без входу запускає шаблон напряму — теж /login і жодного запиту до бази", async () => {
    expect(await outcome(launchRun(form({ case_name: "Apartment 12, move-in" })))).toBe("NEXT_REDIRECT /login");
    expect(calls).toEqual([]);
  });
});
