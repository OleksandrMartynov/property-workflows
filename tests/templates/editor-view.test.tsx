// Вигляд галереї шаблонів і редактора (без бази): що бачить адміністратор і менеджер, позначки змін і стани.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => "/templates/10000000-0000-0000-0000-000000000001/edit",
  redirect: () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const { TemplatesList } = await import("@/app/(app)/templates/_components/templates-list");
const { EditorView } = await import("@/app/(app)/templates/[id]/edit/_components/editor-view");
const { createSaveStore } = await import("@/lib/templates/save-state");

const T = "10000000-0000-0000-0000-000000000001";
const templates = [
  { id: "a", name: "Repair", currentVersion: null, unpublished: true },
  { id: "b", name: "Tenant move-in", currentVersion: 1, unpublished: true },
];
const counts = { b: { sections: 2, total: 5, required: 3 } };
const outlines = { b: [{ name: "Before move-in", tasks: 3 }, { name: "Move-in day", tasks: 2 }] };

describe("Галерея шаблонів", () => {
  it("AC-EDITOR-01: адміністратор бачить «Unpublished changes», «Edit» і «Versions»; склад — з поточної версії", () => {
    const html = renderToStaticMarkup(<TemplatesList templates={templates} counts={counts} outlines={outlines} canManage />);
    expect(html.match(/Unpublished changes/g)).toHaveLength(2);
    expect(html).toContain(`href="/templates/b/edit"`);
    expect(html).toContain(`href="/templates/b/versions"`);
    expect(html).toContain("2 sections · 5 tasks · 3 required");
    expect(html).toContain("Before move-in");
  });

  it("AC-EDITOR-04: шаблон без збереженої версії — «No saved version» і без «Launch»", () => {
    const html = renderToStaticMarkup(<TemplatesList templates={[templates[0]]} counts={{}} canManage />);
    expect(html).toContain("No saved version");
    expect(html).not.toContain("/launch");
  });

  it("AC-EDITOR-02: менеджер — лише збережений шаблон, «Version 1» і «Launch», без «Unpublished changes», «Edit» і «Versions»", () => {
    const html = renderToStaticMarkup(
      <TemplatesList templates={[{ id: "b", name: "Tenant move-in", currentVersion: 1 }]} counts={counts} outlines={outlines} />,
    );
    expect(html).toContain("Version 1");
    expect(html).toContain(`href="/templates/b/launch"`);
    expect(html).not.toContain("Unpublished changes");
    expect(html).not.toContain("/edit");
    expect(html).not.toContain("/versions");
  });
});

describe("Редактор шаблону", () => {
  const view = (props: Partial<Parameters<typeof EditorView>[0]> = {}) =>
    renderToStaticMarkup(
      <EditorView
        template={{ id: T, name: "Tenant move-in", current_version: 1, has_unpublished_changes: true }}
        sections={[{ id: "s2", name: "Move-in day" }]}
        tasks={[
          { id: "t4", section_id: "s2", name: "Hand over the keys", required: true },
          { id: "t6", section_id: "s2", name: "Sign handover act", required: true },
        ]}
        current={{ number: 1 }}
        versionTasks={[
          { version_id: "v1", template_task_id: "t4", section_name: "Move-in day", section_position: 1, position: 1, name: "Hand over the keys", required: true },
        ]}
        latest={{ saved_at: "2026-10-05T06:30:00Z", saved_by: "u1" }}
        authorEmail="admin@example.test"
        savedNumber={null}
        {...props}
      />,
    );

  it("AC-EDITOR-01: шоста задача без збереження — «Unpublished changes», позначка «New», панель «Save» з «1 task added»", () => {
    const html = view();
    expect(html).toContain("Unpublished changes");
    expect(html.match(/data-testid="task-change"[^>]*>New</g)).toHaveLength(1);
    expect(html).toContain('aria-label="Save version"');
    expect(html).toContain("Since Version 1 · 1 task added");
    expect(html).toMatch(/<button type="submit"[^>]*aria-disabled="false"[^>]*>Save/);
  });

  it("AC-EDITOR-05: «Details» — поточна версія, дата й час за Києвом і email адміністратора, що зберіг", () => {
    const html = view();
    expect(html).toContain("Version 1");
    expect(html).toContain("05.10.2026 09:30");
    expect(html).toContain("admin@example.test");
  });

  it("AC-EDITOR-03: після збереження — «Version 2 saved», без «Unpublished changes» і без панелі «Save»", () => {
    const html = view({
      template: { id: T, name: "Tenant move-in", current_version: 2, has_unpublished_changes: false },
      current: { number: 2 },
      versionTasks: null,
      savedNumber: "2",
    });
    expect(html).toContain("Version 2 saved");
    expect(html).not.toContain("Unpublished changes");
    expect(html).not.toContain('aria-label="Save version"');
    expect(html).not.toMatch(/>Save</);
  });

  it("AC-EDITOR-04: відмова збереження — повідомлення дослівно, введене лишається", () => {
    const html = view({ message: "A template needs at least one required task" });
    expect(html).toContain("A template needs at least one required task");
    expect(html).toContain('value="Sign handover act"');
  });

  it("AC-RUN-12: «Preview» — чекліст за секціями, як отримає запуск, без полів редагування", () => {
    const html = view({ mode: "preview" });
    expect(html).toContain('data-testid="editor-preview"');
    expect(html).toContain("Sign handover act");
    expect(html).not.toContain("Add a task");
  });
});

describe("Редактор шаблону: стан збереження", () => {
  const render = (store: ReturnType<typeof createSaveStore>) =>
    renderToStaticMarkup(
      <EditorView
        template={{ id: T, name: "Tenant move-in", current_version: 1, has_unpublished_changes: true }}
        sections={[{ id: "s2", name: "Move-in day" }]}
        tasks={[{ id: "t4", section_id: "s2", name: "Hand over the keys", required: true }]}
        current={{ number: 1 }}
        versionTasks={null}
        latest={null}
        authorEmail={null}
        savedNumber={null}
        saveStore={store}
      />,
    );
  const statusOf = (html: string) => html.match(/<p role="status"[^>]*>.*?<\/p>/)?.[0] ?? "";

  it("AC-EDITOR-25: у фіксованому місці — «All changes kept», доки змін, що не збереглись, немає", () => {
    const html = render(createSaveStore());
    expect(statusOf(html)).toContain("All changes kept");
    expect(statusOf(html)).toContain('aria-live="polite"');
    expect(html).not.toContain("Your last change was not kept");
    expect(html).not.toContain('data-testid="unkept-item"');
  });

  it("AC-EDITOR-25: додавання задачі відхилене (з'єднання втрачено) — у тому самому місці повідомлення кольором помилки, «Sign handover act» лишається на екрані з «Try again»", async () => {
    const store = createSaveStore();
    await store.run({ scope: "s2", name: "Sign handover act", required: true }, async () => {
      throw new TypeError("Failed to fetch");
    });
    const html = render(store);
    const status = statusOf(html);
    expect(status).toContain("Your last change was not kept. Try again.");
    expect(status).toContain("text-destructive");
    expect(status).not.toContain("All changes kept");
    // Задача — у своїй секції після наявних, із можливістю повторити.
    expect(html.indexOf("Hand over the keys")).toBeLessThan(html.indexOf("Sign handover act"));
    expect(html).toMatch(/data-testid="unkept-item" data-state="failed".*Sign handover act.*Try again/);
  });

  it("AC-EDITOR-25: поки запис триває — «Saving…» у тому самому місці, задача вже видима", () => {
    const store = createSaveStore();
    void store.run({ scope: "s2", name: "Sign handover act", required: true }, () => new Promise(() => {}));
    const html = render(store);
    expect(statusOf(html)).toContain("Saving…");
    expect(html).toMatch(/data-testid="unkept-item" data-state="pending".*Sign handover act/);
  });
});
