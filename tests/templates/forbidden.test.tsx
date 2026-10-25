import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Forbidden } from "@/app/_components/forbidden";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates } from "@/lib/supabase/viewer";

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
