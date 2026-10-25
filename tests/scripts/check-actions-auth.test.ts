// Архітектурне правило «кожна Server Action перевіряє вхід» (scripts/check-actions-auth.mjs, ADR 0006):
// на тимчасових проєктах перевіряємо, що правило пропускає правильні дії й ловить порушення.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runScript } from "./run-script";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function project(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), "actions-auth-"));
  dirs.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return runScript("check-actions-auth.mjs", root);
}

const LOGIN = `"use server";
export async function login(formData: FormData) { await signIn(formData); }
export async function signOut() { await supabase.auth.signOut(); }
`;

describe("scripts/check-actions-auth.mjs", () => {
  it("пропускає дії з requireAdmin(), requireViewer() чи getClaims() і дії входу без перевірки", () => {
    const { code, out } = project({
      "src/app/login/actions.ts": LOGIN,
      "src/app/(app)/templates/[id]/edit/actions.ts": `"use server";
export async function addTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("template_tasks").insert({ name: String(formData.get("name")) });
}
export async function launch() { const { supabase } = await requireViewer(); return supabase; }
export async function raw() { const { data } = await supabase.auth.getClaims(); return data; }
`,
    });
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });

  it("ловить Server Action без перевірки входу — навіть якщо перевірка є в іншій дії файлу", () => {
    const { code, out } = project({
      "src/app/(app)/templates/[id]/edit/actions.ts": `"use server";
export async function renameTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("template_tasks").update({ name: "x" });
}
export async function removeTask(formData: FormData) {
  // requireAdmin() тут лише в коментарі — це не перевірка
  await createClient().from("template_tasks").delete().eq("id", String(formData.get("id")));
}
`,
    });
    expect(code).toBe(1);
    expect(out).toContain("removeTask() не перевіряє вхід");
    expect(out).not.toContain("renameTask()");
  });

  it("приймає перевірку через локальний хелпер файлу, який сам викликає requireAdmin(), і не приймає хелпер без перевірки", () => {
    const { code, out } = project({
      "src/app/(app)/templates/[id]/edit/actions.ts": `"use server";
async function editorContext(formData: FormData) {
  const { supabase } = await requireAdmin("/templates");
  return { supabase, id: String(formData.get("template_id")) };
}
async function sectionsOf(supabase: unknown, id: string) {
  return [supabase, id];
}
export async function addSection(formData: FormData) {
  const { supabase, id } = await editorContext(formData);
  await supabase.from("template_sections").insert({ template_id: id });
}
export async function sneaky(formData: FormData) {
  await sectionsOf(null, String(formData.get("id")));
}
`,
    });
    expect(code).toBe(1);
    expect(out).toContain("sneaky() не перевіряє вхід");
    expect(out).not.toContain("addSection()");
  });

  it("ловить getSession() у коді (але не в коментарі) і middleware.ts", () => {
    const { code, out } = project({
      "src/lib/supabase/viewer.ts": `// getSession() для авторизації не використовуємо
export async function who() { return (await supabase.auth.getSession()).data; }
`,
      "middleware.ts": "export function middleware() {}\n",
    });
    expect(code).toBe(1);
    expect(out).toContain("src/lib/supabase/viewer.ts:2  getSession()");
    expect(out).not.toContain("viewer.ts:1");
    expect(out).toContain("middleware.ts:1");
  });
});
