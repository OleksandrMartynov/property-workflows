// WS11, дія з postmortem docs/incidents/2026-11-19-staging-bad-supabase-url.md: smoke червоніє на зламаному стані
// дрілу й називає змінну, яку перевірити, а на виправленому — зелений. Справжній scripts/smoke.mjs проти локального
// сервера, що віддає «/», «/login» і «/api/health» так, як staging до й після виправлення.
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SCRIPT_TEST_TIMEOUT, repoRoot } from "./run-script";

let server: Server | null = null;

async function stagingWith(health: { status: number; body: object }) {
  server = createServer((req, res) => {
    if (req.url === "/") return void res.writeHead(307, { location: "/login" }).end();
    if (req.url === "/login") return void res.writeHead(200, { "content-type": "text/html" }).end('<input type="password">');
    if (req.url === "/api/health") return void res.writeHead(health.status, { "content-type": "application/json" }).end(JSON.stringify(health.body));
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return `http://127.0.0.1:${port}`;
}

function smoke(url: string) {
  return new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn(process.execPath, [path.join(repoRoot, "scripts", "smoke.mjs"), url], {
      env: { ...process.env, SMOKE_TARGET: "deploy", VERCEL_AUTOMATION_BYPASS_SECRET: "" },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

afterEach(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(null)));
  server = null;
});

describe("smoke.mjs: назва змінної з /api/health (дія з postmortem 2026-11-19)", { timeout: SCRIPT_TEST_TIMEOUT }, () => {
  it("зламаний staging (unreachable-dns) — код 1 і ::error з назвою змінної NEXT_PUBLIC_SUPABASE_URL", async () => {
    const url = await stagingWith({
      status: 503,
      body: { ok: false, sha: "10fdfe9", env: "preview", appEnv: "staging", db: "down", reason: "unreachable-dns", check: "NEXT_PUBLIC_SUPABASE_URL" },
    });
    const { code, out } = await smoke(url);
    expect(code).toBe(1);
    expect(out).toMatch(/::error title=smoke .*unreachable-dns.*перевірте змінну NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("виправлений staging — код 0 і «OK — деплой живий»", async () => {
    const url = await stagingWith({ status: 200, body: { ok: true, sha: "10fdfe9", env: "preview", appEnv: "staging", db: "ok", reason: "" } });
    const { code, out } = await smoke(url);
    expect(code).toBe(0);
    expect(out).toContain("OK — деплой живий");
    expect(out).not.toContain("::error");
  });
});
