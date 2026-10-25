#!/usr/bin/env node
// Архітектурне правило «кожна Server Action перевіряє, хто її викликає» (ADR 0006, AGENTS.md «Межі»).
// Server Action — публічний POST-ендпойнт: її викликають напряму, оминаючи сторінку й сховану кнопку. Тому:
// 1) кожна дія — експорт у src/app/**/actions.ts і у файлах з "use server" будь-де в src/ (`export async function`, `export const x =
//    async (…) => …`, `export default async function`, `export { local as name }`) — викликає getClaims() — прямо,
//    через requireViewer() / requireAdmin() з src/lib/supabase/viewer.ts або через локальну функцію того самого файлу,
//    яка сама їх викликає (наприклад, editorContext() редактора шаблону), — і ДО першого запису (insert, update,
//    upsert, delete, rpc). Так само — вбудована дія: функція з "use server" на початку тіла (у page.tsx тощо);
//    виняток — дії, що сесію створюють чи завершують (вхід і вихід, src/app/login/actions.ts). Експорт, тіла якого
//    правило не бачить (re-export з іншого модуля, не async-функція у файлі з "use server"), — теж порушення;
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

/** Індекс дужки, що закриває відкриту в `i` (`(`, `{` чи `[`). */
function matchClose(code, i) {
  const close = { "(": ")", "{": "}", "[": "]" }[code[i]];
  let depth = 0;
  for (let j = i; j < code.length; j++) {
    if (code[j] === code[i]) depth++;
    else if (code[j] === close && --depth === 0) return j;
  }
  return code.length - 1;
}

const prevChar = (code, i) => {
  let j = i - 1;
  while (j >= 0 && /\s/.test(code[j])) j--;
  return code[j] ?? "";
};

/** Тіло стрілки від її `=>`: блок `{ … }` або вираз до `;` чи до наступного експорту. */
function arrowBody(code, arrowIndex) {
  let j = arrowIndex + 2;
  while (/\s/.test(code[j] ?? "")) j++;
  if (code[j] === "{") return code.slice(j, matchClose(code, j) + 1);
  let k = j;
  for (; k < code.length; k++) {
    if ("([{".includes(code[k])) k = matchClose(code, k);
    else if (code[k] === ";" || (code[k] === "\n" && /^\n\s*export\b/.test(code.slice(k, k + 40)))) break;
  }
  return code.slice(j, k);
}

/**
 * Тіло функції від дужки її параметрів: пропускає збалансовані параметри (`cb: () => void`, `opts: { a: 1 }`) і тип
 * результату (`Promise<{ error?: string }>`, `: { ok: boolean }`). Для стрілки — тіло після `=>`: блок або вираз.
 */
function bodyFrom(code, parenIndex, arrow = false) {
  let angle = 0;
  for (let i = matchClose(code, parenIndex) + 1; i < code.length; i++) {
    const c = code[i];
    if (c === "<") angle++;
    else if (c === ">" && code[i - 1] !== "=") angle--;
    else if (c === "(" || c === "[") i = matchClose(code, i);
    else if (c === "{" && (angle > 0 || ":|&".includes(prevChar(code, i)) || arrow)) i = matchClose(code, i);
    else if (c === "{") return code.slice(i, matchClose(code, i) + 1);
    else if (arrow && c === "=" && code[i + 1] === ">" && angle === 0) return arrowBody(code, i);
  }
  return "";
}

const IDENT = "[A-Za-z_$][A-Za-z0-9_$]*";
// function name(…) { … } — з export, default, async чи без.
const FUNCTION_DECL = new RegExp(`(export\\s+)?(default\\s+)?(async\\s+)?function\\s*\\*?\\s*(${IDENT})?\\s*(?:<[^>(]*>)?\\s*\\(`, "g");
// const name = async (…) => …, const name = async function (…) { … }, const name = async fd => …
const CONST_DECL = new RegExp(
  `(export\\s+)?(?:const|let|var)\\s+(${IDENT})\\s*(?::[^=]+)?=\\s*(async\\s+)?(?:function\\s*(?:${IDENT})?\\s*\\(|\\(|(${IDENT})\\s*=>)?`,
  "g",
);

/** Усі функції файлу: ім'я, чи експортована, чи async, тіло, позиція. */
function declarations(code) {
  const out = [];
  for (const m of code.matchAll(FUNCTION_DECL)) {
    // Вираз `= function …` розбирає CONST_DECL; безіменна функція — лише `export default`.
    const before = prevChar(code, m.index); // "" — початок файлу
    if ((before !== "" && "=(,".includes(before)) || (!m[4] && !m[2])) continue;
    const paren = m.index + m[0].length - 1;
    out.push({ name: m[4] ?? "default", exported: Boolean(m[1]), isDefault: Boolean(m[2]), async: Boolean(m[3]), body: bodyFrom(code, paren), index: m.index, fn: true });
  }
  for (const m of code.matchAll(CONST_DECL)) {
    const tail = m[0];
    const decl = { name: m[2], exported: Boolean(m[1]), isDefault: false, async: Boolean(m[3]), body: "", index: m.index, fn: true };
    if (m[4]) decl.body = arrowBody(code, m.index + tail.length - 2); // async fd => …
    else if (tail.endsWith("(")) decl.body = bodyFrom(code, m.index + tail.length - 1, !/function\s*\S*\s*\($/.test(tail));
    else decl.fn = false;
    out.push(decl);
  }
  return out;
}

// Запис у базу: insert / update / upsert / delete чи функція бази (rpc).
const WRITE = /\.(insert|update|upsert|delete|rpc)\s*\(/;

/** "ok" — перевірка входу є і стоїть до першого запису, "late" — запис раніше за перевірку, "none" — перевірки немає. */
function authOrder(body, patterns) {
  const at = (re) => {
    const m = new RegExp(re.source).exec(body);
    return m ? m.index : Infinity;
  };
  const auth = Math.min(...patterns.map(at));
  if (auth === Infinity) return "none";
  return at(WRITE) < auth ? "late" : "ok";
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
  // Директива модуля — лише на початку файлу (коментарі вже замінено пробілами); "use server" у тілі функції — вбудована
  // дія сторінки, а не модуль дій.
  const useServer = /^\s*["']use server["']/.test(code);
  const decls = declarations(code);
  // Вбудована дія: функція, чиє тіло починається з "use server" (наприклад, усередині page.tsx), — теж публічний POST.
  const inlineActions = decls.filter((d) => d.fn && !d.exported && /^\{\s*["']use server["']/.test(d.body));
  // Файл з "use server" — будь-де в src/ (його експорти — дії, щойно клієнт їх імпортує); actions.ts — у src/app/.
  const actionsModule = useServer || (rel.startsWith("src/app/") && basename(file) === "actions.ts");
  if (!actionsModule && inlineActions.length === 0) continue;
  const allowed = SESSION_ACTIONS.get(rel) ?? new Set();
  // Локальні (не експортовані) функції файлу, які самі перевіряють вхід: виклик такої функції — теж перевірка.
  // Транзитивно: move() → editorContext() → requireAdmin() — теж перевірка.
  const guards = new Set();
  const guardRe = () => (guards.size ? new RegExp(`\\b(${[...guards].join("|")})\\s*\\(`) : null);
  const checks = (body) => authOrder(body, [AUTH_CALL, guardRe()].filter(Boolean));
  for (let grew = true; grew; ) {
    grew = false;
    for (const d of decls) {
      if (!d.exported && d.fn && !guards.has(d.name) && checks(d.body) === "ok") {
        guards.add(d.name);
        grew = true;
      }
    }
  }
  const fail = (index, name, why) => problems.push(`${rel}:${lineOf(code, index)}  Server Action ${name}() ${why}`);
  const WRITE_FIRST = "пише до перевірки входу: getClaims() / requireViewer() / requireAdmin() — першим кроком, до будь-якого запису";
  const NO_AUTH = "не перевіряє вхід: getClaims() прямо або через requireViewer() / requireAdmin() — першим кроком, до будь-якого запису";

  /** Перевірка однієї дії (експортованої функції) файлу. */
  const verify = (decl, exportedAs, index) => {
    if (allowed.has(exportedAs)) return;
    if (!decl.fn || !decl.async) {
      // У файлі з "use server" кожен експорт — дія, і Next.js вимагає async-функцію; actions.ts без директиви — лише async.
      if (useServer) fail(index, exportedAs, "— не async-функція: правило не може перевірити такий експорт");
      return;
    }
    const order = checks(decl.body);
    if (order === "none") fail(index, exportedAs, NO_AUTH);
    else if (order === "late") fail(index, exportedAs, WRITE_FIRST);
  };

  for (const d of inlineActions) verify(d, d.name, d.index);
  if (!actionsModule) continue; // у звичайному модулі (сторінка) експорти — не дії
  for (const d of decls.filter((x) => x.exported)) verify(d, d.isDefault && d.name === "default" ? "default" : d.name, d.index);

  // export { a, b as c } — розгортаємо до оголошень цього файлу; export … from — тіла не видно.
  for (const m of code.matchAll(new RegExp(`export\\s+(type\\s+)?\\{([^}]*)\\}\\s*(from\\s*["'][^"']+["'])?`, "g"))) {
    if (m[1]) continue;
    for (const entry of m[2].split(",").map((x) => x.trim()).filter(Boolean)) {
      if (/^type\s/.test(entry)) continue;
      const [local, as] = entry.split(/\s+as\s+/);
      const exportedAs = as ?? local;
      if (m[3]) {
        if (useServer && !allowed.has(exportedAs)) fail(m.index, exportedAs, "— re-export з іншого модуля: оголосіть дію в цьому файлі, щоб правило бачило перевірку");
        continue;
      }
      const decl = decls.find((d) => d.name === local);
      if (!decl) fail(m.index, exportedAs, "— не знайдено оголошення в цьому файлі");
      else verify(decl, exportedAs, m.index);
    }
  }
  for (const m of code.matchAll(/export\s*\*\s*(?:as\s+\S+\s+)?from\s*["'][^"']+["']/g)) {
    if (useServer) fail(m.index, "*", "— re-export з іншого модуля: оголосіть дії в цьому файлі, щоб правило бачило перевірку");
  }
  // export default name; / export default async (…) => …
  for (const m of code.matchAll(new RegExp(`export\\s+default\\s+(?!async\\s+function|function)(async\\s+)?(\\(|${IDENT})`, "g"))) {
    if (m[2] === "(") {
      verify({ fn: true, async: Boolean(m[1]), body: bodyFrom(code, m.index + m[0].length - 1, true) }, "default", m.index);
      continue;
    }
    const decl = decls.find((d) => d.name === m[2]);
    if (!decl) fail(m.index, "default", "— не знайдено оголошення в цьому файлі");
    else verify(decl, "default", m.index);
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
