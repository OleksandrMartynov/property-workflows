// Дія launchRun (AC-RUN-01, 03, 04, 07): що вона передає функції бази launch_run і куди веде після. Справжні дія,
// collectAssignees, validateCaseName і читання поточної версії (src/lib/templates/current.ts); заглушки — лише
// requireViewer з клієнтом Supabase (віддає те, що дала б база з RLS), next/navigation і next/cache.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assigneeField } from "@/lib/runs/assignees";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const RUN = "33333333-3333-3333-3333-333333333333";
const A = "a0000000-0000-0000-0000-000000000002";
const B = "a0000000-0000-0000-0000-000000000003";
const TASKS = ["30000000-0000-0000-0000-000000000111", "30000000-0000-0000-0000-000000000112"];

const rpc = vi.fn();
const versions = { fail: false };

// Ланцюг запиту PostgREST: фільтри повертають ланцюг, await — дані таблиці.
const table = (name: string) => {
  const rows: Record<string, unknown[]> = {
    templates: [{ id: TEMPLATE, current_version: 1 }],
    template_versions: [{ id: "v1", template_id: TEMPLATE, number: 1, name: "Tenant move-in" }],
    template_version_tasks: TASKS.map((template_task_id) => ({ version_id: "v1", template_task_id })),
  };
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "not", "in", "eq", "order"]) chain[m] = () => chain;
  chain.then = (resolve: (r: unknown) => unknown) =>
    resolve(versions.fail && name === "templates" ? { data: null, error: { message: "connection reset" } } : { data: rows[name] ?? [], error: null });
  return chain;
};
const navigation: { url: string; type?: string }[] = [];

vi.mock("@/lib/supabase/viewer", () => ({
  requireViewer: async () => ({ supabase: { rpc, from: table }, viewer: { id: A, role: "manager", email: "manager.a@example.test" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string, type?: string) => {
    navigation.push({ url, type });
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { launchRun } = await import("@/app/(app)/runs/actions");

const form = (caseName: string, assignees: Record<string, string> = {}) => {
  const fd = new FormData();
  fd.set("template_id", TEMPLATE);
  fd.set("case_name", caseName);
  for (const [task, user] of Object.entries(assignees)) fd.set(assigneeField(task), user);
  return fd;
};

beforeEach(() => {
  rpc.mockReset();
  versions.fail = false;
  navigation.length = 0;
});

describe("Дія launchRun", () => {
  it("AC-RUN-04: B на двох задачах — launch_run отримує назву без пробілів і саме ці призначення; далі — сторінка запуску", async () => {
    rpc.mockResolvedValue({ data: RUN, error: null });
    await expect(launchRun(form("  Apartment 12, move-in  ", { [TASKS[0]]: B, [TASKS[1]]: B }))).rejects.toThrow(`NEXT_REDIRECT /runs/${RUN}?done=launched`);
    expect(rpc).toHaveBeenCalledWith("launch_run", {
      p_template_id: TEMPLATE,
      p_case_name: "Apartment 12, move-in",
      p_assignees: { [TASKS[0]]: B, [TASKS[1]]: B },
    });
    expect(navigation).toEqual([{ url: `/runs/${RUN}?done=launched`, type: undefined }]);
  });

  it("AC-RUN-03: порожня назва — до бази не доходимо, назад на форму (replace) з «Enter a case name»", async () => {
    await expect(launchRun(form("   "))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(rpc).not.toHaveBeenCalled();
    expect(navigation).toEqual([{ url: `/templates/${TEMPLATE}/launch?error=CASE_NAME_REQUIRED&case_name=${encodeURIComponent("   ")}`, type: "replace" }]);
  });

  it("AC-RUN-07: назва довша за 100 символів — запуску немає, помилка на формі", async () => {
    await expect(launchRun(form("x".repeat(101)))).rejects.toThrow(/error=CASE_NAME_TOO_LONG/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("AC-RUN-01: версію шаблону не прочитано — не запускаємо (інакше всі задачі лягли б на менеджера), помилка на формі", async () => {
    versions.fail = true;
    await expect(launchRun(form("Apartment 12, move-in"))).rejects.toThrow(/error=DB_ERROR/);
    expect(rpc).not.toHaveBeenCalled();
    expect(navigation[0].type).toBe("replace");
  });

  it("AC-RUN-01: відмова функції бази — код помилки на формі, введена назва лишається в адресі", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "TEMPLATE_NOT_PUBLISHED" } });
    await expect(launchRun(form("Apartment 12, move-in"))).rejects.toThrow(/error=TEMPLATE_NOT_PUBLISHED&case_name=Apartment%2012%2C%20move-in/);
    expect(navigation[0].type).toBe("replace");
  });
});
