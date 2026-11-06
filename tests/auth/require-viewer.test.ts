// Другий рубіж за proxy: requireViewer() сам не пускає без сесії й без ролі застосунку, навіть якщо proxy пропустив
// запит (змінений matcher, новий маршрут). Справжній requireViewer(); заглушки — лише клієнт Supabase (сесія й
// профіль), next/navigation і next/headers (шлях, який proxy передає для повернення після входу).
import { beforeEach, describe, expect, it, vi } from "vitest";

const state: {
  claims: { sub: string; email: string } | null;
  profile: { email: string; role: string | null } | null;
  count: { count: number | null; error: { message: string } | null };
  filters: [string, unknown][];
} = { claims: null, profile: null, count: { count: 0, error: null }, filters: [] };
const redirects: string[] = [];
const selected: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) },
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = (columns: string) => {
        selected.push(columns);
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        state.filters.push([column, value]);
        return chain;
      };
      chain.maybeSingle = async () => ({ data: state.profile, error: null });
      // Підрахунок (head: true) — await самого ланцюга.
      chain.then = (resolve: (r: unknown) => unknown) => resolve(state.count);
      return chain;
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirects.push(url);
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-pw-next", "/templates/10000000-0000-0000-0000-000000000001/edit"]]),
}));

const { countMyOpenTasks, getViewer, requireAdmin, requireViewer } = await import("@/lib/supabase/viewer");

beforeEach(() => {
  redirects.length = 0;
  selected.length = 0;
  state.claims = null;
  state.profile = null;
  state.count = { count: 0, error: null };
  state.filters = [];
});

describe("requireViewer — другий рубіж за proxy", () => {
  it("AC-EDITOR-09: без сесії requireViewer веде на сторінку входу з поверненням, навіть якщо proxy пропустив запит", async () => {
    await expect(requireViewer()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirects).toEqual(["/login?next=%2Ftemplates%2F10000000-0000-0000-0000-000000000001%2Fedit"]);
  });

  it("користувач без ролі застосунку в профілі — на «/», а не на сторінку застосунку", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000099", email: "norole@example.test" };
    state.profile = { email: "norole@example.test", role: null };
    await expect(requireViewer()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirects).toEqual(["/"]);
  });

  it("сесія є, а профілю немає зовсім — на «/», без помилки", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000097", email: "ghost@example.test" };
    state.profile = null;
    await expect(requireViewer()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirects).toEqual(["/"]);
  });

  it("користувач із невідомою роллю (не manager, admin чи vendor) — теж на «/»", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000098", email: "odd@example.test" };
    state.profile = { email: "odd@example.test", role: "tenant" };
    await expect(requireViewer()).rejects.toThrow("NEXT_REDIRECT /");
  });

  it("менеджер із сесією і роллю — проходить: роль і email з профілю, id із JWT", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000002", email: "claims@example.test" };
    state.profile = { email: "manager.a@example.test", role: "manager" };
    const { viewer } = await requireViewer();
    expect(viewer).toEqual({ id: "a0000000-0000-0000-0000-000000000002", role: "manager", email: "manager.a@example.test" });
    expect(redirects).toEqual([]);
    // Роль — з колонки profiles.role, ніколи з user_metadata.
    expect(selected).toEqual(["email, full_name, role"]);
  });

  it("email без профільного — з JWT; без обох — null (порожній email не ламає вхід)", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000004", email: "jwt@example.test" };
    state.profile = { email: null as unknown as string, role: "admin" };
    expect((await requireViewer()).viewer.email).toBe("jwt@example.test");
    state.claims = { sub: "a0000000-0000-0000-0000-000000000004", email: undefined as unknown as string };
    expect((await requireViewer()).viewer.email).toBeNull();
  });

  it("AC-EDITOR-08: requireAdmin() не пускає менеджера — на «/templates» (там «Not enough rights»), до будь-якого запису", async () => {
    state.claims = { sub: "a0000000-0000-0000-0000-000000000003", email: "manager.b@example.test" };
    state.profile = { email: "manager.b@example.test", role: "manager" };
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /templates");
    expect(redirects).toEqual(["/templates"]);
  });
});

describe("getViewer і лічильник відкритих задач", () => {
  it("без сесії getViewer нічого не читає з profiles і повертає порожнього глядача (рішення — за requireViewer)", async () => {
    const { claims, profile } = await getViewer();
    expect([claims, profile]).toEqual([null, null]);
    expect(selected).toEqual([]);
  });

  it("мої задачі «to do»: підрахунок за виконавцем і статусом; немає рядків — 0", async () => {
    state.count = { count: 3, error: null };
    expect(await countMyOpenTasks("a0000000-0000-0000-0000-000000000002")).toBe(3);
    expect(state.filters).toEqual([
      ["assignee_id", "a0000000-0000-0000-0000-000000000002"],
      ["status", "to_do"],
    ]);
    state.count = { count: null, error: null };
    expect(await countMyOpenTasks("a0000000-0000-0000-0000-000000000002")).toBe(0);
  });

  it("помилка бази в підрахунку — помилка сторінки (error.tsx), а не тихий нуль", async () => {
    state.count = { count: null, error: { message: "connection reset" } };
    await expect(countMyOpenTasks("a0000000-0000-0000-0000-000000000002")).rejects.toThrow("connection reset");
  });
});
