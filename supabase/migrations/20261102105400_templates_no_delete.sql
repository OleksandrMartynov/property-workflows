-- Видаляти шаблон не може ніхто з користувачів застосунку. Зріз 1 дав адміністратору delete на templates, а зріз 2
-- (20261025151836_template_versions.sql) відкликав лише insert і update. Прямий DELETE із сесією адміністратора каскадом
-- прибирав усі версії шаблону, хоча збережена версія ніколи не змінюється (AC-EDITOR-03, ADR 0006), а дії «видалити
-- шаблон» немає в матриці прав PM. Потрібне видалення — спершу питання PM: що тоді з версіями й запусками.
-- service_role теж: версій він напряму не видаляє (AC-EDITOR-03), тож каскад не має лишатись обхідним шляхом.
revoke delete on table public.templates from authenticated, service_role;
drop policy templates_delete_admin on public.templates;
