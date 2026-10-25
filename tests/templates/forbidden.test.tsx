// Сторінки адміністратора для менеджера: «Not enough rights» без вмісту, і перевірка ролі — до будь-якого запиту
// незбережених змін чи версій. Справжні сторінки й requireViewer(); заглушки — лише клієнт Supabase (записує, до чого
// звернулась сторінка), next/navigation і next/cache.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Forbidden } from "@/app/_components/forbidden";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates } from "@/lib/supabase/viewer";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const touched: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "a0000000-0000-0000-0000-000000000001", email: "manager.a@example.test" } } }) },
    from: (table: string) => {
      touched.push(`from ${table}`);
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order", "maybeSingle"]) chain[m] = () => chain;
      chain.then = (resolve: (r: unknown) => unknown) =>
        resolve(table === "profiles" ? { data: { email: "manager.a@example.test", role: "manager" }, error: null } : { data: [], error: null });
      return chain;
    },
    rpc: async (fn: string) => {
      touched.push(`rpc ${fn}`);
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

const { default: TemplateVersionsPage } = await import("@/app/(app)/templates/[id]/versions/page");
const { default: EditTemplatePage } = await import("@/app/(app)/templates/[id]/edit/page");

beforeEach(() => {
  touched.length = 0;
});

describe("Сторінки адміністратора для менеджера", () => {
  it("AC-EDITOR-07: менеджер за прямим посиланням на список версій — «Not enough rights» і жодної версії", () => {
    expect(canManageTemplates("manager")).toBe(false);
    const html = renderToStaticMarkup(<Forbidden title="Versions" />);
    expect(html).toContain("Not enough rights");
    expect(html).not.toContain("Version 1");
    expect(html).not.toContain("<table");
  });

  it("AC-DSYS-02: менеджер у редакторі — «Not enough rights» і «Back to templates», без вмісту редактора", () => {
    const html = renderToStaticMarkup(<Forbidden title="Edit template" />);
    expect(html).toContain("Not enough rights");
    expect(html).toMatch(/href="\/templates"[^>]*>Back to templates</);
    expect(html).not.toContain("Add task");
    expect(html).not.toContain("Save");
  });

  it("AC-EDITOR-04: повідомлення збереження без обов'язкової задачі — дослівно з AC", () => {
    expect(errorMessage("TEMPLATE_NEEDS_REQUIRED_TASK")).toBe("A template needs at least one required task");
    expect(canManageTemplates("admin")).toBe(true);
  });
});

describe("Сторінки адміністратора: менеджер за прямим посиланням", () => {
  it("AC-EDITOR-07: сторінка версій — «Not enough rights», жодної версії й жодного запиту версій чи незбережених змін", async () => {
    const page = await TemplateVersionsPage({ params: Promise.resolve({ id: TEMPLATE }) } as Parameters<typeof TemplateVersionsPage>[0]);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Not enough rights");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Version ");
    expect(touched).toEqual(["from profiles"]);
  });

  it("AC-DSYS-02: редактор — «Not enough rights» і «Back to templates», без вмісту редактора й без запитів секцій і задач", async () => {
    const page = await EditTemplatePage({
      params: Promise.resolve({ id: TEMPLATE }),
      searchParams: Promise.resolve({}),
    } as Parameters<typeof EditTemplatePage>[0]);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Not enough rights");
    expect(html).toMatch(/href="\/templates"[^>]*>Back to templates</);
    expect(html).not.toContain("Add task");
    expect(html).not.toContain("Add section");
    expect(touched).toEqual(["from profiles"]);
  });
});
