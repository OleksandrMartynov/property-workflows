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

const runsQuery = () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) chain[m] = () => chain;
  chain.then = (resolve: (r: unknown) => unknown) => resolve({ data: [], count: 2, error: null });
  return chain;
};

vi.mock("@/lib/supabase/viewer", () => ({
  getViewer: async () => ({ supabase: { from: runsQuery, rpc: async () => ({ data: [], error: null }) }, claims: state.claims, profile: state.profile }),
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
