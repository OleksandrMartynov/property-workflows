# 0004. Дизайн-система: власні компоненти на токенах, правило «лише токени» в CI, WebGL-hero лише на вході

- Статус: прийнято
- Дата: 2026-10-23
- AC: AC-TASK-04, AC-TASK-16 (підтвердження останньої обов'язкової задачі — діалог, не `window.confirm`), AC-TASK-10 («Run not found»), AC-TASK-08, AC-TASK-15 (статус і «required» словами, не лише кольором), AC-RUN-03, AC-RUN-07 (тексти помилок дослівно)

## Контекст

- Сторінки зрізів 1–2 мали по 70 сирих класів (`text-zinc-500`, `bg-green-100`, `dark:bg-zinc-800`), власні `<button>` і `<input>` та системний `window.confirm`. Кожна нова сторінка повторювала б це.
- Продукт — робочий інструмент для менеджерів нерухомості (десктоп насамперед), але перше враження — вхід. Користувач просив рівень «провідного дизайну 2026» (приклади з motionsites.ai) і сторінку входу кращу за конкурентів.
- Обмеження: Tailwind 4 без PostCSS-конфігу, Next.js 16, нові npm-залежності й зміни стека — лише через ADR і окрему згоду.

## Рішення

- **Шрифти:** Inter (змінний, вісь optical size) для тексту й заголовків, JetBrains Mono для моно; через `next/font/google`, без npm-пакетів. Geist відхилено після перегляду 8 стеків на реальних екранах: Inter читається чіткіше в щільних таблицях (tabular-цифри) і на Windows.

- **Токени** в `src/app/globals.css`: OKLCH, світла тема в `:root`, темна в `@media (prefers-color-scheme: dark)`, `@theme inline` з `--color-*`. Імена shadcn/ui плюс статуси домену (`status-*`: тло, текст, іконка), `ai*`, `variable*` для майбутнього конструктора, `stage*` для сцени входу, стани (`state-hover/pressed/selected`) як альфа-шар.
- **Компоненти власні** в `src/components/ui/` на цих токенах, без shadcn CLI і без нових залежностей: Button, Input/Textarea/PasswordInput, Select (власний listbox), Combobox, MultiSelect, DatePicker, DateRangePicker, TimeField (київський час), NumberField, CurrencyField, Checkbox, RadioGroup, Switch, Segmented, Slider, FileDrop, Popover, Label, Field, Card, Table, Badge, StatusBadge, Alert, Progress, Avatar, EmptyState, Dialog/ConfirmDialog, TaskCheck/CompletionGlow (оживлення завершення), Skeleton, AppShell із ⌘K, Logo. Діалоги — нативний `<dialog>`: фокус-пастка, Esc і inert-фон дає браузер.
- **Підтвердження незворотної дії** (AC-TASK-04, 16) — `ConfirmDialog`; `withConfirmation` з `src/lib/runs/confirmation.ts` не змінено, тож тести правила лишились дослівними.
- **Правило в CI:** `scripts/check-design-tokens.mjs`, `scripts/check-contrast.mjs` і `scripts/check-ui-copy.mjs` (жодних пояснювальних підзаголовків і копірайтів в інтерфейсі; хук Claude Code в `.claude/settings.json` запускає її після кожної правки `src/**/*.tsx`) у `.github/workflows/architecture.yml`. Контраст пар токенів у `DESIGN.md` генерує скрипт, а не рука.
- **Вхід** — єдиний екран із рухом і єдине місце з другим шрифтом (Instrument Serif Italic через `next/font/google`, без npm-пакета; лише акцентне слово hero): WebGL-шейдер без залежностей (DPR ≤ 1.5 ×0.55, ≤ 30 кадрів/с, пауза поза екраном і за кнопкою «Pause animation», запасний CSS-фон, статичний кадр за `prefers-reduced-motion`), кольори шейдера читаються з токенів `--stage*`.

## Розглянуті варіанти

- **shadcn/ui (Base UI) з `npx shadcn init`.** Відкладено, не відхилено: потребує нових залежностей (`@base-ui/react`, `class-variance-authority`, `lucide-react`…) і переписує `globals.css` трьома відомими пастками. Для першої версії достатньо власного коду на токенах; перехід на React Aria або Base UI для власного listbox, combobox і date picker — окремий ADR після згоди на залежності (дослідження — у лабораторії дизайну, `LIBRARIES.md`).
- **Лише домовленість в `AGENTS.md`.** Ні: правило без перевірки — побажання; скрипт дає файл і рядок.
- **`--color-*: initial` у `@theme`.** Ні: наявні класи мовчки зникають.
- **Hero на Three.js або відео.** Ні: залежність і вага заради фону; сирий WebGL (`hero-shader.tsx`, без залежностей) вкладається в бюджет кадру.
- **Перемикач теми (клас `.dark`).** Ні: вимоги не просять; тема за системою, один спосіб.

## Наслідки

- Простіше: новий екран збирається з `@/components/ui`; темна тема працює без `dark:` у сторінках; зміна акценту — один рядок у `globals.css`.
- Складніше: новий колір — це PR у `DESIGN.md`, `globals.css` і `check-contrast.mjs`. Усі контролі форм (select, combobox, мультивибір, дата, час, число, checkbox, radio, switch, slider, завантаження файлів) — наш код без залежностей; плата — підтримувати їхню доступність самим (APG: клавіатура, ARIA, фокус). Без JavaScript `Select` і `Combobox` не відкриваються, а форма запуску надішле виконавцем за замовчуванням.
- Сторінки списку запусків і головної тягнуть «наступну задачу» й виконавців із `run_tasks` для видимих запусків; нових колонок і міграцій немає.

## Як перевіряємо

- `npm run check:design`, `npm run check:contrast` і `npm run check:copy` локально й три jobs у `architecture.yml` на кожен PR.
- Знімки `/login`, `/`, `/runs`, сторінки запуску у світлій і темній темі до й після (`docs/img/ws7-*`).
- Тести правила підтвердження (`tests/runs/confirmation.test.tsx`) без змін.
