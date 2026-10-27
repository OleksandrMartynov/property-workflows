// Спільне для перевірки контрасту (scripts/check-contrast.mjs) і тестів теми (tests/design/theme.test.ts):
// розбір токенів світлої й темної теми з src/app/globals.css, OKLCH → sRGB, відношення яскравості WCAG 2.x.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Тіло блоку, що починається на позиції `open` ('{'), і позиція його кінця. */
export function body(text, open) {
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

const DARK_MEDIA = /^@media\s*\(prefers-color-scheme:\s*dark\)$/;
const DARK_MEDIA_ROOT = /:root:not\(\[data-theme="light"\]\)\s*\{/;
const DARK_EXPLICIT = /^:root\[data-theme="dark"\]$/;

/**
 * Лише верхній рівень: усі `:root { … }` — світла тема (разом із токенами сцени). Темна тема записана двічі з однаковим
 * тілом: `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` («System» на темному пристрої)
 * і `:root[data-theme="dark"] { … }` («Dark»). Повертає обидві копії, щоб перевірити, що вони не розійшлися.
 * Інші @media (p3, prefers-contrast, forced-colors) навмисно пропускаємо: це опційні надбудови над базовою парою.
 */
export function parseThemes(source) {
  // Коментарі прибираємо одразу: у них трапляються дужки.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const light = {};
  const darkMedia = {};
  const darkExplicit = {};
  let pos = 0;
  while (pos < css.length) {
    const open = css.indexOf("{", pos);
    if (open < 0) break;
    // Умова правила — текст після останнього `;` (так відсікаються `@import …;`).
    const prelude = css.slice(pos, open).split(";").pop().trim();
    const block = body(css, open);
    if (prelude === ":root") Object.assign(light, declarations(block.text));
    else if (DARK_EXPLICIT.test(prelude)) Object.assign(darkExplicit, declarations(block.text));
    else if (DARK_MEDIA.test(prelude)) {
      const inner = block.text.match(DARK_MEDIA_ROOT);
      if (inner) Object.assign(darkMedia, declarations(body(block.text, inner.index + inner[0].length - 1).text));
    }
    pos = block.end + 1;
  }
  return { light, darkMedia, darkExplicit };
}

/** Теми для перевірки: темна — поверх світлої (токени, що однакові в обох темах, у темному блоці не повторюються). */
export function loadThemes(root = process.cwd()) {
  const parsed = parseThemes(readFileSync(join(root, "src", "app", "globals.css"), "utf8"));
  return { ...parsed, themes: { light: parsed.light, dark: { ...parsed.light, ...parsed.darkExplicit } } };
}

export const toRGB = ([L, C, H]) => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((x) => Math.min(1, Math.max(0, x)));
};
// toRGB віддає лінійний sRGB; яскравість рахуємо з нього напряму.
export const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const ratio = (a, b) => {
  const [x, y] = [luminance(toRGB(a)), luminance(toRGB(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
