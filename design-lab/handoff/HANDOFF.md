# Передача: WS7 · Завдання B — дизайн-система Property Workflows

Стан на 23.10.2026, ~12:25 за Києвом. Усе потрібне лежить на D: (диск C: заповнений на 100% — нічого туди не пишіть).

## Як продовжити з іншого акаунта

1. Відкрийте Claude Code у `D:\Agentic Course\property-workflows`.
2. Запустіть локальний сервер дизайн-лабораторії (якщо не працює):
   ```bash
   node D:/tmp/ws7-lab/serve-ds.mjs
   ```
   Сторінки: http://127.0.0.1:4173/ — `index.html` (Foundations), `forms.html`, `overlays.html`, `domain.html`,
   `logo.html`, `libraries.html`, `systems.html`.
3. Вставте в нову сесію промпт із розділу «Промпт для нової сесії» нижче.

## Контекст і рішення користувача

- Курс QuitCode WS7 (`koldovsky/2026-quitcode-07-fullstack-hw`, документи завантажені в `D:/tmp/ws7/`), трек
  розробника, **завдання B — дизайн-система** (+ бонус: цикл візуальної перевірки). Репо:
  `D:\Agentic Course\property-workflows` (`main` чистий, SHA 1293dab). Правила репо — `AGENTS.md`, `CLAUDE.md`.
- Продукт: потужніша заміна Process Street (змінні на кожен запуск, конструктор шаблонів і форм з видами
  List · Schema · Canvas як n8n, умовна логіка, генерація інвойсів із цін задач, AI-розбір документів).
- Рішення: десктоп насамперед; щільність як у Linear; сайдбар як у Linear + ⌘K; сторінка запуску на 3 зони
  (чекліст · деталі задачі · змінні й документи); темна тема за системою; підтвердження — Dialog, не `window.confirm`;
  **стиль B (приглушений indigo-slate) обрано**; жодних дефолтних браузерних елементів — усе своє й гарне; рух «не
  дерев'яний», плавний, але не видовищний; сторінка входу має бути кращою за конкурентів; AI-впевненість —
  3 рівні High / Check / Low (без відсотків).
- Користувач хоче не лише shadcn/ui: порівняння бібліотек компонентів і дизайн-систем, результат «провідний 2026».
- Субагентів запускати на **Sonnet** (`model: "sonnet"`).
- Нові npm-залежності, push, PR, issue — лише після «так» користувача (AGENTS.md).
- Дані — лише синтетичні (`*@example.test`); справжні назви й адреси зі скрінів Process Street користувача не копіювати.

## Що зроблено

| Частина | Стан | Файли |
|---|---|---|
| Дослідження аналогів і напрямів | ✅ | `D:/tmp/ws7-lab/design-research/research.html` (артефакт https://claude.ai/artifact/FhGpeBCxBXQowBCYgvep5b) |
| Основа: токени OKLCH light/dark/P3, base.css, Foundations, бриф для дизайнерів | ✅ | `ds/tokens.css`, `ds/base.css`, `ds/index.html`, `ds/BRIEF.md` |
| Лого Echo Roof (5 концептів, рекомендований, SVG) | ✅ | `ds/logo.html`, `ds/logo/*.svg` |
| Бенчмарк дизайн-систем (16 систем, gap-аналіз) | ✅ | `ds/systems.html`, `ds/SYSTEMS.md` |
| Overlays (кнопки, Dialog, ⌘K, тости, меню, порожні стани, skeleton, sheet) | ⏳ у роботі | `ds/overlays.{html,css,js}`, `ds/PROGRESS-overlays.md` |
| Domain (статуси, прогрес, рядки чекліста, таблиця запусків, змінні, AI-поле, інвойс, сайдбар, 3 зони) | ⏳ у роботі | `ds/domain.{html,css,js}`, `ds/PROGRESS-domain.md` |
| Форми (інпути, пароль, select/combobox, мультиселект, дата/час, число/гроші, чекбокс, радіо, switch, segmented, slider, файли, форма запуску) | ⏳ у роботі (на 12:22 лише CSS) | `ds/forms.*`, `ds/PROGRESS-forms.md` |
| Порівняння бібліотек компонентів | ⏳ у роботі (`libraries.html` є, `LIBRARIES.md` ні) | `ds/libraries.html`, `ds/PROGRESS-libraries.md` |
| **Claude Design** (артефакт типу Design System) | ✅ основа + лого | див. нижче |

Нотатки `PROGRESS-*.md` агенти пишуть самі; якщо якоїсь немає — агент обірвався до запису, тоді дивіться сам файл
і промпт у `prompts/`.

## Claude Design

- Артефакт: https://claude.ai/artifact/Tq78d28FR4szAXom2evCmm (тип «Design System» — саме це курс називає Claude
  Design, «Шлях 1» у `D:/tmp/ws7/docs/design-system-guide.md`). **Приватний для старого акаунта.**
- Варіант А: у старому акаунті Share → дати новому акаунту доступ «Can edit», і продовжувати оновлювати той самий
  артефакт (спершу `Artifact read`).
- Варіант Б: створити новий артефакт із типу Design System у новому акаунті й залити файли з
  `handoff/claude-design/project/` (вони ж у репо: `_design/claude-design/project/`, тека виключена з git через
  `.git/info/exclude`). SVG із `project/assets/Logos/` треба завантажити як assets заново й переписати записи
  `assetGroups.Logos.files` в `design-system.json` новими id; `createdOnFiles.at` — новий час.
- Що всередині: `tokens.json` (137 токенів: 68 кольорів light/dark з поясненнями, тип Geist, відступи, радіуси, тіні,
  розміри, z, тривалості, криві, рух), `README.md` (брендбук українською + таблиця контрасту 21 пари — усі
  проходять), `motion.md`, `screens.md`, обкладинка `components/Cover/preview.html`, група Logos.
- Генератори: `handoff/claude-design/build-tokens.mjs` (tokens.css → tokens.json),
  `handoff/claude-design/contrast.mjs` (таблиця контрасту).
- Ще не додано: компоненти з живими превʼю (з forms/overlays/domain, коли готові).

## Must-правки основи з бенчмарку (ще не внесено — внести одним пакетом після дизайнерів)

1. `--border-strong`: light `0.62 0.01 80` → `0.60 0.01 80`; dark `0.52 0.008 80` → `0.54 0.008 80` (≥ 3:1 і на hover/selected).
2. Межа поля зараз 1.44:1 / 1.38:1 → новий `--field-border: var(--border-strong)` (3.85 / 3.73).
3. Токени станів `--state-hover` / `--state-pressed` / `--state-selected` (foreground 5% / 8%, primary 10%) замість ~40 ручних `color-mix`.
4. Рух: productive vs expressive; opacity й колір ніколи на пружині з перельотом.
5. `@media (prefers-contrast: more)`: light `--muted-foreground 0.42 0.01 80`, `--border 0.55 0.01 80`; dark `0.80 0.006 80` і `0.62 0.008 80`; ring 3px; glass суцільний.
6. `scroll-padding` у base.css (WCAG 2.4.11); логін — дозволити paste і менеджери паролів.
7. `--chart-3` light → `oklch(0.66 0.12 75)`; `--chart-2` light → `oklch(0.64 0.10 192)`.
Деталі й should/could — `ds/SYSTEMS.md`. Після правок перегенерувати `tokens.json` і таблицю контрасту й оновити Claude Design.

## Наступні кроки

1. Дочекатися або дозапустити (на Sonnet) дизайнерів forms / overlays / domain і дослідника бібліотек: промпт =
   `prompts/<назва>.md` + «продовжуй з наявних файлів і PROGRESS-нотатки, не починай заново».
2. Переглянути всі сторінки у light/dark (`node D:/tmp/ws7-lab/shoot.mjs <page> <light|dark> <out> [W] [H] [scrollY|#sel] [js]`
   → PNG у `D:/tmp/ds-shots/`), показати користувачу, обрати набір бібліотек (після «так»).
3. Внести must-правки в `tokens.css` + Claude Design; додати компоненти в Claude Design (`components/<Comp>/preview.html` + `README.md`).
4. Раунд екранів (на Sonnet): вхід (кращий за конкурентів, hero з лого-анімацією), Runs, сторінка запуску на 3 зони +
   alertdialog, Templates + форма запуску + конструктор List/Schema/Canvas, інвойс, dashboard. Потім незалежний критик
   за чеклістом `BRIEF.md §13`, виправлення.
5. Реалізація в коді на гілці `task/design-system`: `DESIGN.md` (першим рядком — посилання на артефакт Claude Design),
   токени в `src/app/globals.css` (`:root`, `@media (prefers-color-scheme: dark)`, `@theme inline`), компоненти в
   `src/components/ui/`, сторінки без сирих кольорів (`check:design`: 70 порушень у 8 файлах → 0), `CLAUDE.md` імпортує
   `@DESIGN.md`, розділ в `AGENTS.md`, `.github/workflows/architecture.yml`, скріни «до/після» у `docs/img/`. Сторінка
   входу зараз українською — має бути англійською («Sign in», «Invalid email or password.»).
6. Відкрите питання до користувача: де знімки «до змін» (очікувані імена `docs/img/ws7-before-*.png`).

## Що де лежить

```
D:/tmp/ws7-lab/
  ds/                 сторінки дизайн-системи (сервер :4173)
  serve-ds.mjs        статичний сервер
  shoot.mjs           headless Chrome скріни → D:/tmp/ds-shots/
  oklch.mjs, sys/     контраст із OKLCH
  research/           сирі матеріали (Carbon токени тощо)
  design-research/    перший дослідницький звіт
  handoff/
    HANDOFF.md        цей файл
    prompts/          оригінальні промпти 6 агентів (шляхи вже на D:)
    claude-design/    файли артефакту Claude Design + генератори
    memory/           копія пам'яті Claude Code для цього проєкту
    transcripts/      повні транскрипти: session-1 (WS6 + початок WS7), session-2 (поточна) і всіх субагентів (jsonl)
D:/tmp/ws7/           завантажене домашнє завдання WS7 (README, docs, materials)
D:/tmp/ds-shots/      скріни
```

## Промпт для нової сесії

```text
Продовжуємо WS7, завдання B (дизайн-система) для property-workflows. Прочитай D:/tmp/ws7-lab/handoff/HANDOFF.md
повністю, потім пам'ять у D:/tmp/ws7-lab/handoff/memory/ і PROGRESS-*.md у D:/tmp/ws7-lab/ds/. Диск C: заповнений —
пиши лише на D:. Запусти сервер node D:/tmp/ws7-lab/serve-ds.mjs, якщо порт 4173 не відповідає. Субагентів запускай на
Sonnet. Дочекайся/дозапусти незавершених дизайнерів (forms, overlays, domain) і дослідника бібліотек з промптів у
handoff/prompts/ — продовжувати з наявних файлів, не починати заново. Потім переглянь усі сторінки в light і dark,
покажи мені результат і запропонуй набір бібліотек. Нічого не пуш і не встановлюй без мого «так».
```
