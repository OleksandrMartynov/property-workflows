// «← Runs» зі сторінки запуску веде на останню адресу списку у вкладці (вигляд, пошук, сторінка), а чужу адресу не
// бере. docs/ux/ux-plan.md, партія 3: стан списку — в адресі.
import { describe, expect, it } from "vitest";
import { listUrl, readListUrl, rememberListUrl, returnHref } from "@/lib/nav/list-return";

const memory = () => {
  const items = new Map<string, string>();
  return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) };
};

describe("Повернення до списку з фільтрами", () => {
  it("список запам'ятовує шлях і параметри, а «← Runs» веде саме туди", () => {
    const storage = memory();
    rememberListUrl("/runs", "view=mine&q=Apartment&page=3", storage);
    expect(returnHref("/runs", readListUrl("/runs", storage))).toBe("/runs?view=mine&q=Apartment&page=3");
  });

  it("без параметрів — сам список; без запису — сам список", () => {
    expect(listUrl("/runs", "")).toBe("/runs");
    expect(listUrl("/runs", "?view=completed")).toBe("/runs?view=completed");
    expect(returnHref("/runs", null)).toBe("/runs");
  });

  it("чужий шлях чи зовнішня адреса з ключа не беруться", () => {
    expect(returnHref("/runs", "/templates?q=x")).toBe("/runs");
    expect(returnHref("/runs", "//evil.example/runs")).toBe("/runs");
    expect(returnHref("/runs", "https://evil.example/runs")).toBe("/runs");
  });

  it("сховище недоступне (приватне вікно) — повернення просто на список, без помилки", () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(() => rememberListUrl("/runs", "view=mine", broken)).not.toThrow();
    expect(returnHref("/runs", readListUrl("/runs", broken))).toBe("/runs");
  });
});
