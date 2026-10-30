// Сторінка запуску (docs/ux/ux-plan.md, партія 4): лічильник секції — записом глосарію «N of M done»; своя задача
// позначена (смужка й підпис для скрінрідера), а email виконавця біля кожної задачі лишається (AC-TASK-11);
// на вузькому екрані «Details» із прогресом — над задачами.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunDetail } from "@/app/(app)/runs/[id]/_components/run-detail";

const A = "a0000000-0000-0000-0000-000000000002";
const B = "a0000000-0000-0000-0000-000000000003";
const task = (id: string, section: string, position: number, assignee: string, status = "to_do") => ({
  id,
  section_name: section,
  section_position: section === "Before move-in" ? 1 : 2,
  position,
  name: `Task ${id}`,
  required: true,
  assignee_id: assignee,
  status,
});

const html = renderToStaticMarkup(
  <RunDetail
    run={{ id: "r1", case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "in_progress", run_manager_id: A }}
    tasks={[task("t1", "Before move-in", 1, A, "done"), task("t2", "Before move-in", 2, B), task("t3", "Move-in day", 1, A)]}
    emailOf={
      new Map([
        [A, "manager.a@example.test"],
        [B, "manager.b@example.test"],
      ])
    }
    viewer={{ id: B, role: "manager", email: "manager.b@example.test" }}
    completeTask={async () => {}}
  />,
);

// Рядки задач (li data-testid="run-task") — щоб перевірки стосувались саме рядка, а не всієї сторінки.
const rows = [...html.matchAll(/<li[^>]*data-testid="run-task"[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);
const rowOf = (name: string) => rows.find((row) => row.includes(name)) ?? "";

describe("Сторінка запуску: секції, свої задачі, порядок панелі", () => {
  it("AC-TASK-12: лічильник секції — «1 of 2 done» і «0 of 1 done», а не «1/2»", () => {
    expect(html).toContain("1 of 2 done");
    expect(html).toContain("0 of 1 done");
    expect(html).not.toMatch(/>1\/2</);
  });

  it("AC-TASK-11: своя задача (t2) позначена, а email виконавця — у кожному рядку задачі", () => {
    expect(rows).toHaveLength(3);
    expect(rowOf("Task t2")).toContain('data-mine="true"');
    expect(rowOf("Task t2")).toContain("(assigned to you)");
    expect(rowOf("Task t2")).toContain("manager.b@example.test");
    for (const name of ["Task t1", "Task t3"]) {
      expect(rowOf(name)).not.toContain("data-mine");
      expect(rowOf(name)).toContain("manager.a@example.test");
    }
  });

  it("AC-TASK-05: прогрес «Details» — першим у розмітці (скрінрідер на телефоні чує його до задач), на широкому екрані — праворуч", () => {
    expect(html.match(/data-testid="run-progress"/g)).toHaveLength(1);
    expect(html.indexOf('data-testid="run-progress"')).toBeLessThan(html.indexOf('data-testid="run-section"'));
    expect(html).toMatch(/class="[^"]*lg:col-start-2 lg:row-start-1[^"]*"/);
  });
});
