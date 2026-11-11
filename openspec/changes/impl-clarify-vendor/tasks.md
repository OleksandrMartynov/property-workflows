# Tasks

Вертикальні задачі: UI + дія + база + тест. Одна задача — одна гілка `task/<коротко>` і один PR «Реалізація».
Перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:copy`.

## 1. Позначка задачі й прямі запити підрядника (база)

- [ ] 1.1 Міграція `…_vendor_clarify.sql`: нова версія `private.complete_task` — `RUN_NOT_FOUND` для запуску без задач
  підрядника, текст PM у деталях `NOT_ALLOWED`, необов'язкова задача завершеного запуску.
- [ ] 1.2 `RUN_NOT_FOUND` → «Run not found» у `src/lib/runs/messages.ts`.
- [ ] 1.3 Тести бази з AC ID і SQL-мутанти.
  Done when: AC-VENDOR-07, AC-VENDOR-15, AC-VENDOR-16, AC-VENDOR-17, AC-VENDOR-18, AC-TASK-19.

## 2. Сторінки й навігація підрядника

- [ ] 2.1 Сторінка запуску підрядника без статусу запуску.
- [ ] 2.2 Навігація підрядника — «Runs» і «Profile»; сторінка `/profile`.
- [ ] 2.3 Тести компонентів і сторінок з AC ID (рядок списку, закриті сторінки шаблонів).
  Done when: AC-VENDOR-11, AC-VENDOR-12, AC-VENDOR-13, AC-VENDOR-14.

## 3. UAT на проді

- [ ] 3.1 Специфікації Playwright на нові й змінені AC, прогін на проді, звіт, proof pack, `docs/conformance.md`.
  Done when: AC-VENDOR-07, AC-VENDOR-08, AC-VENDOR-11…18 і AC-TASK-19 доведено UAT на проді.
