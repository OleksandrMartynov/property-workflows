// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { describe, expect, it } from "vitest";
import { appEnvOf, classifyDbProbe } from "@/lib/health";

describe("classifyDbProbe (/api/health)", () => {
  it("рахує базу живою, коли запит пройшов або Postgres відмовив у правах (42501)", () => {
    expect(classifyDbProbe({ status: 200, error: null })).toEqual({ db: "ok", reason: "" });
    expect(classifyDbProbe({ status: 401, error: { code: "42501", message: "permission denied for table profiles" } })).toEqual({
      db: "ok",
      reason: "",
    });
    expect(classifyDbProbe({ status: 400, error: { code: "PGRST100", message: "bad filter" } }).db).toBe("ok");
  });

  it("повідомляє «paused», коли Supabase відповідає 540 (безкоштовний проєкт призупинено)", () => {
    expect(classifyDbProbe({ status: 540, error: { message: "project paused" } })).toEqual({ db: "down", reason: "paused" });
  });

  it("повідомляє про хибний публічний ключ", () => {
    expect(classifyDbProbe({ status: 401, error: { message: "Invalid API key" } })).toEqual({
      db: "down",
      reason: "invalid-api-key",
    });
  });

  it("повідомляє код, коли PostgREST не дістає до бази або мережі немає", () => {
    expect(classifyDbProbe({ status: 503, error: { code: "PGRST002", message: "schema cache" } })).toEqual({
      db: "down",
      reason: "status-503-PGRST002",
    });
    expect(classifyDbProbe({ status: 0, error: { message: "fetch failed" } })).toEqual({ db: "down", reason: "status-0" });
  });

  it("рахує базу недоступною на 5xx навіть із кодом Postgres (53300 — вичерпано з'єднання)", () => {
    expect(classifyDbProbe({ status: 503, error: { code: "53300", message: "too many connections" } })).toEqual({
      db: "down",
      reason: "status-503-53300",
    });
    expect(classifyDbProbe({ status: 500, error: { code: "XX000", message: "internal" } }).db).toBe("down");
  });
});

describe("appEnvOf (/api/health, WS11)", () => {
  it("staging — ярлик з APP_ENV; прод і preview без змінної — null", () => {
    expect(appEnvOf("staging")).toBe("staging");
    expect(appEnvOf(" Staging \n")).toBe("staging");
    expect(appEnvOf(undefined)).toBeNull();
    expect(appEnvOf("")).toBeNull();
  });

  it("не ярлик (URL, ключ, пробіли всередині) — null: значення змінної не потрапляє у відповідь", () => {
    expect(appEnvOf("https://evil.example.test")).toBeNull();
    expect(appEnvOf("sb_secret_abcdefghijklmnopqrstuvwxyz0123456789")).toBeNull();
    expect(appEnvOf("staging env")).toBeNull();
  });
});
