// Архітектурне правило «секретний ключ лише на сервері» (scripts/check-server-boundary.mjs, ADR 0006): шлях імпорту
// admin-клієнта розв'язується до файлу, тож правило ловить відносні й динамічні імпорти та не плутає чужий `./admin`.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runScript } from "./run-script";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const ADMIN = `import "server-only";
export const createAdminClient = () => process.env.SUPABASE_SECRET_KEY;
`;

function project(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), "server-boundary-"));
  dirs.push(root);
  for (const [file, text] of Object.entries({ "src/lib/supabase/admin.ts": ADMIN, ...files })) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return runScript("check-server-boundary.mjs", root);
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

  it("ловить секретний ключ поза admin.ts і NEXT_PUBLIC_ зі секретом", () => {
    const { code, out } = project({
      "src/lib/env.ts": "export const key = process.env.SUPABASE_SECRET_KEY;\nexport const pub = process.env.NEXT_PUBLIC_SUPABASE_SECRET;\n",
    });
    expect(code).toBe(1);
    expect(out).toContain("src/lib/env.ts:1  секретний ключ читається поза src/lib/supabase/admin.ts");
    expect(out).toContain("src/lib/env.ts:2  NEXT_PUBLIC_ зі секретом");
  });
});
