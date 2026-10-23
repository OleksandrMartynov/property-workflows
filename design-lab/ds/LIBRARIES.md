# Бібліотеки компонентів: вердикт (23.10.2026)

Повна версія з матрицею оцінок, таблицею «хто виграє» для кожного контролу, ризиками та джерелами: `libraries.html`. Версії, дати, ліцензії звірені з npm registry, GitHub API й офіційними доками; розміри бандлів виміряні esbuild (minify + gzip).

## Рекомендація: гібрид «React Aria-first»

- **Ядро — react-aria-components (RAC) 1.22.1 + @internationalized/date 3.12.4.** Закриває ~85% контролів: усі форми, меню, поповери, діалоги, Sheet, Tabs, Table, Tree, ComboBox (multi + чипи), Autocomplete для ⌘K, DropZone, а головне — DatePicker / DateRangePicker / TimeField з `ZonedDateTime` у `Europe/Kyiv`, NumberField з валютою (Intl) і доступний DnD (миша, дотик, клавіатура, screen reader).
- **Base UI 1.9.0 — лише Toast** (stable, Undo через `actionProps`, стек через CSS-змінні). RAC Toast усе ще `UNSTABLE_`. Запасний: Sonner 2.0.8.
- **Доставка:** `npx shadcn@latest init --base aria` (shadcn має базу React Aria з липня 2026) + власні файли в `src/components/ui` (date-picker, number-field, tag-group, drop-zone, tree). Теми — лише CSS-токени; спільні `@custom-variant` (selected / open / pressed / invalid / entering / exiting) та одна фокус-обводка для обох шарів.
- Решта: canvas — @xyflow/react 12.12 (+ React Flow UI), rich text зі змінними — Tiptap 3.31 (TokenField з RAC — alpha, для коротких полів), таблиці — TanStack Table 9 + Virtual, графіки — Recharts 3.10, іконки — Lucide (strokeWidth 1.5), шрифт — Geist. Рух: пружини `linear()` з токенів + React 19.3 `<ViewTransition>` + Motion (LazyMotion, лише layout).

**Альтернативи.** B — «Base UI + shadcn base-nova» (дефолт курсу) з RAC-островами для дати/DnD: менший бандл і зріліший реєстр, але дві системи фокусу й лише react-day-picker для дат. C — «тільки React Aria»: одна система, але Toast нестабільний/сторонній.

## Пакети (потрібне схвалення; ≥ 14 днів від релізу)

`react-aria-components@1.22.1` · `@internationalized/date@3.12.4` · `@react-aria/optimize-locales-plugin@2.1.0` (dev) · `@base-ui/react@1.9.0` · `shadcn@4.21.4` (dev/npx) · `cn@0.4.0` · `class-variance-authority@0.7.1` · `lucide-react@1.54.0` · `motion@14.1.0` · `@xyflow/react@12.12.0` · `@tanstack/react-table@9.2.8` · `@tanstack/react-virtual@3.14.14` · `@tiptap/react|pm|starter-kit|extension-mention@3.31.4` · `recharts@3.10.1` · `zod@4.6.5` · `geist@1.7.2`.
Запасні: `sonner@2.0.8`, `cmdk@1.1.1`, `react-day-picker@10.0.2` + `@date-fns/tz@1.5.0`, `@dnd-kit/react@0.5.0`, `@conform-to/react@1.21.1`.

## Несподівані знахідки

1. coss ui (реєстр на Base UI від Cal.com, peer-залежності збігаються з нашим стеком) — `packages/ui` під **AGPL-3.0-or-later**; MIT лише `apps/ui`. Не копіювати без юриста.
2. shadcn уже має базу `--base aria`, яка сама гібридна (Drawer від Base UI, Sonner), без DatePicker/NumberField/Toast.
3. Base UI 1.9 досі **без Calendar/DatePicker** (лише internal temporal-adapters).
4. RAC має TokenField (alpha), Sheet (09.10.2026), NavigationTree, але Toast — `UNSTABLE_`.
5. cmdk — жодного релізу у 2026, Vaul — «unmaintained», Headless UI — 1 реліз; водночас мажори летять: TanStack Table 9, Pragmatic DnD v2→v4 за 3 місяці.

## Ризики коротко

Молодість нових частин (Sheet, TokenField, aria-база); відкриті issues RAC під React ≥19.3 / Next 16 (iOS `usePreventScroll` #10485); бандл RAC важчий (Select 57 vs 44 kB gz); два headless-шари → Toast лише в Base UI, другий viewport усередині модалки, тест NVDA/VoiceOver; без локалізаційного плагіна RAC тягне всі мови.

## Питання до власника

ADR на відхід від `base-nova`? Нативний `<dialog>` (BRIEF §7) чи RAC Modal? Брати RAC Sheet/TokenField зараз чи чекати стабілізації? Просити в Cal.com ліцензію на coss? Чи достатньо Geist для кирилиці?
