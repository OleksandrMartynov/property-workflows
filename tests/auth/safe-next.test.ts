// Повернення на сторінку після входу (AC-DSYS-08): `next` лише відносний шлях цього сайту. Чужі адреси й обхідні
// записи (`//evil.example`, `https://evil.example`, `/\evil`) дають «/» — вхід не стає відкритим перенаправленням.
import { describe, expect, it } from "vitest";
import { loginPath, returnPath, safeNext } from "@/lib/auth/safe-next";

const RUN = "/runs/11111111-1111-1111-1111-111111111111";

describe("safeNext: куди повернути після входу", () => {
  it("AC-DSYS-08: сторінка запуску за прямим посиланням лишається собою (шлях і query)", () => {
    expect(safeNext(RUN)).toBe(RUN);
    expect(safeNext(`${RUN}?error=NOT_ALLOWED`)).toBe(`${RUN}?error=NOT_ALLOWED`);
    expect(safeNext("/templates/10000000-0000-0000-0000-000000000001/edit")).toBe("/templates/10000000-0000-0000-0000-000000000001/edit");
  });

  it("AC-DSYS-08: без next (або порожній чи не рядок) — головна", () => {
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(["/runs"])).toBe("/");
    expect(safeNext(42)).toBe("/");
  });

  it("AC-DSYS-08: відкрите перенаправлення на чужий сайт відхилено (//evil.example, https://evil.example, /\\evil)", () => {
    for (const attack of [
      "//evil.example",
      "//evil.example/runs",
      "https://evil.example",
      "https://evil.example/runs",
      "http://evil.example",
      "/\\evil.example",
      "/\\/evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example/runs",
      "runs",
    ]) {
      expect(safeNext(attack), attack).toBe("/");
    }
  });

  it("AC-DSYS-08: керівні символи й переноси в next відхилено", () => {
    for (const attack of ["/\t/evil.example", "/runs\nSet-Cookie: x=1", "/runs\r\n", "/\u0000", "/ru\u007fns"]) {
      expect(safeNext(attack), JSON.stringify(attack)).toBe("/");
    }
  });

  it("AC-DSYS-08: надто довгий next відхилено", () => {
    expect(safeNext(`/${"a".repeat(3000)}`)).toBe("/");
  });
});

describe("loginPath і returnPath", () => {
  it("AC-DSYS-08: адреса входу несе next (закодований); для головної чи чужої адреси — просто /login", () => {
    expect(loginPath(RUN)).toBe(`/login?next=${encodeURIComponent(RUN)}`);
    expect(loginPath("/runs?status=in-progress")).toBe("/login?next=%2Fruns%3Fstatus%3Din-progress");
    expect(loginPath("/")).toBe("/login");
    expect(loginPath(null)).toBe("/login");
    expect(loginPath("//evil.example")).toBe("/login");
    expect(loginPath("https://evil.example")).toBe("/login");
  });

  it("AC-DSYS-08: returnPath лишає шлях і query, але прибирає службовий _rsc", () => {
    expect(returnPath(RUN, "")).toBe(RUN);
    expect(returnPath("/runs", "?status=done&_rsc=abc")).toBe("/runs?status=done");
    expect(returnPath("/runs", "?_rsc=abc")).toBe("/runs");
  });
});
