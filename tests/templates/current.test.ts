import { describe, expect, it } from "vitest";
import { templateVersionLabel } from "@/lib/runs/labels";
import { countVersion, pickCurrent, toLaunchSections, type VersionTask } from "@/lib/templates/current";

const task = (section: [string, number], position: number, name: string, required: boolean, id = name): VersionTask => ({
  version_id: "v1",
  template_task_id: id,
  section_name: section[0],
  section_position: section[1],
  position,
  name,
  required,
});
const before: [string, number] = ["Before move-in", 1];
const day: [string, number] = ["Move-in day", 2];
const VERSION_1 = [
  task(day, 2, "Record meter readings", false),
  task(before, 1, "Sign the lease agreement", true),
  task(day, 1, "Hand over the keys", true),
  task(before, 3, "Order cleaning", false),
  task(before, 2, "Inspect the apartment", true),
];

describe("Поточна версія шаблону", () => {
  it("AC-EDITOR-02: для шаблону — лише поточна версія; шаблон без збереженої версії не показано", () => {
    const current = pickCurrent(
      [
        { id: "t1", current_version: 2 },
        { id: "t2", current_version: null },
      ],
      [
        { id: "a", template_id: "t1", number: 1, name: "Tenant move-in" },
        { id: "b", template_id: "t1", number: 2, name: "Tenant move-in" },
        { id: "c", template_id: "t2", number: 1, name: "Draft" },
      ],
    );
    expect(current).toEqual([{ templateId: "t1", versionId: "b", number: 2, name: "Tenant move-in" }]);
  });

  it("AC-EDITOR-06: форма запуску — 5 задач версії 1 у порядку секцій і позицій, ключ — template_task_id", () => {
    const { sections, tasks } = toLaunchSections(VERSION_1);
    expect(sections.map((s) => s.name)).toEqual(["Before move-in", "Move-in day"]);
    expect(tasks.map((t) => t.name)).toEqual([
      "Sign the lease agreement",
      "Inspect the apartment",
      "Order cleaning",
      "Hand over the keys",
      "Record meter readings",
    ]);
    expect(tasks[0]).toMatchObject({ id: "Sign the lease agreement", section_id: sections[0].id, required: true });
  });

  it("AC-EDITOR-06: сторінка запуску показує «Template version 1»", () => {
    expect(templateVersionLabel(1)).toBe("Template version 1");
    expect(templateVersionLabel(null)).toBe("—");
  });

  it("AC-EDITOR-02: склад поточної версії — 2 секції, 5 задач, 3 обов'язкові", () => {
    expect(countVersion(VERSION_1)).toEqual({ sections: 2, total: 5, required: 3 });
  });
});
