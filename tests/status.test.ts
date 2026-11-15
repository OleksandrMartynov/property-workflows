// Сторінка статусу (WS11): стан кожного компонента й підсумок угорі — чисті функції без мережі.
import { describe, expect, it } from "vitest";
import { aiComponent, appComponent, authComponent, databaseComponent, overallStatus, SLOW_MS, type ComponentStatus } from "@/lib/status";
import { isPublicPath } from "@/lib/supabase/public-paths";

const CHAIN = ["a:free", "b:free", "c:free"];
const ok = (id: ComponentStatus["id"]): ComponentStatus => ({ id, name: id, state: "operational", detail: "", latencyMs: 10 });

describe("Компоненти", () => {
  it("застосунок: версія — короткий коміт збірки й середовище; локальна збірка — «local build»", () => {
    expect(appComponent("0123456789abcdef", "production")).toMatchObject({ state: "operational", detail: "Version 0123456 · production" });
    expect(appComponent("local", "local").detail).toBe("Version local build · local");
  });

  it("база: відповіла — «Operational» з часом відповіді; повільно — «Degraded»; збій чи пауза — «Outage»", () => {
    expect(databaseComponent({ db: "ok", reason: "" }, 120)).toMatchObject({ state: "operational", detail: "Response 120 ms" });
    expect(databaseComponent({ db: "ok", reason: "" }, SLOW_MS + 1)).toMatchObject({ state: "degraded", detail: "Slow response" });
    expect(databaseComponent({ db: "down", reason: "paused" }, 50)).toMatchObject({ state: "outage", detail: "Project paused" });
    expect(databaseComponent({ db: "down", reason: "status-0" }, null)).toMatchObject({ state: "outage", detail: "Not responding" });
  });

  it("вхід: 200 — «Operational»; інший код чи мережа — «Outage»", () => {
    expect(authComponent(200, 80)).toMatchObject({ state: "operational", detail: "Response 80 ms" });
    expect(authComponent(503, 80)).toMatchObject({ state: "outage", detail: "HTTP 503" });
    expect(authComponent(0, null)).toMatchObject({ state: "outage", detail: "Not responding" });
  });

  it("AI: без ключа — «Degraded» (значення вводять вручну); усі моделі — «Operational»; частина — «Degraded»; жодної чи список недоступний — «Outage»", () => {
    expect(aiComponent({ configured: false, chain: CHAIN, available: null, ms: null })).toMatchObject({ state: "degraded", detail: "Not configured" });
    expect(aiComponent({ configured: true, chain: CHAIN, available: [...CHAIN, "x"], ms: 200 })).toMatchObject({ state: "operational", detail: "3 of 3 models available" });
    expect(aiComponent({ configured: true, chain: CHAIN, available: ["b:free"], ms: 200 })).toMatchObject({ state: "degraded", detail: "1 of 3 models available" });
    expect(aiComponent({ configured: true, chain: CHAIN, available: ["x"], ms: 200 })).toMatchObject({ state: "outage", detail: "0 of 3 models available" });
    expect(aiComponent({ configured: true, chain: CHAIN, available: null, ms: null })).toMatchObject({ state: "outage", detail: "Model provider not responding" });
  });
});

describe("Підсумок угорі сторінки", () => {
  it("усе працює — «All systems operational»", () => {
    expect(overallStatus([ok("app"), ok("database"), ok("auth"), ok("ai")])).toEqual({ state: "operational", title: "All systems operational" });
  });

  it("збій бази чи входу — «Major outage»; збій лише AI — «Partial outage»; повільно — «Degraded performance»", () => {
    expect(overallStatus([ok("app"), { ...ok("database"), state: "outage" }, ok("auth"), ok("ai")]).title).toBe("Major outage");
    expect(overallStatus([ok("app"), ok("database"), { ...ok("auth"), state: "outage" }, ok("ai")]).state).toBe("outage");
    expect(overallStatus([ok("app"), ok("database"), ok("auth"), { ...ok("ai"), state: "outage" }])).toEqual({ state: "degraded", title: "Partial outage" });
    expect(overallStatus([ok("app"), { ...ok("database"), state: "degraded" }, ok("auth"), ok("ai")])).toEqual({ state: "degraded", title: "Degraded performance" });
  });

  it("сторінка й JSON статусу — публічні (відкриваються й без входу), сусідні шляхи — ні", () => {
    expect(isPublicPath("/status")).toBe(true);
    expect(isPublicPath("/api/status")).toBe(true);
    expect(isPublicPath("/statuses")).toBe(false);
    expect(isPublicPath("/api/status-admin")).toBe(false);
  });
});
