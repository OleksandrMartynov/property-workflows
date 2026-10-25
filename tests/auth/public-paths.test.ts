import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/public-paths";

describe("Сторінки без входу (proxy)", () => {
  it("AC-EDITOR-09: редактор шаблону за прямим посиланням — не публічний, відвідувача веде на /login", () => {
    expect(isPublicPath("/templates/10000000-0000-0000-0000-000000000001/edit")).toBe(false);
    expect(isPublicPath("/templates/10000000-0000-0000-0000-000000000001/versions")).toBe(false);
  });

  it("AC-DSYS-03: сторінка запуску за прямим посиланням — не публічна", () => {
    expect(isPublicPath("/runs/11111111-1111-1111-1111-111111111111")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
  });

  it("AC-DSYS-03: публічні лише вхід і підтвердження — за цілим сегментом шляху", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/login-as-admin")).toBe(false);
    expect(isPublicPath("/authorize")).toBe(false);
    expect(isPublicPath("/auth")).toBe(false);
    expect(isPublicPath("/auth/settings")).toBe(false);
  });
});
