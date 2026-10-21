// Підтвердження останньої обов'язкової задачі (припущення PM у вимозі #3): що бачить користувач і коли форма
// «Mark as done» надсилається. Правило на рівні бази — tests/db/run-progress-db.test.ts.
import { describe, expect, it } from "vitest";
import { CANNOT_BE_UNDONE, confirmationText, isLastRequiredTask, shouldSubmitMarkDone } from "@/lib/runs/confirmation";
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

describe("Підтвердження останньої обов'язкової задачі", () => {
  it("AC-TASK-04: третя обов'язкова задача потребує підтвердження; «OK» — форму надіслано", () => {
    expect(isLastRequiredTask(tasks[2], tasks)).toBe(true);
    const shown: string[] = [];
    expect(shouldSubmitMarkDone(true, "Hand over the keys", (m) => (shown.push(m), true))).toBe(true);
    expect(shown).toEqual([confirmationText("Hand over the keys")]);
    expect(shown[0]).toContain("Hand over the keys");
    expect(shown[0]).toContain(CANNOT_BE_UNDONE);
    expect(CANNOT_BE_UNDONE).toBe("This cannot be undone");
  });

  it("AC-TASK-16: «Cancel» на підтвердженні — форму не надіслано, задача лишається «to do»", () => {
    expect(shouldSubmitMarkDone(true, "Hand over the keys", () => false)).toBe(false);
    // Якщо форма все ж дійшла без підтвердження, база відмовляє: CONFIRMATION_REQUIRED.
    expect(dbErrorCode({ message: "CONFIRMATION_REQUIRED" })).toBe("CONFIRMATION_REQUIRED");
    expect(MESSAGES.CONFIRMATION_REQUIRED).toContain(CANNOT_BE_UNDONE);
  });

  it("AC-TASK-01: задача, що не є останньою обов'язковою, — без підтвердження", () => {
    const early = [task("r1", true, "to_do"), task("r2", true, "to_do"), task("o1", false, "to_do")];
    expect(isLastRequiredTask(early[0], early)).toBe(false);
    expect(isLastRequiredTask(tasks[3], tasks)).toBe(false);
    let asked = false;
    expect(shouldSubmitMarkDone(false, "Sign the lease agreement", () => ((asked = true), false))).toBe(true);
    expect(asked).toBe(false);
  });
});
