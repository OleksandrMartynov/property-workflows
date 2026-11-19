// WS11, трек B: трекер помилок сервера (src/instrumentation.ts, onRequestError) шле в чат команди лише маршрут-шаблон,
// метод, назву помилки, digest і рядки стеку «at …» — без тексту помилки, query, заголовків і cookie. Справжня
// функція; заглушка — лише fetch (Telegram) і змінні середовища.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "@/instrumentation";

const sent: { url: string; body: { chat_id: string; text: string } }[] = [];
const fetchMock = vi.fn(async (url: string, init?: { body?: string }) => {
  sent.push({ url, body: JSON.parse(init?.body ?? "{}") });
  return new Response("{}");
});

const request = (path = "/runs/11111111-1111-1111-1111-111111111111?token=secret-query") => ({
  path,
  method: "GET",
  headers: { cookie: "sb-access-token=cookie-secret", authorization: "Bearer header-secret" },
});
const context = (routePath: string) => ({ routerKind: "App Router" as const, routePath, routeType: "route" as const, renderSource: undefined, revalidateReason: undefined, renderType: undefined });

function failure(message: string, digest?: string) {
  const error = Object.assign(new Error(message), digest ? { digest } : {});
  // Шлях Windows з ім'ям користувача ОС і шлях Linux на Vercel — обидва мають скоротитися до src/… і .next/….
  const windowsFrame = String.raw`at GET (C:\Users\someone\project\src\app\api\ops\error-drill\route.ts:17:9)`;
  error.stack = [`Error: ${message}`, `    ${windowsFrame}`, "    at run (/var/task/.next/server/app.js:1:2)", "not a frame line"].join("\n");
  return error;
}

beforeEach(() => {
  sent.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "000:test-token-not-real");
  vi.stubEnv("TELEGRAM_CHAT_ID", "-100");
  vi.stubEnv("APP_ENV", "staging");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "staging");
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "5a3efc84c08567b1d0742ed26f22c34955fbb2fa");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("onRequestError → Telegram", () => {
  it("надсилає маршрут-шаблон, метод, назву, digest, середовище й рядки стеку зі скороченими шляхами", async () => {
    await onRequestError(failure("boom for lena.private@example.test", "d-1"), request(), context("/api/ops/error-drill"));
    expect(sent).toHaveLength(1);
    const { text } = sent[0].body;
    expect(text).toContain("ПОМИЛКА СЕРВЕРА");
    expect(text).toContain("Середовище: staging (гілка staging)");
    expect(text).toContain("GET /api/ops/error-drill");
    expect(text).toContain("Помилка: Error, digest d-1");
    expect(text).toContain("коміт 5a3efc8");
    // Префікс локального шляху скорочено до src/ (решта шляху Windows лишається як є; на Vercel шляхи — лінуксові).
    expect(text).toContain(String.raw`at GET (src/app\api\ops\error-drill\route.ts:17:9)`);
    expect(text).toContain("at run (.next/server/app.js:1:2)");
  });

  it("не надсилає тексту помилки, query, cookie, заголовків і шляху з ім'ям користувача ОС", async () => {
    await onRequestError(failure("boom for lena.private@example.test", "d-2"), request(), context("/runs/[id]"));
    const { text } = sent[0].body;
    for (const leak of ["lena.private", "boom for", "secret-query", "cookie-secret", "header-secret", "someone", "11111111-1111"]) {
      expect(text).not.toContain(leak);
    }
    expect(text).not.toContain("not a frame line");
  });

  it("та сама помилка на тому самому маршруті — не частіше разу на хвилину", async () => {
    await onRequestError(failure("x", "d-3"), request(), context("/templates"));
    await onRequestError(failure("x", "d-3"), request(), context("/templates"));
    expect(sent).toHaveLength(1);
  });

  it("без TELEGRAM_* — нічого не надсилає; збій Telegram не ламає відповідь", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    await onRequestError(failure("x", "d-4"), request(), context("/a"));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "000:test-token-not-real");
    fetchMock.mockRejectedValueOnce(new Error("network down https://api.telegram.org/bot000:test-token-not-real"));
    await expect(onRequestError(failure("x", "d-5"), request(), context("/b"))).resolves.toBeUndefined();
  });

  it("помилка без стеку чи не Error — лише назва типу, без рядків стеку", async () => {
    await onRequestError("plain string thrown", request(), context("/c"));
    expect(sent[0].body.text).toContain("Помилка: string");
    expect(sent[0].body.text).not.toContain("Стек");
  });
});
