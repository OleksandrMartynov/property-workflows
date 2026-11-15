// «Parse document» на сторінці запуску (зріз 4, ADR 0008): кнопка — лише там, де користувач може позначити задачу
// (ті самі права й статуси, що перевіряє check_task_document у базі); збережені значення — коротким рядком під
// назвою задачі для всіх, хто бачить задачу. Вимоги зрізу 4 з AC у PM ще немає, тож назви тестів — без AC ID.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunDetail } from "@/app/(app)/runs/[id]/_components/run-detail";
import { VendorRunDetail } from "@/app/(app)/runs/[id]/_components/vendor-run-detail";

const A = "a0000000-0000-0000-0000-000000000002";
const B = "a0000000-0000-0000-0000-000000000003";
const V = "a0000000-0000-0000-0000-000000000008";
const task = (id: string, assignee: string, status = "to_do", document: Record<string, unknown> | null = null) => ({
  id,
  section_name: "Repairs",
  section_position: 1,
  position: Number(id.slice(1)),
  name: `Task ${id}`,
  required: true,
  assignee_id: assignee,
  status,
  document: document as never,
});
const LEAK = { kind: "request", phone: "555-0101", description: "Leak.", category: "plumbing", urgency: "urgent", items: null, total: null };
const actions = { requestDraft: async () => null, save: async () => null };
const run = { id: "r1", case_name: "Flat 7, leak", template_name: "Repairs", template_version: 1, status: "in_progress", run_manager_id: A };
const emailOf = new Map([
  [A, "manager.a@example.test"],
  [B, "manager.b@example.test"],
]);

const rowsOf = (html: string) => [...html.matchAll(/<li[^>]*data-testid="run-task"[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);
const rowOf = (html: string, name: string) => rowsOf(html).find((row) => row.includes(`${name}<`)) ?? "";

describe("Сторінка запуску: документ задачі", () => {
  const tasks = [task("t1", A, "to_do", LEAK), task("t2", B), task("t3", A, "done", { ...LEAK, urgency: "not_urgent" })];

  it("виконавець B бачить «Parse document» лише на своїй задачі «to do»; збережені значення бачить на всіх", () => {
    const html = renderToStaticMarkup(
      <RunDetail run={run} tasks={tasks} emailOf={emailOf} viewer={{ id: B, role: "manager", email: "manager.b@example.test" }} completeTask={async () => {}} documentActions={actions} />,
    );
    expect(rowOf(html, "Task t2")).toContain("Parse document");
    expect(rowOf(html, "Task t1")).not.toContain("Parse document");
    expect(rowOf(html, "Task t1")).toContain("Request · Plumbing · Urgent · 555-0101");
    expect(rowOf(html, "Task t3")).toContain("Request · Plumbing · Not urgent · 555-0101");
  });

  it("менеджер запуску A: «Edit document» на задачі зі збереженими значеннями, на виконаній — нічого", () => {
    const html = renderToStaticMarkup(
      <RunDetail run={run} tasks={tasks} emailOf={emailOf} viewer={{ id: A, role: "manager", email: "manager.a@example.test" }} completeTask={async () => {}} documentActions={actions} />,
    );
    expect(rowOf(html, "Task t1")).toContain("Edit document");
    expect(rowOf(html, "Task t2")).toContain("Parse document");
    expect(rowOf(html, "Task t3")).not.toMatch(/Parse document|Edit document/);
  });

  it("запуск «completed» — кнопки немає ні в кого, значення лишаються видимими", () => {
    const html = renderToStaticMarkup(
      <RunDetail
        run={{ ...run, status: "completed" }}
        tasks={tasks}
        emailOf={emailOf}
        viewer={{ id: A, role: "admin", email: "admin@example.test" }}
        completeTask={async () => {}}
        documentActions={actions}
      />,
    );
    expect(html).not.toMatch(/Parse document|Edit document/);
    expect(html).toContain("Request · Plumbing · Urgent · 555-0101");
  });

  it("підрядник: кнопка на своїй задачі «to do», підсумок кошторису під назвою", () => {
    const estimate = { kind: "estimate", phone: null, description: null, category: null, urgency: null, items: [{ name: "Faucet", quantity: 2, unitPrice: 100 }], total: "200.00" };
    const html = renderToStaticMarkup(
      <VendorRunDetail
        run={{ id: "r1", status: "in_progress" }}
        tasks={[task("t4", V, "to_do", estimate), task("t5", V, "done")]}
        lastRequiredTaskId={null}
        viewer={{ id: V, role: "vendor", email: "vendor.v@example.test" }}
        completeTask={async () => {}}
        documentActions={actions}
      />,
    );
    expect(rowOf(html, "Task t4")).toContain("Edit document");
    expect(rowOf(html, "Task t4")).toContain("Estimate · 1 item · Total 200.00");
    expect(rowOf(html, "Task t5")).not.toMatch(/Parse document|Edit document/);
  });

  it("без дій документа (інша сторінка, тест) — кнопки немає, позначка лишається", () => {
    const html = renderToStaticMarkup(
      <RunDetail run={run} tasks={tasks} emailOf={emailOf} viewer={{ id: B, role: "manager", email: "manager.b@example.test" }} completeTask={async () => {}} />,
    );
    expect(html).not.toContain("Parse document");
    expect(rowOf(html, "Task t2")).toContain("Mark as done");
  });
});
