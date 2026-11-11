// Необов'язкова задача завершеного запуску на сторінці (AC-TASK-19, AC-VENDOR-16): у запуску «completed» «Mark as done»
// є на необов'язковій задачі «to do» і немає на обов'язковій — і для менеджера (RunDetail), і для підрядника
// (VendorRunDetail). Дані задач — із полем required, як їх читає сторінка.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunDetail } from "@/app/(app)/runs/[id]/_components/run-detail";
import { VendorRunDetail } from "@/app/(app)/runs/[id]/_components/vendor-run-detail";

const A = "a0000000-0000-0000-0000-000000000002";
const V = "a0000000-0000-0000-0000-000000000008";
const task = (id: string, name: string, required: boolean, assignee: string, status: string) => ({
  id,
  section_name: "Move-in day",
  section_position: 2,
  position: Number(id.slice(1)),
  name,
  required,
  assignee_id: assignee,
  status,
});
/** Форма «Mark as done» задачі — прихований task_id у рядку (MarkDoneForm). */
const markDoneFor = (html: string, id: string) => html.includes(`name="task_id" value="${id}"`);

describe("Сторінка завершеного запуску: необов'язкова задача «to do»", () => {
  it("AC-TASK-19: менеджер — виконавець необов'язкової задачі «to do» завершеного запуску бачить «Mark as done» лише на ній", () => {
    const html = renderToStaticMarkup(
      <RunDetail
        run={{ id: "r1", case_name: "Apartment 3, repair", template_name: "Tenant move-in", template_version: 1, status: "completed", run_manager_id: A }}
        tasks={[task("t1", "Hand over the keys", true, A, "done"), task("t2", "Order a part", false, A, "to_do")]}
        emailOf={new Map([[A, "manager.a@example.test"]])}
        viewer={{ id: A, role: "manager", email: "manager.a@example.test" }}
        completeTask={async () => {}}
      />,
    );
    expect(markDoneFor(html, "t2")).toBe(true);
    expect(markDoneFor(html, "t1")).toBe(false);
  });

  it("AC-VENDOR-16: підрядник у завершеному запуску бачить «Mark as done» на своїй необов'язковій задачі «to do»", () => {
    const html = renderToStaticMarkup(
      <VendorRunDetail
        run={{ id: "r1", status: "completed" }}
        tasks={[task("t3", "Record meter readings", false, V, "to_do")]}
        lastRequiredTaskId={null}
        viewer={{ id: V, role: "vendor", email: "vendor.v@example.test" }}
        completeTask={async () => {}}
      />,
    );
    expect(markDoneFor(html, "t3")).toBe(true);
    expect(html).toContain("Your tasks: 0 of 1 done");
  });

  it("AC-VENDOR-16: обов'язкова задача «to do» в запуску «completed» (стан, якого база не допускає) — без «Mark as done»", () => {
    const html = renderToStaticMarkup(
      <VendorRunDetail
        run={{ id: "r1", status: "completed" }}
        tasks={[task("t4", "Hand over the keys", true, V, "to_do")]}
        lastRequiredTaskId={null}
        viewer={{ id: V, role: "vendor", email: "vendor.v@example.test" }}
        completeTask={async () => {}}
      />,
    );
    expect(markDoneFor(html, "t4")).toBe(false);
  });
});
