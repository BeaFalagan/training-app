# Política de seguridad

## Reportar una vulnerabilidad

**No abras una issue pública.** Usa el aviso privado de GitHub:
[Report a vulnerability](https://github.com/BeaFalagan/training-app/security/advisories/new).

Incluye qué has encontrado, cómo reproducirlo y su posible impacto. Recibirás
respuesta en un plazo de 7 días.

## Alcance

- El código de este repositorio.
- Las políticas RLS, las Edge Functions y las migraciones de `supabase/`.

No hagas pruebas que afecten a usuarios reales, a sus datos ni a la
disponibilidad del servicio.

## Cómo está protegido

El modelo de seguridad (roles, RLS, datos mínimos y cabeceras HTTP) está
descrito en [docs/SEGURIDAD.md](docs/SEGURIDAD.md). En resumen:

- La autorización vive en Postgres: todas las tablas tienen Row Level Security.
- La web solo lleva la clave pública de Supabase. La clave `service_role` solo
  existe en las Edge Functions.
- La app solo guarda nombre, email y planes de entrenamiento.
