# Systems benchmark: підсумок (23.10.2026)

Повна версія — `systems.html` (топ-10 практик, матриця, gap analysis, домен, анти-патерни, структура DESIGN.md, джерела).
Перевірено 16 систем та інструментів: Linear, Vercel Geist, Stripe, Attio, Raycast, Atlassian, GitHub Primer, IBM Carbon,
Shopify Polaris, Material 3 Expressive, Fluent 2, Apple HIG/Liquid Glass, Radix, Process Street, Tallyfy, n8n.
Notion, Plain, Height виключено: перевірюваної публічної документації не знайшов. Сторінки входу Stripe, Raycast, Clerk,
WorkOS не зняті (JS/автентифікація) — їхні патерни не цитуються.

## П'ять головних висновків

1. **Стани як альфа-шар** (Radix `a1–a12`, Geist `gray-alpha`, Atlassian прозорий `color.background.neutral`).
   У нас ≈ 40 різних ad-hoc `color-mix` (foreground у 9/10/12/14/16 %). Потрібні токени `--state-hover/pressed/selected`.
2. **Контраст має бути у структурі**, а не в перевірці постфактум (Stripe: ≥ 5 рівнів L = малий текст; Radix: Lc 60/90;
   Linear: змінна `contrast` → автоматична high-contrast тема). Наш аудит знайшов реальні дефекти (нижче).
3. **Рух ділиться на productive і expressive** (Carbon 70/110/150 vs 240–700 мс) і **spatial vs effects** (M3: effects ζ=1,
   «alpha не відскакує вище 100 %»). Наші тривалості вже в межах, бракує класифікації й правила.
4. **Тихий chrome** (Linear 2026: «Don't compete for attention you haven't earned», «Structure should be felt not seen»,
   менше роздільників; Geist: «draw each border once»). Ми вже тепліші й тихіші — бракує правила й лінта.
5. **Машинозчитувані токени й нативні примітиви**: Carbon публікує DTCG JSON з `$description`; у нас dark-блок
   продубльовано дослівно (70 рядків ×2). Baseline 2026: anchor positioning, `contrast-color()`; Baseline 2024:
   `light-dark()`, Popover API.

## Must (7)

| ID | Зміна | Значення / вимір |
|---|---|---|
| G1 | `--border-strong` падає < 3:1 на hover/pressed/selected | light `0.62 0.01 80` → `0.60 0.01 80` (min 3.14); dark `0.52 0.008 80` → `0.54 0.008 80` (min 3.12). Було 2.86–2.99 |
| G2 | Межа поля вводу 1.44 / 1.38 | новий `--field-border: var(--border-strong)` (3.85 / 3.73) для text input / select / textarea |
| G3 | State-layer токени | `--state-hover` fg 5 %, `--state-pressed` fg 8 %, `--state-selected` primary 10 %; 14 % лише поза сайдбаром (на сайдбарі 4.42 < 4.5) |
| G4 | Рух: `--motion-productive/expressive/effects` | opacity/колір ніколи на пружині з перельотом; spring лише transform/розмір |
| G5 | `@media (prefers-contrast: more)` | light: muted-fg `0.42 0.01 80`, border `0.55 0.01 80`; dark: muted-fg `0.80 0.006 80`, border `0.62 0.008 80`; ring 3px; glass суцільний |
| G6 | WCAG 2.2 AA у `base.css` | `html { scroll-padding-block: calc(var(--size-header) + var(--space-2)) … }`; логін: paste, менеджери паролів, passkey, без OTP по цифрах (3.3.8) |
| G7 | `--chart-3` light 2.46 / `--chart-2` 3.01 | `oklch(0.66 0.12 75)` (3.09); `oklch(0.64 0.10 192)` (3.13) |

## Should (9)

G8 `--surface-sunken` (light `0.975 0.005 85`, dark `0.150 0.004 80`) + правило вкладених шарів · G9 одне джерело тем
(`tokens.json` DTCG → CSS, мінімум — перевірка паритету тем, `light-dark()`) · G10 `.pw-popover` на Popover API + anchor
positioning + `@starting-style` · G11 дисципліна меж у BRIEF · G12 AI label + explainability + «Revert to AI» +
3-рівнева впевненість формою, не відтінком · G13 `--status-x-border` · G14 правила порожніх станів/таблиць Carbon ·
G15 чекліст логіну в BRIEF §12 · G16 DESIGN.md у форматі для агента.

## Could (4)

G17 `[data-density]` compact/default/comfortable · G18 `--duration-micro: 50ms` · G19 `contrast-color()` лише для
користувацьких кольорів (не для брендових заливок: MDN попереджає про середні тони) · G20 генератор теми base+accent+contrast.

## Нижче планки 2026 у нашому фундаменті

- Контрол-межі < 3:1 на hover/selected/pressed (G1); поле вводу 1.4:1 (G2); chart-3 2.46 (G7) — порушують власну планку BRIEF §13.
- Немає `prefers-contrast`; немає `scroll-padding` у `base.css` (WCAG 2.4.11).
- Немає токенів станів (≈ 40 ad-hoc змішувань); немає «sunken» поверхні.
- Dark-блок продубльовано; токени лише в CSS (без JSON/описів) — агенту нічого читати окрім коментарів.

Контраст: WCAG 2.x, OKLCH → sRGB, альфа в sRGB-просторі як у браузері; скрипти `D:/tmp/sysw/chk.mjs`, `chk2.mjs`.
