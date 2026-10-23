import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addMonthsKeep,
  datePresets,
  formatDate,
  formatLong,
  kyivZoneName,
  monthGrid,
  parseDateInput,
  parseKey,
  rangePresets,
  todayKey,
  weekdayIndex,
} from "./dates";

const TODAY = "2026-10-23"; // п'ятниця

describe("dates: ключі й арифметика (UTC)", () => {
  it("розбирає лише справжні дати", () => {
    expect(parseKey("2026-02-30")).toBeNull();
    expect(parseKey("2026-13-01")).toBeNull();
    expect(parseKey("2028-02-29")).toEqual({ y: 2028, m: 2, d: 29 });
    expect(parseKey("26-10-23")).toBeNull();
  });

  it("додає дні через межі місяця, року й зміну часу (25 жовтня 2026 у Києві)", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("зсуває місяці зі збереженням дня і притисканням до кінця місяця", () => {
    expect(addMonthsKeep("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsKeep("2026-10-23", -12)).toBe("2025-10-23");
    expect(addMonthsKeep("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-10-23", 3)).toBe("2027-01-01");
  });

  it("рахує день тижня від понеділка", () => {
    expect(weekdayIndex(TODAY)).toBe(4);
    expect(weekdayIndex("2026-10-26")).toBe(0);
    expect(weekdayIndex("2026-10-25")).toBe(6);
  });

  it("будує сітку місяця 6 × 7 з понеділка", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid).toHaveLength(6);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid[0][0]).toBe("2026-09-28");
    expect(grid[0][3]).toBe("2026-10-01");
    expect(grid[5][6]).toBe("2026-11-08");
  });
});

describe("dates: формат і Europe/Kyiv", () => {
  it("форматує дату детерміновано", () => {
    expect(formatDate("2026-10-24")).toBe("24 Oct 2026");
    expect(formatDate("2026-09-05")).toBe("5 Sep 2026");
    expect(formatLong(TODAY)).toBe("Friday, 23 October 2026");
  });

  it("визначає «сьогодні» за Києвом, а не за UTC", () => {
    // 21:30 UTC 22 жовтня — у Києві вже 00:30 23 жовтня (літній час, UTC+3).
    expect(todayKey(new Date("2026-10-22T21:30:00Z"))).toBe("2026-10-23");
    expect(todayKey(new Date("2026-10-22T20:30:00Z"))).toBe("2026-10-22");
    // Узимку UTC+2: 22:30 UTC — уже наступний день.
    expect(todayKey(new Date("2026-12-31T22:30:00Z"))).toBe("2027-01-01");
  });

  it("називає пояс: літній GMT+3, зимовий GMT+2", () => {
    expect(kyivZoneName("2026-10-24")).toBe("GMT+3");
    expect(kyivZoneName("2026-10-26")).toBe("GMT+2");
  });
});

describe("dates: розбір введення", () => {
  it("розуміє слова", () => {
    expect(parseDateInput("today", TODAY)).toBe(TODAY);
    expect(parseDateInput("  Tomorrow ", TODAY)).toBe("2026-10-24");
    expect(parseDateInput("next week", TODAY)).toBe("2026-10-30");
  });

  it("розуміє день і місяць, з роком і без", () => {
    expect(parseDateInput("24 Oct", TODAY)).toBe("2026-10-24");
    expect(parseDateInput("24 oct 2027", TODAY)).toBe("2027-10-24");
    expect(parseDateInput("Oct 24", TODAY)).toBe("2026-10-24");
    expect(parseDateInput("5 sept", TODAY)).toBe("2026-09-05");
  });

  it("розуміє числові формати й ISO", () => {
    expect(parseDateInput("24.10.2026", TODAY)).toBe("2026-10-24");
    expect(parseDateInput("24/10", TODAY)).toBe("2026-10-24");
    expect(parseDateInput("2026-10-24", TODAY)).toBe("2026-10-24");
  });

  it("порожнє — порожній рядок, сміття й неіснуючі дати — null", () => {
    expect(parseDateInput("   ", TODAY)).toBe("");
    expect(parseDateInput("soon", TODAY)).toBeNull();
    expect(parseDateInput("31 Feb", TODAY)).toBeNull();
    expect(parseDateInput("32 Oct", TODAY)).toBeNull();
    expect(parseDateInput("24 Foo", TODAY)).toBeNull();
  });
});

describe("dates: пресети", () => {
  it("дає Today / Tomorrow / Next week", () => {
    expect(datePresets(TODAY).map((p) => p.value)).toEqual(["2026-10-23", "2026-10-24", "2026-10-30"]);
  });

  it("дає діапазони тижня, 7 днів і місяця", () => {
    const byLabel = Object.fromEntries(rangePresets(TODAY).map((p) => [p.label, p]));
    expect(byLabel["This week"]).toMatchObject({ start: "2026-10-19", end: "2026-10-25" });
    expect(byLabel["Next 7 days"]).toMatchObject({ start: "2026-10-23", end: "2026-10-29" });
    expect(byLabel["Next week"]).toMatchObject({ start: "2026-10-26", end: "2026-11-01" });
    expect(byLabel["This month"]).toMatchObject({ start: "2026-10-01", end: "2026-10-31" });
  });
});
