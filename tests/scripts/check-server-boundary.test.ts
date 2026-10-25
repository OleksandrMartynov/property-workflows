// Архітектурне правило «секретний ключ лише на сервері» (scripts/check-server-boundary.mjs, ADR 0006): шлях імпорту
// admin-клієнта розв'язується до файлу, тож правило ловить відносні й динамічні імпорти та не плутає чужий `./admin`.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { repoRoot, runScript } from "./run-script";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const ADMIN = `import "server-only";
export const createAdminClient = () => process.env.SUPABASE_SECRET_KEY;
`;

function project(files: Record<string, string>, relativeRoot = false) {
  const root = mkdtempSync(path.join(tmpdir(), "server-boundary-"));
  dirs.push(root);
  for (const [file, text] of Object.entries({ "src/lib/supabase/admin.ts": ADMIN, ...files })) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  if (!relativeRoot) return runScript("check-server-boundary.mjs", root);
  // --root відносно робочої теки: шляхи порівнюються після resolve().
  const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "check-server-boundary.mjs"), "--root", path.basename(root)], {
    cwd: path.dirname(root),
    encoding: "utf8",
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

describe("scripts/check-server-boundary.mjs", () => {
  it("пропускає admin-клієнт у actions.ts і route.ts та чужий ./admin у src/app/admin/", () => {
    const { code, out } = project({
      "src/app/(app)/users/actions.ts": `"use server";\nimport { createAdminClient } from "@/lib/supabase/admin";\n`,
      "src/app/api/users/route.ts": `import { createAdminClient } from "../../../lib/supabase/admin";\n`,
      "src/app/admin/page.tsx": `import { AdminPanel } from "./admin";\nexport default AdminPanel;\n`,
      "src/app/admin/admin.tsx": "export const AdminPanel = () => null;\n",
    });
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });

  it("ловить відносний, динамічний, require і side-effect імпорт admin-клієнта поза серверними файлами", () => {
    const { code, out } = project({
      "src/lib/users.ts": `import { createAdminClient } from "./supabase/admin";\n`,
      "src/lib/supabase/helpers.ts": `export const load = () => import("@/lib/supabase/admin");\n`,
      "src/lib/legacy.cjs": `const admin = require("./supabase/admin.ts");\n`,
      "src/app/(app)/page.tsx": `import "@/lib/supabase/admin";\n`,
      "src/app/(app)/widget.tsx": `"use client";\nimport { createAdminClient } from "@/lib/supabase/admin";\n`,
    });
    expect(code).toBe(1);
    expect(out).toContain("src/lib/users.ts:1  admin-клієнт імпортовано не з actions.ts");
    expect(out).toContain("src/lib/supabase/helpers.ts:1  admin-клієнт імпортовано не з actions.ts");
    expect(out).toContain("src/lib/legacy.cjs:1  admin-клієнт імпортовано не з actions.ts");
    expect(out).toContain("src/app/(app)/page.tsx:1  admin-клієнт імпортовано не з actions.ts");
    expect(out).toContain('src/app/(app)/widget.tsx:2  admin-клієнт імпортовано у файлі з "use client"');
  });

  it("з відносним --root ловить відносний і @/-імпорт так само", () => {
    const { code, out } = project(
      {
        "src/lib/users.ts": `import { createAdminClient } from "./supabase/admin";\n`,
        "src/lib/more.ts": `import { createAdminClient } from "@/lib/supabase/admin";\n`,
      },
      true,
    );
    expect(code).toBe(1);
    expect(out).toContain("src/lib/users.ts:1  admin-клієнт імпортовано не з actions.ts");
    expect(out).toContain("src/lib/more.ts:1  admin-клієнт імпортовано не з actions.ts");
  });

  it("\"use server\" у тілі функції сторінки не робить сторінку серверним файлом для admin-клієнта", () => {
    const { code, out } = project({
      "src/app/(app)/page.tsx": `// Сторінка
import { createAdminClient } from "@/lib/supabase/admin";
export default function Page() {
  async function save() {
    "use server";
  }
  return save;
}
`,
      "src/app/(app)/users/actions.ts": `// Дії
"use server";
import { createAdminClient } from "@/lib/supabase/admin";
`,
    });
    expect(code).toBe(1);
    expect(out).toContain("src/app/(app)/page.tsx:2  admin-клієнт імпортовано не з actions.ts");
    expect(out).not.toContain("users/actions.ts");
  });

  it("ловить секретний ключ поза admin.ts і NEXT_PUBLIC_ зі секретом", () => {
    const { code, out } = project({
      "src/lib/env.ts": "export const key = process.env.SUPABASE_SECRET_KEY;\nexport const pub = process.env.NEXT_PUBLIC_SUPABASE_SECRET;\n",
    });
    expect(code).toBe(1);
    expect(out).toContain("src/lib/env.ts:1  секретний ключ читається поза src/lib/supabase/admin.ts");
    expect(out).toContain("src/lib/env.ts:2  NEXT_PUBLIC_ зі секретом");
  });

  it("перевіряє .mts і .cts, символьне посилання — порушення (за ним не переходить)", () => {
    const outside = mkdtempSync(path.join(tmpdir(), "server-boundary-outside-"));
    dirs.push(outside);
    writeFileSync(path.join(outside, "leak.ts"), "export const key = process.env.SUPABASE_SECRET_KEY;\n");
    const root = mkdtempSync(path.join(tmpdir(), "server-boundary-link-"));
    dirs.push(root);
    mkdirSync(path.join(root, "src", "lib", "supabase"), { recursive: true });
    writeFileSync(path.join(root, "src", "lib", "supabase", "admin.ts"), ADMIN);
    writeFileSync(path.join(root, "src", "lib", "env.mts"), "export const key = process.env.SUPABASE_SECRET_KEY;\n");
    writeFileSync(path.join(root, "src", "lib", "env.cts"), "export const key = process.env.SUPABASE_SECRET_KEY;\n");
    symlinkSync(outside, path.join(root, "src", "linked"), "junction"); // "junction": на Windows тека без прав адміністратора
    const { code, out } = runScript("check-server-boundary.mjs", root);
    expect(code).toBe(1);
    expect(out).toContain("src/lib/env.mts:1  секретний ключ читається поза");
    expect(out).toContain("src/lib/env.cts:1  секретний ключ читається поза");
    expect(out).toContain("src/linked:1  символьне посилання");
    expect(out).not.toContain("leak.ts");
  });

  // root читає будь-що, а на Windows chmod не знімає права читання — тест там не має сенсу.
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)("теку в src/ не вдалося прочитати — код 2 і пояснення, а не «OK»", () => {
    const root = mkdtempSync(path.join(tmpdir(), "server-boundary-locked-"));
    dirs.push(root);
    mkdirSync(path.join(root, "src", "lib", "supabase"), { recursive: true });
    writeFileSync(path.join(root, "src", "lib", "supabase", "admin.ts"), ADMIN);
    const locked = path.join(root, "src", "locked");
    mkdirSync(locked);
    chmodSync(locked, 0o000);
    try {
      const { code, out } = runScript("check-server-boundary.mjs", root);
      expect(code).toBe(2);
      expect(out).toContain("не вдалося прочитати теку");
      expect(out).not.toContain("OK");
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  it("--root без значення — код 2 і пояснення, а не TypeError", () => {
    const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "check-server-boundary.mjs"), "--root"], { encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toContain("після --root вкажіть теку проєкту");
    expect(result.stderr).not.toContain("TypeError");
  });
});
