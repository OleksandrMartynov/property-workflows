// Розбір форми «Save values», значення з бази й підсумок у рядку задачі (зріз 4, ADR 0008). Чисті функції.
import { describe, expect, it } from "vitest";
import { documentSummary, fromStored, parseDocumentForm, parseMoney } from "@/lib/runs/task-document";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
};

describe("parseMoney", () => {
  it.each([
    ["", null],
    ["200", 200],
    ["$1,250.00", 1250],
    [" 85.5 ", 85.5],
    ["10.005", 10.01],
  ])("«%s» → %s", (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each(["-5", "abc", "1.2.3", "€10"])("«%s» — не сума (undefined)", (raw) => {
    expect(parseMoney(raw)).toBeUndefined();
  });
});

describe("parseDocumentForm", () => {
  it("заявка: пробіли на краях прибрано, порожні поля — null", () => {
    expect(parseDocumentForm(form({ kind: "request", phone: "", description: "  Leak.  ", category: "plumbing", urgency: "", items: "", total: "" }))).toEqual({
      ok: true,
      value: { kind: "request", phone: null, description: "Leak.", category: "plumbing", urgency: null, items: null, total: null },
    });
  });

  it("позиції: назва обрізана, порожній список — null", () => {
    const items = JSON.stringify([{ name: " Faucet ", quantity: 1, unitPrice: 85 }]);
    expect(parseDocumentForm(form({ kind: "estimate", items, total: "85" }))).toMatchObject({
      ok: true,
      value: { items: [{ name: "Faucet", quantity: 1, unitPrice: 85 }], total: 85 },
    });
    expect(parseDocumentForm(form({ kind: "estimate", items: "[]", total: "85" }))).toMatchObject({ ok: true, value: { items: null } });
  });

  it.each([
    ["вид поза переліком", { kind: "menu", urgency: "urgent" }],
    ["терміновість поза переліком", { kind: "request", urgency: "asap" }],
    ["опис довший за 400", { kind: "request", description: "x".repeat(401) }],
    ["позиції не JSON", { kind: "estimate", items: "{oops" }],
    ["кількість 0", { kind: "estimate", items: JSON.stringify([{ name: "Bolt", quantity: 0, unitPrice: 1 }]) }],
    ["ціна NaN (null у JSON)", { kind: "estimate", items: JSON.stringify([{ name: "Bolt", quantity: 1, unitPrice: null }]) }],
    ["сума не число", { kind: "estimate", total: "lots" }],
  ])("%s — DOCUMENT_INVALID", (_label, values) => {
    expect(parseDocumentForm(form(values))).toEqual({ ok: false, error: "DOCUMENT_INVALID" });
  });

  it("телефон, з якого не виходить 555-0101, — PHONE_INVALID", () => {
    expect(parseDocumentForm(form({ kind: "request", phone: "call me" }))).toEqual({ ok: false, error: "PHONE_INVALID" });
  });

  it("лише вид документа — DOCUMENT_EMPTY", () => {
    expect(parseDocumentForm(form({ kind: "estimate" }))).toEqual({ ok: false, error: "DOCUMENT_EMPTY" });
  });
});

describe("fromStored і documentSummary", () => {
  it("рядок бази (total рядком із numeric) → значення й підсумок кошторису", () => {
    const doc = fromStored({ kind: "estimate", phone: null, description: null, category: null, urgency: null, items: [{ name: "Faucet", quantity: 2, unitPrice: 100 }], total: "200.00" });
    expect(doc).toMatchObject({ total: 200, items: [{ name: "Faucet", quantity: 2, unitPrice: 100 }] });
    expect(documentSummary(doc!)).toBe("Estimate · 1 item · Total 200.00");
  });

  it("підсумок заявки: вид, категорія, терміновість, телефон", () => {
    const doc = fromStored({ kind: "request", phone: "555-0101", description: "Leak.", category: "heating_and_cooling", urgency: "urgent", items: null, total: null });
    expect(documentSummary(doc!)).toBe("Request · Heating and cooling · Urgent · 555-0101");
  });

  it("немає рядка або невідомий вид — нічого не показуємо", () => {
    expect(fromStored(null)).toBeNull();
    expect(fromStored({ kind: "menu", phone: null, description: null, category: null, urgency: null, items: null, total: null })).toBeNull();
  });
});
