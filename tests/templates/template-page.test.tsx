// Сторінка шаблону лише для читання, «Template not found», недоступний для запуску шаблон без версії й порожні списки
// (AC-EDITOR-02, 10, 16, 17, 18). Справжні сторінки й requireViewer(); заглушки — лише клієнт Supabase (рядки в пам'яті,
// запис звернень), next/navigation і next/cache. Дані «Tenant move-in» — як в AC: версія 1, 2 секції, 5 задач.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT = "10000000-0000-0000-0000-000000000001";
const REPAIR = "10000000-0000-0000-0000-000000000002";
const touched: string[] = [];
let role: "manager" | "admin" = "manager";
let drafts: { id: string; name: string; current_version: number | null; has_unpublished_changes: boolean }[] = [];
let versions: { id: string; template_id: string; number: number; name: string }[] = [];

const task = (n: number, section: string, sectionPosition: number, name: string, required: boolean) => ({
  version_id: "v1",
  template_task_id: `t${n}`,
  section_name: section,
  section_position: sectionPosition,
  position: n,
  name,
  required,
});
const versionTasks = [
  task(1, "Before move-in", 1, "Sign the lease agreement", true),
  task(2, "Before move-in", 1, "Inspect the apartment", true),
  task(3, "Before move-in", 1, "Order cleaning", false),
  task(4, "Move-in day", 2, "Hand over the keys", true),
  task(5, "Move-in day", 2, "Record meter readings", false),
];

/** Рядки таблиць, як їх віддасть база цьому користувачу; шаблон «Repair» без версії менеджеру не віддається (RLS). */
function rows(table: string): Record<string, unknown>[] {
  if (table === "profiles") return [{ id: "a0000000-0000-0000-0000-000000000001", email: `${role}@example.test`, role }];
  if (table === "templates") {
    const all = [
      { id: TENANT, current_version: 1 },
      { id: REPAIR, current_version: null },
    ];
    return role === "admin" ? all : all.filter((t) => t.current_version !== null);
  }
  if (table === "template_versions") return versions;
  if (table === "template_version_tasks") return versionTasks;
  return [];
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "a0000000-0000-0000-0000-000000000001", email: `${role}@example.test` } } }) },
    from: (table: string) => {
      touched.push(`from ${table}`);
      let data = rows(table);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.order = () => chain;
      chain.not = (col: string) => ((data = data.filter((r) => r[col] !== null)), chain);
      chain.in = (col: string, values: unknown[]) => ((data = data.filter((r) => values.includes(r[col]))), chain);
      chain.eq = (col: string, value: unknown) => ((data = data.filter((r) => r[col] === value)), chain);
      chain.maybeSingle = () => ((data = data.slice(0, 1)), Object.assign(chain, { single: true }));
      chain.then = (resolve: (r: unknown) => unknown) => resolve({ data: chain.single ? (data[0] ?? null) : data, error: null });
      return chain;
    },
    rpc: async (fn: string) => {
      touched.push(`rpc ${fn}`);
      if (fn === "list_template_drafts") return { data: role === "admin" ? drafts : null, error: role === "admin" ? null : { message: "NOT_ALLOWED" } };
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
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => "/templates",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { default: TemplatePage } = await import("@/app/(app)/templates/[id]/page");
const { default: TemplateNotFound } = await import("@/app/(app)/templates/[id]/not-found");
const { default: LaunchTemplatePage } = await import("@/app/(app)/templates/[id]/launch/page");
const { default: TemplateVersionsPage } = await import("@/app/(app)/templates/[id]/versions/page");
const { TemplatesList } = await import("@/app/(app)/templates/_components/templates-list");
const { MESSAGES } = await import("@/lib/runs/messages");

const params = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  touched.length = 0;
  role = "manager";
  versions = [{ id: "v1", template_id: TENANT, number: 1, name: "Tenant move-in" }];
  drafts = [
    { id: TENANT, name: "Tenant move-in", current_version: 1, has_unpublished_changes: true },
    { id: REPAIR, name: "Repair", current_version: null, has_unpublished_changes: true },
  ];
});

const manager = (id: string) => TemplatePage({ params: params(id) } as Parameters<typeof TemplatePage>[0]);

describe("Сторінка шаблону для менеджера", () => {
  it("AC-EDITOR-02: менеджер B відкриває шаблон — «Version 1» з 5 задачами, 3 «required» і 2 «optional», «Launch», без позначки про зміни", async () => {
    const html = renderToStaticMarkup(await manager(TENANT));
    expect(html).toContain("Tenant move-in");
    expect(html).toContain("Version 1");
    expect(html.match(/data-testid="template-task"/g)).toHaveLength(5);
    expect(html.match(/>required</g)).toHaveLength(3);
    expect(html.match(/>optional</g)).toHaveLength(2);
    expect(html).toContain("Before move-in");
    expect(html).toContain("Move-in day");
    expect(html).toMatch(new RegExp(`href="/templates/${TENANT}/launch"[^>]*>(<svg.*?</svg>)?Launch<`));
    expect(html).not.toContain("Unpublished changes");
    // Лише поточна версія: ні незбережених змін, ні списку версій, ні функції чернеток.
    expect(touched).not.toContain("from template_sections");
    expect(touched).not.toContain("from template_tasks");
    expect(touched).not.toContain("rpc list_template_drafts");
  });

  it("AC-EDITOR-02: той самий вигляд для адміністратора — поточна версія з 5 задачами, без позначки про незбережені зміни", async () => {
    role = "admin";
    const html = renderToStaticMarkup(await manager(TENANT));
    expect(html).toContain("Version 1");
    expect(html.match(/data-testid="template-task"/g)).toHaveLength(5);
    expect(html).not.toContain("Unpublished changes");
  });

  it("AC-EDITOR-16: менеджер за прямим посиланням на «Repair» без версії — «Template not found», жодної секції чи задачі", async () => {
    await expect(manager(REPAIR)).rejects.toThrow("NEXT_NOT_FOUND");
    // Задачі не запитувались взагалі, а сторінка 404 сегмента показує лише повідомлення.
    expect(touched).not.toContain("from template_version_tasks");
    expect(touched).not.toContain("rpc list_template_drafts");
    const html = renderToStaticMarkup(<TemplateNotFound />);
    expect(html).toContain("Template not found");
    expect(MESSAGES.TEMPLATE_NOT_FOUND).toBe("Template not found");
    expect(html).not.toContain("template-task");
    expect(html).not.toContain("Before move-in");
  });

  it("AC-EDITOR-16: адреса не uuid — теж «Template not found», без звернення до бази за шаблоном", async () => {
    await expect(manager("not-a-uuid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(touched).not.toContain("from templates");
  });

  it("AC-EDITOR-16: менеджер відкриває форму запуску «Repair» без версії — «Template not found», форми й задач немає", async () => {
    await expect(
      LaunchTemplatePage({ params: params(REPAIR), searchParams: Promise.resolve({}) } as Parameters<typeof LaunchTemplatePage>[0]),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(touched).not.toContain("from template_version_tasks");
  });
});

describe("Шаблон без збереженої версії для адміністратора", () => {
  const card = (props: Partial<Parameters<typeof TemplatesList>[0]> = {}) =>
    renderToStaticMarkup(
      <TemplatesList
        templates={[
          { id: REPAIR, name: "Repair", currentVersion: null, unpublished: true },
          { id: TENANT, name: "Tenant move-in", currentVersion: 1 },
        ]}
        counts={{ [TENANT]: { sections: 2, total: 5, required: 3 } }}
        canManage
        {...props}
      />,
    );

  it("AC-EDITOR-10: «Repair» у списку запуску — вимкнений «Launch» і примітка «Save the template to launch it», посилання на запуск немає", () => {
    const html = card();
    expect(MESSAGES.TEMPLATE_NOT_PUBLISHED).toBe("Save the template to launch it");
    expect(html).toContain("Save the template to launch it");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="[^"]+-launch-note"[^>]*>(<svg.*?<\/svg>)?Launch<\/button>/);
    expect(html).not.toContain(`/templates/${REPAIR}/launch`);
    // Збережений шаблон поруч лишається доступним: посилання «Launch» і жодної примітки для нього.
    expect(html).toContain(`href="/templates/${TENANT}/launch"`);
    expect(html.match(/Save the template to launch it/g)).toHaveLength(1);
  });

  it("AC-EDITOR-10: форма запуску «Repair» — примітка замість форми: ні поля назви випадку, ні «Launch», ні вибору виконавця", async () => {
    role = "admin";
    const page = await LaunchTemplatePage({ params: params(REPAIR), searchParams: Promise.resolve({}) } as Parameters<typeof LaunchTemplatePage>[0]);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Launch “Repair”");
    expect(html).toContain("Save the template to launch it");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Case name");
    expect(html).not.toContain(">Launch<");
  });

  it("AC-EDITOR-10: менеджер не бачить шаблону без версії в списку", () => {
    const html = card({ canManage: false, templates: [{ id: TENANT, name: "Tenant move-in", currentVersion: 1 }] });
    expect(html).not.toContain("Repair");
    expect(html).not.toContain("Save the template to launch it");
  });
});

describe("Порожні списки", () => {
  it("AC-EDITOR-17: менеджер без жодного збереженого шаблону — «No templates yet. An administrator creates them.» без таблиці й дій", () => {
    const html = renderToStaticMarkup(<TemplatesList templates={[]} counts={{}} />);
    expect(html).toContain("No templates yet. An administrator creates them.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("Create a template");
    expect(html).not.toContain("<button");
  });

  it("AC-EDITOR-17: адміністратор без жодного шаблону — «No templates yet. Create a template to start.» і «Create a template»", () => {
    const html = renderToStaticMarkup(<TemplatesList templates={[]} counts={{}} canManage />);
    expect(html).toContain("No templates yet. Create a template to start.");
    expect(html).toMatch(/<button[^>]*>(<svg.*?<\/svg>)?Create a template<\/button>/);
    expect(html).not.toContain("<table");
    expect(html).not.toContain("An administrator creates them");
  });

  it("AC-EDITOR-18: адміністратор відкриває список версій «Repair» без версій — «No versions yet. Save the template to create version 1.», без таблиці", async () => {
    role = "admin";
    versions = [];
    const page = await TemplateVersionsPage({ params: params(REPAIR) } as Parameters<typeof TemplateVersionsPage>[0]);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No versions yet. Save the template to create version 1.");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Current");
    expect(html).not.toMatch(/Version \d/);
  });
});
