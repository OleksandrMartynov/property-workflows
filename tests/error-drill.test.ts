// WS11, трек B: навмисна помилка для трекера помилок закрита двічі — лише адміністратор і лише не на проді. Справжній
// маршрут; заглушка — лише getViewer (сесія й роль з @/lib/supabase/viewer).
import { afterEach, describe, expect, it, vi } from "vitest";

const viewer: { claims: { sub: string } | null; profile: { role: string } | null } = { claims: null, profile: null };
vi.mock("@/lib/supabase/viewer", () => ({ getViewer: async () => viewer }));

const { GET } = await import("@/app/api/ops/error-drill/route");

afterEach(() => {
  vi.unstubAllEnvs();
  viewer.claims = null;
  viewer.profile = null;
});

describe("/api/ops/error-drill", () => {
  it("на проді — 404 навіть адміністратору: проду помилка не загрожує", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    viewer.claims = { sub: "a1" };
    viewer.profile = { role: "admin" };
    expect((await GET()).status).toBe(404);
  });

  it("на staging без входу, менеджеру й підряднику — 404", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await GET()).status).toBe(404);
    for (const role of ["manager", "vendor"]) {
      viewer.claims = { sub: "u1" };
      viewer.profile = { role };
      expect((await GET()).status).toBe(404);
    }
  });

  it("адміністратор на staging — необроблена помилка ErrorDrill (її ловить onRequestError)", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    viewer.claims = { sub: "a1" };
    viewer.profile = { role: "admin" };
    await expect(GET()).rejects.toMatchObject({ name: "ErrorDrill" });
  });
});
