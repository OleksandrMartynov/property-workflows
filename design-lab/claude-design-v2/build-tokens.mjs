// Генератор project/tokens.json для артифакту Claude Design (тип «Design System») з src/app/globals.css.
//
//   node build-tokens.mjs [шлях/до/globals.css] [шлях/до/tokens.json]
//
// За замовчуванням: ../../src/app/globals.css → ./project/tokens.json.
// Правила джерела:
//   · світла тема = усі :root верхнього рівня (поза @media/@supports), темна = @media (prefers-color-scheme: dark) { :root };
//   · колір = значення, що починається з oklch(…); var(--x) на інший колір → аліас "{x}"; color-mix(), calc() — пропускаємо
//     (їх формат не читає; похідні стани описані в README й додаються в preview.html);
//   · елевація (--elevation-N) → family shadow з обома темами;
//   · розміри, рух, радіуси, шкала тексту читаються з тих самих блоків globals.css;
//   · кожен токен мусить мати usage у словнику нижче: новий токен у globals.css без опису зупиняє генератор;
//   · токени контролів форм (--size-check … --scale-thumb) лежать у другому :root globals.css і читаються так само;
//     похідні кольори контролів (--accent-float, --primary-tint…, --match, --*-tint, --control-off,
//     --control-disabled-fill) — color-mix(), тож у tokens.json їх немає: формули в README й у PRELUDE build-previews.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => new URL(p, import.meta.url);
const SRC = process.argv[2] ?? here("../../src/app/globals.css");
const OUT = process.argv[3] ?? here("./project/tokens.json");
const css = fs.readFileSync(SRC, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// ---------------------------------------------------------------- розбір CSS
/** Правила верхнього рівня: [{ prelude, body }] (at-рядки без тіла, як @import, пропускаються). */
function topLevel(text) {
  const rules = [];
  let depth = 0, start = 0, bodyStart = -1, prelude = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) { prelude = text.slice(start, i).trim(); bodyStart = i + 1; }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) { rules.push({ prelude, body: text.slice(bodyStart, i) }); start = i + 1; }
    } else if (ch === ";" && depth === 0) {
      start = i + 1;
    }
  }
  return rules;
}
const decls = (body) => {
  const out = {};
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  return out;
};

const rules = topLevel(css);
const rootsOf = (list) => list.filter((r) => /^:root$/.test(r.prelude)).map((r) => decls(r.body));
const light = Object.assign({}, ...rootsOf(rules));
const darkMedia = rules.find((r) => /^@media\s*\(prefers-color-scheme:\s*dark\)$/.test(r.prelude));
if (!darkMedia) throw new Error("не знайдено @media (prefers-color-scheme: dark)");
const dark = Object.assign({}, ...rootsOf(topLevel(darkMedia.body)));
const themeInline = decls(rules.find((r) => r.prelude === "@theme inline")?.body ?? "");
const themeText = decls(rules.find((r) => r.prelude === "@theme")?.body ?? "");

const isColor = (v) => /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.]+%?)?\s*\)$/.test(v ?? "");

// ---------------------------------------------------------------- usage (кольори)
const U = {
  background: "Полотно сторінки. Поверх нього лежать `card` і `popover`; на ньому читаються `foreground`, `muted-foreground`, `primary` (як текст і іконка) і `destructive`.",
  foreground: "Основний текст і іконки на `background`, `card`, `popover`, `muted`; колір контурної й ghost-кнопки. База станів: `hover` і `pressed` — 5% і 8% `foreground` поверх будь-якого тла.",
  card: "Картки, таблиці, панелі: на крок вище за `background`. Текст — `card-foreground`, допоміжний — `muted-foreground`.",
  "card-foreground": "Текст на `card`.",
  popover: "Найвищий шар: діалоги, меню, палітра ⌘K. Текст — `popover-foreground`.",
  "popover-foreground": "Текст на `popover`.",
  primary: "Основна дія й фокус (indigo): заливка основної кнопки, посилання, заповнення смужки прогресу. Як текст чи іконка — на `background` і `card` (≥ 4.5:1). Одна primary-дія на екран.",
  "primary-foreground": "Текст і іконки на заливці `primary`. У dark — темний текст на світлій заливці: це задумано, не інверсія.",
  secondary: "Заливка вторинної кнопки й нейтрального Badge. Текст — `secondary-foreground`.",
  "secondary-foreground": "Текст на `secondary`.",
  muted: "Тихі заливки: трек ProgressBar, disabled-поле, шапка таблиці (50%), нижня панель діалогу (40%), skeleton. Текст на ній — `muted-foreground`.",
  "muted-foreground": "Допоміжний текст, підписи, placeholder, `meta` — на `background`, `card` і `muted` (≥ 4.5:1).",
  accent: "Hover вторинної кнопки й поточний пункт верхньої навігації на вузькому екрані. Текст — `accent-foreground`.",
  "accent-foreground": "Текст на `accent`.",
  destructive: "Деструктивна дія (заливка кнопки), межа й текст помилки поля. На `background` і `card` ≥ 4.5:1. Лише з підтвердженням.",
  "destructive-foreground": "Текст і іконки на заливці `destructive`.",
  border: "Декоративна hairline-межа: картки, таблиці, розділювачі. Сама нічого не означає (контраст нижче 3:1): межа контролу — це `input` або `border-strong`.",
  "border-strong": "Межа, що визначає контрол або стан (чекбокс, радіо, трек перемикача), hover картки-посилання, пунктир порожнього стану (50%). ≥ 3:1 до `background`.",
  input: "Межа текстового поля, select і PasswordInput. ≥ 3:1 до `background` і `card` в обох темах.",
  field: "Заливка текстового поля, select і PasswordInput.",
  ring: "Кільце фокусу: суцільний outline `ring-width` з відступом `ring-offset`; ≥ 3:1 на `background`, `card`, `sidebar`.",
  sidebar: "Фон сайдбару: на крок тихіший за полотно. Текст — `sidebar-foreground`.",
  "sidebar-foreground": "Текст навігації й блоку користувача на `sidebar` (≥ 4.5:1).",
  "sidebar-primary": "Акцент у сайдбарі (шаблон shadcn): зарезервовано, у застосунку поки не використовується.",
  "sidebar-primary-foreground": "Текст на `sidebar-primary` (зарезервовано).",
  "sidebar-accent": "Поточний пункт навігації (`aria-current=page`) на `sidebar`.",
  "sidebar-accent-foreground": "Текст поточного пункту на `sidebar-accent`.",
  "sidebar-border": "Права межа сайдбару, розділювач блоку користувача, межа поля пошуку.",
  "sidebar-ring": "Кільце фокусу в сайдбарі (зарезервовано; зараз діє `ring`).",
  overlay: "Підкладка під модальним вікном; разом із blur 4px. Колір з альфою.",
  skeleton: "Основа skeleton-заглушок: аліас `muted`.",
};
for (let i = 1; i <= 5; i++) U[`chart-${i}`] = `Графіки (шаблон shadcn), серія ${i}; у застосунку графіків поки немає.`;

const STATUS = {
  todo: ["To do", "Тло бейджа «To do» і тихих станів."],
  progress: ["In progress", "Тло бейджа «In progress», інформаційного Alert і Badge `primary`."],
  done: ["Done / Completed", "Тло бейджа «Done» / «Completed» і Alert успіху."],
  overdue: ["Overdue", "Тло бейджа «Overdue» і Alert помилки."],
  "due-soon": ["Due soon", "Тло бейджа «Due soon»."],
};
for (const [k, [label, tint]] of Object.entries(STATUS)) {
  U[`status-${k}`] = `${tint} Текст на ньому — \`status-${k}-foreground\`.`;
  U[`status-${k}-foreground`] = `Текст статусу «${label}» на \`status-${k}\` (≥ 4.5:1).`;
  U[`status-${k}-mark`] = `Мітка статусу «${label}»: крапка й іконка (форма іконки різна для кожного статусу)${k === "done" ? "; заповнення ProgressBar завершеного запуску" : ""}. ≥ 3:1 до \`background\`. Не для тексту.`;
}
U.ai = "Тло AI-чернеток і Badge `ai`. Пурпурний — лише для AI, ніколи замість `primary`. Текст — `ai-foreground`.";
U["ai-foreground"] = "Текст AI-чернетки на `ai` (≥ 4.5:1).";
U["ai-mark"] = "Мітка AI: ✦, рамка чернетки. ≥ 3:1 до `background`. Не для тексту.";
U.variable = "Тло чипа змінної запуску `{{…}}` і Badge `variable`. Бірюзовий — лише для змінних. Текст — `variable-foreground`.";
U["variable-foreground"] = "Текст чипа змінної на `variable` (≥ 4.5:1).";
U["variable-mark"] = "Мітка змінної: крапка, рамка чипа. ≥ 3:1 до `background`. Не для тексту.";

U.stage = "Тло hero сторінки входу. Світла тема — світла «перламутрова» сцена, темна — темна кінематографічна; це вітрина, а не тло роботи.";
U["stage-foreground"] = "Заголовок і основний текст на `stage` (≥ 4.5:1): темний у світлій темі, світлий у темній.";
U["stage-muted"] = "Допоміжний текст на `stage`.";
U["stage-card"] = "Скляна картка на `stage`; напівпрозорий колір (альфа 0.62 у світлій темі, 0.55 у темній).";
U["stage-border"] = "Тонка межа картки й дрібних елементів на `stage`; альфа 0.14 (темно-індигова у світлій темі, біла в темній).";
U["stage-accent"] = "Акцент на `stage`: галочки, прогрес, виділення, акцентне слово hero (≥ 4.5:1).";
U["stage-glow-1"] = "Світіння шейдера hero, шар 1 (indigo).";
U["stage-glow-2"] = "Світіння шейдера hero, шар 2 (magenta).";
U["stage-glow-3"] = "Світіння шейдера hero, шар 3 (teal).";

// ---------------------------------------------------------------- кольори
const colors = [];
const problems = [];
for (const [name, value] of Object.entries(light)) {
  if (isColor(value)) {
    const d = dark[name];
    if (d !== undefined && !isColor(d)) problems.push(`${name}: темне значення не oklch: ${d}`);
    const val = d !== undefined && d !== value ? { light: value, dark: d } : value;
    if (!U[name]) problems.push(`немає usage для кольору --${name}`);
    colors.push({ name, value: val, usage: U[name] ?? "" });
  } else if (/^var\(--([\w-]+)\)$/.test(value)) {
    const target = value.match(/^var\(--([\w-]+)\)$/)[1];
    if (isColor(light[target])) {
      if (!U[name]) problems.push(`немає usage для аліасу --${name}`);
      colors.push({ name, value: `{${target}}`, usage: U[name] ?? "" });
    }
  }
}

// «сцена» hero і похідний аліас — наприкінці, щоб основні поверхні йшли першими
const rank = (n) => (n.startsWith("stage") ? 2 : n === "skeleton" ? 3 : 1);
colors.sort((a, b) => rank(a.name) - rank(b.name));

// ---------------------------------------------------------------- шадоу
const shadowUse = {
  "elevation-1": "Тінь у стані спокою для того, що лежить на сторінці: картка, таблиця, основна кнопка (`shadow-sm` у Tailwind). У dark — густіша, без верхнього відблиску.",
  "elevation-2": "Тінь для того, що підіймається: hover картки-посилання, поповер, меню (`shadow-md`). У dark додається верхній відблиск 1px.",
  "elevation-3": "Тінь для того, що плаває над усім: діалог, палітра ⌘K, скляна картка (`shadow-lg`). У dark — з верхнім відблиском.",
};
const shadows = Object.keys(shadowUse).map((name) => {
  if (!light[name] || !dark[name]) problems.push(`немає світлого чи темного --${name}`);
  return { name, value: { light: light[name], dark: dark[name] }, usage: shadowUse[name] };
});

// ---------------------------------------------------------------- типографіка
const px = (rem) => {
  const m = /^([\d.]+)rem$/.exec(rem ?? "");
  if (!m) throw new Error(`очікував rem: ${rem}`);
  return `${+(parseFloat(m[1]) * 16).toFixed(2)}px`;
};
const samples = { display: "Sign in", title: "Runs", heading: "Apartment 12, move-in", body: "Inspect the apartment", label: "Mark as done", meta: "2 of 5 done · Due 24 Oct" };
const typeUse = {
  display: "Великі числа-лічильники на головній (28/32, без засічок). Заголовок «Sign in» — не цей крок: це Inter 32/36, 600, трекінг −0.03em, лише на екрані входу.",
  title: "Заголовок сторінки (`h1`) і діалогу.",
  heading: "Заголовок картки й секції, назва порожнього стану, назва продукту в лого.",
  body: "Основний текст: рядки таблиць, поля, абзаци, Alert. Вага `--weight-body`: 400 у світлій темі, 420 у темній.",
  label: "Підписи полів, кнопки, пункти навігації, числа прогресу («2 of 5 done»). Вага 500.",
  meta: "Заголовки колонок, бейджі, підказки й помилки під полем, дати, лічильники.",
};
const weights = { display: 600, title: 600, heading: 600, body: 400, label: 500, meta: 400 };
const styles = Object.keys(typeUse).map((n) => {
  const size = themeText[`text-${n}`], lh = themeText[`text-${n}--line-height`];
  if (!size || !lh) problems.push(`немає text-${n} у @theme`);
  const ls = themeText[`text-${n}--letter-spacing`];
  const fw = themeText[`text-${n}--font-weight`];
  return {
    name: n, fontSize: px(size), lineHeight: px(lh), fontWeight: fw ? +fw : weights[n],
    ...(ls ? { letterSpacing: ls } : {}), sample: samples[n], usage: typeUse[n],
  };
});
const family = (key, face) => {
  const raw = themeInline[`font-${key}`];
  if (!raw) throw new Error(`немає --font-${key} у @theme inline`);
  return raw.replace(/^var\([^)]*\)/, `"${face}"`);
};
const type = {
  fonts: [],
  families: { sans: family("sans", "Inter"), mono: family("mono", "JetBrains Mono") },
  groups: [
    {
      name: "Interface",
      family: "sans",
      note: "Inter зі змінною віссю optical size (Google Fonts, hosted: файлів немає). Шість кроків, щільність рівня Linear. Усі числа — з `tabular-nums`.",
      styles,
    },
  ],
};

// ---------------------------------------------------------------- розміри, радіуси, відступи
const need = (map, name) => {
  if (map[name] === undefined) { problems.push(`немає --${name}`); return "0"; }
  return map[name];
};
const sizeUse = {
  "size-control": "Висота поля й кнопки за замовчуванням (`md`).",
  "size-control-sm": "Висота малої кнопки (`sm`) і дрібних дій у сайдбарі.",
  "size-control-lg": "Висота великої кнопки й поля (`lg`): форма входу, порожні стани.",
  "size-header": "Висота верхньої смуги на вузькому екрані; відступ скролу під липкою шапкою.",
  "size-sidebar": "Ширина сайдбару на широкому екрані.",
  "size-sidebar-rail": "Ширина згорнутого сайдбару-рейки (3.5rem = 56px): лише іконки; зміна ширини — на `spring-smooth`.",
  "size-check": "Коробка чекбокса й радіо (1rem); та сама сторона в рядку мультивибору.",
  "size-switch-w": "Ширина треку перемикача Switch (2rem).",
  "size-switch-h": "Висота треку Switch (1.25rem); кулька = висота − 6px.",
  "size-thumb": "Діаметр бігунка Slider (1rem); поле натискання ширше за рейку на радіус бігунка.",
  "size-track": "Товщина рейки Slider (0.25rem).",
  "size-day": "Клітинка дня в календарі (2rem), сітка 7 × 2rem = 14rem на місяць.",
  "size-listbox-max": "Максимальна висота списку Select / Combobox / MultiSelect (16.5rem); далі прокрутка.",
  "size-option": "Висота рядка списку (2rem).",
  "size-option-rich": "Висота рядка з описом або аватаром і двома рядками тексту (2.75rem).",
  "size-chip": "Висота фішки MultiSelect (1.375rem).",
  "size-popover-cal": "Ширина поповера календаря (17rem): 14rem сітки + паддинги.",
  "size-hit": "Мінімальна ціль вказівника в полі: кнопка-іконка, значок, шеврон (1.5rem = 24px, WCAG 2.5.8).",
};
const size = { note: "Щільність. Рядок таблиці — 44px, шапка колонок — 32px, іконка — 16px (14px у малих контролах). Розміри контролів форм — у rem: масштабуються з шрифтом.", tokens: Object.entries(sizeUse).map(([name, usage]) => ({ name, value: need(light, name), usage })) };

const radiusSm = need(light, "radius");
const radiusUse = [
  ["radius-xs", themeInline["radius-xs"], "Бейдж, kbd, невеликі контроли (кнопка-посилання, «Show»)."],
  ["radius-sm", radiusSm, "Кнопки й поля (`--radius`). База всієї шкали."],
  ["radius-md", themeInline["radius-md"], "Картки, таблиці, Alert, порожній стан."],
  ["radius-lg", themeInline["radius-lg"], "Великі плитки й скляні картки."],
  ["radius-xl", themeInline["radius-xl"], "Діалоги й палітра ⌘K."],
  ["radius-pill", "999px", "Статус-бейдж, аватар, смужка прогресу."],
];
for (const [n, v] of radiusUse) if (!v) problems.push(`немає ${n}`);
const radius = { note: "Радіус за роллю, а не «rounded-lg скрізь».", tokens: radiusUse.map(([name, value, usage]) => ({ name, value, usage })) };

const spaceRows = [
  ["space-0-5", "2px", "Лише оптика: проміжок між пунктами навігації."],
  ["space-1", "4px", "Щільні групи: заголовок і опис картки."],
  ["space-1-5", "6px", "Проміжок іконка ↔ текст у контролі, підпис ↔ поле. Лише всередині компонентів."],
  ["space-2", "8px", "Паддинг малого контролу, проміжок між кнопками."],
  ["space-2-5", "10px", "Паддинг Alert і малої кнопки по горизонталі. Лише всередині компонентів."],
  ["space-3", "12px", "Паддинг контролу, футер картки."],
  ["space-4", "16px", "Паддинг картки й клітинки таблиці, проміжок між полями форми."],
  ["space-5", "20px", "Паддинг діалогу."],
  ["space-6", "24px", "Проміжок між блоками сторінки, паддинг порожнього стану."],
  ["space-8", "32px", "Горизонтальний паддинг сторінки на широкому екрані."],
  ["space-10", "40px", "Великі розриви."],
  ["space-12", "48px", "Вертикальний паддинг порожнього стану."],
  ["space-16", "64px", "Сторінка входу, hero."],
];
const spacing = { note: "Сітка 4px (шкала відступів Tailwind). Півкроки — лише всередині компонентів.", tokens: spaceRows.map(([name, value, usage]) => ({ name, value, usage })) };

// ---------------------------------------------------------------- рух і ефекти
const durationUse = {
  "duration-instant": "Тінт, колір, прозорість дрібних елементів.",
  "duration-fast": "Hover і press, стандартний перехід кольору (`transition-ui`).",
  "duration-base": "Поява Alert і підказок, галочка статусу.",
  "duration-moderate": "Діалоги: поява підкладки й вікна.",
  "duration-slow": "Заповнення ProgressBar.",
  "duration-celebrate": "Завершення запуску; максимум для будь-якого руху.",
  "spring-snappy-duration": "Час заспокоєння `spring-snappy` (відчутно ≈ 150ms).",
  "spring-smooth-duration": "Час заспокоєння `spring-smooth` (відчутно ≈ 200ms).",
  "shimmer-duration": "Відблиск skeleton (петля).",
};
const duration = { note: "Інтерфейс 90–240ms; завершення запуску ≤ 400ms; вихід = вхід × `exit-factor`.", tokens: Object.entries(durationUse).map(([name, usage]) => ({ name, value: need(light, name), usage })) };

const easingUse = {
  "ease-standard": "Ease-out за замовчуванням для кольору, межі, тіні.",
  "ease-emphasized": "Великі поверхні, що входять.",
  "ease-exit": "Вихід: прискорення, ніколи не пружина.",
  "ease-in-out-soft": "Заповнення смужки, морфи, cross-fade.",
  "spring-snappy": "Пружина (ζ ≈ 0.82, ~1% перельоту): press, поповери, меню. Лише `transform`.",
  "spring-smooth": "Пружина (ζ ≈ 1.0, без перельоту): поява діалогу, прогрес. Лише `transform`.",
};
const easing = {
  note: "Нічого лінійного, крім безперервних петель. `opacity` і колір ніколи не на пружині з перельотом. Fallback пружин — `cubic-bezier` (`@supports not linear()`).",
  tokens: Object.entries(easingUse).map(([name, usage]) => ({ name, value: themeInline[name] ?? light[name] ?? (problems.push(`немає --${name}`), "0"), usage })),
};

const effectsUse = {
  "ring-width": "Товщина кільця фокусу (3px при `prefers-contrast: more`).",
  "ring-offset": "Відступ кільця фокусу від елемента.",
  "distance-1": "Зсув появи: підйом hover (обнуляється при reduced motion).",
  "distance-2": "Зсув появи поповера й меню.",
  "distance-3": "Зсув появи діалогу.",
  "scale-enter": "Діалоги й поповери ростуть від цього масштабу.",
  "scale-press": "Масштаб `:active` кнопки.",
  "exit-factor": "Множник тривалості виходу відносно входу.",
  "distance-slide": "Зсув панелі місяця в календарі при перегортанні (24px; 0 при reduced motion).",
  "scale-thumb": "Масштаб бігунка Slider під час перетягування (1.12; 1 при reduced motion).",
  "glass-alpha": "Непрозорість скляного шару (100% при `prefers-reduced-transparency`).",
  "glass-blur": "Розмиття під скляним шаром (0 при reduced transparency).",
};
const effects = { note: "Ефекти, що поважають налаштування користувача: reduced motion, reduced transparency, підвищений контраст.", tokens: Object.entries(effectsUse).map(([name, usage]) => ({ name, value: need(light, name), usage })) };

// ---------------------------------------------------------------- збірка й перевірки
const tokens = {
  name: "Property Workflows",
  version: 1,
  color: { themes: [{ id: "light", name: "Light" }, { id: "dark", name: "Dark" }], tokens: colors },
  type,
  spacing,
  radius,
  shadow: { note: "Три висоти. Усередині сторінки глибина — hairline `border` плюс крок тону; тінь лише для того, що лежить, підіймається чи плаває.", tokens: shadows },
  size,
  duration,
  easing,
  effects,
};

const all = [
  ...colors, ...shadows,
  ...["spacing", "radius", "size", "duration", "easing", "effects"].flatMap((f) => tokens[f].tokens),
];
const seen = new Set();
for (const t of all) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(t.name)) problems.push(`ім'я поза граматикою: ${t.name}`);
  if (seen.has(t.name)) problems.push(`дубль імені: ${t.name}`);
  seen.add(t.name);
  if (!t.usage) problems.push(`порожній usage: ${t.name}`);
  const vals = typeof t.value === "object" ? Object.values(t.value) : [t.value];
  for (const v of vals) {
    if (v === undefined || v === "") problems.push(`порожнє значення: ${t.name}`);
    if (/var\(|color-mix\(|calc\(/.test(String(v))) problems.push(`заборонена функція в ${t.name}: ${v}`);
  }
}
for (const fam of ["spacing", "radius", "size", "duration", "easing", "effects", "shadow"]) {
  if (tokens[fam].tokens.length > 60) problems.push(`у ${fam} більше 60 токенів`);
}
if (problems.length) {
  console.error("Помилки генерації:\n- " + problems.join("\n- "));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(tokens, null, 2) + "\n");
console.log(`кольорів ${colors.length}, шадоу ${shadows.length}, усього токенів ${all.length}, типографіка ${styles.length} стилів → ${OUT instanceof URL ? fileURLToPath(OUT) : OUT}`);
