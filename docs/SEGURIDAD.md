# Seguridad y datos

## Principios

1. **Datos mínimos.** La app solo guarda **nombre, email y planes de entrenamiento** (más la fecha y duración de los entrenamientos completados). Los datos personales y de salud quedan fuera de la app.
2. **La autorización vive en la base de datos.** Todas las tablas tienen Row Level Security. Aunque alguien manipulara la app, Postgres solo le devuelve lo que le corresponde.
3. **Nada secreto en el cliente.** La web y la app solo llevan la clave pública de Supabase. La clave `service_role` solo existe en las Edge Functions.

## Roles

| Rol | Puede |
| --- | --- |
| **Cliente** | Ver sus planes **publicados**, la biblioteca de ejercicios y su historial; registrar entrenamientos completados |
| **Entrenador** | Gestionar a **sus** clientes y sus planes (borradores incluidos); crear y editar **sus** ejercicios; ver la biblioteca compartida |
| **Administrador** (`is_admin`) | Ver a todos los usuarios; dar de alta y de baja a entrenadores y clientes; cambiar de entrenador; generar códigos |

- El rol, el entrenador asignado y `is_admin` **no se pueden cambiar desde la app**: lo impide el trigger `guard_profile_privileges`.
- Las acciones de administración pasan por la Edge Function `admin-users`, que comprueba `is_admin` antes de actuar.

## Acceso

- **Registro público desactivado.** Las cuentas solo las crea un entrenador o la administración.
- **Código de acceso temporal** (8 caracteres, sin caracteres ambiguos). Se comparte por WhatsApp o email, y el usuario debe crear su contraseña al entrar por primera vez.
- Si alguien pierde el código u olvida la contraseña, su entrenador o la administración generan uno nuevo, y el anterior deja de funcionar.

## Almacenamiento y web

- Los vídeos de ejercicios están en un bucket **privado** y se sirven con URLs firmadas que caducan a la hora.
- **Cabeceras HTTP en Vercel:**
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
- **Zonas privadas fuera de los buscadores:** la app (`app.html`) lleva `noindex` y `robots.txt` excluye sus rutas.

## Estado actual y pendientes

| Punto | Estado |
| --- | --- |
| RLS en todas las tablas, probado con usuarios reales | ✅ |
| Registro público desactivado | ✅ |
| Datos en la UE (Supabase `eu-west-1`) | ✅ |
| Sin teléfono, objetivo, salud, notas, esfuerzo ni comentarios: ni en la app ni en la base de datos | ✅ |
| Funciones internas y políticas solo para usuarios con sesión; `search_path` fijo en los triggers | ✅ |
| Protección contra contraseñas filtradas | ⏳ Requiere Supabase Pro |
| Copias de seguridad diarias | ⏳ Requiere Supabase Pro |
| Uso comercial de Vercel | ⏳ Requiere Vercel Pro (Hobby no permite uso comercial) |
| Contratos de encargado del tratamiento (Supabase y Vercel) y aviso de privacidad | ⏳ |

## Revisar la seguridad

```bash
supabase db advisors --linked     # analizador de seguridad y rendimiento de Supabase
```

Avisos que se mantienen a propósito:
- **Funciones `SECURITY DEFINER` ejecutables por `authenticated`** (`can_read_plan`, `is_my_client`…): las usan las políticas RLS, así que los usuarios con sesión necesitan poder ejecutarlas. Solo devuelven sí/no o identificadores propios.
- **Contraseñas filtradas:** requiere Supabase Pro.
