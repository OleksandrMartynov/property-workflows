// Стан збереження змін редактора (AC-EDITOR-25): текст у фіксованому місці й поведінка сховища при збої, успіху й повторі.
import { describe, expect, it } from "vitest";
import { createSaveStore, isNotKept, isRedirectError, keepTypedValues, saveStatusText, withOutcome, type ActionOutcome } from "@/lib/templates/save-state";

const TASK = { scope: "s2", name: "Sign handover act", required: true };

describe("Текст стану збереження", () => {
  it("AC-EDITOR-25: зміну не збережено — «Your last change was not kept. Try again.» дослівно", () => {
    expect(saveStatusText("failed")).toBe("Your last change was not kept. Try again.");
  });

  it("AC-EDITOR-25: усе збережено — «All changes kept» (і до першої зміни); під час запису — «Saving…»", () => {
    expect(saveStatusText("kept")).toBe("All changes kept");
    expect(saveStatusText("idle")).toBe("All changes kept");
    expect(saveStatusText("pending")).toBe("Saving…");
  });

  it("AC-EDITOR-25: збій без пояснення — «не збережено»; відмова з кодом повідомлення (NAME_REQUIRED) — ні", () => {
    expect(isNotKept({ ok: false, code: "DB_ERROR" })).toBe(true);
    expect(isNotKept({ ok: false, code: "NAME_REQUIRED" })).toBe(false);
    expect(isNotKept({ ok: true })).toBe(false);
  });
});

describe("Сховище стану збереження", () => {
  it("AC-EDITOR-25: втрачене з'єднання — стан «failed», задача лишається в списку, помилка не кидається далі", async () => {
    const store = createSaveStore();
    expect(store.getSnapshot().status).toBe("kept");
    const outcome = await store.run(TASK, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(outcome).toEqual({ ok: false, code: "DB_ERROR" });
    const { status, items } = store.getSnapshot();
    expect(saveStatusText(status)).toBe("Your last change was not kept. Try again.");
    expect(items).toEqual([expect.objectContaining({ scope: "s2", name: "Sign handover act", state: "failed" })]);
  });

  it("AC-EDITOR-25: поки зміна виконується — «pending» і рядок задачі вже на екрані; після успіху — «kept» без рядка", async () => {
    const store = createSaveStore();
    let release: (v: { ok: true }) => void = () => {};
    const running = store.run(TASK, () => new Promise((resolve) => (release = resolve)));
    expect(store.getSnapshot().status).toBe("pending");
    expect(store.getSnapshot().items).toEqual([expect.objectContaining({ name: "Sign handover act", state: "pending" })]);
    release({ ok: true });
    await running;
    expect(store.getSnapshot()).toEqual({ status: "kept", items: [] });
  });

  it("AC-EDITOR-25: «Try again» повторює ту саму зміну; успіх прибирає рядок і повідомлення", async () => {
    const store = createSaveStore();
    let calls = 0;
    await store.run(TASK, async () => (++calls === 1 ? { ok: false, code: "DB_ERROR" } : { ok: true }));
    const [failed] = store.getSnapshot().items;
    expect(store.getSnapshot().status).toBe("failed");
    await store.retry(failed.id);
    expect(calls).toBe(2);
    expect(store.getSnapshot()).toEqual({ status: "kept", items: [] });
  });

  it("AC-EDITOR-25: відмова з поясненням (NAME_REQUIRED) не стає «не збережено» — її показує викликач над редактором", async () => {
    const store = createSaveStore();
    const outcome = await store.run(TASK, async () => ({ ok: false, code: "NAME_REQUIRED" }));
    expect(outcome).toEqual({ ok: false, code: "NAME_REQUIRED" });
    expect(store.getSnapshot()).toEqual({ status: "kept", items: [] });
  });

  it("AC-EDITOR-25: redirect сервера (відвідувач без входу чи не admin) не ковтається як «не збережено» — іде далі до Next", async () => {
    const store = createSaveStore();
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    expect(isRedirectError(redirect)).toBe(true);
    await expect(store.run(TASK, async () => Promise.reject(redirect))).rejects.toBe(redirect);
    expect(store.getSnapshot()).toEqual({ status: "kept", items: [] });
  });
});

describe("повтор і введені значення", () => {
  it("AC-EDITOR-25: відмова з поясненням під час «Try again» не зникає мовчки — обробник результату виконується і для повтору", async () => {
    const seen: string[] = [];
    const results: ActionOutcome[] = [{ ok: false, code: "DB_ERROR" }, { ok: false, code: "NOT_ALLOWED_TEMPLATES" }];
    const store = createSaveStore();
    const perform = withOutcome(async () => results.shift() as ActionOutcome, (o) => seen.push(o.ok ? "ok" : o.code));

    await store.run({ scope: "sections", name: "Move-in day", required: false }, perform);
    expect(store.getSnapshot().status).toBe("failed");
    await store.retry(store.getSnapshot().items[0].id);

    expect(seen).toEqual(["DB_ERROR", "NOT_ALLOWED_TEMPLATES"]);
    expect(store.getSnapshot()).toMatchObject({ status: "kept", items: [] });
  });

  it("AC-EDITOR-25: після збою введена назва лишається в полі — defaultValue стає надісланим значенням, чужі поля не чіпаємо", () => {
    const sent = new FormData();
    sent.set("name", "  Inspection day ");
    sent.set("template_id", "t1");
    const fields = [
      { name: "name", type: "text", defaultValue: "Old name" },
      { name: "template_id", type: "hidden", defaultValue: "t1" },
      { name: "other", type: "text", defaultValue: "kept" },
    ];
    keepTypedValues(fields, sent);
    expect(fields.map((f) => f.defaultValue)).toEqual(["  Inspection day ", "t1", "kept"]);
  });
});
