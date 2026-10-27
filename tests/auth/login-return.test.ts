// Повернення на сторінку після входу (AC-DSYS-08) наскрізно: proxy веде відвідувача на /login?next=…, серверні сторінки
// (requireViewer) роблять так само, форма входу несе next, а дія входу після успіху веде саме туди — і лише на безпечний шлях.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const RUN = "/runs/11111111-1111-1111-1111-111111111111";

let claims: { sub: string } | null = null;
const signInWithPassword = vi.fn();
const requestHeaders = new Map<string, string>();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: async () => ({ data: { claims } }) } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims } }), signInWithPassword } }),
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { updateSession } = await import("@/lib/supabase/proxy");
const { requireViewer } = await import("@/lib/supabase/viewer");
const { login } = await import("@/app/login/actions");
const { LoginForm } = await import("@/app/login/login-form");

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
};

beforeEach(() => {
  claims = null;
  signInWithPassword.mockReset();
  requestHeaders.clear();
});

describe("Proxy: відвідувач без входу", () => {
  it("AC-DSYS-08: пряме посилання на запуск веде на /login?next=<шлях запуску>", async () => {
    const response = await updateSession(new NextRequest(`http://localhost:3000${RUN}`));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(RUN);
  });

  it("AC-DSYS-08: query посилання зберігається, службовий _rsc — ні", async () => {
    const response = await updateSession(new NextRequest("http://localhost:3000/runs?status=done&_rsc=x1"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("next")).toBe("/runs?status=done");
  });

  it("AC-DSYS-08: головна веде на звичайний /login без next, а сама сторінка входу не перенаправляється", async () => {
    const home = await updateSession(new NextRequest("http://localhost:3000/"));
    expect(new URL(home.headers.get("location")!).search).toBe("");
    const login = await updateSession(new NextRequest("http://localhost:3000/login?next=%2Fruns"));
    expect(login.headers.get("location")).toBeNull();
  });

  it("AC-DSYS-08: користувач, який увійшов, відкриває сторінку без перенаправлення", async () => {
    claims = { sub: "b0000000-0000-0000-0000-000000000001" };
    const response = await updateSession(new NextRequest(`http://localhost:3000${RUN}`));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("requireViewer: сесія зникла між proxy і сторінкою", () => {
  it("AC-DSYS-08: redirect на вхід несе шлях, який передав proxy", async () => {
    requestHeaders.set("x-pw-next", RUN);
    await expect(requireViewer()).rejects.toThrow(`NEXT_REDIRECT /login?next=${encodeURIComponent(RUN)}`);
  });

  it("AC-DSYS-08: чужа адреса в заголовку не потрапляє в next", async () => {
    requestHeaders.set("x-pw-next", "//evil.example");
    await expect(requireViewer()).rejects.toThrow("NEXT_REDIRECT /login");
    await expect(requireViewer()).rejects.not.toThrow("next=");
  });
});

describe("Форма й дія входу", () => {
  it("AC-DSYS-08: форма несе next прихованим полем, лише коли він не головна", () => {
    const html = (next?: string) => renderToStaticMarkup(createElement(LoginForm, { action: async () => {}, next }));
    expect(html(RUN)).toContain(`name="next" value="${RUN}"`);
    expect(html("/")).not.toContain('name="next"');
    expect(html()).not.toContain('name="next"');
  });

  it("AC-DSYS-08: після входу менеджера B — сторінка запуску, на яку вело посилання", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(login(form({ email: "manager.b@example.test", password: "x", next: RUN }))).rejects.toThrow(`NEXT_REDIRECT ${RUN}`);
    expect(signInWithPassword).toHaveBeenCalledOnce();
  });

  it("AC-DSYS-08: без next вхід веде на головну", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(login(form({ email: "manager.b@example.test", password: "x" }))).rejects.toThrow(/^NEXT_REDIRECT \/$/);
  });

  it("AC-DSYS-08: next на чужий сайт після входу ігнорується — головна", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    for (const attack of ["//evil.example", "https://evil.example/runs", "/\\evil.example"]) {
      await expect(login(form({ email: "manager.b@example.test", password: "x", next: attack })), attack).rejects.toThrow(/^NEXT_REDIRECT \/$/);
    }
  });

  it("AC-DSYS-08: хибний пароль лишає next у адресі входу, щоб наступна спроба теж повернула на сторінку", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    await expect(login(form({ email: "manager.b@example.test", password: "x", next: RUN }))).rejects.toThrow(
      `NEXT_REDIRECT /login?error=invalid&next=${encodeURIComponent(RUN)}`,
    );
    await expect(login(form({ email: "", password: "", next: RUN }))).rejects.toThrow(`NEXT_REDIRECT /login?error=missing&next=${encodeURIComponent(RUN)}`);
  });
});
