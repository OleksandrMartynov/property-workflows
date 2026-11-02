-- Новий профіль без явної ролі отримує найменші права. Тригер on_auth_user_created вставляє профіль без ролі, тож
-- користувач, створений через Auth (зокрема підрядник, AC-VENDOR-01), стартував би менеджером. Тепер — vendor: лише свої
-- задачі, без шаблонів і запуску. Менеджера й адміністратора роль задає явно (service_role; npm run users:demo).
-- Наявних профілів зміна не торкається; набір ролей (profiles_role_check) той самий.
alter table public.profiles alter column role set default 'vendor';
