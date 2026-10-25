#!/usr/bin/env node
// Контраст пар токенів у src/app/globals.css для світлої й темної теми (WCAG 2.x): текст ≥ 4.5:1, межі полів,
// кільце фокусу й іконки-стани ≥ 3:1. Значення OKLCH → sRGB → відносна яскравість. Код виходу 1, якщо пара нижче норми.
// Використання: node scripts/check-contrast.mjs [--md]   (--md друкує таблицю для DESIGN.md)

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Коментарі прибираємо одразу: у них трапляються дужки.
const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло блоку, що починається на позиції `open` ('{'), і позиція його кінця. */
function body(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return { text: text.slice(open + 1, i), end: i };
  }
  throw new Error("globals.css: незбалансовані дужки");
}

const declarations = (text) => {
  const out = {};
  for (const m of text.matchAll(/--([a-z0-9-]+):\s*oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/g)) {
    out[m[1]] = [m[2].endsWith("%") ? parseFloat(m[2]) / 100 : parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
  }
  return out;
};

// Лише верхній рівень: усі `:root { … }` — світла тема (разом із токенами сцени); `@media (prefers-color-scheme: dark) { :root { … } }` — темна.
// Інші @media (p3, prefers-contrast, forced-colors) навмисно пропускаємо: це опційні надбудови над базовою парою.
const light = {};
const dark = {};
let pos = 0;
while (pos < css.length) {
  const open = css.indexOf("{", pos);
  if (open < 0) break;
  // Умова правила — текст після останнього `;` (так відсікаються `@import …;`).
  const prelude = css.slice(pos, open).split(";").pop().trim();
  const block = body(css, open);
  if (prelude === ":root") Object.assign(light, declarations(block.text));
  else if (/^@media\s*\(prefers-color-scheme:\s*dark\)$/.test(prelude)) {
    const inner = block.text.match(/:root\s*\{/);
    if (inner) Object.assign(dark, declarations(body(block.text, inner.index + inner[0].length - 1).text));
  }
  pos = block.end + 1;
}
const themes = { light, dark: { ...light, ...dark } };

const toRGB = ([L, C, H]) => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((x) => Math.min(1, Math.max(0, x)));
};
// toRGB віддає лінійний sRGB; яскравість рахуємо з нього напряму.
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (a, b) => {
  const [x, y] = [luminance(toRGB(a)), luminance(toRGB(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// [токен, тло, мінімум, де]
const PAIRS = [
  ["foreground", "background", 4.5, "Основний текст"],
  ["foreground", "card", 4.5, "Текст на картці"],
  ["muted-foreground", "background", 4.5, "Допоміжний текст"],
  ["muted-foreground", "card", 4.5, "Допоміжний текст на картці"],
  ["muted-foreground", "muted", 4.5, "Допоміжний текст на приглушеному тлі"],
  ["sidebar-foreground", "sidebar", 4.5, "Навігація"],
  ["primary-foreground", "primary", 4.5, "Основна кнопка"],
  ["destructive-foreground", "destructive", 4.5, "Небезпечна кнопка"],
  ["secondary-foreground", "secondary", 4.5, "Другорядна кнопка"],
  ["popover-foreground", "popover", 4.5, "Меню, діалоги"],
  ["primary", "background", 4.5, "Посилання й акцентний текст"],
  ["destructive", "card", 4.5, "Текст помилки поля"],
  ["input", "card", 3, "Межа поля вводу"],
  ["input", "background", 3, "Межа поля на полотні"],
  ["border-strong", "background", 3, "Межа чекбокса, радіо, перемикача"],
  ["ring", "background", 3, "Кільце фокусу на полотні"],
  ["ring", "card", 3, "Кільце фокусу на картці"],
  ["ring", "sidebar", 3, "Кільце фокусу в сайдбарі"],
  ["status-todo-foreground", "status-todo", 4.5, "Статус «to do»"],
  ["status-progress-foreground", "status-progress", 4.5, "Статус «in progress»"],
  ["status-done-foreground", "status-done", 4.5, "Статус «done / completed»"],
  ["status-overdue-foreground", "status-overdue", 4.5, "Статус «overdue», помилка"],
  ["status-due-soon-foreground", "status-due-soon", 4.5, "Статус «due soon»"],
  ["ai-foreground", "ai", 4.5, "Позначка AI"],
  ["variable-foreground", "variable", 4.5, "Чип змінної"],
  ["status-due-soon-foreground", "background", 4.5, "Підказка Caps Lock"],
  ["stage-foreground", "stage", 4.5, "Заголовок hero входу"],
  ["stage-muted", "stage", 4.5, "Підзаголовок hero входу"],
  ["stage-accent", "stage", 4.5, "Акцентне слово hero входу"],
  ["status-done-mark", "background", 3, "Іконка «done»"],
  ["status-overdue-mark", "background", 3, "Іконка «overdue»"],
  ["status-progress-mark", "background", 3, "Іконка «in progress»"],
  ["status-todo-mark", "background", 3, "Іконка «to do» (StatusIcon, TaskCheck)"],
  ["status-due-soon-mark", "background", 3, "Іконка «due soon»"],
  ["ai-mark", "background", 3, "Кінець смуги навігації, позначка AI"],
  ["variable-mark", "background", 3, "Позначка змінної"],
  ["accent-foreground", "accent", 4.5, "Підсвічений пункт меню й списку"],
  ["sidebar-primary-foreground", "sidebar-primary", 4.5, "Активний пункт сайдбара"],
];

const rows = [];
let failures = 0;
for (const [fg, bg, min, where] of PAIRS) {
  const cells = ["light", "dark"].map((theme) => {
    const a = themes[theme][fg];
    const b = themes[theme][bg];
    if (!a || !b) {
      failures++;
      console.error(`Немає токена ${!a ? fg : bg} у темі ${theme}`);
      return NaN;
    }
    const value = ratio(a, b);
    if (value < min) {
      failures++;
      console.error(`НИЖЧЕ НОРМИ ${fg} → ${bg} (${theme}): ${value.toFixed(2)}:1, потрібно ≥ ${min}:1`);
    }
    return value;
  });
  rows.push(`| \`${fg}\` → \`${bg}\` | ${where} | ≥ ${min}:1 | ${cells[0].toFixed(2)}:1 | ${cells[1].toFixed(2)}:1 |`);
}

if (process.argv.includes("--md")) {
  console.log("| Пара (текст або мітка → тло) | Де | Норма | Світла | Темна |\n|---|---|---|---|---|\n" + rows.join("\n"));
} else if (failures === 0) {
  console.log(`check-contrast: OK — ${PAIRS.length} пар у світлій і темній темі проходять норму.`);
}
process.exit(failures ? 1 : 0);
