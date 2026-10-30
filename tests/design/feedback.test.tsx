// Відгук на дії (docs/ux/ux-plan.md, партія 2): після «Mark as done» скрінрідер чує «<задача>: done»; помилка назви
// випадку — під самим полем, з aria-invalid і фокусом. Тексти помилок — дослівно з AC.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoneTaskNotice, doneAnnouncement } from "@/app/(app)/runs/[id]/_components/done-task-notice";
import { LaunchForm } from "@/app/(app)/templates/[id]/launch/_components/launch-form";
import { errorMessage } from "@/lib/runs/messages";

const tasks = [
  { id: "t1", name: "Sign the lease agreement", status: "to_do" },
  { id: "t4", name: "Hand over the keys", status: "done" },
];

describe("Відгук після «Mark as done»", () => {
  it("оголошує «<назва задачі>: done» лише для скрінрідера (видимий відгук дає сам рядок)", () => {
    expect(doneAnnouncement(tasks, "task", "t4")).toBe("Hand over the keys: done");
    // Область live region з'являється порожньою, текст додається після монтування — так скрінрідер помічає зміну.
    const html = renderToStaticMarkup(<DoneTaskNotice tasks={tasks} done="task" task="t4" />);
    expect(html).toBe('<p role="status" aria-live="polite" class="sr-only"></p>');
  });

  it("мовчить без параметра done=task або для задачі, якої немає на сторінці", () => {
    expect(doneAnnouncement(tasks, undefined, "t4")).toBeNull();
    expect(doneAnnouncement(tasks, "task", "other")).toBeNull();
    expect(renderToStaticMarkup(<DoneTaskNotice tasks={tasks} task="t4" />)).toBe("");
  });
});

describe("Помилка назви випадку на формі запуску", () => {
  const form = (caseNameError?: string) =>
    renderToStaticMarkup(
      <LaunchForm
        templateId="10000000-0000-0000-0000-000000000001"
        templateName="Tenant move-in"
        sections={[{ id: "s1", name: "Before move-in" }]}
        tasks={[{ id: "t1", section_id: "s1", name: "Sign the lease agreement", required: true }]}
        viewer={{ id: "u1", email: "manager.a@example.test" }}
        others={[]}
        caseName=""
        caseNameError={caseNameError}
        action={async () => {}}
      />,
    );

  it("AC-RUN-03: «Enter a case name» — під полем, поле позначено недійсним", () => {
    const html = form(errorMessage("CASE_NAME_REQUIRED"));
    expect(html).toContain("Enter a case name");
    expect(html).toMatch(/id="case_name"[^>]*aria-invalid="true"|aria-invalid="true"[^>]*id="case_name"/);
    expect(html).toContain('id="case_name-error"');
  });

  it("AC-RUN-07: «Case name must be at most 100 characters» — під полем", () => {
    expect(form(errorMessage("CASE_NAME_TOO_LONG"))).toContain("Case name must be at most 100 characters");
  });

  it("без помилки поле не позначено недійсним", () => {
    expect(form()).not.toContain('aria-invalid="true"');
  });
});
