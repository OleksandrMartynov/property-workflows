// WS11, staging з окремою базою: UAT не пише в базу, якщо розгорнута адреса працює з іншою базою, ніж .env.local.
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkUatTarget, fetchHealthRef, supabaseRefFromUrl } from "../../scripts/uat/ref-guard.mjs";

const base = "https://staging.example.test";

afterEach(() => vi.unstubAllGlobals());

describe("UAT: та сама база, що в .env.local (scripts/uat/ref-guard.mjs)", () => {
  it("ref з адреси Supabase — як supabaseRefOf у /api/health; не Supabase — null", () => {
    expect(supabaseRefFromUrl("https://abcdefghijklmnopqrst.supabase.co")).toBe("abcdefghijklmnopqrst");
    expect(supabaseRefFromUrl("http://127.0.0.1:54321")).toBeNull();
    expect(supabaseRefFromUrl(undefined)).toBeNull();
  });

  it("однакові ref — можна писати", () => {
    expect(checkUatTarget({ base, healthRef: "stagingref", localRef: "stagingref" })).toBeNull();
  });

  it("різні ref (прод-адреса, .env.local = staging) — зупинка з обома ref і порадою", () => {
    const problem = checkUatTarget({ base, healthRef: "prodref", localRef: "stagingref" });
    expect(problem).toContain("prodref");
    expect(problem).toContain("stagingref");
    expect(problem).toContain("--url <staging>");
  });

  it("health без supabaseRef чи .env.local без адреси Supabase — зупинка, а не запис навмання", () => {
    expect(checkUatTarget({ base, healthRef: null, localRef: "stagingref" })).toContain("supabaseRef");
    expect(checkUatTarget({ base, healthRef: "stagingref", localRef: null })).toContain(".env.local");
  });

  it("fetchHealthRef: заголовок обходу лише коли секрет задано; значення не потрапляє в адресу", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
        calls.push({ url, headers: init.headers });
        return new Response(JSON.stringify({ supabaseRef: "stagingref" }), { headers: { "content-type": "application/json" } });
      }),
    );
    expect(await fetchHealthRef(base, "bypass-test-not-real")).toBe("stagingref");
    expect(await fetchHealthRef(base, "")).toBe("stagingref");
    expect(calls[0]).toEqual({ url: `${base}/api/health`, headers: { "x-vercel-protection-bypass": "bypass-test-not-real" } });
    expect(calls[1].headers).toEqual({});
  });
});
