-- Назви шаблону, секцій і задач (зріз 2, ADR 0007): AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-23, AC-EDITOR-24.
-- PM (solomchaak/property-workflows-spec#28, #30): шаблон, секція й задача мають назву, назва лише з пробілів — порожня;
-- назва шаблону унікальна без урахування регістру й пробілів на краях, перевіряється під час СТВОРЕННЯ шаблону й під час
-- ЗБЕРЕЖЕННЯ перейменованого шаблону. Застосованих міграцій не змінюємо.
--
-- Модель. templates.name — назва з незбережених змін (чернетки): вона може бути будь-якою, зокрема порожньою чи
-- такою, що збігається з назвою іншого шаблону, поки адміністратор не зберіг версію (AC-EDITOR-20, AC-EDITOR-24: відмова
-- зберігає «Unpublished changes» разом із введеною назвою). Тому простий unique на templates.name (і будь-який unique
-- індекс на lower(btrim(name)) чернеток) знято. Унікальність тримаємо там, де PM її вимагає:
--   * «назва, яку займає шаблон» — назва його поточної версії, а для шаблону без версії — назва чернетки;
--   * створення (before insert на templates) і збереження (save_template_version) порівнюють lower(btrim(назва)) з
--     «зайнятими» назвами ІНШИХ шаблонів і відмовляють кодом TEMPLATE_NAME_TAKEN;
--   * обидва шляхи беруть один транзакційний advisory lock: два паралельні створення чи збереження з однаковою назвою
--     йдуть по черзі, і другий бачить назву першого (без гонки; unique індексу тут бути не може — правило залежить
--     від двох таблиць і від того, чи є версія).
-- Порожні назви: у чернетках (templates, template_sections, template_tasks) дозволені — стерту назву видно в редакторі
-- й вона лишається до збереження; versions і run_tasks порожніх назв не отримують: save_template_version відмовляє
-- (TEMPLATE_NAME_REQUIRED, ITEM_NAME_REQUIRED). Створити шаблон із порожньою назвою не можна (AC-EDITOR-19).

-- ── Чернетки: порожня назва дозволена, довжина — як було ──────────────────────────────────────────────
alter table public.templates drop constraint templates_name_key;
alter table public.templates drop constraint templates_name_check;
alter table public.templates add constraint templates_name_check check (char_length(btrim(name)) <= 200);
alter table public.template_sections drop constraint template_sections_name_check;
alter table public.template_sections add constraint template_sections_name_check check (char_length(btrim(name)) <= 200);
alter table public.template_tasks drop constraint template_tasks_name_check;
alter table public.template_tasks add constraint template_tasks_name_check check (char_length(btrim(name)) <= 200);

-- ── «Зайнята» назва ────────────────────────────────────────────────────────────────────────────────────
-- Назва поточної версії шаблону, а без версії — назва чернетки. p_except — шаблон, що перевіряється (його власну назву
-- не рахуємо). security definer: адміністратор не читає templates.name напряму (column grants).
create or replace function private.template_name_taken(p_name text, p_except uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.templates as t
    left join public.template_versions as v on v.template_id = t.id and v.number = t.current_version
    where t.id is distinct from p_except
      and lower(btrim(coalesce(v.name, t.name))) = lower(btrim(p_name))
  );
$$;
revoke execute on function private.template_name_taken(text, uuid) from public, anon, authenticated;

-- ── Створення шаблону (AC-EDITOR-19, AC-EDITOR-23) ─────────────────────────────────────────────────────
-- before insert: перевірка діє на будь-який шлях вставки (форма, функція, сид); спрацьовує до check constraints,
-- тож відмова про порожню назву — наш код. id рядка виключаємо з порівняння: повторний запуск ідемпотентного
-- supabase/seed.sql («on conflict (id) do nothing») не конфліктує сам із собою.
create or replace function private.check_template_name_on_create()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Не-адміністратор (менеджер напряму): політика RLS відмовить сама; тригер іде першим, тож без цього рядка відповідь
  -- «назву вже зайнято» розкривала б менеджеру назви шаблонів із незбережених змін (AC-EDITOR-02).
  if (select auth.uid()) is not null and (select private.current_app_role()) is distinct from 'admin' then
    return new;
  end if;
  if char_length(btrim(coalesce(new.name, ''))) = 0 then
    raise exception 'TEMPLATE_NAME_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('public.templates.name', 0));
  if false and private.template_name_taken(new.name, new.id) then
    raise exception 'TEMPLATE_NAME_TAKEN';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_template_name_on_create() from public, anon, authenticated;

create trigger templates_check_name_on_create
  before insert on public.templates
  for each row execute function private.check_template_name_on_create();

-- ── Перейменування секції й зміна задачі: порожня назва зберігається в чернетці (AC-EDITOR-20) ─────────
-- Відмова про порожню назву тепер — під час збереження версії. Додавання нової секції чи задачі з порожньою назвою
-- (add_template_section, add_template_task) лишається відмовою NAME_REQUIRED: PM описує лише стерту назву наявної.
create or replace function public.rename_template_section(p_template_id uuid, p_section_id uuid, p_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  update public.template_sections as s
  set name = btrim(coalesce(p_name, ''))
  where s.id = p_section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

create or replace function public.update_template_task(p_template_id uuid, p_task_id uuid, p_name text, p_required boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  update public.template_tasks as t
  set name = btrim(coalesce(p_name, '')), required = coalesce(p_required, false)
  from public.template_sections as s
  where t.id = p_task_id and s.id = t.section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

-- ── Збереження версії: назви (AC-EDITOR-20, AC-EDITOR-24) ──────────────────────────────────────────────
-- Повторює тіло з 20261025151836_template_versions.sql і додає три перевірки; будь-яка відмова відкочує транзакцію,
-- тож версії немає, а чернетка (разом із назвою) й «Unpublished changes» лишаються.
create or replace function private.save_template_version(p_template_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_template  public.templates;
  v_number    integer;
  v_version   uuid;
begin
  -- Матриця прав «Create a template, edit it and save it as a new version»: лише admin (AC-EDITOR-08).
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;

  -- for update: два збереження одного шаблону йдуть по черзі, номер не повторюється; запуск чекає (for share).
  select * into v_template from public.templates as t where t.id = p_template_id for update;
  if v_template.id is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;

  -- Без незбережених змін нової версії не створюємо (робоче припущення, solomchaak/property-workflows-spec#22).
  if not v_template.has_unpublished_changes then
    raise exception 'NO_UNPUBLISHED_CHANGES';
  end if;

  -- AC-EDITOR-20: шаблон, секція й задача мають назву; назва лише з пробілів — порожня.
  if char_length(btrim(v_template.name)) = 0 then
    raise exception 'TEMPLATE_NAME_REQUIRED';
  end if;
  if exists (
    select 1 from public.template_sections as s
    where s.template_id = p_template_id and char_length(btrim(s.name)) = 0
  ) or exists (
    select 1 from public.template_tasks as tt
    join public.template_sections as s on s.id = tt.section_id
    where s.template_id = p_template_id and char_length(btrim(tt.name)) = 0
  ) then
    raise exception 'ITEM_NAME_REQUIRED';
  end if;

  -- AC-EDITOR-24: назва не збігається з назвою іншого шаблону (без регістру й пробілів на краях). Lock — спільний зі
  -- створенням шаблону: паралельне створення чи збереження з тією самою назвою піде по черзі й побачить її.
  perform pg_advisory_xact_lock(hashtextextended('public.templates.name', 0));
  if private.template_name_taken(v_template.name, p_template_id) then
    raise exception 'TEMPLATE_NAME_TAKEN';
  end if;

  -- AC-EDITOR-04: версії без обов'язкової задачі не буває; незбережені зміни лишаються (транзакцію відкочено).
  if not exists (
    select 1 from public.template_tasks as tt
    join public.template_sections as s on s.id = tt.section_id
    where s.template_id = p_template_id and tt.required
  ) then
    raise exception 'TEMPLATE_NEEDS_REQUIRED_TASK';
  end if;

  -- Секція без задач у версію не йде (робоче припущення QA, docs/spec-reading.md «Зріз 2»).
  if exists (
    select 1 from public.template_sections as s
    where s.template_id = p_template_id
      and not exists (select 1 from public.template_tasks as tt where tt.section_id = s.id)
  ) then
    raise exception 'SECTION_WITHOUT_TASKS';
  end if;

  -- AC-EDITOR-03: версія 1 для нового шаблону, наступний номер для наявного; номер ніколи не повторюється.
  select coalesce(max(v.number), 0) + 1 into v_number
  from public.template_versions as v where v.template_id = p_template_id;

  insert into public.template_versions (template_id, number, name, saved_by)
  values (p_template_id, v_number, btrim(v_template.name), v_uid)
  returning id into v_version;

  insert into public.template_version_tasks
    (version_id, template_task_id, section_name, section_position, position, name, required)
  select v_version, tt.id, s.name, s.position, tt.position, tt.name, tt.required
  from public.template_sections as s
  join public.template_tasks as tt on tt.section_id = s.id
  where s.template_id = p_template_id;

  update public.templates
  set current_version = v_number, has_unpublished_changes = false
  where id = p_template_id;

  return v_number;
end;
$$;
