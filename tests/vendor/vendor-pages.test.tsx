// Сторінки підрядника (vendor): справжні сторінки й requireViewer(); заглушки — лише клієнт Supabase (віддає те, що
// дала б база з RLS і vendor_runs, і записує, до чого звернулась сторінка), next/navigation і next/cache.
// Правила бази (лише свої задачі, відмови прямих запитів) — tests/db/vendor-db.test.ts.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorRunsList } from "@/app/(app)/runs/_components/vendor-runs-list";
import { formatVendorProgress } from "@/lib/runs/progress";

const VENDOR_ID = "a0000000-0000-0000-0000-000000000008";
const RUN_12 = "11111111-1111-1111-1111-111111111112";

const state: {
  touched: string[];
  vendorRuns: { id: string; case_name: string; status: string; created_at: string; done: number; total: number }[];
  tasks: Record<string, unknown>[];
  lastRequired: string | null;
} = { touched: [], vendorRuns: [], tasks: [], lastRequired: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: VENDOR_ID, email: "vendor.v@example.test" } } }) },
    from: (table: string) => {
      state.touched.push(`from ${table}`);
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order", "range", "limit", "maybeSingle"]) chain[m] = () => chain;
      chain.then = (resolve: (r: unknown) => unknown) =>
        resolve(
          table === "profiles"
            ? { data: { email: "vendor.v@example.test", full_name: "Viktor Demo-Vendor-V", role: "vendor" }, error: null }
            : table === "run_tasks"
              ? { data: state.tasks, error: null }
              : { data: [], error: null },
        );
      return chain;
    },
    rpc: async (fn: string, args?: { p_run_id?: string }) => {
      state.touched.push(`rpc ${fn}`);
      if (fn === "vendor_runs") return { data: state.vendorRuns.filter((r) => !args?.p_run_id || r.id === args.p_run_id), error: null };
      if (fn === "run_last_required_task") return { data: state.lastRequired, error: null };
      return { data: [], error: null };
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { default: RunsPage } = await import("@/app/(app)/runs/page");
const { default: RunPage } = await import("@/app/(app)/runs/[id]/page");
const { default: TemplatesPage } = await import("@/app/(app)/templates/page");
const { default: TemplatePage } = await import("@/app/(app)/templates/[id]/page");
const { default: LaunchTemplatePage } = await import("@/app/(app)/templates/[id]/launch/page");
const { default: Home } = await import("@/app/(app)/page");

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const run12 = { id: RUN_12, case_name: "Apartment 12, move-in", status: "in_progress", created_at: "2026-10-30T10:00:00Z", done: 0, total: 2 };
const task = (id: string, name: string, section: string, required: boolean, status = "to_do") => ({
  id,
  section_name: section,
  section_position: section === "Before move-in" ? 1 : 2,
  position: 1,
  name,
  required,
  assignee_id: VENDOR_ID,
  status,
});
const errorOf = async (p: Promise<unknown>) => p.then(() => "", (e: Error) => e.message);

beforeEach(() => {
  state.touched.length = 0;
  state.vendorRuns = [];
  state.tasks = [];
  state.lastRequired = null;
});

describe("Список запусків підрядника", () => {
  it("AC-VENDOR-03: V бачить лише «Apartment 12, move-in» зі статусом і «Your tasks: 0 of 2 done», без «Apartment 14, repair»", async () => {
    state.vendorRuns = [run12];
    const html = renderToStaticMarkup(await RunsPage({ searchParams: Promise.resolve({}) } as never));
    expect(html).toContain("Apartment 12, move-in");
    expect(html).toContain("Your tasks: 0 of 2 done");
    expect(html).toContain("in progress");
    expect(html).not.toContain("Apartment 14, repair");
    // Лише поля PM: без менеджера, шаблону й email інших (Q11), рядків runs сторінка не читає.
    expect(html).not.toContain("Run manager");
    expect(html).not.toContain("@example.test");
    expect(state.touched).not.toContain("from runs");
  });

  it("AC-VENDOR-10: V без задач — «No tasks assigned to you yet.» і жодної таблиці", async () => {
    const html = renderToStaticMarkup(await RunsPage({ searchParams: Promise.resolve({}) } as never));
    expect(html).toContain("No tasks assigned to you yet.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Launch a template");
  });

  it("AC-VENDOR-10: порожній стан компонента — без таблиці; з запуском — таблиця з лічильником", () => {
    expect(renderToStaticMarkup(<VendorRunsList runs={[]} />)).not.toContain("<table");
    const html = renderToStaticMarkup(<VendorRunsList runs={[{ ...run12, done: 1 }]} />);
    expect(html).toContain("<table");
    expect(html).toContain("Your tasks: 1 of 2 done");
  });

  it("AC-VENDOR-03: головна для V веде на список запусків", async () => {
    expect(await errorOf(Home())).toBe("NEXT_REDIRECT /runs");
  });
});

describe("Сторінка запуску для підрядника", () => {
  it("AC-VENDOR-04: V бачить рівно задачі 3 і 4 з секцією, «required»/«optional» і статусом; без email і прогресу запуску", async () => {
    state.vendorRuns = [run12];
    state.tasks = [task("t3", "Order cleaning", "Before move-in", false), task("t4", "Hand over the keys", "Move-in day", true)];
    const html = renderToStaticMarkup(await RunPage({ params: Promise.resolve({ id: RUN_12 }), searchParams: Promise.resolve({}) } as never));
    expect((html.match(/data-testid="run-task"/g) ?? []).length).toBe(2);
    for (const text of ["Order cleaning", "Hand over the keys", "Before move-in", "Move-in day", "optional", "required", "to do"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("Your tasks: 0 of 2 done");
    expect(html).not.toContain("@example.test");
    expect(html).not.toContain("of 5 done");
    expect(html).not.toContain("Details");
    expect(html).not.toContain("Template version");
    expect(state.touched).not.toContain("from runs");
    expect(state.touched).not.toContain("rpc list_assignable_users");
  });

  it("AC-VENDOR-05: після позначки задачі 3 V бачить «done» і «Your tasks: 1 of 2 done»", async () => {
    state.vendorRuns = [{ ...run12, done: 1 }];
    state.tasks = [task("t3", "Order cleaning", "Before move-in", false, "done"), task("t4", "Hand over the keys", "Move-in day", true)];
    const html = renderToStaticMarkup(await RunPage({ params: Promise.resolve({ id: RUN_12 }), searchParams: Promise.resolve({}) } as never));
    expect(html).toContain("Your tasks: 1 of 2 done");
    expect(formatVendorProgress({ done: 1, total: 2 })).toBe("Your tasks: 1 of 2 done");
    // «Mark as done» — лише на задачі «to do» (задача 4), не на виконаній задачі 3.
    expect((html.match(/name="task_id" value="t4"/g) ?? []).length).toBe(1);
    expect(html).not.toContain('name="task_id" value="t3"');
  });

  it("AC-VENDOR-06: запуск без задач V за прямим посиланням — «Run not found» (notFound) без задач", async () => {
    state.tasks = [];
    expect(await errorOf(RunPage({ params: Promise.resolve({ id: RUN_12 }), searchParams: Promise.resolve({}) } as never))).toBe(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("Шаблони для підрядника", () => {
  it("AC-VENDOR-08: список шаблонів за прямим посиланням — «Not enough rights», жодного шаблону, даних шаблонів не читає", async () => {
    const html = renderToStaticMarkup(await TemplatesPage());
    expect(html).toContain("Not enough rights");
    expect(html).toMatch(/href="\/runs"[^>]*>Back to runs</);
    expect(html).not.toContain("Tenant move-in");
    expect(state.touched).toEqual(["from profiles"]);
  });

  it("AC-VENDOR-08: сторінка шаблону й форма запуску для V — та сама відмова, без даних шаблону", async () => {
    for (const page of [
      await TemplatePage({ params: Promise.resolve({ id: TEMPLATE }) } as never),
      await LaunchTemplatePage({ params: Promise.resolve({ id: TEMPLATE }), searchParams: Promise.resolve({}) } as never),
    ]) {
      expect(renderToStaticMarkup(page)).toContain("Not enough rights");
    }
    expect(state.touched.filter((t) => t !== "from profiles")).toEqual([]);
  });
});
