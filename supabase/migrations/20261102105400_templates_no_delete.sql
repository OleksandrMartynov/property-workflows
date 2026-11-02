-- Видаляти шаблон не може ніхто з користувачів застосунку. Зріз 1 дав адміністратору delete на templates, а зріз 2
-- (20261025151836_template_versions.sql) відкликав лише insert і update. Прямий DELETE із сесією адміністратора каскадом
-- прибирав усі версії шаблону, хоча збережена версія ніколи не змінюється (AC-EDITOR-03, ADR 0006), а дії «видалити
-- шаблон» немає в матриці прав PM. Потрібне видалення — спершу питання PM: що тоді з версіями й запусками.
revoke delete on table public.templates from authenticated;
drop policy templates_delete_admin on public.templates;
