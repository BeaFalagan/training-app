-- =====================================================================
-- ENTRENO — Esquema inicial
-- Fase 1: usuarios y roles · Fase 2: ejercicios · Fase 3: planes semanales
-- Fase 5: registros de entrenamiento
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('trainer', 'client');
create type public.plan_status as enum ('draft', 'published');
-- standard : series x repeticiones con descanso entre series
-- circuit  : N rondas de varios ejercicios seguidos
-- emom     : cada minuto, un ejercicio (rota entre los ejercicios del bloque)
-- amrap    : tantas rondas como sea posible en un tiempo límite
-- tabata   : intervalos trabajo/descanso (por defecto 20/10 x 8)
-- for_time : completar el trabajo lo más rápido posible (con time cap)
create type public.block_type as enum ('standard', 'circuit', 'emom', 'amrap', 'tabata', 'for_time');

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null default 'client',
  trainer_id      uuid references public.profiles (id) on delete set null,
  full_name       text not null default '',
  email           text,
  phone           text,
  avatar_url      text,
  goal            text,
  health_notes    text,
  birth_date      date,
  active          boolean not null default true,
  expo_push_token text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_trainer_idx on public.profiles (trainer_id);

-- Notas privadas del entrenador sobre cada cliente (el cliente no las ve)
create table public.client_notes (
  client_id  uuid primary key references public.profiles (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  notes      text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Biblioteca de ejercicios
-- ---------------------------------------------------------------------
create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references public.profiles (id) on delete cascade,
  name             text not null,
  description      text,
  muscle_group     text,
  equipment        text,
  -- Vídeo en Supabase Storage (bucket exercise-videos) o URL externa .mp4/.m3u8
  video_path       text,
  video_url        text,
  thumbnail_path   text,
  cues             text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index exercises_trainer_idx on public.exercises (trainer_id);

-- ---------------------------------------------------------------------
-- Planes semanales
-- ---------------------------------------------------------------------
create table public.weekly_plans (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.profiles (id) on delete cascade,
  client_id    uuid not null references public.profiles (id) on delete cascade,
  title        text not null default 'Semana de entrenamiento',
  week_start   date not null,  -- siempre lunes
  notes        text,
  status       public.plan_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint week_start_is_monday check (extract(isodow from week_start) = 1)
);
create index weekly_plans_client_week_idx on public.weekly_plans (client_id, week_start);
create index weekly_plans_trainer_idx on public.weekly_plans (trainer_id);

create table public.plan_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.weekly_plans (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = lunes
  title       text not null default 'Entrenamiento',
  notes       text,
  created_at  timestamptz not null default now(),
  unique (plan_id, day_of_week)
);

create table public.workout_blocks (
  id                  uuid primary key default gen_random_uuid(),
  day_id              uuid not null references public.plan_days (id) on delete cascade,
  position            int not null default 0,
  name                text not null default 'Bloque',
  type                public.block_type not null default 'standard',
  rounds              int not null default 3 check (rounds between 1 and 100),
  work_seconds        int check (work_seconds between 1 and 3600),
  rest_seconds        int check (rest_seconds between 0 and 3600),
  rest_between_rounds int check (rest_between_rounds between 0 and 3600),
  time_cap_seconds    int check (time_cap_seconds between 1 and 7200),
  notes               text,
  created_at          timestamptz not null default now()
);
create index workout_blocks_day_idx on public.workout_blocks (day_id, position);

create table public.block_exercises (
  id               uuid primary key default gen_random_uuid(),
  block_id         uuid not null references public.workout_blocks (id) on delete cascade,
  exercise_id      uuid not null references public.exercises (id) on delete restrict,
  position         int not null default 0,
  reps             text,           -- "12", "8-10", "máx", "30 m"
  duration_seconds int check (duration_seconds between 1 and 3600),
  load             text,           -- "20 kg", "RPE 8", "70%"
  rest_seconds     int check (rest_seconds between 0 and 3600),
  notes            text,
  created_at       timestamptz not null default now()
);
create index block_exercises_block_idx on public.block_exercises (block_id, position);

-- ---------------------------------------------------------------------
-- Registros de entrenamiento (lo que hace el cliente)
-- ---------------------------------------------------------------------
create table public.workout_logs (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles (id) on delete cascade,
  day_id           uuid references public.plan_days (id) on delete set null,
  day_title        text,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  duration_seconds int,
  rpe              smallint check (rpe between 1 and 10),
  feeling          smallint check (feeling between 1 and 5),
  comments         text,
  rounds_completed int,
  created_at       timestamptz not null default now()
);
create index workout_logs_client_idx on public.workout_logs (client_id, started_at desc);
create index workout_logs_day_idx on public.workout_logs (day_id);

create table public.exercise_logs (
  id                uuid primary key default gen_random_uuid(),
  log_id            uuid not null references public.workout_logs (id) on delete cascade,
  block_exercise_id uuid references public.block_exercises (id) on delete set null,
  exercise_id       uuid references public.exercises (id) on delete set null,
  set_number        int not null default 1,
  reps_done         int,
  load_used         text,
  created_at        timestamptz not null default now()
);
create index exercise_logs_log_idx on public.exercise_logs (log_id);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();
create trigger weekly_plans_touch before update on public.weekly_plans
  for each row execute function public.touch_updated_at();
create trigger client_notes_touch before update on public.client_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Alta automática de perfil al crear usuario.
-- Siempre se crea como 'client' sin entrenador: el rol y el entrenador solo
-- los asigna la Edge Function invite-client (service role) o el SQL editor.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario no puede cambiarse a sí mismo el rol ni el entrenador
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and (
       new.role is distinct from old.role
    or new.trainer_id is distinct from old.trainer_id
    or (new.active is distinct from old.active and auth.uid() = old.id)
  ) then
    raise exception 'No tienes permiso para cambiar este campo';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------
-- Helpers de seguridad (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'trainer');
$$;

create or replace function public.my_trainer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select trainer_id from profiles where id = auth.uid();
$$;

create or replace function public.is_my_client(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_client and trainer_id = auth.uid());
$$;

create or replace function public.can_read_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from weekly_plans
    where id = p_plan
      and (trainer_id = auth.uid() or (client_id = auth.uid() and status = 'published'))
  );
$$;

create or replace function public.can_edit_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from weekly_plans where id = p_plan and trainer_id = auth.uid());
$$;

create or replace function public.plan_of_day(p_day uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select plan_id from plan_days where id = p_day;
$$;

create or replace function public.plan_of_block(p_block uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select d.plan_id from workout_blocks b join plan_days d on d.id = b.day_id where b.id = p_block;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.client_notes    enable row level security;
alter table public.exercises       enable row level security;
alter table public.weekly_plans    enable row level security;
alter table public.plan_days       enable row level security;
alter table public.workout_blocks  enable row level security;
alter table public.block_exercises enable row level security;
alter table public.workout_logs    enable row level security;
alter table public.exercise_logs   enable row level security;

-- profiles
create policy "profiles: ver propio, mis clientes y mi entrenador" on public.profiles
  for select using (id = auth.uid() or trainer_id = auth.uid() or id = public.my_trainer_id());
create policy "profiles: editar propio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: entrenador edita a sus clientes" on public.profiles
  for update using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- client_notes (solo entrenador)
create policy "client_notes: entrenador" on public.client_notes
  for all using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and public.is_my_client(client_id));

-- exercises
create policy "exercises: leer los míos o los de mi entrenador" on public.exercises
  for select using (trainer_id = auth.uid() or trainer_id = public.my_trainer_id());
create policy "exercises: entrenador gestiona los suyos" on public.exercises
  for all using (trainer_id = auth.uid() and public.is_trainer())
  with check (trainer_id = auth.uid() and public.is_trainer());

-- weekly_plans
create policy "plans: leer" on public.weekly_plans
  for select using (public.can_read_plan(id));
create policy "plans: entrenador inserta para sus clientes" on public.weekly_plans
  for insert with check (trainer_id = auth.uid() and public.is_my_client(client_id));
create policy "plans: entrenador actualiza" on public.weekly_plans
  for update using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and public.is_my_client(client_id));
create policy "plans: entrenador borra" on public.weekly_plans
  for delete using (trainer_id = auth.uid());

-- plan_days
create policy "days: leer" on public.plan_days
  for select using (public.can_read_plan(plan_id));
create policy "days: editar" on public.plan_days
  for all using (public.can_edit_plan(plan_id)) with check (public.can_edit_plan(plan_id));

-- workout_blocks
create policy "blocks: leer" on public.workout_blocks
  for select using (public.can_read_plan(public.plan_of_day(day_id)));
create policy "blocks: editar" on public.workout_blocks
  for all using (public.can_edit_plan(public.plan_of_day(day_id)))
  with check (public.can_edit_plan(public.plan_of_day(day_id)));

-- block_exercises
create policy "block_exercises: leer" on public.block_exercises
  for select using (public.can_read_plan(public.plan_of_block(block_id)));
create policy "block_exercises: editar" on public.block_exercises
  for all using (public.can_edit_plan(public.plan_of_block(block_id)))
  with check (public.can_edit_plan(public.plan_of_block(block_id)));

-- workout_logs
create policy "logs: cliente gestiona los suyos" on public.workout_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "logs: entrenador lee los de sus clientes" on public.workout_logs
  for select using (public.is_my_client(client_id));

-- exercise_logs
create policy "exercise_logs: cliente" on public.exercise_logs
  for all using (exists (select 1 from workout_logs l where l.id = log_id and l.client_id = auth.uid()))
  with check (exists (select 1 from workout_logs l where l.id = log_id and l.client_id = auth.uid()));
create policy "exercise_logs: entrenador lee" on public.exercise_logs
  for select using (exists (select 1 from workout_logs l where l.id = log_id and public.is_my_client(l.client_id)));

-- ---------------------------------------------------------------------
-- Duplicar un plan a otra semana (para reutilizar programación)
-- Se ejecuta con los permisos del usuario: RLS aplica.
-- ---------------------------------------------------------------------
create or replace function public.duplicate_plan(p_plan uuid, p_week_start date, p_client uuid default null)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  src       weekly_plans%rowtype;
  new_plan  uuid;
  d         record;
  new_day   uuid;
  b         record;
  new_block uuid;
begin
  select * into src from weekly_plans where id = p_plan and trainer_id = auth.uid();
  if not found then
    raise exception 'Plan no encontrado';
  end if;

  insert into weekly_plans (trainer_id, client_id, title, week_start, notes, status)
  values (src.trainer_id, coalesce(p_client, src.client_id), src.title, p_week_start, src.notes, 'draft')
  returning id into new_plan;

  for d in select * from plan_days where plan_id = p_plan loop
    insert into plan_days (plan_id, day_of_week, title, notes)
    values (new_plan, d.day_of_week, d.title, d.notes)
    returning id into new_day;

    for b in select * from workout_blocks where day_id = d.id loop
      insert into workout_blocks (day_id, position, name, type, rounds, work_seconds, rest_seconds,
                                  rest_between_rounds, time_cap_seconds, notes)
      values (new_day, b.position, b.name, b.type, b.rounds, b.work_seconds, b.rest_seconds,
              b.rest_between_rounds, b.time_cap_seconds, b.notes)
      returning id into new_block;

      insert into block_exercises (block_id, exercise_id, position, reps, duration_seconds, load, rest_seconds, notes)
      select new_block, exercise_id, position, reps, duration_seconds, load, rest_seconds, notes
      from block_exercises where block_id = b.id;
    end loop;
  end loop;

  return new_plan;
end $$;

-- ---------------------------------------------------------------------
-- Storage: vídeos de ejercicios (bucket privado, carpeta = id del entrenador)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-videos', 'exercise-videos', false, 209715200,
        array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "videos: entrenador sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_trainer());
create policy "videos: entrenador actualiza su carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "videos: entrenador borra su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "videos: leer los míos o los de mi entrenador" on storage.objects
  for select to authenticated
  using (bucket_id = 'exercise-videos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] = public.my_trainer_id()::text
  ));
