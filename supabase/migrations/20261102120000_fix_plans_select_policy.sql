-- Corrige la creación de planes: la política de lectura usaba can_read_plan(id),
-- que consulta la tabla y no ve la fila que se está insertando. Al pedir la fila
-- de vuelta (INSERT ... RETURNING), Postgres rechazaba la operación.
-- Misma regla de acceso, comprobada directamente con las columnas de la fila.
drop policy if exists "plans: leer" on public.weekly_plans;
create policy "plans: leer" on public.weekly_plans
  for select using (
    trainer_id = auth.uid()
    or (client_id = auth.uid() and status = 'published')
  );
