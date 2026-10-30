# QA proof pack: зріз 2 — редактор шаблону з версіями і єдина дизайн-система

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Покладіть у docs/qa/proof-pack.md вашого репо й заповнюйте по кроках WS8 (A → B → C → D).
Посилання — на файли на коміті (…/blob/<sha>/…#L<N>), на PR (…/pull/N) і на прогони (…/actions/runs/N).
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
Цей файл — вхід для конвеєра WS9: на кожен AC видно, чим він доведений.
-->

- Прод-URL: https://property-workflows-rho.vercel.app
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-30
- `/api/health` на момент UAT: <!-- sha і db, напр. «sha 1a2b3c4, db ok, 01.11.2026» -->

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-EDITOR-07 | відмова в браузері (заборонена роль: менеджер на списку версій) | Then B sees the message "Not enough rights" and no versions. |
| AC-EDITOR-09 | відмова в браузері (не увійшов: відвідувач на редакторі) | Then the visitor sees the sign-in page and no content of the template. |
| AC-DSYS-04 | стан інтерфейсу (порожній список запусків) | Then B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table. |

## A. Ворота

- PR воріт: <!-- …/pull/N -->
- Зелений `quality` на `main`: <!-- …/actions/runs/N -->
- Обов'язкові перевірки в `solo-main` з <!-- дата -->: <!-- назви jobs -->

Розбір першого повного прогону `fallow` (той самий — в описі PR воріт):

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| unused dependency `@tailwindcss/turbopack`, `@vitest/coverage-v8` | 2 | хибна | `ignoreDependencies` (з матеріалів курсу): Tailwind 4 підключено рядком у `next.config.ts`, провайдер покриття Vitest вантажить за назвою з конфігу — fallow цього не бачить |
| unused files: контролі форм дизайн-системи (`checkbox`, `date-picker` + `date-time.css`, `dt-shared`, `file-drop`, `multi-select`, `number-field`, `radio-group`, `slider`, `switch`, `time-field` у `src/components/ui/`) | 11 | навмисна | `entry` у `.fallowrc.jsonc` з коментарем: публічний API бібліотеки `src/components/ui` для наступних зрізів (DESIGN.md, «Відомі прогалини першої версії»); сторінки зрізів 1–3 їх ще не імпортують |
| unused file `src/lib/supabase/client.ts` | 1 | справжня | лишено з поясненням: браузерний клієнт шаблону курсу (AGENTS.md, «Структура»); усі запити застосунку серверні, файл знадобиться клієнтським компонентам (напр. realtime). Не Server Action, тож не публічний ендпойнт; `audit` (new-only) на нього не валить |
| unused export `AC_ID_GLOBAL` (`scripts/lib/spec-lib.mjs`) | 1 | справжня | лишено з поясненням: скрипт перевірок шаблону курсу, який ми не змінюємо (його оновлює PR «Оновлення шаблону») |
| duplicates: темна тема в `src/app/globals.css` (2 копії) | 3 групи | навмисна | DESIGN.md §9: кожен темний токен у двох копіях — `@media (prefers-color-scheme: dark)` для System і `:root[data-theme="dark"]` для Dark; `tests/design/theme.test.tsx` ловить розбіжність |
| duplicates: `src/lib/supabase/database.types.ts` | 1 група | хибна | згенерований файл (`npm run db:types`), його не правимо |
| duplicates: `combobox` / `multi-select` / `select` (клавіатура списку), `progress` / `progress-ring` | 6 груп | справжня | лишено: рефакторинг дизайн-системи окремим PR; поведінку перевірено в браузері (DESIGN.md) |
| duplicates: `scripts/check-design-tokens.mjs` / `check-server-boundary.mjs`, `(app)/layout.tsx` / `viewer.ts`, `edit/actions.ts` | 4 групи | справжня | лишено: скрипти шаблону курсу; читання профілю в layout і `requireViewer` — різні контракти (layout не перенаправляє) |
| high complexity: компоненти дизайн-системи (`number-field`, `date-picker`, `time-field`, `combobox`, `select`, `multi-select`, `slider`, …) | ≈80 функцій | справжня | лишено: клавіатурна навігація ARIA (↑ ↓ Home End, Enter, Esc, набір літер) за задумом — велика функція; `audit` (new-only) валить лише нову складність |
| high complexity: сторінки й дії (`(app)/page.tsx` Home, `runs/page.tsx`, `runs/_lib/summaries.ts`, `templates/[id]/edit/page.tsx`, `templates-list.tsx`) | ≈10 функцій | справжня | лишено як цілі рефакторингу; нові гілки в цих файлах ворота вже ловлять |
| high complexity: скрипти шаблону (`check-actions-auth.mjs`, `check-spec.mjs`, `check-design-tokens.mjs`) | ≈10 функцій | навмисна | скрипти курсу; складність скриптів курсу WS8 — у `health.ignore` з матеріалів |

## B. Якість тестів

### Рівень для кожного AC

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-…-NN | <!-- політика / функція бази / TS-модуль / сторінка --> | <!-- unit / база (PGlite) / e2e --> | … | <!-- …/blob/<sha>/tests/…#L<N> --> |

### Покриття

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| <!-- src/lib/<модуль>.ts --> | … % | … % | — |
| <!-- src/app/<сторінка>/page.tsx --> | 0 % | 0 % | <!-- e2e: tests/e2e/….spec.ts --> |

### Доказ мутацією

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| <!-- src/lib/…/x.ts:14 `<=` → `<` --> | AC-…-NN | вижив | <!-- …/blob/<sha>/tests/…#L<N>: межа «…» з AC --> | убитий |

- Stryker: <!-- score до → після, посилання на PR з виводом -->
- SQL-мутації (`npm run mutation:sql`): <!-- таблиця з npm run mutation:sql -- --markdown (KILLED / SURVIVED / ERROR) з PR або «немає PGlite-гарнесу» -->
- Еквівалентні мутанти: <!-- який і чому (рядок міграції чи коду, що робить його еквівалентним) або «немає» -->

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-…-NN | <!-- …/blob/<sha>/tests/e2e/….spec.ts --> | <!-- passed / failed --> | <!-- Haiku: PASS / FAIL / NEEDS-HUMAN (+ Sonnet, якщо була суперечка) --> | <!-- PASS / FAIL / NEEDS-HUMAN і правило (R1–R6) --> | <!-- …/blob/<sha>/docs/qa/uat/<дата>/frames/AC-…-then-1.png --> |

- Звіт: <!-- …/blob/<sha>/docs/qa/uat/<YYYY-MM-DD>/report.md -->
- Відео: <!-- вкладення в описі PR …/pull/N -->
- Рецензент: <!-- моделі зі звіту (claude-haiku-5-5; суперечки — claude-sonnet-5-5) і вартість прогону -->
- Негативний контроль: <!-- NC-… (npm run uat:nc): що навмисно хибне, вердикт (FAIL / NEEDS-HUMAN), …/pull/N -->
- Дані: <!-- «лише читання» або «@writes: uat-<запуск>@example.test, рядок «Прибирання» зі звіту» -->

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-…-NN | <!-- ✅ / ❌ / NEEDS-HUMAN → … --> | <!-- коментар-підпис або issue «Відхилення від вимог» --> |

## D. Eval рецензента

- PR з вадами (не злитий): <!-- …/pull/N -->
- Ключ і таблиця: <!-- …/pull/N#issuecomment-M -->

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | <!-- категорія і файл:рядок --> | <!-- знайшов / пропустив + цитата --> | <!-- знайшов / пропустив + цитата --> |
| 2 | … | … | … |
| 3 | … | … | … |
| П | приманка: <!-- що --> | <!-- хибна тривога? цитата --> | <!-- хибна тривога? цитата --> |

- Інші знахідки: <!-- слушна / шум, по рядку на кожну -->
- Правило, що закриває пропуск: <!-- рядок в AGENTS.md чи path instruction, …/commit/<sha> -->
- Повторний прогін: <!-- хто, результат, цитата, …/pull/N#issuecomment-M -->
