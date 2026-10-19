# 0002. Тести правил бази на PGlite

- Статус: прийнято
- Дата: 2026-10-19
- AC: AC-RUN-01 … AC-RUN-09, AC-TASK-01 … AC-TASK-09

## Контекст

Більшість правил зрізу виконує база: RLS (хто бачить запуск), функції `launch_run` і `complete_task` (копія задач,
права на позначку, завершення запуску), check-обмеження. Docker локально не використовуємо, а `db-check` у CI лише
застосовує міграції й не запускає тестів поведінки. Тест server action з моком supabase-js не перевірив би самих
політик.

## Рішення

- Нова devDependency `@electric-sql/pglite@0.5.8` — справжній Postgres у WASM, у процесі Vitest.
- `tests/db/supabase-pglite.ts` взято з демо курсу
  (https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/blob/main/tests/db/supabase-pglite.ts) і спрощено
  під ролі `manager` / `admin`: емуляція ролей Supabase (`anon`, `authenticated`, `service_role`) і `auth.uid()`,
  застосування всіх `supabase/migrations/*.sql` і `supabase/seed.sql`, користувачі з `supabase/demo-users.json`.
- Тести бази — `tests/db/*.test.ts`, назви з AC ID; запит від імені користувача — `asUser`, перевірка результату в
  обхід RLS — `asService`.

## Розглянуті варіанти

- `supabase start` + pgTAP — потрібен Docker локально й окремий крок CI.
- Моки supabase-js — не перевіряють RLS і функцій, лише наш виклик.

## Наслідки

- `npm test` перевіряє ті самі міграції, що потім застосовує `db-deploy`, за ~1 с.
- Межа емуляції: Auth, PostgREST і JWT спрощені; налаштування хмарного проєкту (реєстрація, Confirm email) тут не
  перевіряються.
