import { describe, expect, it } from "vitest";
import { cleanName, formatSavedAt, nextPosition, swapWithNeighbour, versionList } from "@/lib/templates/editor";

describe("Список версій", () => {
  it("AC-EDITOR-05: версія 2 (12.10.2026 14:05, адміністратор C) першою, версія 1 (05.10.2026 09:30, адміністратор A) другою", () => {
    const A = "a0000000-0000-0000-0000-000000000001";
    const C = "a0000000-0000-0000-0000-000000000005";
    const rows = versionList(
      [
        // Київ — UTC+3 у жовтні до переходу на зимовий час: 09:30 і 14:05 за Києвом.
        { number: 1, saved_at: "2026-10-05T06:30:00Z", saved_by: A },
        { number: 2, saved_at: "2026-10-12T11:05:00Z", saved_by: C },
      ],
      new Map([
        [A, "admin@example.test"],
        [C, "admin.c@example.test"],
      ]),
    );
    expect(rows).toEqual([
      { label: "Version 2", savedAt: "12.10.2026 14:05", author: "admin.c@example.test" },
      { label: "Version 1", savedAt: "05.10.2026 09:30", author: "admin@example.test" },
    ]);
  });

  it("AC-EDITOR-05: дата за Києвом і після переходу на зимовий час (UTC+2), до хвилини", () => {
    expect(formatSavedAt("2026-11-02T07:00:59Z")).toBe("02.11.2026 09:00");
  });

  it("AC-EDITOR-05: версія з початкових даних зрізу 1 без автора — «Initial data»", () => {
    expect(versionList([{ number: 1, saved_at: "2026-10-25T12:00:00Z", saved_by: null }], new Map())[0].author).toBe("Initial data");
  });
});

describe("Редактор: порядок і назви", () => {
  const items = [
    { id: "a", position: 1 },
    { id: "b", position: 2 },
    { id: "c", position: 3 },
  ];

  it("AC-EDITOR-01: переміщення вгору міняє задачу місцями із сусідньою; на краю нічого не змінює", () => {
    expect(swapWithNeighbour(items, "b", "up")).toEqual([
      { id: "b", position: 1 },
      { id: "a", position: 2 },
    ]);
    expect(swapWithNeighbour(items, "a", "up")).toEqual([]);
    expect(swapWithNeighbour(items, "c", "down")).toEqual([]);
    expect(nextPosition(items)).toBe(4);
    expect(nextPosition([])).toBe(1);
  });

  it("AC-EDITOR-01: назва секції чи задачі — без пробілів на краях; порожня не приймається", () => {
    expect(cleanName("  Sign handover act ")).toBe("Sign handover act");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
});
