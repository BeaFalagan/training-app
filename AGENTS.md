# Guía para agentes y colaboradores

Repositorio de **Entreno**: landing pública (HTML estático), app de entrenamiento web con Expo y backend en Supabase. La documentación está en [`docs/`](docs/).

## Estructura

- `app/`: app Expo (Expo Router en `app/src/app`), landing estática en `app/landing` y build web en `app/scripts/build-web.mjs`.
- `supabase/`: migraciones SQL, Edge Functions y seeds.

## Reglas

- **Proyecto solo web**: no añadas código ni configuración nativa.
- **Expo cambia en cada SDK** (ahora SDK 58). Antes de usar una API de Expo o React Native, consulta la documentación de la versión: `https://docs.expo.dev/versions/v58.0.0/`.
- Instala dependencias con `npx expo install <paquete>` dentro de `app/`.
- Antes de dar algo por terminado: `npm run check` (tipos, lint y tests) desde la raíz.
- La seguridad vive en Postgres (RLS). Cualquier tabla nueva necesita políticas y una migración en `supabase/migrations/`.
- **Datos mínimos**: la app solo guarda nombre, email y planes de entrenamiento. No añadas datos personales ni de salud.
- Textos de la interfaz y comentarios en español.
