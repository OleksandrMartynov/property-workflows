# Tasks

Вертикальні задачі: UI + дія + база + тест. Одна задача — одна гілка `task/<коротко>` і один PR «Реалізація».
Перевірка — `npm test`, `npm run ac:coverage`, `npm run check:design`, `npm run check:copy`.

## 1. Роль vendor у базі

- [x] 1.1 Міграція `…_vendor_role.sql`: `profiles_role_check` з `vendor`; `run_tasks_select_visible` — підрядник
  бачить лише свої задачі; `launch_run` приймає підрядника виконавцем; `list_assignable_users` повертає підрядників
  менеджеру й адміністратору; `complete_task` допускає підрядника до своєї задачі; `run_last_required_task`.
- [x] 1.2 `AppRole` з `vendor`, `requireViewer()` пускає підрядника; `INVALID_ASSIGNEE` з підрядником.
- [x] 1.3 Тести бази з AC ID: призначення, вибір виконавця, лише свої задачі, позначка своєї й відмова для чужої,
  чужий запуск, прямий запуск шаблону; кожна відмова перевіряє і відмову, і незмінні дані.
  Done when: AC-VENDOR-01, AC-VENDOR-02, AC-VENDOR-07, AC-VENDOR-09.

## 2. Сторінки підрядника

- [ ] 2.1 `/runs` для підрядника — `VendorRunsList` («Your tasks: N of K done», статус, назва випадку) і порожній стан
  «No tasks assigned to you yet.»; `/` веде на `/runs`.
- [ ] 2.2 `/runs/[id]` для підрядника — лише свої задачі без email і прогресу запуску, «Mark as done» з
  підтвердженням останньої обов'язкової задачі.
- [ ] 2.3 Шаблони для підрядника — «Not enough rights» і «Back to runs»; навігація без Templates.
- [ ] 2.4 Тести компонентів і сторінок з AC ID.
  Done when: AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06, AC-VENDOR-08, AC-VENDOR-10.

## 3. Акаунт підрядника на проді

- [ ] 3.1 `pm-vendor@example.test` у `supabase/demo-users.json` (у кінці списку), `npm run users:demo` на проді,
  оновлений `accounts.zip`; PM і UAT входять під підрядником.
  Done when: AC-VENDOR-03, AC-VENDOR-10 відтворюються на проді під акаунтом підрядника.
