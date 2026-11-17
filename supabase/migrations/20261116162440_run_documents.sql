-- Зріз 4 «Parse a document and confirm the values» (solomchaak/property-workflows-spec#59, AC-DOCAI-01…16;
-- openspec/specs/document-ai). Блок «Parse a document» — на сторінці запуску, а не в задачі: AI ПРОПОНУЄ значення,
-- людина перевіряє й лише тоді зберігає. Працюють із блоком лише менеджер запуску й адміністратор (AC-DOCAI-14, 15);
-- прямий запит будь-кого іншого — «Not enough rights», без значень і без запису (AC-DOCAI-16). У запуску може бути
-- кілька записів, новіший — першим (припущення PM).
--
-- РИЗИК (деструктивна зміна): прибираємо документи задач з #92 (run_task_documents, check_task_document,
-- save_task_document) — їх писав і підрядник, і будь-який виконавець задачі, а це суперечить AC-DOCAI-14…16. Дані
-- там лише синтетичні (робоче припущення до вимоги PM); перенесення в run_documents не робимо: записи задач не мають
-- менеджера, який їх підтвердив би в новому сенсі.

-- ── 0. Документи задач (#92) — прибрати ──────────────────────────────────────────────────────────────────────────
drop function if exists public.save_task_document(uuid, text, text, text, text, text, jsonb, numeric);
drop function if exists private.save_task_document(uuid, text, text, text, text, text, jsonb, numeric);
drop function if exists public.check_task_document(uuid);
drop function if exists private.check_task_document(uuid);
drop table if exists public.run_task_documents;

-- ── 1. Підтверджені значення документа запуску ───────────────────────────────────────────────────────────────────
-- Переліки — значення PM: категорії й терміновість (src/lib/ai/schema.ts).
create table public.run_documents (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.runs (id) on delete cascade,
  kind        text not null constraint run_documents_kind_check check (kind in ('request', 'estimate')),
  phone       text constraint run_documents_phone_check check (phone ~ '^[0-9]{3}-[0-9]{4}$'),
  description text constraint run_documents_description_check
                check (description = btrim(description) and char_length(description) between 1 and 400),
  category    text constraint run_documents_category_check
                check (category in ('plumbing', 'electrical', 'heating_and_cooling', 'appliance', 'structure_and_doors', 'other')),
  urgency     text constraint run_documents_urgency_check check (urgency in ('urgent', 'not_urgent')),
  -- Позиції кошторису: [{"name": text, "quantity": number > 0, "unitPrice": number >= 0}], до 30; форму перевіряє
  -- save_run_document (check не може містити підзапит).
  items       jsonb constraint run_documents_items_check check (jsonb_typeof(items) = 'array'),
  total       numeric(12, 2) constraint run_documents_total_check check (total >= 0),
  saved_by    uuid not null references public.profiles (id),
  saved_at    timestamptz not null default now(),
  constraint run_documents_not_empty check (num_nonnulls(phone, description, category, urgency, items, total) >= 1)
);

create index run_documents_run_id_saved_at_idx on public.run_documents (run_id, saved_at desc);

comment on table public.run_documents is
  'Значення документа запуску, які підтвердив менеджер запуску чи адміністратор (AI лише пропонує). Пише лише save_run_document.';

alter table public.run_documents enable row level security;

revoke all on table public.run_documents from anon, authenticated;
-- Клієнт лише читає; запис — функцією save_run_document нижче.
grant select on table public.run_documents to authenticated;
grant select, insert, update, delete on table public.run_documents to service_role;

-- Бачать записи ті самі, хто бачить блок: адміністратор і менеджер запуску (AC-DOCAI-14, 15). Підрядник і
-- менеджер-виконавець чужого запуску записів не отримують навіть прямим запитом (AC-DOCAI-16).
create policy run_documents_select_run_manager_or_admin on public.run_documents
  for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or exists (
      select 1 from public.runs as r
      where r.id = run_id and r.run_manager_id = (select auth.uid())
    )
  );

-- ── 2. Чи можна працювати з документом запуску ───────────────────────────────────────────────────────────────────
-- Server Action кличе її ДО виклику моделі (нічого не пише), save_run_document — перед записом. Будь-хто, крім
-- адміністратора й менеджера цього запуску, — DOCUMENT_NOT_ALLOWED («Not enough rights», AC-DOCAI-16); чужий чи
-- неіснуючий запуск для менеджера — та сама відмова, щоб не підказувати, які запуски існують.
create or replace function private.check_run_document(p_run_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text := (select private.current_app_role());
  v_run  public.runs;
begin
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'DOCUMENT_NOT_ALLOWED';
  end if;

  select * into v_run from public.runs as r where r.id = p_run_id;
  if v_role = 'admin' and v_run.id is null then
    raise exception 'RUN_NOT_FOUND';
  end if;
  if v_role <> 'admin' and (v_run.id is null or v_run.run_manager_id is distinct from v_uid) then
    raise exception 'DOCUMENT_NOT_ALLOWED';
  end if;

  return true;
end;
$$;

revoke execute on function private.check_run_document(uuid) from public, anon;
grant execute on function private.check_run_document(uuid) to authenticated;

create or replace function public.check_run_document(p_run_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.check_run_document(p_run_id);
$$;

revoke execute on function public.check_run_document(uuid) from public, anon;
grant execute on function public.check_run_document(uuid) to authenticated;

-- ── 3. Збереження значень, які людина підтвердила (AC-DOCAI-04, AC-DOCAI-13) ────────────────────────────────────
-- Кожне «Save values» — новий запис (у запуску може бути кілька). Права — check_run_document; значення — ті самі
-- перевірки, що й у формі (src/lib/runs/run-document.ts), бо функцію можна покликати напряму.
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

revoke execute on function private.save_run_document(uuid, text, text, text, text, text, jsonb, numeric) from public, anon;
grant execute on function private.save_run_document(uuid, text, text, text, text, text, jsonb, numeric) to authenticated;

create or replace function public.save_run_document(
  p_run_id      uuid,
  p_kind        text,
  p_phone       text default null,
  p_description text default null,
  p_category    text default null,
  p_urgency     text default null,
  p_items       jsonb default null,
  p_total       numeric default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.save_run_document(p_run_id, p_kind, p_phone, p_description, p_category, p_urgency, p_items, p_total);
$$;

revoke execute on function public.save_run_document(uuid, text, text, text, text, text, jsonb, numeric) from public, anon;
grant execute on function public.save_run_document(uuid, text, text, text, text, text, jsonb, numeric) to authenticated;
