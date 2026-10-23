// Самоперевірка project/ перед публікацією.
//
//   node check.mjs                  лише перевірка
//   node check.mjs --write-contrast перезаписати таблицю «Контраст» у README.md значеннями з tokens.json
//
// Перевіряє: граматику tokens.json (імена, дублі, списки, значення кольору без var()/color-mix(), аліаси, ліміти),
// контраст пар (WCAG 2) у обох темах і збіг таблиці README, прев'ю (маркер @dsCard, заборонені елементи, посилання
// var(--…) на неіснуючі токени, літеральні кольори, @media за кольоровою схемою), README компонентів, Cover без README,
// design-system.json, розміри файлів.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "project");
const write = process.argv.includes("--write-contrast");
const errors = [];
const notes = [];
const err = (m) => errors.push(m);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// ------------------------------------------------------------------ tokens.json
const tokens = JSON.parse(read("tokens.json"));
const themes = tokens.color.themes.map((t) => t.id);
const first = themes[0];
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const names = new Map();
const addName = (n, fam) => {
  if (!NAME.test(n)) err(`ім'я поза граматикою: ${n}`);
  if (names.has(n)) err(`дубль імені ${n} (${names.get(n)} і ${fam})`);
  names.set(n, fam);
};
const FUNC_COLOR = /^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(\s*[-\d.%\s,/]+\)$/;
const HEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const colorByName = new Map(tokens.color.tokens.map((t) => [t.name, t]));
const colorValue = (t, theme) => (typeof t.value === "string" ? t.value : (t.value[theme] ?? t.value[first]));

for (const t of tokens.color.tokens) {
  addName(t.name, "color");
  if (!t.usage || t.usage.length > 1000) err(`usage ${t.name}: порожній або > 1000`);
  for (const th of themes) {
    const v = colorValue(t, th);
    if (v === undefined) { err(`${t.name}: немає значення для теми ${th}`); continue; }
    const alias = /^\{([\w.-]+)\}$/.exec(v);
    if (alias) {
      if (!colorByName.has(alias[1]) || alias[1] === t.name) err(`${t.name}: аліас на неіснуючий токен чи на себе: ${v}`);
    } else if (!HEX.test(v) && !FUNC_COLOR.test(v)) err(`${t.name}[${th}]: недозволене значення кольору «${v}»`);
    if (/var\(|color-mix\(|calc\(|currentcolor|transparent/i.test(v)) err(`${t.name}[${th}]: var()/color-mix()/named: ${v}`);
  }
}
if (tokens.color.tokens.length > 600) err("кольорів більше 600");

for (const t of tokens.shadow?.tokens ?? []) {
  addName(t.name, "shadow");
  if (!t.usage) err(`usage ${t.name} порожній`);
  for (const th of themes) {
    const v = typeof t.value === "string" ? t.value : (t.value[th] ?? t.value[first]);
    if (!v || v.length > 400 || /var\(|url\(/.test(v)) err(`shadow ${t.name}[${th}]: недозволене значення`);
  }
}
const PLAIN = /^[A-Za-z0-9 #%(),./+_-]{1,200}$/;
for (const fam of Object.keys(tokens)) {
  if (["name", "version", "color", "type", "shadow", "meta"].includes(fam)) continue;
  const list = tokens[fam]?.tokens;
  if (!Array.isArray(list)) { err(`родина ${fam}: очікувався список tokens`); continue; }
  if (list.length > 60) err(`родина ${fam}: більше 60 токенів`);
  for (const t of list) {
    addName(t.name, fam);
    if (!t.usage) err(`usage ${t.name} порожній`);
    if (typeof t.value !== "string" || !PLAIN.test(t.value) || /var\(|url\(/.test(t.value)) err(`${fam}/${t.name}: недозволене значення «${t.value}»`);
    if ((t.value.match(/\(/g) ?? []).length !== (t.value.match(/\)/g) ?? []).length) err(`${t.name}: незбалансовані дужки`);
  }
}
for (const g of tokens.type.groups) for (const s of g.styles) {
  if (!NAME.test(s.name)) err(`стиль ${s.name}: ім'я поза граматикою`);
  if (!/^[\d.]+(px|rem|em)$/.test(s.fontSize)) err(`стиль ${s.name}: fontSize ${s.fontSize}`);
}
for (const [k, v] of Object.entries(tokens.type.families)) {
  if (v.length > 200 || /[;{}<>\\()]/.test(v)) err(`family ${k}: недозволені символи`);
}
if (Object.keys(tokens).length > 20) err("забагато верхніх ключів");

// ------------------------------------------------------------------ контраст
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return lin.map((x) => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055; });
}
function toRgb(v) {
  let m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(v);
  if (m) return oklchToRgb(+m[1] / (m[2] ? 100 : 1), +m[3], +m[4]);
  m = HEX.exec(v);
  if (m) {
    let h = v.slice(1); if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  throw new Error(`не вмію читати колір для контрасту: ${v}`);
}
const resolve = (name, theme, depth = 0) => {
  const t = colorByName.get(name);
  if (!t || depth > 16) throw new Error(`колір ${name}`);
  const v = colorValue(t, theme);
  const a = /^\{([\w.-]+)\}$/.exec(v);
  return a ? resolve(a[1], theme, depth + 1) : v;
};
const lum = (rgb) => { const d = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * d(rgb[0]) + 0.7152 * d(rgb[1]) + 0.0722 * d(rgb[2]); };
const ratio = (fg, bg, theme) => { const x = lum(toRgb(resolve(fg, theme))), y = lum(toRgb(resolve(bg, theme))); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

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
  ["status-done-mark", "background", 3, "Іконка «done»"],
  ["status-overdue-mark", "background", 3, "Іконка «overdue»"],
  ["status-progress-mark", "background", 3, "Іконка «in progress»"],
  ["stage-foreground", "stage", 4.5, "Заголовок hero входу"],
  ["stage-muted", "stage", 4.5, "Підзаголовок hero входу"],
  ["stage-accent", "stage", 4.5, "Акцентне слово hero входу"],
];
// Додаткові пари, що їх називають usage-примітки й малюють прев'ю (у таблицю README не потрапляють)
const EXTRA = [
  ["destructive", "background", 4.5, "Помилка поля на полотні"],
  ["primary", "card", 4.5, "Посилання на картці"],
  ["card-foreground", "card", 4.5, "Текст картки"],
  ["accent-foreground", "accent", 4.5, "Текст на accent"],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5, "Поточний пункт навігації"],
  ["sidebar-foreground", "sidebar-accent", 4.5, "Навігація на accent"],
  ["muted-foreground", "sidebar", 4.5, "Допоміжний текст у сайдбарі"],
  ["muted-foreground", "popover", 4.5, "Підказка в палітрі"],
  ["muted-foreground", "field", 4.5, "Placeholder поля"],
  ["muted-foreground", "secondary", 4.5, "Допоміжний текст на secondary"],
  ["foreground", "field", 4.5, "Текст у полі"],
  ["input", "field", 3, "Межа поля до його заливки"],
  ["border-strong", "card", 3, "Межа стану на картці"],
  ["ring", "popover", 3, "Кільце фокусу в діалозі"],
  ["ai-mark", "background", 3, "Мітка AI"],
  ["variable-mark", "background", 3, "Мітка змінної"],
  ["status-todo-mark", "background", 3, "Іконка «to do»"],
  ["status-due-soon-mark", "background", 3, "Іконка «due soon»"],
  ["status-due-soon-foreground", "background", 4.5, "Підказка Caps Lock"],
  ["status-done-foreground", "background", 4.5, "Текст «Done» на полотні"],
  ["status-overdue-foreground", "background", 4.5, "Текст «Overdue» на полотні"],
];
const fmt = (n) => n.toFixed(2);
let table = "| Пара (текст або мітка → тло) | Де | Норма | Світла | Темна |\n|---|---|---|---|---|\n";
for (const [fg, bg, min, where] of PAIRS) {
  const l = ratio(fg, bg, "light"), d = ratio(fg, bg, "dark");
  if (l < min || d < min) err(`КОНТРАСТ ${fg} → ${bg}: ${fmt(l)} / ${fmt(d)} < ${min}`);
  table += `| \`${fg}\` → \`${bg}\` | ${where} | ≥ ${min}:1 | ${fmt(l)}:1 | ${fmt(d)}:1 |\n`;
}
for (const [fg, bg, min, where] of EXTRA) {
  if (!colorByName.has(fg) || !colorByName.has(bg)) { err(`EXTRA: немає токена ${fg} або ${bg}`); continue; }
  const l = ratio(fg, bg, "light"), d = ratio(fg, bg, "dark");
  if (l < min || d < min) notes.push(`контраст нижче норми (${where}): ${fg} → ${bg} ${fmt(l)} / ${fmt(d)} < ${min}`);
}
let readme = read("README.md");
const tableRe = /\| Пара \(текст або мітка → тло\) \|[^\n]*\n(?:\|[^\n]*\n?)+/;
if (!tableRe.test(readme)) err("у README немає таблиці «Контраст»");
else if (write) {
  readme = readme.replace(tableRe, table);
  fs.writeFileSync(path.join(root, "README.md"), readme);
  notes.push("таблицю «Контраст» у README перезаписано");
} else if (readme.match(tableRe)[0].trim() !== table.trim()) err("таблиця «Контраст» у README не збігається з обчисленою з tokens.json (node check.mjs --write-contrast)");

// ------------------------------------------------------------------ прев'ю й README компонентів
const compDir = path.join(root, "components");
const comps = fs.readdirSync(compDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const declared = new Set([...names.keys(), "font-sans", "font-mono"]);
const FORBIDDEN = /<(iframe|frame|object|embed|portal|noscript)\b/i;
let previews = 0;
for (const c of comps) {
  const dir = path.join(compDir, c);
  const files = fs.readdirSync(dir);
  if (c === "Cover") {
    if (files.some((f) => f !== "preview.html")) err("Cover має бути «голою» текою: лише preview.html");
  } else {
    if (!files.includes("README.md")) err(`${c}: немає README.md`);
    else {
      const md = fs.readFileSync(path.join(dir, "README.md"), "utf8");
      if (!md.startsWith(`# ${c}`)) err(`${c}/README.md має починатися з «# ${c}»`);
      const summary = md.split("\n").slice(1).join("\n").trim().split("\n")[0];
      if (!summary || summary.startsWith("#") || summary.length < 20) err(`${c}/README.md: перший абзац після заголовка має бути резюме`);
      if (Buffer.byteLength(md) > 64 * 1024) err(`${c}/README.md > 64 KB`);
    }
  }
  if (!files.includes("preview.html")) { err(`${c}: немає preview.html`); continue; }
  previews++;
  const html = fs.readFileSync(path.join(dir, "preview.html"), "utf8");
  const marker = html.split("\n")[0];
  const h = /height=(\d+)/.exec(marker);
  if (!/^<!-- @dsCard\b.*-->$/.test(marker)) err(`${c}/preview.html: перший рядок не маркер @dsCard`);
  if (!h || +h[1] < 40 || +h[1] > 4000) err(`${c}/preview.html: height поза 40–4000`);
  if (c === "Cover" && (!h || +h[1] < 240 || +h[1] > 360)) err("Cover: height має бути 240–360");
  if (/group="[^"]*"/.test(marker) === (c === "Cover")) err(`${c}: ${c === "Cover" ? "Cover не має group" : "бракує group у маркері"}`);
  if (FORBIDDEN.test(html)) err(`${c}/preview.html: заборонений елемент`);
  if (/\{\{/.test(html)) err(`${c}/preview.html: нерозкрита заглушка`);
  if (Buffer.byteLength(html) > 256 * 1024) err(`${c}/preview.html > 256 KB`);
  if (/prefers-color-scheme/.test(html)) err(`${c}/preview.html: тема має йти від data-theme, не від prefers-color-scheme`);
  const local = new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1].slice(2)));
  for (const m of html.matchAll(/var\(--([\w-]+)/g)) {
    if (!declared.has(m[1]) && !local.has(m[1])) err(`${c}/preview.html: var(--${m[1]}) не оголошено ні в токенах, ні в самому прев'ю`);
  }
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const body = html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/&#\d+;/g, "");
  for (const [label, text] of [["CSS", css], ["розмітка", body]]) {
    const lit = text.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/g);
    if (lit) err(`${c}/preview.html (${label}): літеральний колір ${[...new Set(lit)].join(", ")}`);
  }
}

// ------------------------------------------------------------------ індекс і файли
const index = JSON.parse(read("design-system.json"));
if (index.v !== 3 || index.layout !== "files") err("design-system.json: очікував v 3, layout files");
if (!index.createdOnFiles?.at || !/^\d{4}-\d\d-\d\dT[\d:]+(\.\d+)?Z$/.test(index.createdOnFiles.at)) err("createdOnFiles.at не RFC 3339");
if (index.title !== "Property Workflows" || index.namespace !== "PropertyWorkflows") err("design-system.json: title/namespace");
if (!Array.isArray(index.libraries) || index.libraries.length) err("libraries має бути []");
if (!index.lastChange?.by || !index.lastChange?.at) err("lastChange без by/at");
const logos = index.assetGroups?.Logos;
if (!logos) err("немає assetGroups.Logos");
else {
  for (const f of logos.order) if (!fs.existsSync(path.join(root, "assets", "Logos", f))) err(`Logos.order: немає файлу ${f}`);
  for (const [k, rec] of Object.entries(logos.files)) {
    if (!/^[0-9a-f]{32}$/.test(rec.blob)) err(`Logos.files.${k}: blob не 32 hex`);
    const size = fs.statSync(path.join(root, "assets", "Logos", k)).size;
    if (rec.size !== size) err(`Logos.files.${k}: size ${rec.size} ≠ ${size} байтів`);
  }
}
for (const f of ["README.md", "motion.md", "screens.md"]) {
  const md = read(f);
  if (md.length > 200 * 1024) err(`${f} > 200 KB`);
}
const mdHeads = ["motion.md", "screens.md"].map((f) => /^# .+/m.test(read(f)));
if (mdHeads.includes(false)) err("motion.md і screens.md мають мати заголовок першого рівня (назва секції)");
const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } })(root);
const bad = all.filter((p) => /(^|[\\/])\.|node_modules|package\.json|tsconfig\.json|CLAUDE\.md|AGENTS\.md/.test(path.relative(root, p)));
if (bad.length) err(`заборонені назви файлів: ${bad.map((p) => path.relative(root, p)).join(", ")}`);
const total = all.reduce((s, p) => s + fs.statSync(p).size, 0);

const colorsN = tokens.color.tokens.length;
console.log(`токенів: ${names.size} (кольорів ${colorsN}); пар контрасту: ${PAIRS.length} + ${EXTRA.length}; прев'ю: ${previews}; файлів: ${all.length}; ${(total / 1024).toFixed(0)} KB`);
for (const n of notes) console.log("note:", n);
if (errors.length) {
  console.error(`\nПОМИЛКИ (${errors.length}):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log("OK: усі перевірки пройдено");
