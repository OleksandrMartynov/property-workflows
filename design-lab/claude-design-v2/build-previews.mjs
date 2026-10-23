// Збирає project/components/<Name>/preview.html з previews-src/<Name>.html.
//
//   node build-previews.mjs
//
// Джерело прев'ю = перший рядок-маркер `<!-- @dsCard … -->`, далі один чи кілька <style> (локальні стилі компонента)
// і розмітка. Збирач додає спільне: шрифти Inter (opsz, wght) і JetBrains Mono із Google Fonts, похідні токени (color-mix — формат tokens.json їх не
// читає, тож формули ті самі, що в src/app/globals.css), базу тіла, клас типографіки `.t-*`, іконки статусів і аватар.
// Кольори, радіуси, відступи, тіні й розміри в прев'ю — лише через var(--токен) із tokens.css, який готує сторінка.
// Cover.html копіюється як є (повний документ). Заглушки в розмітці:
//   {{si done}} · {{si overdue lg}}     іконка статусу (todo | progress | done | overdue | due-soon), lg = 16px
//   {{avatar ana@example.test}}          аватар за хешем адреси — той самий алгоритм, що в avatar.tsx
//   {{mark}} · {{mark16}} · {{mark20}}   знак Echo Roof (24 / 16 / 20 сітка), колір — currentColor
//   /* @include button */               у <style>: спільний фрагмент previews-src/_partials/button.css
//   {{ring 2 5}} · {{ring 3 3 lg}}      ProgressRing (done total), lg = 24px, як у картці «Details»
//   {{stack a@example.test,b@example.test [max]}}   AvatarStack: ініціали, що перекриваються, і «+N»
//   {{search}} · {{nav home|templates|runs}}   іконки 16px
//   {{g chev}} · {{g alert sm}}          глиф контролів форм 16px (chev | chev-l | chev-r | close | alert | search | check |
//                                         calendar | clock | plus | minus | arrow | upload | file | trash | error | eye | eye-off | caps | shield | user | spin);
//                                         sm = 12px, xs = 10px; той самий штрих 1.5, що в src/components/ui
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, "previews-src");
const OUT = path.join(root, "project", "components");

const PRELUDE = `
:root, [data-theme] {
  /* Похідні токени: color-mix у oklab, як у globals.css (у tokens.json їх немає) */
  --state-hover: color-mix(in oklab, var(--foreground) 5%, transparent);
  --state-pressed: color-mix(in oklab, var(--foreground) 8%, transparent);
  --state-selected: color-mix(in oklab, var(--primary) 10%, transparent);
  --primary-hover: color-mix(in oklab, var(--primary), var(--foreground) 10%);
  --primary-active: color-mix(in oklab, var(--primary), var(--foreground) 18%);
  --destructive-hover: color-mix(in oklab, var(--destructive), var(--foreground) 10%);
  /* Похідні токени контролів форм (globals.css, розділ «Контролі форм») */
  --accent-float: color-mix(in oklab, var(--popover), var(--foreground) 7%);
  --primary-tint: color-mix(in oklch, var(--primary) 12%, transparent);
  --primary-tint-strong: color-mix(in oklch, var(--primary) 22%, transparent);
  --match: color-mix(in oklch, var(--primary) 20%, transparent);
  --destructive-tint: color-mix(in oklch, var(--destructive) 10%, transparent);
  --done-tint: color-mix(in oklch, var(--status-done) 14%, transparent);
  --control-off: color-mix(in oklab, var(--muted), var(--foreground) 6%);
  --control-disabled-fill: color-mix(in oklab, var(--muted-foreground), var(--background) 62%);
  --glass-bg: color-mix(in oklch, var(--popover) var(--glass-alpha), transparent);
  /* Локальні для controls.css: межа поля на hover і пружина з легким перельотом (лише малі перемикачі) */
  --border-hover: color-mix(in oklab, var(--input), var(--foreground) 14%);
  --spring-bouncy: linear(0, 0.015 2%, 0.07 4.5%, 0.169 7.5%, 0.594 18%, 0.731 22%, 0.841 26%, 0.923 30%, 0.986 34.5%, 1.026 39.5%, 1.045 46%, 1.035 57.5%, 1.002 79.5%, 1);
  --spring-bouncy-duration: 360ms;
  --weight-body: 400;
}
[data-theme="dark"] { --weight-body: 420; }
*, *::before, *::after { box-sizing: border-box; border-color: var(--border); }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; padding: var(--space-4);
  background: var(--background); color: var(--foreground);
  font-family: var(--font-sans); font-size: 14px; line-height: 20px; letter-spacing: -0.006em;
  font-weight: var(--weight-body); font-optical-sizing: auto; font-synthesis: none; text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
h1, h2, h3, p { margin: 0; }
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
button, input, select, textarea { font: inherit; letter-spacing: inherit; color: inherit; margin: 0; }
button { cursor: default; background: none; border: 0; padding: 0; }
button:disabled { cursor: not-allowed; }
:focus { outline: none; }
:focus-visible { outline: var(--ring-width) solid var(--ring); outline-offset: var(--ring-offset); }
::placeholder { color: var(--muted-foreground); opacity: 1; }

/* Шкала тексту: display · title · heading · body · label · meta */
.t-display { font-size: 28px; line-height: 32px; letter-spacing: -0.03em; font-weight: 600; }
.t-title { font-size: 20px; line-height: 28px; letter-spacing: -0.016em; font-weight: 600; }
.t-heading { font-size: 15px; line-height: 20px; letter-spacing: -0.008em; font-weight: 600; }
.t-body { font-size: 14px; line-height: 20px; letter-spacing: -0.006em; }
.t-label { font-size: 13px; line-height: 18px; font-weight: 500; }
.t-meta { font-size: 12px; line-height: 16px; letter-spacing: 0.004em; }
.tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
.muted { color: var(--muted-foreground); }
.cap { font-size: 12px; line-height: 16px; letter-spacing: 0.004em; color: var(--muted-foreground); margin: 0 0 var(--space-2); }
.sec { display: flex; flex-direction: column; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.stack { display: flex; flex-direction: column; gap: var(--space-5); }

/* Іконки статусів (14px; lg — 16px, як в Alert) */
.si { width: 14px; height: 14px; flex-shrink: 0; }
.si.lg { width: 16px; height: 16px; margin-top: 2px; }
.si-todo { color: var(--status-todo-mark); }
.si-progress { color: var(--status-progress-mark); }
.si-done { color: var(--status-done-mark); }
.si-overdue { color: var(--status-overdue-mark); }
.si-due-soon { color: var(--status-due-soon-mark); }

/* Аватар: ініціал + тон за хешем адреси */
.avatar { display: inline-grid; width: 20px; height: 20px; flex-shrink: 0; place-items: center; border-radius: var(--radius-pill); font-size: 10px; line-height: 1; font-weight: 600; }
.avatar.tone-0 { background: var(--status-progress); color: var(--status-progress-foreground); }
.avatar.tone-1 { background: var(--status-done); color: var(--status-done-foreground); }
.avatar.tone-2 { background: var(--status-due-soon); color: var(--status-due-soon-foreground); }
.avatar.tone-3 { background: var(--ai); color: var(--ai-foreground); }
.avatar.tone-4 { background: var(--variable); color: var(--variable-foreground); }

.ring { width: 16px; height: 16px; flex-shrink: 0; }
.ring.lg { width: 24px; height: 24px; }
.avstack { display: inline-flex; align-items: center; }
.avatar.stacked { box-shadow: 0 0 0 2px var(--card); }
.avatar.overlap { margin-left: -6px; }
.avstack .more { margin-left: var(--space-1); font-size: 12px; line-height: 16px; letter-spacing: 0.004em; font-weight: 500; color: var(--muted-foreground); }

.g { width: 16px; height: 16px; flex: none; }
.g.sm { width: 12px; height: 12px; }
.g.xs { width: 10px; height: 10px; }
@keyframes ui-spin { to { transform: rotate(360deg); } }
.g-spin { animation: ui-spin 800ms linear infinite; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 1600ms !important; transition-duration: 1ms !important; } }
`.trim();

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=JetBrains+Mono:wght@100..800&display=swap">`;

// ---- заглушки ----
const SI = {
  done: `<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.8 8.2l2.2 2.2 4.2-4.6" style="stroke:var(--background)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  progress: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor"/>`,
  overdue: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.8v3.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11" r="1" fill="currentColor"/>`,
  "due-soon": `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.8"/><path d="M8 5v3.2l2 1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  todo: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.4 2.2"/>`,
};
const MARK = {
  "": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 22V12L12 3L21 12V22" stroke="currentColor" stroke-width="2"/><path d="M7 22V13.66L12 8.66L17 13.66V22" stroke="currentColor" stroke-width="2"/><path d="M10 22V14.9L12 12.9L14 14.9V22Z" fill="currentColor"/></svg>`,
  "16": `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 15V8L8 2L14 8V15" stroke="currentColor" stroke-width="2"/><path d="M5 15V9L8 6L11 9V15Z" fill="currentColor"/></svg>`,
  "20": `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 19V10L10 2L18 10V19" stroke="currentColor" stroke-width="2"/><path d="M6 19V11.66L10 7.66L14 11.66V19" stroke="currentColor" stroke-width="2"/><path d="M9 19V12.9L10 11.9L11 12.9V19Z" fill="currentColor"/></svg>`,
};
const NAV = {
  home: "M3 8.5 8 4l5 4.5V13H9.5v-3h-3v3H3z",
  templates: "M3.5 3h9v10h-9zM6 6h4M6 8.5h4M6 11h2",
  runs: "M3 4.5h10M3 8h10M3 11.5h6",
};
const SEARCH = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.2" stroke="currentColor" stroke-width="1.4"/><path d="m10.2 10.2 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

const G = {
  chev: '<path d="M3.5 6L8 10.5 12.5 6"/>',
  "chev-l": '<path d="m9.5 4-4 4 4 4"/>',
  "chev-r": '<path d="m6.5 4 4 4-4 4"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  alert: '<circle cx="8" cy="8" r="6" stroke-width="1.6"/><path d="M8 4.8v3.6" stroke-width="1.6"/><circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none"/>',
  search: '<circle cx="7" cy="7" r="4.25"/><path d="M10.25 10.25l3 3"/>',
  check: '<path d="M3.5 8.5l3 3 6-7" stroke-width="1.6"/>',
  calendar: '<rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.5 6.75h11M5.5 2v2.5M10.5 2v2.5"/>',
  clock: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.2"/>',
  plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  minus: '<path d="M3.5 8h9"/>',
  arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  upload: '<path d="M8 10.25V2.75M5 5.5l3-2.75 3 2.75M3 10.25v2a1 1 0 001 1h8a1 1 0 001-1v-2"/>',
  file: '<path d="M4 2.5h5.25l3.25 3.25V13a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z"/><path d="M9 2.75V6h3.25"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.25h5.8l.6-8.25M6.75 7v3.5M9.25 7v3.5"/>',
  error: '<circle cx="8" cy="8" r="5.75"/><path d="M8 5v3.5M8 10.75v.01"/>',
  shield: '<path d="M8 2.2 13 4v3.6c0 3-2 5-5 6.2-3-1.2-5-3.2-5-6.2V4z"/><path d="m5.9 8.1 1.5 1.5 2.8-3"/>',
  user: '<circle cx="8" cy="5.6" r="2.4"/><path d="M3.2 13.2c.4-2.3 2.3-3.7 4.8-3.7s4.4 1.4 4.8 3.7"/>',
  eye: '<path d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.9"/>',
  "eye-off": '<path d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.9" transform="translate(8 8) scale(.75) translate(-8 -8)"/><path d="M3 13 13 3"/>',
  caps: '<path d="M8 2.5l4.5 5H10v3H6v-3H3.5z"/><path d="M6 13.25h4"/>',
  spin: '<circle cx="8" cy="8" r="5.5" stroke-opacity="0.25"/><path d="M8 2.5a5.5 5.5 0 015.5 5.5"/>',
};

function avatarTone(email) {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 5;
}

function ring(done, total, lg) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const complete = total > 0 && done >= total;
  const cls = `ring${lg ? " lg" : ""}`;
  if (complete) {
    return `<svg class="${cls}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" style="fill:var(--status-done-mark)"/><path d="M4.8 8.2l2.2 2.2 4.2-4.6" style="stroke:var(--background)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg class="${cls}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" style="stroke:color-mix(in oklab, var(--border-strong) 45%, transparent)" stroke-width="2"/><circle cx="8" cy="8" r="6" pathLength="1" stroke-width="2" stroke-linecap="round" style="stroke:var(--primary);transform:rotate(-90deg);transform-origin:center;transform-box:fill-box;stroke-dasharray:${ratio} 1;opacity:${ratio > 0 ? 1 : 0}"/></svg>`;
}

function stack(emails, max = 3) {
  if (!emails.length) return `<span class="muted">—</span>`;
  const shown = emails.slice(0, max), rest = emails.length - shown.length;
  const av = shown.map((e, i) => `<span class="avatar tone-${avatarTone(e)} stacked${i > 0 ? " overlap" : ""}" aria-hidden="true">${(e.trim()[0] ?? "?").toUpperCase()}</span>`).join("");
  return `<span class="avstack" title="${emails.join(", ")}">${av}${rest > 0 ? `<span class="tabular more">+${rest}</span>` : ""}</span>`;
}

function expand(html) {
  return html
    .replace(/\{\{si ([\w-]+)(?: (lg))?\}\}/g, (_, name, lg) => {
      if (!SI[name]) throw new Error(`невідомий статус {{si ${name}}}`);
      return `<svg class="si si-${name}${lg ? " lg" : ""}" viewBox="0 0 16 16" fill="none" aria-hidden="true">${SI[name]}</svg>`;
    })
    .replace(/\{\{avatar ([^}\s]+)\}\}/g, (_, email) => `<span class="avatar tone-${avatarTone(email)}" aria-hidden="true">${(email.trim()[0] ?? "?").toUpperCase()}</span>`)
    .replace(/\{\{mark(16|20)?(?: ([^}]*))?\}\}/g, (_, size = "", cls = "") => MARK[size].replace("<svg ", `<svg class="mark${cls ? " " + cls : ""}" `))
    .replace(/\{\{ring (\d+) (\d+)(?: (lg))?\}\}/g, (_, d, t, lg) => ring(+d, +t, lg))
    .replace(/\{\{stack ([^}\s]*)(?: (\d+))?\}\}/g, (_, list, max) => stack(list.split(",").filter(Boolean), max ? +max : 3))
    .replace(/\{\{g ([\w-]+)(?: (sm|xs))?\}\}/g, (_, name, size) => {
      if (!G[name]) throw new Error("невідомий глиф {{g " + name + "}}");
      return '<svg class="g g-' + name + (size ? " " + size : "") + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + G[name] + "</svg>";
    })
    .replace(/\{\{search\}\}/g, () => SEARCH)
    .replace(/\{\{nav (home|templates|runs)\}\}/g, (_, n) => `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="${NAV[n]}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

const include = (css) =>
  css.replace(/\/\* @include ([\w-]+) \*\//g, (_, n) => fs.readFileSync(path.join(SRC, "_partials", `${n}.css`), "utf8").trim());
const FORBIDDEN = /<(iframe|frame|object|embed|portal|noscript)\b/i;
let built = 0;
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".html")).sort()) {
  const name = file.replace(/\.html$/, "");
  const source = fs.readFileSync(path.join(SRC, file), "utf8").replace(/\r\n/g, "\n");
  const outDir = path.join(OUT, name);
  fs.mkdirSync(outDir, { recursive: true });
  let out;
  if (name === "Cover") {
    out = source;
  } else {
    const lines = source.split("\n");
    const marker = lines.shift();
    if (!/^<!-- @dsCard\b.*-->$/.test(marker)) throw new Error(`${file}: перший рядок має бути маркером @dsCard`);
    const rest = lines.join("\n");
    const styles = [...rest.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => include(m[1].trim())).join("\n\n");
    const body = expand(rest.replace(/<style>[\s\S]*?<\/style>/g, "").trim());
    if (/\{\{/.test(body)) throw new Error(`${file}: нерозкрита заглушка`);
    out = `${marker}
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — preview</title>
${FONTS}
<style>
${PRELUDE}
</style>
<style>
${styles}
</style>
</head>
<body>
${body}
</body>
</html>
`;
  }
  if (FORBIDDEN.test(out)) throw new Error(`${file}: заборонений елемент`);
  if (Buffer.byteLength(out) > 256 * 1024) throw new Error(`${file}: більше 256 KB`);
  fs.writeFileSync(path.join(outDir, "preview.html"), out);
  built++;
}
console.log(`зібрано прев'ю: ${built}`);
