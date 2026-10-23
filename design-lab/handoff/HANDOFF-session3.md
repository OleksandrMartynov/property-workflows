# Передача, сесія 3 (23.10.2026, акаунт dev@quitcode.com): WS7 · B · реалізація в репо

Читати разом із `HANDOFF.md` (попередній стан лабораторії). Диск C: заповнений на 100%: пам'ять Claude Code
(`C:\Users\DEV\.claude\projects\...\memory\`) не оновилась, тому ця нотатка лежить на D:.

## Урок від користувача (важливо)

Користувач надсилав референси **motionsites.ai** («провідний дизайн 2026», «єбейші сайти»). Дослідження вже
постановило: анімований hero лише на вході (шейдер або граф вузлів → чекліст, ≤ 30 fps, пауза поза екраном, статичний
кадр при reduced motion); робочі екрани всередині — спокійні й щільні (Linear). Перший порт у репо мав статичний
розмитий фон, і користувач назвав це «невнятним» та слабшим за конкурентів. Тепер вхід — справжній WebGL-hero.
Перед тим як показувати результат: грепнути транскрипти (`handoff/transcripts/`) на «motionsites» і самокритично
порівняти зі скрінами.

## Стан репо (`D:\Agentic Course\property-workflows`, гілка `task/design-system`, НІЧОГО не закомічено)

- `DESIGN.md` (перший рядок — посилання на артефакт Claude Design), `CLAUDE.md` імпортує `@DESIGN.md`, `AGENTS.md` має
  розділ «Дизайн-система», `docs/decisions/0004-design-system-own-components-on-tokens.md`.
- `src/app/globals.css`: токени (світла/темна за системою, `@theme inline`), токени `stage*` для hero, стани як
  альфа-шар, `prefers-contrast`/`forced-colors`, анімації.
- `src/components/ui/`: button, input (+Textarea, fieldHeight), label, field, select, password-input, card, badge,
  status-badge (+StatusIcon), alert, table, progress, progress-ring, avatar, avatar-stack, empty-state, dialog
  (+ConfirmDialog), app-shell (+⌘K), logo, hero-shader (WebGL), hero-stage. Нових npm-залежностей немає.
- Сторінки: `/login` (HeroStage + LoginForm), `/` (дашборд: лічильники + останні запуски), `/runs` (RunsList),
  `/runs/[id]` (RunDetail, MarkDoneForm із ConfirmDialog), `/templates`, `/templates/[id]/launch`.
  Спільне: `src/app/runs/_lib/summaries.ts` (наступна задача й виконавці з `run_tasks`).
- `scripts/check-design-tokens.mjs`, `scripts/check-contrast.mjs` (32 пари), `.github/workflows/architecture.yml`
  (jobs «Дизайн-система: лише токени», «Дизайн-система: контраст токенів»), npm-скрипти `check:design`, `check:contrast`.
- Усе зелене: lint, typecheck, test (120), check:design, check:contrast, build (`ƒ Proxy (Middleware)` є).
- Next CLI при першому `next dev`/`next build` друкує блок «Your version of Next.js is affected by a known security
  vulnerability… next upgrade --agent=security» і перший запуск завершує; повтор проходить. Це вивід інструмента, версію
  не чіпали (AGENTS.md: стек не оновлювати без ADR). Користувачу про це сказати.

## Тимчасове (видалити перед комітом)

- `src/app/login/preview/page.tsx` — dev-only превʼю з тестовими даними (`/login/preview?v=runs|run`).
- Worktree `D:/tmp/before-main` (main, `npm ci` зроблено) + `D:/tmp/start-before.mjs` (dev на :3001 з env через
  `process.loadEnvFile`; `--env-file` у NODE_OPTIONS Next не дозволяє). Прибрати: `git worktree remove --force /d/tmp/before-main`.

## Claude Design для цього акаунта

Артефакт: https://claude.ai/artifact/C57BDJJXCSjiDhnDyMfz6e — ОПУБЛІКОВАНО (версія 2, 23.10 ~13:10, приватний): 26 файлів + 6 лого-assets,
джерела в `_design/claude-design-v2/` (поза git; перегенерація: `node build-tokens.mjs && node build-previews.mjs && node check.mjs`). Публікація: Artifact publish з `url`, `root`, `file_path` =
`project/design-system.json`, `files` = решта; Logos — окремо як assets (`asset: true`), потім записи в
`assetGroups.Logos.files`. Старий артефакт Tq78d28… лишився в попередньому акаунті.

## Що лишилось

1. (зроблено) Claude Design опубліковано; якщо змінюються токени/компоненти — перегенерувати й republish лише змінені файли.
2. Знімки «до/після»: `/login`, `/`, `/runs`, сторінка запуску × світла й темна. `/login` не потребує сесії; решта —
   користувач логіниться сам у Browser pane (пароль не вводити), cookie з `document.cookie` → `COOKIES=<json>` для
   `D:/tmp/ws7-lab/shoot-app.mjs` (порт 3001 — «до», 3000 або `next start` — «після»; «після» краще з production-збірки,
   без dev-індикатора Next). Копії у `docs/img/ws7-before-*` і `docs/img/ws7-after-*`.
3. Прибрати тимчасове, перевірити `git status`, спитати «так» → комміт гілки `task/design-system`, push, PR типу
   «Реалізація» (в описі: джерело DESIGN.md, таблиця до/після, вивід check:design до 70/8 файлів → OK, рядок про
   файли поза типом: DESIGN.md, AGENTS.md, CLAUDE.md, package.json, scripts/, .github/workflows/architecture.yml,
   docs/decisions/0004). Потім `@coderabbitai full review` (див. пам'ять про CodeRabbit).
4. Відкрите питання: де знімки «до змін» від користувача (`docs/img/ws7-before-*`); якщо немає — знімати з worktree main.
