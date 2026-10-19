# Чекліст розробника, день 0

<!--
Заповнюєте ви одразу після заняття, у цьому порядку: власне репо, власні Supabase і Vercel, перший зелений CI, ruleset.
Мета — застосунок працює локально й на вашому прод-URL, міграції в базу застосовує лише CI, а в main усе йде через PR.
Для кожного пункту — доказ: посилання (run CI, PR, preview), назва змінної або знімок екрана в docs/img/
(без справжніх назв клієнта й людей: зображення spec:check не перевіряє).
ЗНАЧЕННЯ СЕКРЕТІВ І ПАРОЛІВ НІКОЛИ НЕ ПИШІТЬ — лише назви змінних і де вони задані.
Заповнений файл (розділи 1–6) — ваш перший PR, тип «Реалізація» (розділ 7): він же перевіряє ruleset. Посилання на сам
цей PR і на preview допишіть наступним PR. Пояснення кроків — README, «Шлях розробника».
Docker не потрібен: локально — лише npm run dev проти вашої бази; міграції на одноразовій базі перевіряє CI (db-check).
-->

Моє репо: https://github.com/OleksandrMartynov/property-workflows · Прод-URL: https://property-workflows-rho.vercel.app
Репо вимог PM: <!-- https://github.com/<pm>/<team-slug>-spec --> · Організація Supabase: Property Workflows

## 1. Інструменти й репо

- [x] Node 24 (`node -v`), Git, GitHub CLI (`gh auth status`); OpenSpec 1.14.1 запускається через `npx openspec`
      (devDependency з `package.json`). Глобальне встановлення `npm i -g @fission-ai/openspec@1.14.1` не вдалося через
      брак місця на диску C:. Перевірені версії: Node v24.12.0, gh 2.102.0, OpenSpec 1.14.1 (`npx openspec --version`)
- [x] Репо створено з шаблону (**Use this template → Create a new repository**): власник — ваш особистий акаунт, назва —
      `<team-slug>`, **Public** (ruleset на GitHub Free діє лише в публічних репо; PM у нотатці-порівнянні посилається на
      рядки вашого коду) — https://github.com/OleksandrMartynov/property-workflows
- [x] `git clone https://github.com/<dev>/<team-slug>.git` → `npm ci` → `cp .env.example .env.local`
      (у PowerShell: `Copy-Item .env.example .env.local`)
- [x] CodeRabbit (GitHub App) встановлено на це репо (github.com/apps/coderabbitai → Configure → Only select repositories) — [docs/img/coderabbit-repo-access.png](img/coderabbit-repo-access.png)
- [ ] (Якщо PM надіслав список справжніх назв клієнта особистим повідомленням) — локальний `product/denylist.local.txt`
      (у `.gitignore`; `npm run spec:check` читає його й значень не друкує)

## 2. Supabase: власна база

- [x] Організацію й проєкт створено у вашому акаунті (один із двох безкоштовних проєктів; регіон — найближчий) — організація Property Workflows, проєкт property-workflows
- [x] Authentication: «Allow new users to sign up» **вимкнено**, «Confirm email» **вимкнено**
      (точні назви й місце перемикачів перевірте в інтерфейсі) — [docs/img/auth-signups.png](img/auth-signups.png), [docs/img/auth-email-provider.png](img/auth-email-provider.png)
- [x] (Після розділу 4, коли є прод-URL) Authentication → URL Configuration: Site URL = прод-URL Vercel; Redirect URLs
      `http://localhost:3000/**`, `https://*-<slug>.vercel.app/**` — Site URL `https://property-workflows-rho.vercel.app`;
      Redirect URLs `http://localhost:3000/**`, `https://*-flambs-projects.vercel.app/**` —
      [docs/img/auth-url-config.png](img/auth-url-config.png)
- [x] `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
      (Project Settings → API Keys; точну назву розділу перевірте в інтерфейсі) і `DEMO_USER_PASSWORD` (≥ 8 символів).
      Значення не комітимо й не вставляємо в чат — задано всі чотири змінні (`npm run users:demo` пройшов)

## 3. GitHub: environment `production` і секрети

- [x] Settings → Environments → `production` (якщо перший прогін CI вже створив його автоматично — відкрийте наявний;
      `Production`, яке створює Vercel для своїх деплоїв, — те саме середовище: регістр у назвах GitHub не розрізняє):
      **Deployment branches** = Selected branches → `main`; «Allow administrators to bypass configured protection rules»
      вимкнено — [docs/img/github-env-production.png](img/github-env-production.png)
- [x] Секрет environment `SUPABASE_DB_URL` = рядок **Session pooler** (порт **5432**, не 6543) з Supabase → **Connect**;
      пароль у рядку percent-encoded — секрет environment `production`: `SUPABASE_DB_URL`
- [x] Запасний шлях (лише якщо `--db-url` не працює): секрети environment `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
      `SUPABASE_PROJECT_ID` (README, «Міграції в прод: запасний шлях») — не потрібно: `db-deploy` працює через `SUPABASE_DB_URL`
- [ ] (Необов'язково) секрет репо `SPEC_DENYLIST` — ті самі справжні назви через кому, для CI

## 4. Vercel

- [x] Add New → Project → імпорт вашого репо, Node 24.x — https://property-workflows-rho.vercel.app
- [x] Змінні Production і Preview — лише `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
      `SUPABASE_SECRET_KEY` — **ніколи** — у Vercel лише `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production і Preview) —
      [docs/img/vercel-env.png](img/vercel-env.png)
- [x] Settings → Deployment Protection → **Require Log In** вимкнено → Save (інакше PM і викладач не відкриють ваші preview;
      точну назву перемикача перевірте в інтерфейсі) — [docs/img/vercel-protection.png](img/vercel-protection.png)
- [x] Після змінних — редеплой; прод-URL відкривається — https://property-workflows-rho.vercel.app/login

## 5. База й перший зелений CI

- [x] Actions → CI → **Run workflow** (гілка `main`, `include_seed` ✓) → job `db-deploy` застосував першу міграцію й сид — https://github.com/OleksandrMartynov/property-workflows/actions/runs/39255466202
      (`Applying migration 20261012000000_profiles_and_roles.sql…`, `Seeding data from supabase/seed.sql…`)
- [x] `npm run users:demo` (синтетичні користувачі з `supabase/demo-users.json`) → `npm run dev` → `http://localhost:3000` →
      вхід як `admin@example.test` працює локально й на прод-URL — створено `admin@example.test` (admin),
      `member1@example.test`, `member2@example.test` (member)
- [x] CI на `main` зелений: `spec`, `app`, `conformance`, `db-check`, `db-deploy` — https://github.com/OleksandrMartynov/property-workflows/actions/runs/39255466202

## 6. Ruleset `solo-main` (лише після зеленого CI на `main`)

- [x] Settings → Rules → Rulesets → **New ruleset → Import a ruleset** → `solo-main.json` з курсового репо
      (`materials/rulesets/solo-main.json`) або вручну: target — гілка за замовчуванням (`main`); Restrict deletions;
      Block force pushes; Require a pull request — **0 approvals** (колег у вашому репо немає); Require status checks
      (джерело GitHub Actions, без «up to date»): `spec`, `app`, `conformance`, `db-check`; Allowed merge methods —
      **Squash** і **Merge**; Bypass list — **порожній** (навіть для власника); Enforcement — Active
      (точні назви полів перевірте в інтерфейсі) — ruleset `solo-main` (id 25405104) імпортовано з `solo-main.json` через
      `gh api …/rulesets --method POST`: enforcement active, bypass порожній; rules: deletion, non_fast_forward,
      pull_request, required_status_checks — https://github.com/OleksandrMartynov/property-workflows/rules/25405104, [docs/img/ruleset.png](img/ruleset.png)

## 7. Перший PR (перевірка ruleset-у)

- [x] `git switch -c setup/bootstrap` → цей файл із доказами розділів 1–6 → push → `gh pr create --web` (тип «Реалізація»)
      → окремим коментарем `@coderabbitai review` — https://github.com/OleksandrMartynov/property-workflows/pull/1
- [x] Поки перевірки не зелені, кнопка merge заблокована; push у `main` напряму відхиляється — `git push origin HEAD:main`
      (порожній тестовий коміт): `remote: error: GH013: Repository rule violations found for refs/heads/main` —
      `Changes must be made through a pull request`, `4 of 4 required status checks are expected`,
      `! [remote rejected] HEAD -> main (push declined due to repository rule violations)`
- [x] Vercel створив preview для PR — https://property-workflows-git-setup-bootstrap-flambs-projects.vercel.app
- [x] **Squash and merge** → прод-деплой Vercel пройшов — коміт `cb8b1e9` у `main`:
      https://vercel.com/flambs-projects/property-workflows/HPNEDuREhkkxEbpAePjFnRUkjEx3; CI на `main` після merge —
      https://github.com/OleksandrMartynov/property-workflows/actions/runs/39259418885
- [ ] (З першою задачею, що має міграцію) `db-check` зелений, після merge `db-deploy` застосував її у вашу базу — <!-- посилання на run -->

## 8. Вимоги PM і специфікація

- [ ] Адресу репо вимог PM узято з чату команди; на зустрічі команди (дні 0–2, до кінця 15.10, організує PM; якщо
      команда не зібралася — діра в чат команди до обіду 16.10) — перший раунд питань до брифу
- [ ] PM написав у чаті команди «вимоги оновлено» (у курсі перші вимоги — до кінця 16.10) → у Claude Code чи Cursor
      `/requirements-sync <pm>/<team-slug>-spec` → PR «Оновлення вимог» злито; шапка `docs/conformance.md` показує
      адресу, джерело (issues чи docs) і дату знімка — <!-- посилання на PR -->
- [ ] Читання вимог: скіл `spec-clarify` → питання — issues «Питання до вимог» у репо PM через вебформу → журнал
      `docs/spec-reading.md` — <!-- посилання на issues -->
- [ ] Переклад у специфікацію (гілка `spec/add-<зріз>`): `/opsx:propose add-<зріз>` → `npx openspec validate add-<зріз> --strict`
      → скіл `spec-review` → `npx openspec archive add-<зріз> -y` → `/conformance` → PR «Специфікація» злито;
      `npm run ac:coverage` без «вимогу PM ще не перекладено» — <!-- посилання на PR -->
