# План реалізації: зріз 3 — підрядник працює лише зі своїми задачами

## Why

Реалізуємо зріз 3 — сценарії `openspec/specs/vendor-access/spec.md` і змінені вимоги `run-launch` та `run-progress`,
внесені зміною специфікації `add-vendor` за знімком вимог PM від 2026-10-30
(`Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-30`; вимога
https://github.com/solomchaak/property-workflows-spec/issues/39). Нова роль `vendor`: підрядник — виконавець задач,
який бачить лише свої задачі.

## What Changes

Зміна плану (`skip_specs: true`): специфікацію не змінює, лише описує, як реалізуємо AC з `openspec/specs/`.

- Задача 1 — роль `vendor` у базі, призначення підрядника й видимість лише своїх задач: AC-VENDOR-01, AC-VENDOR-02,
  AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06, AC-VENDOR-07, AC-VENDOR-09.
- Задача 2 — сторінки підрядника: список запусків, сторінка запуску, відмова на шаблонах, навігація: AC-VENDOR-03,
  AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-08, AC-VENDOR-10.
- Задача 3 — тестовий акаунт підрядника на проді: `supabase/demo-users.json`, `accounts.zip`.
