# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести. Одна задача — одна гілка `task/<коротко>` і один PR
«Реалізація». Перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:boundary`.

## 1. Версії шаблону в базі

- [x] 1.1 Міграція: `template_versions`, `template_version_tasks` (RLS, revoke, grant select, без update / delete);
  `templates.current_version`, `templates.has_unpublished_changes` і column grant `update (name)`; `select` незбережених
  змін лише `admin`; тригери позначки; `save_template_version`; `launch_run` з поточної версії й
  `runs.template_version`; перехід даних зрізу 1 у версію 1; `database.types.ts`; ADR 0006.
- [x] 1.2 Форма запуску, дія `launchRun` (`src/app/(app)/runs/actions.ts`) і сторінка запуску читають поточну версію
  (`template_version_tasks`), а не робочі таблиці; назва шаблону для менеджера — з версії; сторінка запуску показує
  «Template version N».
- [x] 1.3 Тести бази (PGlite) на кожен AC задачі, зокрема відмовні: менеджер не змінює незбережені зміни й не
  зберігає версію напряму, не бачить незбережених змін і старих версій — і дані не змінились. Мутаційна перевірка:
  таблиця «AC → що прибрали → який тест упав» в описі PR, ≥ 2 червоні прогони CI на комітах `mutation: …` і revert.
  Done when: AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-06, AC-EDITOR-08.

## 2. Редактор, список версій і відмови

- [x] 2.1 Сторінки `/templates` (за роллю), `/templates/new`, `/templates/[id]/edit` з діями редактора
  (`requireAdmin()` першим рядком), `/templates/[id]/versions`; `Forbidden` з «Not enough rights» і
  «Back to templates»; статуси запуску одним `StatusBadge`; порожній список запусків; `pm-manager@example.test` і
  `pm-admin@example.test`.
- [x] 2.2 Архітектурне правило: `check:boundary` і правило «кожен `actions.ts` викликає `getClaims()` прямо або через
  `requireViewer()` / `requireAdmin()` (крім дії входу)» в `architecture.yml`; червоний прогін на коміті з навмисним
  порушенням, потім revert.
- [x] 2.3 Тести: відмова дії редактора для менеджера (дані не змінились), вибір сторінки «Not enough rights» за роллю,
  формат дати й порядок версій, статуси й порожній стан; мутаційна перевірка перевірки ролі в дії.
  Done when: AC-EDITOR-05, AC-EDITOR-07, AC-EDITOR-09, AC-DSYS-01, AC-DSYS-02, AC-DSYS-03, AC-DSYS-04.
