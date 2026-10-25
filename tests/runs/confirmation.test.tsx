// Підтвердження останньої обов'язкової задачі (припущення PM у вимозі #3): що бачить користувач, коли викликається
// серверна дія і що рендерить форма. Правило на рівні бази — tests/db/run-progress-db.test.ts.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MarkDoneForm } from "@/app/(app)/runs/[id]/mark-done-form";
import { CANNOT_BE_UNDONE, confirmationText, isLastRequiredTask, withConfirmation } from "@/lib/runs/confirmation";
import { MESSAGES, dbErrorCode } from "@/lib/runs/messages";

const task = (id: string, required: boolean, status: string) => ({ id, required, status });
// 3 обов'язкові задачі, 2 з них «done»; третя «to do» — остання обов'язкова.
const tasks = [
  task("r1", true, "done"),
  task("r2", true, "done"),
  task("r3", true, "to_do"),
  task("o1", false, "to_do"),
  task("o2", false, "to_do"),
];

const formData = () => {
  const fd = new FormData();
  fd.set("run_id", "run");
  fd.set("task_id", "r3");
  return fd;
};

describe("Підтвердження останньої обов'язкової задачі", () => {
  it("AC-TASK-04: третя обов'язкова задача — підтвердження з назвою й «This cannot be undone»; «OK» — дія з confirmed=yes", async () => {
    expect(isLastRequiredTask(tasks[2], tasks)).toBe(true);
    const action = vi.fn(async () => {});
    const shown: string[] = [];
    const fd = formData();
    await withConfirmation(action, "Hand over the keys", (m) => (shown.push(m), true))(fd);

    expect(shown).toEqual([confirmationText("Hand over the keys")]);
    expect(shown[0]).toContain("Hand over the keys");
    expect(shown[0]).toContain(CANNOT_BE_UNDONE);
    expect(CANNOT_BE_UNDONE).toBe("This cannot be undone");
    expect(action).toHaveBeenCalledTimes(1);
    expect(fd.get("confirmed")).toBe("yes");
  });

  it("AC-TASK-16: «Cancel» на підтвердженні — серверну дію не викликано, задача лишається «to do»", async () => {
    const action = vi.fn(async () => {});
    const fd = formData();
    await withConfirmation(action, "Hand over the keys", () => false)(fd);
    expect(action).not.toHaveBeenCalled();
    expect(fd.get("confirmed")).toBeNull();
    // Якщо запит усе ж дійшов без підтвердження, база відмовляє: CONFIRMATION_REQUIRED.
    expect(dbErrorCode({ message: "CONFIRMATION_REQUIRED" })).toBe("CONFIRMATION_REQUIRED");
    expect(MESSAGES.CONFIRMATION_REQUIRED).toContain(CANNOT_BE_UNDONE);
  });

  it("AC-TASK-16: форма останньої обов'язкової задачі не містить у HTML поля confirmed — без підтвердження його не надіслати", () => {
    const html = renderToStaticMarkup(
      <MarkDoneForm action={async () => {}} runId="run" taskId="r3" taskName="Hand over the keys" needsConfirmation />,
    );
    expect(html).toContain("Mark as done");
    expect(html).not.toContain('name="confirmed"');
  });

  it("AC-TASK-01: задача, що не є останньою обов'язковою, — без підтвердження", () => {
    const early = [task("r1", true, "to_do"), task("r2", true, "to_do"), task("o1", false, "to_do")];
    expect(isLastRequiredTask(early[0], early)).toBe(false);
    expect(isLastRequiredTask(tasks[3], tasks)).toBe(false);
    const html = renderToStaticMarkup(
      <MarkDoneForm action={async () => {}} runId="run" taskId="r1" taskName="Sign the lease agreement" needsConfirmation={false} />,
    );
    expect(html).toContain("Mark as done");
    expect(html).not.toContain('name="confirmed"');
  });
});
