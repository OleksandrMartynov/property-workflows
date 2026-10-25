#!/usr/bin/env node
// Архітектурне правило «кожна Server Action перевіряє, хто її викликає» (ADR 0006, AGENTS.md «Межі»).
// Server Action — публічний POST-ендпойнт: її викликають напряму, оминаючи сторінку й сховану кнопку. Тому:
// 1) кожна експортована async-функція у src/app/**/actions.ts і у файлах з "use server" викликає getClaims() — прямо,
//    через requireViewer() / requireAdmin() з src/lib/supabase/viewer.ts або через локальну функцію того самого файлу,
//    яка сама їх викликає (наприклад, editorContext() редактора шаблону);
//    виняток — дії, що сесію створюють чи завершують (вхід і вихід, src/app/login/actions.ts);
// 2) жодного getSession() у коді src/ (коментарі не рахуються) — він не перевіряє підпис JWT;
// 3) жодного middleware.ts — у Next.js 16 сесію оновлює src/proxy.ts.
// Роль і дані захищають ще RLS і функції бази; правило ловить дію, яка забула перевірку (як-от нова дія редактора).
// Використання: node scripts/check-actions-auth.mjs [--root <dir>]. Код виходу: 0 — OK, 1 — є порушення.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();

// Дії, які сесію створюють чи завершують: перевіряти ще нічого (signInWithPassword / signOut самі є перевіркою).
const SESSION_ACTIONS = new Map([["src/app/login/actions.ts", new Set(["login", "signOut"])]]);
const AUTH_CALL = /\b(getClaims|requireViewer|requireAdmin)\s*\(/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

/** Код без коментарів (// і /* … *\/), з тими самими номерами рядків. */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Тіло функції від `{` після сигнатури до парної `}` (рядки, коментарі й шаблони — грубо, але для дій досить). */
function bodyFrom(code, start) {
  const open = code.indexOf("{", code.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
}

const problems = [];
const posix = (p) => p.split(sep).join("/");
const lineOf = (code, index) => code.slice(0, index).split("\n").length;

for (const file of walk(join(root, "src"))) {
  const rel = posix(relative(root, file));
  const code = stripComments(readFileSync(file, "utf8"));

  // 2) getSession() для авторизації заборонено.
  for (const m of code.matchAll(/\bgetSession\s*\(/g)) {
    problems.push(`${rel}:${lineOf(code, m.index)}  getSession() — для авторизації лише getClaims() (перевіряє підпис JWT)`);
  }

  // 1) Кожна Server Action перевіряє виклик.
  const isActions = basename(file) === "actions.ts" || /^\s*["']use server["']/m.test(code);
  if (!rel.startsWith("src/app/") || !isActions) continue;
  const allowed = SESSION_ACTIONS.get(rel) ?? new Set();
  // Локальні (не експортовані) функції файлу, які самі перевіряють вхід: виклик такої функції — теж перевірка.
  const guards = [...code.matchAll(/(?<!export\s+)(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)]
    .filter((m) => !/export\s+$/.test(code.slice(Math.max(0, m.index - 20), m.index)) && AUTH_CALL.test(bodyFrom(code, m.index)))
    .map((m) => m[1]);
  const guarded = guards.length ? new RegExp(`\\b(${guards.join("|")})\\s*\\(`) : null;
  for (const m of code.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g)) {
    const name = m[1];
    if (allowed.has(name)) continue;
    const body = bodyFrom(code, m.index);
    if (!AUTH_CALL.test(body) && !(guarded && guarded.test(body))) {
      problems.push(
        `${rel}:${lineOf(code, m.index)}  Server Action ${name}() не перевіряє вхід: getClaims() прямо або через ` +
          "requireViewer() / requireAdmin() — першим кроком, до будь-якого запису",
      );
    }
  }
}

// 3) middleware.ts замість src/proxy.ts.
for (const p of ["middleware.ts", "src/middleware.ts"]) {
  if (existsSync(join(root, p))) problems.push(`${p}:1  middleware.ts — у Next.js 16 сесію оновлює src/proxy.ts`);
}

if (problems.length === 0) {
  console.log("check-actions-auth: OK — кожна Server Action перевіряє вхід (getClaims), getSession() і middleware.ts немає.");
  process.exit(0);
}
for (const p of problems) console.log(p);
console.log(`\ncheck-actions-auth: ${problems.length} порушень. Правило — ADR 0006, AGENTS.md («Межі»).`);
process.exit(1);
