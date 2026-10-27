#!/usr/bin/env node
// Контраст пар токенів у src/app/globals.css для світлої й темної теми (WCAG 2.x): текст ≥ 4.5:1, межі полів,
// кільце фокусу й іконки-стани ≥ 3:1. Значення OKLCH → sRGB → відносна яскравість. Код виходу 1, якщо пара нижче норми.
// Використання: node scripts/check-contrast.mjs [--md]   (--md друкує таблицю для DESIGN.md)

import { loadThemes, ratio } from "./lib/contrast.mjs";

const { themes, darkMedia, darkExplicit } = loadThemes();

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
  ["sidebar-accent-foreground", "sidebar-accent", 4.5, "Поточний пункт сайдбара (aria-current)"],
];

const rows = [];
let failures = 0;
// Дві копії темного блоку (media для «System» і явна для «Dark») мають збігатися токен у токен.
for (const name of new Set([...Object.keys(darkMedia), ...Object.keys(darkExplicit)])) {
  const [x, y] = [darkMedia[name], darkExplicit[name]];
  if (!x || !y || x.some((v, i) => v !== y[i])) {
    failures++;
    console.error(`Темні блоки розійшлися: --${name} (media: ${x ?? "немає"}, data-theme=dark: ${y ?? "немає"})`);
  }
}
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
