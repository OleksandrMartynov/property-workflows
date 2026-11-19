// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { describe, expect, it } from "vitest";
import { appEnvOf, classifyDbProbe, missingEnv, networkCause, suspectEnv } from "@/lib/health";

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

describe("причина збою бази й назва змінної (WS11, дія з postmortem 2026-11-19)", () => {
  it("networkCause: код причини fetch → dns / refused / timeout / tls / network", () => {
    expect(networkCause({ cause: { code: "ENOTFOUND" } })).toBe("dns");
    expect(networkCause({ cause: { code: "EAI_AGAIN" } })).toBe("dns");
    expect(networkCause({ cause: { code: "ECONNREFUSED" } })).toBe("refused");
    expect(networkCause({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })).toBe("timeout");
    expect(networkCause({ name: "TimeoutError" })).toBe("timeout");
    expect(networkCause({ cause: { code: "CERT_HAS_EXPIRED" } })).toBe("tls");
    expect(networkCause(new Error("something else"))).toBe("network");
    expect(networkCause(null)).toBe("network");
  });

  it("suspectEnv: мережа — адреса Supabase, хибний ключ — ключ; пауза й 5xx — не змінні", () => {
    expect(suspectEnv("unreachable-dns")).toBe("NEXT_PUBLIC_SUPABASE_URL");
    expect(suspectEnv("invalid-api-key")).toBe("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(suspectEnv("paused")).toBeNull();
    expect(suspectEnv("status-503-PGRST002")).toBeNull();
  });

  it("missingEnv: лише назви порожніх обов'язкових змінних", () => {
    expect(missingEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" })).toEqual([]);
    expect(missingEnv({ NEXT_PUBLIC_SUPABASE_URL: "  " })).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });
});
