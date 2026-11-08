-- Datos mínimos y endurecimiento según el analizador de Supabase.
-- La app solo guarda nombre, email y planes: se eliminan columnas y tablas
-- que ya no se usan (estaban vacías al aplicar esta migración).

-- 1. Datos personales y de notificaciones que ya no existen en la app
alter table public.profiles
  drop column if exists phone,
  drop column if exists goal,
  drop column if exists health_notes,
  drop column if exists birth_date,
  drop column if exists expo_push_token;

alter table public.workout_logs
  drop column if exists rpe,
  drop column if exists feeling,
  drop column if exists comments;

drop table if exists public.client_notes;
drop table if exists public.exercise_logs;

-- 2. search_path fijo en las funciones de trigger
alter function public.touch_updated_at() set search_path = public;
alter function public.guard_profile_privileges() set search_path = public;

-- 3. Las funciones internas no se pueden llamar sin sesión
revoke execute on function
  public.can_edit_plan(uuid),
  public.can_read_plan(uuid),
  public.is_admin(),
  public.is_my_client(uuid),
  public.is_trainer(),
  public.my_trainer_id(),
  public.plan_of_block(uuid),
  public.plan_of_day(uuid),
  public.duplicate_plan(uuid, date, uuid)
from public, anon;

grant execute on function
  public.can_edit_plan(uuid),
  public.can_read_plan(uuid),
  public.is_admin(),
  public.is_my_client(uuid),
  public.is_trainer(),
  public.my_trainer_id(),
  public.plan_of_block(uuid),
  public.plan_of_day(uuid),
  public.duplicate_plan(uuid, date, uuid)
to authenticated;

-- Los triggers no necesitan permiso de ejecución para nadie
revoke execute on function
  public.handle_new_user(),
  public.touch_updated_at(),
  public.guard_profile_privileges()
from public, anon, authenticated;

-- 4. Las políticas solo se aplican a usuarios con sesión
--    (sin sesión no había filas visibles; ahora ni siquiera se evalúan)
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and roles = '{public}'
  loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
  end loop;
end $$;
