# Tasks

Вертикальні задачі: кожна — міграція (за потреби) + доменна функція + сторінка / дія + тест. Одна задача — одна гілка
`task/<коротко>` і один PR «Реалізація». Перевірка — `npm test`, `npm run ac:coverage`.

## 4. Запуск і сторінка запуску

- [x] 4.1 Міграція: `private.launch_run` відкидає призначення для задачі, якої немає в шаблоні (D11); тести бази.
  Done when: AC-RUN-04 — призначення для прибраної задачі відкинуто, запуск створено; AC-RUN-10, AC-RUN-11, AC-RUN-12 —
  тести бази й юніт-тести зелені.
- [x] 4.2 `not-found.tsx` з «Run not found» (D12); `groupBySection`, `requiredLabel` на сторінці запуску (D14); тести.
  Done when: AC-TASK-10, AC-TASK-11, AC-TASK-12, AC-TASK-15, AC-TASK-18.

## 5. Підтвердження і список запусків

- [x] 5.1 Міграція: `complete_task(p_task_id, p_confirmed)` з `CONFIRMATION_REQUIRED` (D13); `isLastRequiredTask`,
  `confirmationText`, клієнтський `MarkDoneButton`, `confirmed` у дії `completeTask`; тести.
  Done when: AC-TASK-04 — після підтвердження запуск «completed»; AC-TASK-16 — скасування лишає задачу «to do».
- [x] 5.2 Тести списку запусків на базі (D15).
  Done when: AC-TASK-13, AC-TASK-14, AC-TASK-17.
