import { describe, expect, it } from "vitest";
import { validateCaseName } from "@/lib/runs/case-name";
import { MESSAGES, dbErrorCode, errorMessage } from "@/lib/runs/messages";

describe("Назва випадку", () => {
  it("AC-RUN-03: порожня назва або лише пробіли — помилка «Enter a case name»", () => {
    for (const raw of ["", "   ", "\t  ", undefined, null]) {
      const result = validateCaseName(raw);
      expect(result).toEqual({ ok: false, error: "CASE_NAME_REQUIRED" });
    }
    expect(errorMessage("CASE_NAME_REQUIRED")).toBe("Enter a case name");
  });

  it("AC-RUN-07: назва довжиною 101 символ — помилка «Case name must be at most 100 characters»", () => {
    expect(validateCaseName("a".repeat(101))).toEqual({ ok: false, error: "CASE_NAME_TOO_LONG" });
    expect(MESSAGES.CASE_NAME_TOO_LONG).toBe("Case name must be at most 100 characters");
  });

  it("AC-RUN-07: 100 символів приймаємо; пробіли на краях обрізаємо (робоче припущення Q3)", () => {
    expect(validateCaseName("b".repeat(100))).toEqual({ ok: true, value: "b".repeat(100) });
    expect(validateCaseName("  Apartment 12, move-in  ")).toEqual({ ok: true, value: "Apartment 12, move-in" });
  });

  it("AC-RUN-03: помилка функції бази перекладається в той самий текст PM", () => {
    expect(dbErrorCode({ message: "CASE_NAME_REQUIRED" })).toBe("CASE_NAME_REQUIRED");
    expect(dbErrorCode({ message: 'new row violates "something"' })).toBe("DB_ERROR");
    expect(errorMessage("UNKNOWN")).toBeUndefined();
  });

  it("AC-RUN-06: відмова в запуску має власний текст, а не текст позначки задачі з AC-TASK-03", () => {
    expect(dbErrorCode({ message: "LAUNCH_NOT_ALLOWED" })).toBe("LAUNCH_NOT_ALLOWED");
    expect(dbErrorCode({ message: "NOT_ALLOWED" })).toBe("NOT_ALLOWED");
  });
});
