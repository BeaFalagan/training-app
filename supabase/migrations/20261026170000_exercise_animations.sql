-- Ilustración animada de cada ejercicio (clave de app/src/features/exercises/figure.ts).
-- Se muestra cuando el ejercicio no tiene vídeo.
alter table public.exercises add column if not exists animation text;
