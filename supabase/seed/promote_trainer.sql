-- 1) Crea el usuario del entrenador en Supabase Dashboard → Authentication → Add user
--    (marca "Auto confirm user" y ponle contraseña).
-- 2) Ejecuta esto en el SQL Editor cambiando el email:
update public.profiles
set role = 'trainer', full_name = 'Entrenador'
where email = 'entrenador@example.com';
