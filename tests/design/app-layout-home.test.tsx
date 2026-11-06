// Каркас (app)/layout і головна після переходу на getViewer: claims і профіль — один раз на запит, лічильник «моїх
// відкритих задач» — один на layout і головну. Справжні layout, сторінка й AppShell; заглушки — getViewer і підрахунок
// (дані бази з RLS через клієнт Supabase) і next/navigation.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ME = "a0000000-0000-0000-0000-000000000002";
const state: { claims: { sub: string; email: string } | null; profile: { email: string; full_name: string | null; role: string } | null } = {
  claims: null,
  profile: null,
};
const counted: string[] = [];
// Мої задачі «to do» (run_tasks з назвою запуску) і фільтри цього запиту.
let myTasks: { id: string; name: string; run_id: string; runs: { case_name: string } | null }[] = [];
const taskFilters: [string, unknown][] = [];
let tasksError: { message: string } | null = null;

const runsQuery = (table: string) => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit"]) chain[m] = () => chain;
  chain.eq = (column: string, value: unknown) => {
    if (table === "run_tasks") taskFilters.push([column, value]);
    return chain;
  };
  chain.then = (resolve: (r: unknown) => unknown) => resolve({ data: table === "run_tasks" ? myTasks : [], count: 2, error: table === "run_tasks" ? tasksError : null });
  return chain;
};

vi.mock("@/lib/supabase/viewer", () => ({
  getViewer: async () => ({ supabase: { from: (table: string) => runsQuery(table), rpc: async () => ({ data: [], error: null }) }, claims: state.claims, profile: state.profile }),
  requireViewer: async () => { throw new Error("not used"); },
  countMyOpenTasks: async (id: string) => {
    counted.push(id);
    return 4;
  },
  loginRedirectPath: async () => "/login?next=%2Fruns",
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

const { default: AppLayout } = await import("@/app/(app)/layout");
const { default: Home } = await import("@/app/(app)/page");

beforeEach(() => {
  counted.length = 0;
  myTasks = [];
  taskFilters.length = 0;
  tasksError = null;
  state.claims = { sub: ME, email: "manager.a@example.test" };
  state.profile = { email: "manager.a@example.test", full_name: null, role: "manager" };
});

describe("Каркас (app)/layout", () => {
  it("без сесії — на сторінку входу з поверненням", async () => {
    state.claims = null;
    await expect(AppLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT /login?next=%2Fruns");
  });

  it("email з профілю й нагадування про мої відкриті задачі — один підрахунок на запит", async () => {
    const html = renderToStaticMarkup(await AppLayout({ children: <p>content</p> }));
    expect(html).toContain("manager.a@example.test");
    expect(html).toContain("4 open tasks assigned to you");
    expect(counted).toEqual([ME]);
  });

  it("профілю немає — email із JWT, каркас не падає", async () => {
    state.profile = null;
    state.claims = { sub: ME, email: "jwt@example.test" };
    expect(renderToStaticMarkup(await AppLayout({ children: null }))).toContain("jwt@example.test");
  });
});

describe("Головна", () => {
  it("«Your open tasks» — той самий підрахунок, що й нагадування в каркасі", async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Launch a template");
    expect(counted).toEqual([ME]);
  });

  it("«Your tasks»: мої задачі «to do» з назвою запуску й посиланням на запуск; лічильник «Your open tasks» — акцентом", async () => {
    myTasks = [
      { id: "t1", name: "Hand over the keys", run_id: "r1", runs: { case_name: "Apartment 12, move-in" } },
      { id: "t2", name: "Order cleaning", run_id: "r2", runs: null },
    ];
    const html = renderToStaticMarkup(await Home());
    expect(taskFilters).toEqual([
      ["assignee_id", ME],
      ["status", "to_do"],
    ]);
    expect(html).toContain(">Your tasks<");
    expect(html.match(/data-testid="my-task"/g)).toHaveLength(2);
    expect(html).toMatch(/href="\/runs\/r1"[\s\S]*?Hand over the keys[\s\S]*?Apartment 12, move-in/);
    expect(html).toMatch(/href="\/runs\/r2"[\s\S]*?Order cleaning[\s\S]*?—/);
    // 4 мої задачі, показано 2 — «View all» веде на вигляд «mine».
    expect(html).toContain('href="/runs?view=mine"');
    expect(html.match(/data-accent="true"/g)).toHaveLength(1);
  });

  it("помилка бази в запиті моїх задач — помилка сторінки (error.tsx), а не порожній блок", async () => {
    tasksError = { message: "connection reset" };
    await expect(Home()).rejects.toThrow("connection reset");
  });

  it("моїх задач немає — без блоку «Your tasks»", async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).not.toContain("Your tasks<");
    expect(html).not.toContain('data-testid="my-task"');
  });

  it("AC-VENDOR-03: підрядник — одразу на список запусків зі своїми задачами", async () => {
    state.profile = { email: "vendor.v@example.test", full_name: null, role: "vendor" };
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT /runs");
  });

  it("без сесії — на сторінку входу", async () => {
    state.claims = null;
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("профілю немає — стан помилки без даних і без кнопки запуску", async () => {
    state.profile = null;
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Profile not found");
    expect(html).not.toContain("Launch a template");
  });
});
