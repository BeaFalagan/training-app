-- Ejercicios de ejemplo (material de casa: mancuernas, gomas, comba y cinta).
-- Cambia el email por el del entrenador. Los vídeos se pueden subir desde la app.
-- Después ejecuta seed/exercise_animations.sql para asignar las ilustraciones.
with t as (select id from public.profiles where email = 'entrenador@example.com' and role = 'trainer')
insert into public.exercises (trainer_id, name, muscle_group, equipment, description, cues)
select t.id, e.name, e.muscle, e.equip, e.descr, e.cues from t, (values
  ('Sentadilla con mancuerna',     'Pierna',           'Mancuernas',    'Sentadilla sujetando una mancuerna vertical pegada al pecho.', array['Pecho arriba','Rodillas hacia fuera','Talones apoyados']),
  ('Swing con mancuerna',          'Cadena posterior', 'Mancuernas',    'Golpe de cadera llevando la mancuerna de entre las piernas a la altura del pecho.', array['Empuja con la cadera','Espalda recta','Glúteo apretado arriba']),
  ('Peso muerto rumano',           'Cadena posterior', 'Mancuernas',    'Bisagra de cadera con rodillas semiflexionadas.', array['Cadera atrás','Mancuernas pegadas','Espalda neutra']),
  ('Press militar',                'Hombro',           'Mancuernas',    'Empuje vertical por encima de la cabeza.', array['Costillas abajo','Bíceps junto a la oreja','No arquees']),
  ('Zancada alterna',              'Pierna',           'Mancuernas',    'Zancada hacia delante alternando piernas.', array['Paso largo','Rodilla trasera cerca del suelo','Tronco vertical']),
  ('Remo con goma',                'Espalda',          'Goma',          'Tira de la goma hacia el abdomen juntando las escápulas.', array['Codos pegados','Junta las escápulas','Vuelve controlado']),
  ('Sentadilla con goma',          'Pierna',           'Goma',          'Pisa la goma y haz la sentadilla contra la resistencia.', array['Rodillas hacia fuera','Pecho arriba','Sube empujando el suelo']),
  ('Flexiones',                    'Pecho',            'Peso corporal', 'Flexión de brazos con el cuerpo en bloque.', array['Core activo','Codos a 45º','Pecho al suelo']),
  ('Plancha',                      'Core',             'Peso corporal', 'Isométrico en antebrazos.', array['Glúteo apretado','No hundas la cadera','Respira']),
  ('Comba',                        'Cardio',           'Comba',         'Saltos a la comba a ritmo constante.', array['Saltos pequeños','Codos pegados','Gira con las muñecas']),
  ('Cinta de caminar',             'Cardio',           'Cinta',         'Caminata en cinta a ritmo constante.', array['Ritmo en el que puedas hablar','Inclinación 2–6 %','No te agarres a la barra'])
) as e(name, muscle, equip, descr, cues);
