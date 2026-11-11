# Tasks

Вертикальні задачі: UI + дія + база + тест. Одна задача (усі її пункти: код, тести й рядки матриці) — одна гілка
`task/<коротко>` і один PR «Реалізація».
Перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:copy`.

## 1. Позначка задачі й прямі запити підрядника (база)

- [ ] 1.1 Міграція `…_vendor_clarify.sql`: нова версія `private.complete_task` — `RUN_NOT_FOUND` для запуску без задач
  підрядника, текст PM у деталях `NOT_ALLOWED`, необов'язкова задача завершеного запуску.
- [ ] 1.2 `RUN_NOT_FOUND` → «Run not found» у `src/lib/runs/messages.ts`; `canCompleteTask` (`src/lib/runs/access.ts`)
  пропонує «Mark as done» і на необов'язковій задачі «to do» завершеного запуску (AC-VENDOR-16, AC-TASK-19).
- [ ] 1.3 Тести бази й `canCompleteTask` з AC ID, SQL-мутанти; тест сторінки запуску менеджера й підрядника: у запуску
  «completed» «Mark as done» є на необов'язковій задачі «to do» і немає на обов'язковій (дані задач — з полем `required`);
  рядки `docs/conformance.md` цих AC — у тому самому PR, що й код 1.1–1.2.
  Done when: AC-VENDOR-07, AC-VENDOR-15, AC-VENDOR-16, AC-VENDOR-17, AC-VENDOR-18, AC-TASK-19.

## 2. Сторінки й навігація підрядника

- [ ] 2.1 Сторінка запуску підрядника без статусу запуску.
- [ ] 2.2 Навігація підрядника — «Runs» і «Profile»; сторінка `/profile`.
- [ ] 2.3 Тести компонентів і сторінок з AC ID (рядок списку, закриті сторінки шаблонів); рядки `docs/conformance.md` цих
  AC — у тому самому PR, що й код 2.1–2.2.
  Done when: AC-VENDOR-11, AC-VENDOR-12, AC-VENDOR-13, AC-VENDOR-14.

## 3. UAT на проді

- [ ] 3.1 Специфікації Playwright на нові й змінені AC, прогін на проді, звіт, proof pack; у `docs/conformance.md` —
  шляхи UAT і, за потреби, уточнення рядків за результатом прогону.
  Done when: AC-VENDOR-07, AC-VENDOR-08, AC-VENDOR-11…18 і AC-TASK-19 доведено UAT на проді.
