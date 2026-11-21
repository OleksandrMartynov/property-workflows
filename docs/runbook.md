# Runbook: Property Workflows

**Runbook** — що робити, коли щось пішло не так, написано заздалегідь, на спокійну голову. Кожен розділ відповідає на
три питання: як зрозуміти, що це саме воно; що зробити першим; як перевірити, що допомогло.

Шаблон — набір курсу (`materials/ops-kit/docs/runbook.template.md`
у https://github.com/koldovsky/2026-quitcode-11-devops-operations-hw); зміст — про наш продукт: агенція з управління
нерухомістю, шаблони процесів, запуски, задачі, підрядники, AI-розбір документів.

Останнє оновлення: 2026-11-19 (після інцидент-дрілу), версія продукту: до `v1.0.0` (тег ставимо після приймання PM).

## Хто отримує алерт і кого кликати

| Роль | Хто (GitHub-логін) | Коли кликати |
|---|---|---|
| Черговий розробник (отримує алерт) | @OleksandrMartynov | будь-який червоний smoke чи повідомлення «ПОМИЛКА СЕРВЕРА» |
| PM (говорить із клієнтом) | @solomchaak | SEV1–SEV2 — одразу; SEV3 — у робочий час |
| Резерв | немає (команда з одного розробника на це репо) | — |

- **Канал алерту:** група Telegram команди (назву запише черговий після створення групи), у ній — розробник і PM.
  Бот пише туди з `.github/workflows/smoke.yml` (секрети GitHub `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) і з
  `src/instrumentation.ts` (ті самі назви — змінні Vercel, Production і Preview).
- **Серйозність** — за матрицею SEV1–3 в операційних вимогах PM (репо https://github.com/solomchaak/property-workflows-spec).
  До її появи: SEV1 — прод недоступний або менеджери не можуть запускати шаблони й позначати задачі; SEV2 — не працює
  одна функція (наприклад, «Parse a document» чи сторінка підрядника); SEV3 — лише staging чи preview.

## Де що

| Що | Адреса / де шукати |
|---|---|
| Прод | https://property-workflows-rho.vercel.app (гілка `main`) |
| Staging | https://property-workflows-git-staging-flambs-projects.vercel.app (гілка `staging`, змінна лише для гілки `APP_ENV=staging`; за захистом Vercel) |
| Здоров'я | `<адреса>/api/health` → `{"ok":true,"sha":"…","env":"production","appEnv":null,"db":"ok","reason":""}`; на staging `"appEnv":"staging"` |
| Прогони smoke | Actions → `smoke`: job `prod` — прод (після деплою `main` і щодня ≈ 07:23 за Києвом), job `deploy` — кожен preview і staging за адресою саме цього деплою |
| Vercel | проєкт `property-workflows` → Deployments, Logs |
| Supabase | проєкт застосунку → Logs, Advisors (MCP — лише `read_only=true`) |
| Захист деплоїв | Vercel Authentication — **Standard Protection**: preview і staging закриті входом Vercel, прод відкритий (D0 і курс читають прод без входу). Smoke проходить захист заголовком `x-vercel-protection-bypass` (секрет `VERCEL_AUTOMATION_BYPASS_SECRET`) |
| Доступ PM до staging | **спільне посилання Vercel** (Share на деплої staging, адреса гілки + `?_vercel_share=…`), обрано 2026-11-18: PM не потрібен акаунт Vercel; на Hobby — одне посилання на акаунт. Посилання містить токен — лише особистим повідомленням PM, у публічних файлах — адреса без параметрів. Перевипуск: Vercel → деплой staging → Share → нове посилання (старе відкликати) |

## 1. Червоний smoke

**Як зрозуміти:** у Telegram прийшло «ЧЕРВОНИЙ SMOKE» — репо, job, середовище (і гілка), адреса, коміт, посилання на
прогін.

1. Відкрийте посилання на прогін → крок smoke → рядки `::error::`. Тексти — з `scripts/smoke.mjs`:

   | Рядок `::error::` містить | Що це найімовірніше | Куди далі |
   |---|---|---|
   | `стіна входу Vercel` / `секрет обходу` / `деплой за захистом Vercel` | захист Vercel або секрет `VERCEL_AUTOMATION_BYPASS_SECRET` | розділ 4 (ротація) |
   | `Supabase призупинено` | база на паузі (`/api/health` → `"reason":"paused"`) | розділ 3 |
   | `ключ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY у Vercel не приймається` | хибний ключ у змінних Vercel (`"reason":"invalid-api-key"`) | розділ 4 |
   | `прод показує <sha>, а очікувався <sha>` | деплой `main` не пройшов або був відкат без Promote | розділ 2 |
   | `"/": HTTP 5xx` (часто `MIDDLEWARE_INVOCATION_FAILED`) | у Vercel бракує чи хибна `NEXT_PUBLIC_SUPABASE_*`, або зламаний код proxy | крок 2 нижче |
   | `очікували перенаправлення на /login` | proxy веде не на вхід — зламано `src/proxy.ts` чи `PUBLIC_PATHS` | крок 2 нижче |
   | `недоступний` | Vercel чи мережа | https://www.vercel-status.com, повтор через 5 хв |

2. **Прод чи ні?** Job `deploy` (preview, staging) — користувачі агенції не постраждали: SEV3, виправляємо в робочому
   порядку. Job `prod` — визначте SEV і напишіть у чат команди «беру, SEV<N>».
3. **Спершу зупинити шкоду, потім шукати причину.** Якщо прод зламав останній деплой — відкат (розділ 2), потім
   розбір. Журнали Vercel на Hobby живуть **1 годину**: потрібні рядки — одразу в issue інциденту, без даних
   користувачів.
4. **Розбір** — з агентом у профілі «лише пропонує» (розділ 7) або вручну. Агент пропонує, виправляє людина.
5. **Перевірка:** Actions → smoke → Re-run (або Run workflow з полем `url` для staging) — зелений; у чат: «SEV<N>
   закрито, причина: …».
6. Після SEV1–SEV2 — postmortem `docs/incidents/<YYYY-MM-DD>-<slug>.md` за шаблоном набору, без пошуку винних.

Приклад — дріл 2026-11-19 (`docs/incidents/2026-11-19-staging-bad-supabase-url.md`): перевизначення
`NEXT_PUBLIC_SUPABASE_URL` для гілки `staging` з одним зміненим символом → Redeploy → smoke `deploy` червоний
(`/api/health` 503, `db: down`) → алерт через 23 с → розбір агентом → людина прибрала перевизначення й зробила
Redeploy → smoke зелений через 24 хв від поломки. Тепер у такому разі `::error` і алерт одразу кажуть «перевірте змінну
NEXT_PUBLIC_SUPABASE_URL у Vercel для цього середовища (і перевизначення для гілки)».

## 2. Відкат проду і повернення автоматичного просування (Promote)

**Коли:** прод зламав щойно розгорнутий коміт, а виправлення вперед займе довше за 30 хв (SEV1) чи 2 год (SEV2).

1. Vercel → Deployments → попередній робочий прод-деплой → **Instant Rollback**. На Hobby відкат можливий **лише на
   один попередній** прод-деплой.
2. Перевірте прод: `/api/health` — `"db":"ok"`, сторінка входу відкривається.
3. **Пастка Hobby:** після відкату Vercel **вимикає автоматичне просування** — наступні злиття в `main` збираються,
   але на прод **не потрапляють**. Smoke `prod` червонітиме з «прод показує <старий sha>, а очікувався <новий>».
4. Виправлення — звичайним PR у `main` (CI, CodeRabbit). Коли деплой виправлення готовий: Vercel → цей деплой →
   **Promote**. Це повертає автоматичне просування; smoke `prod` знову зелений.
5. Відкат **не змінює** базу й міграції. Міграції в нас лише додають (expand) і йдуть у базу через `db-deploy` після
   злиття, тож старий код працює з новою схемою. Схема назад — лише новою міграцією вперед, ніколи `migration down`.

Хто робить: черговий розробник. Агент відкат і Promote не робить ніколи (у профілі заборонено поіменно:
`mcp__vercel__request_rollback`, `mcp__vercel__request_promote`, `vercel rollback`, `vercel promote`).

Чого ми не бачили самі: 17.11.2026 Vercel не запустив деплой коміту `4deabb4` з `main` (на коміті не було жодного
статусу Vercel), і прод лишився на попередньому коміті. Smoke `prod` такого не помітив би до наступного злиття чи
щоденного прогону — перевіряйте `/api/health` після кожного злиття, а наступне злиття запускає новий деплой.

## 3. База на паузі

**Як зрозуміти:** `/api/health` → 503, `"db":"down"`, `"reason":"paused"`; smoke пише «Supabase призупинено».
Безкоштовний Supabase ставить проєкт на паузу після 7 днів без достатньої активності бази.

1. Supabase Dashboard → проєкт → **Resume project**. Відновлення займає кілька хвилин.
2. Actions → smoke → Run workflow (поле `url` порожнє) — зелений.
3. Запишіть у чат команди, коли була пауза і скільки тривала.

Як не допустити до demo day: щоденний прогін smoke (`schedule`) робить запит до бази через `/api/health`; за день до
показу — ручний прогін smoke і вхід під тестовим акаунтом.

## 4. Ротація ключа + redeploy

**Коли:** ключ потрапив у git, журнал, на знімок чи в чат з агентом — або його треба змінити планово.
Порядок завжди однаковий: **новий ключ → замінити всюди → redeploy → перевірити → лише тоді видалити старий.**

| Що | Де новий | Де замінити | Що ще |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys | Vercel → Environment Variables (Production, Preview і перевизначення гілки `staging`, якщо є) | **Redeploy**: `NEXT_PUBLIC_*` вбудовуються під час збірки |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API Keys | лише `.env.local` розробника (скрипти `users:demo`, `template:ac`); у Vercel і GitHub його немає | старий ключ видалити в Supabase |
| `SUPABASE_DB_URL` (пароль бази) | Supabase → Settings → Database → Reset password | GitHub → Environments → `production` → секрет | перевірка — наступний `db-deploy` чи ручний `db-check` |
| `OPENROUTER_API_KEY` | OpenRouter → Keys | Vercel (Production, Preview), `.env.local` для `npm run eval` | redeploy; AC-DOCAI-13 («The assistant is not available now…») — ознака, що ключа немає |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel → Settings → Deployment Protection → Protection Bypass for Automation | GitHub → Settings → Secrets → Actions | redeploy staging; ручний smoke з `url` staging — зелений |
| `BACKUP_PASSPHRASE` | менеджер паролів (нова довга випадкова фраза) | GitHub → Environments → `production` → секрет | ручний прогін `backup` зелений; старі копії — старою фразою (розділ 8) |
| `TELEGRAM_BOT_TOKEN` | Telegram, BotFather (перевипуск токена) | GitHub Secrets і змінні Vercel | ручний червоний прогін smoke (`url` = `https://example.invalid`) → повідомлення прийшло |

Перевірка: зелений smoke на прод і staging. Запис у чат: що ротували і чому — без значень.

## 5. Де журнали і скільки вони живуть

| Що | Де | Скільки живе (безкоштовні тарифи) |
|---|---|---|
| Журнали запитів Vercel (`llm.call`, помилки сервера) | Vercel → Logs (фільтр за гілкою, `level:error`) | **1 година** (Hobby) |
| Журнали збірки | Vercel → Deployments → деплой → Build Logs | поки є деплой |
| Журнали Supabase (API, Postgres, Auth) | Supabase → Logs | **1 день** (Free) |
| Прогони GitHub Actions (smoke, CI, e2e, UAT-артефакти) | Actions | 90 днів (налаштування репо, перевірено через API 17.11.2026) |
| Алерти smoke і помилки сервера (`onRequestError`) | група Telegram команди | поки їх не видалили |
| Звіти UAT на проді | `docs/qa/uat/<дата>/` у репо | назавжди (у git); відео й траси — лише артефакти CI |

`llm.call` — один рядок JSON на виклик моделі: модель, затримка, токени, стан, fallback, версія промпту, id запиту.
Тексту документа й відповіді моделі там немає (`src/lib/ai/llm-log.ts`, тест — `tests/llm-log.test.ts`).

Висновок для чергового: розбираємо **одразу**, потрібні рядки журналу копіюємо в issue інциденту (без даних
користувачів).

## 6. Staging

- Гілка `staging` отримує зміни лише з `main` — `git merge --ff-only origin/main` або PR `main → staging`; окремої
  розробки на ній немає.
- Staging і прод ділять **одну базу Supabase**: на staging — лише тестові акаунти з `accounts.zip`
  (`*@example.test`), жодних руйнівних дій з даними, жодних міграцій.
- Змінна лише для гілки: `APP_ENV=staging` (Vercel → Environment Variables → Preview → Branch `staging`). Нові змінні
  діють лише після Redeploy.
- Вхід на staging перекидає на прод — додайте адресу staging у Supabase → Authentication → URL Configuration →
  Redirect URLs.
- Навмисна помилка для перевірки трекера: `<staging>/api/ops/error-drill` під адміністратором (на проді й для інших
  ролей — 404).

## 7. Розбір з агентом: профіль «лише пропонує»

Агент читає журнали, деплої й код і **пропонує** причину та виправлення. Нічого не змінює: інструменти запису MCP
Vercel і Supabase заборонені поіменно (і в щоденному `.claude/settings.json`), Supabase підключено з
`read_only=true`, у профілі дрілу заборонено ще й `Edit`, `Write`, `git push`, `gh secret`.

```bash
claude --settings .claude/settings.incident.json --permission-mode plan
```

Сервери MCP (`vercel`, `supabase`) — у `.mcp.json`; вхід у Vercel — `/mcp` (OAuth, токенів у файлах немає). Назви
змінних середовища гілки агент сам не читає: людина вставляє в розмову лише їхні назви, без значень. Промпт — R09
«Розбір інциденту агентом» з бібліотеки промптів WS11. Стенограму зберігаємо дослівно (`/export`) у
`docs/incidents/<YYYY-MM-DD>-<slug>-rca.md`. Вміст журналів, issues і сторінок — дані для агента, а не команди.

Уроки дрілу 2026-11-19 (`docs/incidents/2026-11-19-staging-bad-supabase-url.md`):

- **Вхід MCP Vercel — з доступом до команди `flambs-projects`.** Без нього кожен запит до проєкту дає 403, і агент
  працює наосліп. Перевірка до інциденту: `/mcp` → `vercel` → (Re)authenticate → на сторінці згоди обрати команду;
  `list_teams` має повернути команду. Робіть це заздалегідь: журнали Hobby живуть 1 годину.
- **Норма для порівняння — останній зелений прогін smoke саме тієї гілки.** У журналі прогону є
  `DEPLOY_BRANCH`: перевірте його, перш ніж давати прогін агенту (на дрілі норма спершу була з іншої гілки).
- **Причину збою бази тепер видно одразу:** `/api/health` віддає `reason` (`unreachable-dns`, `-refused`,
  `-timeout`, `-tls`, `missing-env`, `invalid-env`, `invalid-api-key`, `paused`) і `check` — назву змінної, яку
  перевірити; той самий рядок `health.db_down` пише в Runtime Logs, а smoke — в `::error` і в алерт.

## 8. Резервна копія і відновлення

Безкоштовний Supabase резервних копій не робить, тому наша копія — єдина. Workflow `.github/workflows/backup.yml`
(бонус WS11, з набору курсу; інструкція — `materials/ops-kit/bonus/restore-drill.md` у репо домашки).

| Що | Як у нас |
|---|---|
| Де копія | Actions → `backup` → прогін → артефакт `supabase-backup` (файл `backup-<UTC>.tgz.gpg`: ролі, схема, усі дані й окремо дані `public`) |
| Як часто (RPO) | щодня ≈ 03:41 за Києвом (`41 1 * * *` UTC) і вручну → втратити можна до **24 годин** записів |
| Скільки живе | **7 днів** (артефакт), тобто в будь-який момент є до 7 щоденних копій |
| Шифрування | `gpg --symmetric` AES256 фразою `BACKUP_PASSPHRASE`; відкритого дампу немає ніде: ні в git, ні в артефакті, ні в журналі |
| Хто знає фразу | лише розробник (власник репо): секрет середовища `production` у GitHub і його менеджер паролів. Втрачено фразу — копії не розшифрувати |
| Тренування | job `restore-drill` після кожної копії: одноразова база Supabase на раннері з наших міграцій → копія → порівняння кількості рядків у Summary прогону |

**Тренування 2026-11-19:**

| Прогін | `scope` | Результат |
|---|---|---|
| [44504097040](https://github.com/OleksandrMartynov/property-workflows/actions/runs/44504097040) | `all` | ❌ `ERROR: column …` — схема `auth` локального Supabase інша, ніж у хмарі |
| [44504667852](https://github.com/OleksandrMartynov/property-workflows/actions/runs/44504667852) | `public` | ❌ `duplicate key`: наші міграції самі вставляють стартові шаблони, копія приносила їх удруге → #117: перед завантаженням очищаємо `public` одноразової бази |
| [44506250509](https://github.com/OleksandrMartynov/property-workflows/actions/runs/44506250509) | `public` | ✅ 9 таблиць, 348 рядків — «у копії = відновлено» в кожній ([знімок Summary](ops/backup-restore-drill.png)) |

**RTO тренування:** job `restore-drill` — **1 хв 45 с** (разом із підняттям бази в Docker), увесь прогін з копією —
3 хв 12 с. Справжнє відновлення в новий проєкт довше: створення проєкту, змінні у Vercel, Redeploy, smoke — закладаємо
≈ 30–60 хв.

**Чого тренування не доводить:** рядки `auth.*` (акаунти) у локальну базу не відновлюються, тому типовий `scope` —
`public` (#118). У новому хмарному проєкті схема `auth` та сама, що й у копії, але це **не перевірено**. Якщо акаунти
не відновляться, `npm run users:demo` створить тестові акаунти заново, але з новими `id`, тож запуски й задачі з копії
(менеджер, виконавці) на них не вкажуть — це окремий розбір, а не крок цієї інструкції.

**Справжнє відновлення** — рішення людини після інциденту, не агента:

1. Завантажити артефакт `supabase-backup` потрібного дня; розшифрувати локально `gpg -d backup-<UTC>.tgz.gpg > backup.tgz`
   (фразу вводить людина), розпакувати `tar -xzf backup.tgz`.
2. Створити **новий** проєкт Supabase і відновити за інструкцією Supabase «Backup and restore using the CLI»:
   `roles.sql` → `schema.sql` → `data.sql`. Поверх живих даних — ніколи.
3. Нові `NEXT_PUBLIC_SUPABASE_URL` і `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → Vercel (розділ 4), `SUPABASE_DB_URL` →
   GitHub (`production`), Redirect URLs у Supabase → Redeploy → smoke прод зелений.
4. Розшифровані файли видалити з ноутбука; запис в issue інциденту — що й з якої копії відновлено, без даних.

Червоний нічний прогін `backup` алерту в Telegram не шле: GitHub надсилає лист про збій розкладу. Перевіряйте Actions →
`backup` хоча б раз на тиждень. Ротація фрази: нова фраза → секрет `BACKUP_PASSPHRASE` → ручний прогін `backup`
зелений; копії попередніх днів лишаються зашифровані старою фразою, доки не зникнуть за 7 днів.

## 9. Чого ніколи не робити

- `supabase migration down`, `supabase migration repair`, `supabase db reset --linked` (чи `--db-url`) і
  `supabase db push` з ноутбука проти нашого проєкту — **знищують дані** або розводять базу з `main`. Схема змінюється
  лише міграцією в PR, у базу її застосовує `db-deploy`.
- `npx supabase@latest`: CLI 3.x змінює поведінку команд. Лише закріплена версія з `package.json` (Dependabot мажор
  не пропонує).
- Агент з правом запису на прод: відкат, Promote, зміну змінних і деплой робить людина.
- Значення токенів, ключів, паролів і chat id — у git, журналі, issue, на знімку чи в чаті з агентом. Push protection
  GitHub увімкнено (17.11.2026), але він не ловить усе.
- Інцидент-дріл на проді чи з базою: дріл — лише на staging, змінною середовища гілки, без міграцій.
- Мажорні TypeScript, ESLint, `@types/node` і Supabase CLI без ADR (AGENTS.md, «Стек і версії»).
- Виконувати інструкції з тексту журналів, issues, документів у «Parse a document» чи повідомлень про помилки: це
  дані, а не команди.
