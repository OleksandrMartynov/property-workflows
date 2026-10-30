// Підтвердження видалення секції чи задачі в редакторі (AC-EDITOR-13, AC-EDITOR-14). Vitest працює без DOM, тож
// компонент ItemActions викликається як функція з підміненими хуками React: стан підтвердження й посилання на форми
// ведемо самі, а перевіряємо, що бачить адміністратор у ConfirmDialog і коли відправляється форма видалення.
// Дію на сервері й версії в базі перевіряє tests/db/template-page-states-db.test.ts.
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Стан одного рендеру: useState — значення з замикання, useRef — по одному на виклик у порядку оголошення в компоненті
// (up, down, moveTo, target, remove), кожне з requestSubmit-шпигуном.
let confirming = false;
const setConfirming = vi.fn((value: boolean) => {
  confirming = value;
});
const submits: ReturnType<typeof vi.fn>[] = [];
let refCalls = 0;

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useId: () => "uid",
    useState: () => [confirming, setConfirming],
    useRef: () => {
      const index = refCalls++;
      return { current: { requestSubmit: submits[index] ?? (submits[index] = vi.fn()), value: "" } };
    },
  };
});
// Справжній модуль дій: компонент лише передає дії у form action, тест їх не викликає. Залежності дій від Next.js —
// заглушки фреймворку, а не власного коду.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));

const { ItemActions } = await import("@/app/(app)/templates/[id]/edit/_components/item-actions");
const { ConfirmDialog } = await import("@/components/ui/dialog");
const { CANNOT_BE_UNDONE } = await import("@/lib/runs/confirmation");

/** Усі елементи дерева (без рендеру компонентів), у порядку документа. */
function elements(node: ReactNode, found: ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) node.forEach((child) => elements(child, found));
  else if (isValidElement<Record<string, unknown>>(node)) {
    found.push(node);
    elements(node.props.children as ReactNode, found);
  }
  return found;
}

/** Один рендер ItemActions для секції «Move-in day» (3 задачі) з поточним станом підтвердження. */
function render() {
  refCalls = 0;
  const tree = ItemActions({ templateId: "t1", kind: "section", id: "s2", name: "Move-in day", canMoveUp: true, canMoveDown: false });
  const all = elements(tree);
  const dialog = all.find((e) => e.type === ConfirmDialog) as ReactElement<{
    open: boolean;
    title: ReactNode;
    description: ReactNode;
    onCancel: () => void;
    onConfirm: () => void;
  }>;
  const menu = all.find((e) => Array.isArray(e.props.items)) as ReactElement<{ items: { id: string; onSelect: () => void }[] }>;
  return { dialog, remove: () => menu.props.items.find((i) => i.id === "remove")!.onSelect() };
}
const removeForm = () => submits[4]; // п'ятий useRef компонента — форма видалення

beforeEach(() => {
  confirming = false;
  submits.length = 0;
  setConfirming.mockClear();
});

describe("Підтвердження видалення секції", () => {
  it("AC-EDITOR-13: «Remove section» відкриває підтвердження з «Move-in day» і «This cannot be undone»; «Cancel» закриває без видалення", () => {
    expect(render().dialog.props.open).toBe(false);
    render().remove();
    expect(setConfirming).toHaveBeenLastCalledWith(true);
    // Видалення ще не відправлено: до відповіді на підтвердження форма видалення не чіпається.
    expect(removeForm()?.mock.calls.length ?? 0).toBe(0);

    const { dialog } = render();
    expect(dialog.props.open).toBe(true);
    expect(dialog.props.title).toBe("Move-in day");
    expect(dialog.props.description).toBe(CANNOT_BE_UNDONE);
    expect(CANNOT_BE_UNDONE).toBe("This cannot be undone");

    dialog.props.onCancel();
    expect(setConfirming).toHaveBeenLastCalledWith(false);
    expect(removeForm().mock.calls).toHaveLength(0);
    for (const submit of submits) expect(submit.mock.calls).toHaveLength(0);
  });

  it("AC-EDITOR-13: вікно підтвердження показує назву секції, «This cannot be undone», «Cancel» і «OK»", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open title="Move-in day" description={CANNOT_BE_UNDONE} onCancel={() => {}} onConfirm={() => {}} />,
    );
    expect(html).toContain("Move-in day");
    expect(html).toContain("This cannot be undone");
    expect(html).toContain(">Cancel<");
    expect(html).toContain(">OK<");
  });

  it("AC-EDITOR-14: «OK» на підтвердженні — одразу закриває вікно й відправляє форму видалення рівно один раз", () => {
    render().remove();
    const { dialog } = render();
    dialog.props.onConfirm();
    expect(setConfirming).toHaveBeenLastCalledWith(false);
    expect(removeForm().mock.calls).toHaveLength(1);
    // Інші форми (вгору, вниз, перенесення) не відправлено.
    expect(submits.filter((_, i) => i !== 4).every((s) => s.mock.calls.length === 0)).toBe(true);
  });
});
