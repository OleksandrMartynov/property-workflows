import { describe, expect, it } from "vitest";
import { taskStatusLabel } from "@/lib/runs/labels";
import { countProgress, formatProgress } from "@/lib/runs/progress";

const fiveTasks = (done: number) =>
  Array.from({ length: 5 }, (_, i) => ({ status: i < done ? "done" : "to_do", required: i % 2 === 0 }));

describe("Прогрес запуску", () => {
  it("AC-TASK-05: 5 задач, 2 «done» — «2 of 5 done»", () => {
    expect(formatProgress(countProgress(fiveTasks(2)))).toBe("2 of 5 done");
  });

  it("AC-TASK-05: прогрес рахує всі задачі, обов'язкові чи ні (глосарій PM)", () => {
    expect(countProgress(fiveTasks(0))).toEqual({ done: 0, total: 5 });
    expect(formatProgress(countProgress(fiveTasks(5)))).toBe("5 of 5 done");
  });

  it("AC-TASK-08: для кожної з 5 задач видно «done» або «to do»", () => {
    expect(fiveTasks(2).map((t) => taskStatusLabel(t.status))).toEqual(["done", "done", "to do", "to do", "to do"]);
  });

});
