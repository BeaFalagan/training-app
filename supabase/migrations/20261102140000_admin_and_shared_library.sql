-- =====================================================================
-- Administración y biblioteca de ejercicios compartida
-- =====================================================================

-- 1) Administradores: pueden ver a todos los usuarios y gestionarlos
--    (altas, bajas y reasignaciones se hacen con la Edge Function admin-users).
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles: admin lee todo" on public.profiles;
create policy "profiles: admin lee todo" on public.profiles
  for select using (public.is_admin());

-- Nadie puede darse permisos de administrador a sí mismo desde la app
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and (
       new.role is distinct from old.role
    or new.trainer_id is distinct from old.trainer_id
    or new.is_admin is distinct from old.is_admin
    or (new.active is distinct from old.active and auth.uid() = old.id)
  ) then
    raise exception 'No tienes permiso para cambiar este campo';
  end if;
  return new;
end $$;

-- El primer administrador se asigna a mano (ver docs/DESPLIEGUE.md):
-- update public.profiles set is_admin = true where email = 'admin@example.com';

-- 2) Biblioteca compartida por todo el club: cualquier usuario puede leer los
--    ejercicios (y sus vídeos); cada entrenador solo edita los suyos.
drop policy if exists "exercises: leer los míos o los de mi entrenador" on public.exercises;
create policy "exercises: leer (club)" on public.exercises
  for select to authenticated using (true);

drop policy if exists "videos: leer los míos o los de mi entrenador" on storage.objects;
create policy "videos: leer (club)" on storage.objects
  for select to authenticated using (bucket_id = 'exercise-videos');
