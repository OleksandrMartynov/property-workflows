-- Відгук викладача до WS10 (koldovsky/2026-quitcode-10-ai-features-hw#13), пункти 2 і 4: денний ліміт викликів моделі
-- на одного користувача — на сервері, і save_run_document відхиляє те саме, що й форма (src/lib/runs/run-document.ts).
-- Застосовану міграцію 20261116162440_run_documents.sql не редагуємо — функцію замінює create or replace нижче.

-- ── 1. Денний ліміт викликів моделі на користувача ───────────────────────────────────────────────────────────────
-- Безкоштовний тариф OpenRouter — 50 запитів на добу на весь акаунт, тобто на всіх менеджерів разом. Без ліміту на
-- людину один менеджер запуску (чи скрипт, що напряму кличе Server Action) вимкнув би помічника для всіх до наступної
-- доби. Лічильник — у базі, а не в пам'яті сервера: серверні функції Vercel не зберігають стан між запусками.
-- Доба — UTC, як у ліміту OpenRouter.
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  count   integer not null default 0 constraint ai_usage_count_check check (count >= 0),
  primary key (user_id, day)
);

comment on table public.ai_usage is
  'Скільки разів користувач просив AI запропонувати значення за добу (UTC). Пише лише private.consume_ai_quota.';

alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from anon, authenticated;
grant select on table public.ai_usage to authenticated;
grant select, insert, update, delete on table public.ai_usage to service_role;

create policy ai_usage_select_own on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Межу задає база, а не параметр: інакше клієнт, що кличе функцію напряму, передав би собі будь-яку межу.
-- 10 на людину на добу: один прогін документа — один виклик (повтор при збої постачальника лишається в межах
-- одного виклику), а 50 на акаунт вистачає на кількох менеджерів.
create or replace function private.consume_ai_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_limit constant integer := 10;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Один атомарний запит: два одночасні виклики не проскочать межу (рядок блокує upsert).
  insert into public.ai_usage as u (user_id, day, count)
  values (v_uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < v_limit
  returning u.count into v_count;

  if v_count is null then
    raise exception 'DAILY_LIMIT';
  end if;
  return v_count;
end;
$$;

revoke execute on function private.consume_ai_quota() from public, anon;
grant execute on function private.consume_ai_quota() to authenticated;

create or replace function public.consume_ai_quota()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.consume_ai_quota();
$$;

revoke execute on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;

-- ── 2. Сума «не число» ───────────────────────────────────────────────────────────────────────────────────────────
-- numeric приймає 'NaN', а в Postgres NaN >= 0 істинне, тож run_documents_total_check його пропускав. Форма (zod) NaN
-- не пропускає; прямий rpc — пропускав.
alter table public.run_documents
  add constraint run_documents_total_finite check (total <> 'NaN'::numeric);

-- ── 3. save_run_document: позиції так само суворо, як у формі ────────────────────────────────────────────────────
-- Було: btrim прибирав лише пробіли (назва з самого переносу рядка проходила), зайві ключі позиції будь-якого розміру
-- зберігались. Стане: рівно три ключі (name, quantity, unitPrice), у назві є хоч один непробільний символ, довжина без
-- пробільних символів на краях — 1…120, як у zod (`z.string().trim().min(1).max(120)`). Решта — як у 20261116162440.
create or replace function private.save_run_document(
  p_run_id      uuid,
  p_kind        text,
  p_phone       text,
  p_description text,
  p_category    text,
  p_urgency     text,
  p_items       jsonb,
  p_total       numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_run_document(p_run_id);

  -- Порожній список позицій — «позицій немає».
  if (case when jsonb_typeof(p_items) = 'array' then jsonb_array_length(p_items) = 0 else false end) then
    p_items := null;
  end if;
  -- IS DISTINCT FROM, а не <>: відсутній ключ дає NULL, і «NULL <> 'string'» не спрацював би (позиція {} пройшла б).
  -- CASE — щоб довжину й елементи рахувати лише для масиву (порядок обчислення OR Postgres не гарантує).
  if p_items is not null and (
       case
         when jsonb_typeof(p_items) is distinct from 'array' then true
         when jsonb_array_length(p_items) > 30 then true
         else exists (
           select 1 from jsonb_array_elements(p_items) as e(item)
           where case
                   when jsonb_typeof(e.item) is distinct from 'object' then true
                   when (select count(*) from jsonb_object_keys(e.item)) <> 3 then true
                   when jsonb_typeof(e.item -> 'name') is distinct from 'string' then true
                   when jsonb_typeof(e.item -> 'quantity') is distinct from 'number' then true
                   when jsonb_typeof(e.item -> 'unitPrice') is distinct from 'number' then true
                   when (e.item ->> 'name') !~ '[^[:space:]]' then true
                   else char_length(regexp_replace(e.item ->> 'name', '^[[:space:]]+|[[:space:]]+$', '', 'g')) not between 1 and 120
                     or (e.item ->> 'quantity')::numeric <= 0
                     or (e.item ->> 'unitPrice')::numeric < 0
                 end
         )
       end
     ) then
    raise exception 'DOCUMENT_INVALID';
  end if;

  if num_nonnulls(p_phone, p_description, p_category, p_urgency, p_items, p_total) = 0 then
    raise exception 'DOCUMENT_EMPTY';
  end if;

  begin
    insert into public.run_documents (run_id, kind, phone, description, category, urgency, items, total, saved_by)
    values (p_run_id, p_kind, p_phone, p_description, p_category, p_urgency, p_items, p_total, (select auth.uid()))
    returning id into v_id;
  exception
    -- Значення поза переліками й форматами (прямий rpc в обхід форми) — один зрозумілий код.
    when check_violation or not_null_violation or numeric_value_out_of_range then
      raise exception 'DOCUMENT_INVALID';
  end;
  return v_id;
end;
$$;
