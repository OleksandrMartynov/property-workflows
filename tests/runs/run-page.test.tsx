// Сторінка запуску після відповідей PM (зміна clarify-template-runs): групи за секціями, позначка «required» /
// «optional», можливість позначки лише на дозволених задачах, «Run not found», назва випадку з пробілом.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RunNotFound from "@/app/runs/[id]/not-found";
import { canCompleteTask } from "@/lib/runs/access";
import { validateCaseName } from "@/lib/runs/case-name";
import { requiredLabel } from "@/lib/runs/labels";
import { MESSAGES } from "@/lib/runs/messages";
import { groupBySection } from "@/lib/runs/sections";

const task = (name: string, section_name: string, section_position: number, position: number, required = true) => ({
  name,
  section_name,
  section_position,
  position,
  required,
});

// Запуск із секціями, як в AC-TASK-12: «Before move-in» (2 задачі) і «Move-in day» (3 задачі); 3 обов'язкові, 2 ні.
const runTasks = [
  task("Hand over the keys", "Move-in day", 2, 1),
  task("Inspect the apartment", "Before move-in", 1, 2),
  task("Record meter readings", "Move-in day", 2, 3, false),
  task("Sign the lease agreement", "Before move-in", 1, 1),
  task("Order cleaning", "Move-in day", 2, 2, false),
];

describe("Сторінка запуску", () => {
  it("AC-TASK-12: задачі двома групами — спершу «Before move-in» з 2 задачами, потім «Move-in day» з 3", () => {
    const groups = groupBySection(runTasks);
    expect(groups.map((g) => [g.name, g.tasks.length])).toEqual([
      ["Before move-in", 2],
      ["Move-in day", 3],
    ]);
    expect(groups[0].tasks.map((t) => t.name)).toEqual(["Sign the lease agreement", "Inspect the apartment"]);
  });

  it("AC-TASK-12: дві секції з однаковою позицією в шаблоні — дві цілі групи, не розірвані задачами одна одної", () => {
    const samePosition = [
      task("Inspect the apartment", "Before move-in", 0, 2),
      task("Hand over the keys", "Move-in day", 0, 1),
      task("Sign the lease agreement", "Before move-in", 0, 1),
      task("Order cleaning", "Move-in day", 0, 2),
      task("Record meter readings", "Move-in day", 0, 3),
    ];
    const groups = groupBySection(samePosition);
    expect(groups.map((g) => [g.name, g.tasks.length])).toEqual([
      ["Before move-in", 2],
      ["Move-in day", 3],
    ]);
    expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length);
  });

  it("AC-TASK-15: біля статусу кожної задачі — «required» або «optional»: 3 «required» і 2 «optional»", () => {
    const labels = runTasks.map((t) => requiredLabel(t.required));
    expect(labels.filter((l) => l === "required")).toHaveLength(3);
    expect(labels.filter((l) => l === "optional")).toHaveLength(2);
  });

  it("AC-TASK-18: менеджер C бачить можливість позначки на своїй задачі й не бачить на задачі менеджера B", () => {
    const C = { id: "c", role: "manager" as const };
    const run = { run_manager_id: "a", status: "in_progress" };
    expect(canCompleteTask(C, { assignee_id: "c", status: "to_do" }, run)).toBe(true);
    expect(canCompleteTask(C, { assignee_id: "b", status: "to_do" }, run)).toBe(false);
  });

  it("AC-TASK-10: чужий запуск — сторінка «Run not found» без жодної задачі", () => {
    const html = renderToStaticMarkup(<RunNotFound />);
    expect(MESSAGES.RUN_NOT_FOUND).toBe("Run not found");
    expect(html).toContain("Run not found");
    expect(html).not.toContain("run-task");
  });

  it("AC-RUN-11: назва зі 100 символів і пробілом перед нею (101 як введено) — коректна, зберігаються 100 символів", () => {
    const name = "d".repeat(100);
    expect(validateCaseName(` ${name}`)).toEqual({ ok: true, value: name });
  });
});
