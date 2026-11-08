-- Alta de clientes con código de acceso (sin depender del envío de emails).
-- El entrenador genera un código temporal, se lo pasa al cliente (WhatsApp…)
-- y el cliente lo cambia por su propia contraseña al entrar por primera vez.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;
