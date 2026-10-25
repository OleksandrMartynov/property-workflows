#!/usr/bin/env node
// Правило тексту в інтерфейсі (DESIGN.md, розділ 8): лише потрібний текст — заголовки, підписи полів, значення, помилки
// й тексти з AC. Жодних пояснювальних підзаголовків, підказок-«води», «No account yet?», копірайтів.
// Виняток — коментар `copy-ok: <причина>` у тому самому або попередньому рядку.
// Режими: без аргументів — перевірити src/; `--hook` — для хука Claude Code (читає JSON з stdin, перевіряє лише змінений файл).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const SKIP = [/[\\/]gallery[\\/]/, /\.test\.tsx?$/, /[\\/]node_modules[\\/]/];

const BANNED = [
  /use your work email/i,
  /no account yet/i,
  /ask your workspace administrator/i,
  /you become the run manager/i,
  /templates turn move-ins/i,
  /welcome back/i,
  /all rights reserved/i,
  /©/,
];

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/** Повертає масив { line, message } для вмісту файлу. */
export function checkSource(source) {
  const lines = source.split("\n");
  const problems = [];
  const okAt = (index) => /copy-ok:/.test(lines[index] ?? "") || /copy-ok:/.test(lines[index - 1] ?? "");
  const lineOf = (offset) => source.slice(0, offset).split("\n").length - 1;
  const report = (index, message) => {
    if (!okAt(index)) problems.push({ line: index + 1, message });
  };

  lines.forEach((text, index) => {
    for (const pattern of BANNED) {
      if (pattern.test(text)) report(index, `заборонений пояснювальний текст (${pattern.source})`);
    }
  });

  // <p className="… text-muted-foreground …">Звичайне речення з 4+ слів.</p>
  for (const match of source.matchAll(/<p\b[^>]*className=(?:"[^"]*"|\{[^}]*\})[^>]*>\s*([^<{}]+?)\s*<\/p>/g)) {
    const [, text] = match;
    if (/text-(muted-foreground|stage-muted)/.test(match[0]) && words(text) >= 4) {
      report(lineOf(match.index), `пояснювальний абзац «${text.slice(0, 48)}…» — прибрати або обґрунтувати copy-ok`);
    }
  }

  // description="…", hint="…", emptyHint = "…" (проп чи значення за замовчуванням), subtitle="…" з довгим літералом.
  for (const match of source.matchAll(/\b(description|hint|emptyHint|subtitle|helperText)\s*=\s*"([^"]+)"/g)) {
    if (words(match[2]) >= 4) report(lineOf(match.index), `${match[1]}="${match[2].slice(0, 40)}…" — пояснювальний текст`);
  }

  return problems;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (SKIP.some((r) => r.test(path))) continue;
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(name)) yield path;
  }
}

function run(files) {
  let total = 0;
  for (const file of files) {
    for (const { line, message } of checkSource(readFileSync(file, "utf8"))) {
      console.error(`${relative(root, file)}:${line}: ${message}`);
      total += 1;
    }
  }
  return total;
}

if (process.argv[1]?.endsWith("check-ui-copy.mjs")) {
  if (process.argv.includes("--hook")) {
    // Хук PostToolUse: stdin — JSON з tool_input.file_path. Код 2 повертає текст помилки агенту.
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    let file = "";
    try {
      file = JSON.parse(raw)?.tool_input?.file_path ?? "";
    } catch {}
    const path = file ? resolve(file) : "";
    if (path && existsSync(path) && /[\\/]src[\\/].*\.tsx?$/.test(path) && !SKIP.some((r) => r.test(path))) {
      const total = run([path]);
      if (total) {
        console.error("\nПравило тексту (DESIGN.md §8): прибери пояснювальний текст. Лише заголовки, підписи, значення, помилки й тексти з AC.");
        process.exit(2);
      }
    }
    process.exit(0);
  }
  const total = run(walk(join(root, "src")));
  if (total) {
    console.error(`\ncheck-ui-copy: ${total} порушень правила тексту (DESIGN.md, розділ 8).`);
    process.exit(1);
  }
  console.log("check-ui-copy: OK — пояснювального тексту в інтерфейсі немає.");
}
