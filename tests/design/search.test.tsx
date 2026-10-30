// Пошук у ⌘K і нагадування (docs/ux/ux-plan.md, партія 5). Справжня дія searchWorkspace і requireViewer; заглушка —
// лише клієнт Supabase (віддає те, що дала б база з RLS, і записує, до чого звернулась дія) і next/navigation.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { role: "manager", touched: [] as string[] };

// Ланцюжок запиту: ilike справді фільтрує рядки (як база), решта методів лише повертає ланцюжок.
const query = (rows: unknown) => {
  let data = rows;
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "not", "order", "limit", "maybeSingle"]) chain[m] = () => chain;
  chain.ilike = (column: string, pattern: string) => {
    const needle = pattern.replace(/^%|%$/g, "").replace(/\\(.)/g, "$1").toLowerCase();
    data = (data as Record<string, string>[]).filter((row) => String(row[column]).toLowerCase().includes(needle));
    return chain;
  };
  chain.then = (resolve: (r: unknown) => unknown) => resolve({ data, error: null });
  return chain;
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "u1", email: "u1@example.test" } } }) },
    from: (table: string) => {
      state.touched.push(`from ${table}`);
      const rows: Record<string, unknown> = {
        profiles: { email: "u1@example.test", role: state.role },
        runs: [{ id: "r12", case_name: "Apartment 12, move-in", template_name: "Tenant move-in", status: "in_progress" }],
        template_versions: [{ template_id: "t1", number: 1, name: "Tenant move-in" }],
      };
      return query(rows[table] ?? []);
    },
    rpc: (fn: string) => {
      state.touched.push(`rpc ${fn}`);
      if (fn === "vendor_runs") return query([{ id: "r12", case_name: "Apartment 12, move-in", status: "in_progress", created_at: "", done: 0, total: 2 }]);
      if (fn === "list_template_drafts") return query([{ id: "t2", name: "Apartment repair", current_version: null, has_unpublished_changes: true }]);
      return query([]);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  usePathname: () => "/runs",
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));

const { searchWorkspace } = await import("@/app/(app)/search/actions");
const { AppShell } = await import("@/components/ui/app-shell");

beforeEach(() => {
  state.touched.length = 0;
});

describe("Пошук у ⌘K", () => {
  it("менеджер знаходить запуск за назвою випадку й шаблон за назвою", async () => {
    state.role = "manager";
    const hits = await searchWorkspace("apartment 12");
    expect(hits).toEqual([{ id: "r12", label: "Apartment 12, move-in", detail: "Tenant move-in · in progress", href: "/runs/r12", group: "Run" }]);
    const templates = await searchWorkspace("move");
    expect(templates.find((h) => h.group === "Template")).toEqual({ id: "t1", label: "Tenant move-in", detail: "Version 1", href: "/templates/t1", group: "Template" });
  });

  it("адміністратор бачить і шаблон без збереженої версії — у редакторі", async () => {
    state.role = "admin";
    const hits = await searchWorkspace("repair");
    expect(hits).toContainEqual({ id: "t2", label: "Apartment repair", detail: "Unpublished changes", href: "/templates/t2/edit", group: "Template" });
  });

  it("AC-VENDOR-08: підрядник шукає лише у своїх запусках (vendor_runs), без шаблонів і рядків runs", async () => {
    state.role = "vendor";
    const hits = await searchWorkspace("apartment");
    expect(hits.map((h) => h.group)).toEqual(["Run"]);
    expect(state.touched).not.toContain("from runs");
    expect(state.touched).not.toContain("from templates");
    expect(state.touched).not.toContain("rpc list_template_drafts");
  });

  it("запит коротший за 2 символи — порожньо, без звернення до запусків чи шаблонів", async () => {
    state.role = "manager";
    expect(await searchWorkspace(" a ")).toEqual([]);
    expect(state.touched).toEqual(["from profiles"]);
  });
});

describe("Нагадування біля «Runs»", () => {
  const shell = (openTasks: number) =>
    renderToStaticMarkup(
      <AppShell email="u1@example.test" role="manager" signOutAction={async () => {}} openTasks={openTasks}>
        <p>content</p>
      </AppShell>,
    );

  it("показує число моїх відкритих задач з повним підписом для скрінрідера", () => {
    const html = shell(3);
    expect(html).toContain('data-testid="open-tasks"');
    expect(html).toContain('<span aria-hidden="true">3</span><span class="sr-only">3 open tasks assigned to you</span>');
  });

  it("понад 99 — видно «99+», а скрінрідер чує повне число", () => {
    expect(shell(120)).toContain('<span aria-hidden="true">99+</span><span class="sr-only">120 open tasks assigned to you</span>');
  });

  it("нуль — без бейджа", () => {
    expect(shell(0)).not.toContain('data-testid="open-tasks"');
  });
});
