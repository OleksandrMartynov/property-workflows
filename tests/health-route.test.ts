// WS11, дія з postmortem docs/incidents/2026-11-19-staging-bad-supabase-url.md: /api/health називає причину
// мережевого збою і змінну, яку перевірити (без значення), і лишає рядок health.db_down у журналі. Справжній маршрут;
// заглушки — зовнішнє: клієнт Supabase (@supabase/supabase-js) і fetch (уточнювальний запит причини).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const probe: { result: { status: number; error: { code?: string; message?: string } | null } } = {
  result: { status: 200, error: null },
};
vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string) => {
    if (!/^https?:\/\//.test(url)) throw new Error("Invalid supabaseUrl");
    const chain = { select: () => chain, limit: async () => probe.result };
    return { from: () => chain };
  },
}));

const { GET } = await import("@/app/api/health/route");

// Синтетична адреса з «хибним» ref — як на дрілі; у відповідь і журнал вона не має потрапити.
const BROKEN_URL = "https://abcdefghijklmnopqrsx.supabase.co";
const errors: string[] = [];

function dnsFailure() {
  return Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }) });
}

beforeEach(() => {
  errors.length = 0;
  vi.spyOn(console, "error").mockImplementation((line: string) => void errors.push(String(line)));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BROKEN_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_not_real");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("APP_ENV", "staging");
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "10fdfe9d6f11004d1fb9591aa7e3582d131a075a");
  probe.result = { status: 200, error: null };
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/api/health: причина збою бази й назва змінної (дія з postmortem 2026-11-19)", () => {
  it("зламаний стан дрілу: хост не резолвиться — 503, reason unreachable-dns, check NEXT_PUBLIC_SUPABASE_URL і рядок у журналі", async () => {
    probe.result = { status: 0, error: { message: "TypeError: fetch failed" } };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(dnsFailure()));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body).toMatchObject({ ok: false, db: "down", reason: "unreachable-dns", check: "NEXT_PUBLIC_SUPABASE_URL", appEnv: "staging" });
    expect(errors).toHaveLength(1);
    expect(JSON.parse(errors[0])).toMatchObject({ event: "health.db_down", reason: "unreachable-dns", check: "NEXT_PUBLIC_SUPABASE_URL", env: "preview", sha: "10fdfe9" });
    // Ні значення змінної, ні хоста, ні ключа — ні у відповіді, ні в журналі.
    for (const text of [JSON.stringify(body), errors[0]]) {
      expect(text).not.toContain("abcdefghijklmnopqrsx");
      expect(text).not.toContain("sb_publishable");
    }
  });

  it("виправлений стан: база відповідає — 200 без check і без рядка в журналі", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, db: "ok", reason: "", appEnv: "staging" });
    expect(body).not.toHaveProperty("check");
    expect(errors).toEqual([]);
  });

  it("відмова з'єднання й тайм-аут — свої причини; хост відповів на другий запит — unreachable-network", async () => {
    probe.result = { status: 0, error: { message: "TypeError: fetch failed" } };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } })));
    expect((await (await GET()).json()).reason).toBe("unreachable-refused");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" })));
    expect((await (await GET()).json()).reason).toBe("unreachable-timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    expect((await (await GET()).json()).reason).toBe("unreachable-network");
  });

  it("немає змінної — missing-env і назви відсутніх змінних, без запиту до бази", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const body = await (await GET()).json();
    expect(body).toMatchObject({ db: "down", reason: "missing-env", check: "NEXT_PUBLIC_SUPABASE_URL" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("невалідна адреса — invalid-env; хибний ключ — invalid-api-key і check з назвою ключа", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    expect(await (await GET()).json()).toMatchObject({ reason: "invalid-env", check: "NEXT_PUBLIC_SUPABASE_URL" });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BROKEN_URL);
    probe.result = { status: 401, error: { message: "Invalid API key" } };
    expect(await (await GET()).json()).toMatchObject({ reason: "invalid-api-key", check: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" });
  });

  it("база на паузі — paused без check: справа не в змінних", async () => {
    probe.result = { status: 540, error: { message: "project paused" } };
    const body = await (await GET()).json();
    expect(body).toMatchObject({ reason: "paused" });
    expect(body).not.toHaveProperty("check");
  });
});
