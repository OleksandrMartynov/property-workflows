// Сторінка статусу (WS11) з підмінною мережею: які запити йдуть, як їхні відповіді стають станами, і що на сторінці
// немає секретів. Заглушки — лише зовнішнє: fetch, клієнт Supabase і `server-only`.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_MODELS } from "@/lib/ai/models";

const db = { status: 401, error: { code: "42501", message: "permission denied for table profiles" } as { code?: string; message: string } | null };
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ select: () => ({ limit: async () => db }) }) }),
}));

let auth: () => Promise<Response>;
let models: () => Promise<Response>;
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith("/auth/v1/health")) return auth();
  if (url === "https://openrouter.ai/api/v1/models") return models();
  throw new Error(`unexpected fetch ${url}`);
});

const { checkStatus } = await import("@/lib/status-probes");
const { default: StatusPage } = await import("@/app/status/page");
const { GET } = await import("@/app/api/status/route");

const KEY = "sk-or-test-not-real";
const modelList = (ids: readonly string[]) => async () => Response.json({ data: ids.map((id) => ({ id })) });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("OPENROUTER_API_KEY", KEY);
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1234567890");
  vi.stubEnv("VERCEL_ENV", "production");
  db.status = 401;
  db.error = { code: "42501", message: "permission denied for table profiles" };
  auth = async () => new Response("{}", { status: 200 });
  models = modelList([...PRODUCT_MODELS, "other/model:free"]);
  fetchMock.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const states = async () => Object.fromEntries((await checkStatus()).components.map((c) => [c.id, c.state]));

describe("Сторінка статусу", () => {
  it("усе відповіло — «All systems operational», чотири компоненти «Operational», версія збірки видно", async () => {
    const html = renderToStaticMarkup(await StatusPage());
    expect(html).toContain("All systems operational");
    expect(html.match(/data-state="operational"/g)).toHaveLength(5); // підсумок + 4 компоненти
    expect(html).toContain("Version abcdef1 · production");
    expect(html).toContain(`${PRODUCT_MODELS.length} of ${PRODUCT_MODELS.length} models available`);
    expect(html).toContain("Kyiv time");
  });

  it("ні ключа AI, ні публічного ключа Supabase на сторінці й у JSON немає", async () => {
    const html = renderToStaticMarkup(await StatusPage());
    const json = JSON.stringify(await (await GET()).json());
    for (const text of [html, json]) {
      expect(text).not.toContain(KEY);
      expect(text).not.toContain("sb_publishable_test");
    }
  });

  it("до OpenRouter іде лише публічний список моделей, без ключа в запиті (ліміт моделей не витрачаємо)", async () => {
    await checkStatus();
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("openrouter.ai")) as unknown as [string, RequestInit?] | undefined;
    expect(call?.[0]).toBe("https://openrouter.ai/api/v1/models");
    expect(JSON.stringify(call?.[1] ?? {})).not.toContain(KEY);
  });

  it("вхід не відповідає — «Outage» і «Major outage» угорі", async () => {
    auth = async () => {
      throw new Error("timeout");
    };
    const report = await checkStatus();
    expect(report).toMatchObject({ state: "outage", title: "Major outage" });
    expect(await states()).toMatchObject({ auth: "outage", database: "operational" });
  });

  it("Supabase призупинено (540) — база «Outage» з причиною", async () => {
    db.status = 540;
    db.error = { message: "project paused" };
    const report = await checkStatus();
    expect(report.components.find((c) => c.id === "database")).toMatchObject({ state: "outage", detail: "Project paused" });
  });

  it("без ключа AI список моделей не запитуємо: AI «Degraded», угорі «Degraded performance»", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", " ");
    const report = await checkStatus();
    expect(report.components.find((c) => c.id === "ai")).toMatchObject({ state: "degraded", detail: "Not configured" });
    expect(report.title).toBe("Degraded performance");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("openrouter.ai"))).toBe(false);
  });

  it("OpenRouter недоступний — AI «Outage», угорі «Partial outage» (продукт працює без AI)", async () => {
    models = async () => new Response("down", { status: 502 });
    expect(await checkStatus()).toMatchObject({ state: "degraded", title: "Partial outage" });
  });

  it("JSON /api/status — той самий звіт без кешу", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ state: "operational", components: expect.any(Array), checkedAt: expect.any(String) });
  });
});
