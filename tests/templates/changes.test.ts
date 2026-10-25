import { describe, expect, it } from "vitest";
import type { VersionTask } from "@/lib/templates/current";
import { changeLines, draftChanges } from "@/lib/templates/changes";

// «Tenant move-in», версія 1: 2 секції, 5 задач (3 обов'язкові) — як у AC-EDITOR-01.
const v = (id: string, section: [number, string], name: string, required: boolean, position: number): VersionTask => ({
  version_id: "v1",
  template_task_id: id,
  section_name: section[1],
  section_position: section[0],
  position,
  name,
  required,
});
const BEFORE: [number, string] = [1, "Before move-in"];
const DAY: [number, string] = [2, "Move-in day"];
const VERSION_1 = [
  v("t1", BEFORE, "Sign the lease", true, 1),
  v("t2", BEFORE, "Collect the deposit", true, 2),
  v("t3", BEFORE, "Order cleaning", false, 3),
  v("t4", DAY, "Hand over the keys", true, 1),
  v("t5", DAY, "Record meter readings", false, 2),
];
const sections = [
  { id: "s1", name: "Before move-in" },
  { id: "s2", name: "Move-in day" },
];
const tasks = [
  { id: "t1", section_id: "s1", name: "Sign the lease", required: true },
  { id: "t2", section_id: "s1", name: "Collect the deposit", required: true },
  { id: "t3", section_id: "s1", name: "Order cleaning", required: false },
  { id: "t4", section_id: "s2", name: "Hand over the keys", required: true },
  { id: "t5", section_id: "s2", name: "Record meter readings", required: false },
];

describe("Зміни чернетки порівняно з поточною версією", () => {
  it("AC-EDITOR-01: шоста задача «Sign handover act» — позначка «New» і «1 task added»; решта без позначок", () => {
    const draft = [...tasks, { id: "t6", section_id: "s2", name: "Sign handover act", required: true }];
    const changes = draftChanges(sections, draft, VERSION_1);
    expect([...changes.tasks]).toEqual([["t6", "new"]]);
    expect(changes.sections.size).toBe(0);
    expect(changeLines(changes.summary)).toEqual(["1 task added"]);
  });

  it("AC-EDITOR-03: чернетка без змін (одразу після збереження версії) — жодної позначки й жодного рядка підсумку", () => {
    const changes = draftChanges(sections, tasks, VERSION_1);
    expect(changes.tasks.size + changes.sections.size).toBe(0);
    expect(changeLines(changes.summary)).toEqual([]);
  });

  it("AC-EDITOR-01: перейменування, зміна «required», перенесення в іншу секцію — «Edited»; видалена задача — «removed»", () => {
    const draft = [
      { id: "t1", section_id: "s1", name: "Sign the lease agreement", required: true },
      { id: "t2", section_id: "s1", name: "Collect the deposit", required: false },
      { id: "t3", section_id: "s2", name: "Order cleaning", required: false },
      { id: "t4", section_id: "s2", name: "Hand over the keys", required: true },
    ];
    const changes = draftChanges(sections, draft, VERSION_1);
    expect(Object.fromEntries(changes.tasks)).toEqual({ t1: "edited", t2: "edited", t3: "edited" });
    expect(changeLines(changes.summary)).toEqual(["3 tasks edited", "1 task removed"]);
  });

  it("AC-EDITOR-01: нова й перейменована секція, видалена секція — позначки секцій і підсумок", () => {
    const draft = [
      { id: "t1", section_id: "s1", name: "Sign the lease", required: true },
      { id: "t2", section_id: "s1", name: "Collect the deposit", required: true },
      { id: "t3", section_id: "s1", name: "Order cleaning", required: false },
      { id: "t7", section_id: "s3", name: "Collect feedback", required: false },
    ];
    const changes = draftChanges(
      [
        { id: "s1", name: "Before the move" },
        { id: "s3", name: "After move-in" },
      ],
      draft,
      VERSION_1,
    );
    expect(Object.fromEntries(changes.sections)).toEqual({ s1: "edited", s3: "new" });
    expect(changeLines(changes.summary)).toEqual(["1 section added", "1 task added", "1 section renamed", "1 section removed", "2 tasks removed"]);
  });

  it("AC-EDITOR-04: шаблон ще не збережено як версію — порівнювати нема з чим, позначок немає", () => {
    const changes = draftChanges(sections, tasks, null);
    expect(changes.tasks.size + changes.sections.size).toBe(0);
    expect(changeLines(changes.summary)).toEqual([]);
  });
});
