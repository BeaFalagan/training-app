# Despliegue

## Entornos

| Servicio | Proyecto | URL |
| --- | --- | --- |
| Web (landing + app) | Vercel | `https://<tu-proyecto>.vercel.app` |
| Backend | Supabase (región UE recomendada) | `https://<project-ref>.supabase.co` |
| Código | GitHub · `<usuario>/training-app` | Cada push a `main` despliega en Vercel |

## Vercel

La configuración está en [`vercel.json`](../vercel.json), en la raíz del repositorio.

1. **Settings → Build and Deployment → Root Directory:** vacío (raíz del repositorio). El build entra en `app/`.
2. **Framework Preset:** `Other`. Build, Output e Install se leen de `vercel.json`, así que no hay que sobrescribirlos.
3. **Environment Variables**, para Production, Preview y Development:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SITE_URL` (opcional): URL pública para los enlaces de invitación
4. **Domains:** añade tu dominio y actualiza las URLs de `app/landing/` (canonical, Open Graph, datos estructurados, `robots.txt`, `sitemap.xml` y `llms.txt`).

Las variables `EXPO_PUBLIC_*` se incrustan al compilar. Si cambian, hay que volver a desplegar.

## Supabase

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push                      # aplica supabase/migrations
supabase functions deploy invite-client
supabase functions deploy admin-users
```

Configuración en el panel:
- **Authentication → Sign In / Providers:** registro público **desactivado**. Solo se entra con un código de acceso.
- **Authentication → Passwords:** mínimo 8 caracteres y protección contra contraseñas filtradas (plan Pro).

Datos iniciales, desde el SQL Editor:
- `supabase/seed/demo_exercises.sql`: ejercicios de ejemplo.
- `supabase/seed/exercise_animations.sql`: asigna las ilustraciones por nombre.
- Primer administrador, después de crear su usuario en Authentication → Add user:
  ```sql
  update profiles set role = 'trainer', is_admin = true where email = 'admin@example.com';
  ```

## Comprobaciones antes de desplegar

```bash
npm run check        # tipos, lint y tests (lo mismo que ejecuta la CI en GitHub)
npm run build:web    # build de producción en local
```
