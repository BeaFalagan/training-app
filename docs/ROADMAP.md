# Roadmap

Leyenda: ✅ hecho · 🔜 siguiente · 💡 ideas

## ✅ Hecho

- App web con Expo SDK 58, TypeScript estricto y Expo Router; diseño adaptable a escritorio y pantallas estrechas.
- Roles de entrenador, cliente y administración; alta con código de acceso temporal.
- Datos mínimos: solo nombre, email y planes.
- Biblioteca de ejercicios compartida, con vídeo propio o una de las 43 ilustraciones animadas.
- Planes semanales con 6 formatos de bloque (series, circuito, EMOM, AMRAP, Tabata, For Time); repetir, duplicar y mover semanas.
- Temporizador guiado con cuenta atrás, rondas, pitidos y pantalla siempre encendida.
- Material necesario calculado a partir de los ejercicios.
- Panel «Esta semana» del entrenador y progreso del cliente (racha, minutos, calendario).
- Landing estática con SEO y datos estructurados.
- CI, CodeQL, búsqueda de secretos y Dependabot en GitHub Actions.

## 🔜 Siguiente

| Prioridad | Tarea |
| --- | --- |
| Alta | Tests de las políticas RLS con usuarios simulados (pgTAP) |
| Media | Tests de extremo a extremo del flujo de invitación y del temporizador (Playwright) |
| Media | Demo pública con datos de ejemplo |

## 💡 Ideas

- Registro de cargas por serie y gráficas de progresión por ejercicio.
- Plantillas de semanas reutilizables entre clientes.
- Avisos por email al publicar una semana nueva.
- Verificación en dos pasos para cuentas de administración.
