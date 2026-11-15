-- Зріз 4 «AI document parsing» (roadmap PM, рядок WS10 у solomchaak/property-workflows-spec#1; golden cases —
-- solomchaak/property-workflows-spec#40; ADR 0008). У задачі запуску AI читає документ (лист мешканця, розшифровку
-- дзвінка, кошторис підрядника) і ПРОПОНУЄ значення; людина перевіряє, виправляє й лише тоді зберігає. Модель у базу
-- не пише нічого: запис робить лише save_task_document під сесією користувача, після його «Save values».
-- Вимоги зрізу 4 з AC у PM ще немає: хто зберігає значення — ті самі, хто позначає задачу (виконавець, менеджер
-- запуску, адміністратор; підрядник — лише своя задача), і лише поки задача «to do» в запуску «in progress».

-- ── 1. Значення документа задачі ────────────────────────────────────────────────────────────────────────────────
-- Один документ на задачу: повторне збереження замінює значення (поки задача «to do»). Переліки — значення PM із
-- «Правил для кейсів» (#40), ті самі, що в src/lib/ai/schema.ts.
create table public.run_task_documents (
  task_id     uuid primary key references public.run_tasks (id) on delete cascade,
  kind        text not null constraint run_task_documents_kind_check check (kind in ('request', 'estimate')),
  phone       text constraint run_task_documents_phone_check check (phone ~ '^[0-9]{3}-[0-9]{4}$'),
  description text constraint run_task_documents_description_check
                check (description = btrim(description) and char_length(description) between 1 and 400),
  category    text constraint run_task_documents_category_check
                check (category in ('plumbing', 'electrical', 'heating_and_cooling', 'appliance', 'structure_and_doors', 'other')),
  urgency     text constraint run_task_documents_urgency_check check (urgency in ('urgent', 'not_urgent')),
  -- Позиції кошторису: [{"name": text, "quantity": number > 0, "unitPrice": number >= 0}], до 30; форму перевіряє
  -- save_task_document (check не може містити підзапит).
  items       jsonb constraint run_task_documents_items_check check (jsonb_typeof(items) = 'array'),
  total       numeric(12, 2) constraint run_task_documents_total_check check (total >= 0),
  saved_by    uuid not null references public.profiles (id),
  saved_at    timestamptz not null default now(),
  constraint run_task_documents_not_empty check (num_nonnulls(phone, description, category, urgency, items, total) >= 1)
);

comment on table public.run_task_documents is
  'Значення документа задачі запуску, які людина перевірила й зберегла (AI лише пропонує). Пише лише save_task_document.';

alter table public.run_task_documents enable row level security;

revoke all on table public.run_task_documents from anon, authenticated;
-- Клієнт лише читає; запис — функцією save_task_document нижче.
grant select on table public.run_task_documents to authenticated;
grant select, insert, update, delete on table public.run_task_documents to service_role;

-- Бачить значення той, хто бачить задачу: підзапит іде під RLS run_tasks (підрядник — лише свої задачі).
create policy run_task_documents_select_visible on public.run_task_documents
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and exists (select 1 from public.run_tasks as t where t.id = task_id)
  );

-- ── 2. Чи можна працювати з документом задачі ───────────────────────────────────────────────────────────────────
-- Ті самі умови, що в complete_task (і canCompleteTask у TS): роль, своя задача підрядника, виконавець / менеджер
-- запуску / адміністратор, задача «to do», запуск «in progress». Server Action requestDocumentDraft кличе її ДО
-- виклику моделі (нічого не пише), save_task_document — перед записом. Помилка — код, як у complete_task.
create or replace function private.check_task_document(p_task_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text;
  v_task public.run_tasks;
  v_run  public.runs;
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin', 'vendor') then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into v_task from public.run_tasks as t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  select * into v_run from public.runs as r where r.id = v_task.run_id;

  -- Підрядник — лише задача, де він виконавець (як у complete_task, AC-VENDOR-07).
  if v_role = 'vendor' and v_task.assignee_id is distinct from v_uid then
    raise exception 'NOT_ALLOWED';
  end if;
  if not (v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid) then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Значення виконаної задачі не змінюємо: вони — частина її історії.
  if v_task.status <> 'to_do' then
    raise exception 'TASK_DONE';
  end if;
  if v_run.status <> 'in_progress' then
    raise exception 'RUN_COMPLETED';
  end if;

  return true;
end;
$$;

revoke execute on function private.check_task_document(uuid) from public, anon;
grant execute on function private.check_task_document(uuid) to authenticated;

create or replace function public.check_task_document(p_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.check_task_document(p_task_id);
$$;

revoke execute on function public.check_task_document(uuid) from public, anon;
grant execute on function public.check_task_document(uuid) to authenticated;

-- ── 3. Збереження значень, які людина підтвердила ───────────────────────────────────────────────────────────────
-- Права й статуси — check_task_document під блокуванням рядка задачі й запуску (той самий порядок, що в
-- complete_task: спершу задача, потім запуск), тож одночасна позначка задачі не проскочить між перевіркою й записом.
create or replace function private.save_task_document(
  p_task_id     uuid,
  p_kind        text,
  p_phone       text,
  p_description text,
  p_category    text,
  p_urgency     text,
  p_items       jsonb,
  p_total       numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
begin
  select t.run_id into v_run_id from public.run_tasks as t where t.id = p_task_id for update;
  perform 1 from public.runs as r where r.id = v_run_id for update;
  perform private.check_task_document(p_task_id);

  -- Порожній список позицій — «позицій немає».
  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) = 0 then
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
                   when jsonb_typeof(e.item -> 'name') is distinct from 'string' then true
                   when jsonb_typeof(e.item -> 'quantity') is distinct from 'number' then true
                   when jsonb_typeof(e.item -> 'unitPrice') is distinct from 'number' then true
                   else char_length(btrim(e.item ->> 'name')) not between 1 and 120
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
    insert into public.run_task_documents (task_id, kind, phone, description, category, urgency, items, total, saved_by)
    values (p_task_id, p_kind, p_phone, p_description, p_category, p_urgency, p_items, p_total, (select auth.uid()))
    on conflict (task_id) do update
      set kind = excluded.kind,
          phone = excluded.phone,
          description = excluded.description,
          category = excluded.category,
          urgency = excluded.urgency,
          items = excluded.items,
          total = excluded.total,
          saved_by = excluded.saved_by,
          saved_at = now();
  exception
    -- Значення поза переліками й форматами (прямий rpc в обхід форми) — один зрозумілий код.
    when check_violation or not_null_violation or numeric_value_out_of_range then
      raise exception 'DOCUMENT_INVALID';
  end;
end;
$$;

revoke execute on function private.save_task_document(uuid, text, text, text, text, text, jsonb, numeric) from public, anon;
grant execute on function private.save_task_document(uuid, text, text, text, text, text, jsonb, numeric) to authenticated;

create or replace function public.save_task_document(
  p_task_id     uuid,
  p_kind        text,
  p_phone       text default null,
  p_description text default null,
  p_category    text default null,
  p_urgency     text default null,
  p_items       jsonb default null,
  p_total       numeric default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.save_task_document(p_task_id, p_kind, p_phone, p_description, p_category, p_urgency, p_items, p_total);
$$;

revoke execute on function public.save_task_document(uuid, text, text, text, text, text, jsonb, numeric) from public, anon;
grant execute on function public.save_task_document(uuid, text, text, text, text, text, jsonb, numeric) to authenticated;
