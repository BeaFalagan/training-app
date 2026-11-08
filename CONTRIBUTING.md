# Cómo trabajar en este repositorio

Este es el código de un proyecto real en producción. Las issues con errores o
ideas son bienvenidas; los pull requests externos se revisan caso a caso.

## Flujo de trabajo

1. **`main` siempre está desplegable.** Cada push a `main` se publica en Vercel.
   La rama está protegida: solo se cambia mediante pull request con la CI en verde.
2. **Una rama por cambio**, creada desde `main`:
   - `feat/…` funcionalidad nueva
   - `fix/…` corrección
   - `docs/…`, `chore/…`, `refactor/…`
3. **Pull request** con la plantilla rellena. Vercel genera un preview para probarlo.
4. **Squash and merge**: un commit por cambio en `main`, con un título claro.

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/),
en español y en imperativo:

```
feat(planes): mover un plan de semana desde el menú
fix(login): el botón «Tengo un código» no respondía
docs: explicar el despliegue de Supabase
```

## Versiones

[Versionado semántico](https://semver.org/lang/es/). Cada versión lleva:

- una entrada en [`CHANGELOG.md`](CHANGELOG.md);
- una etiqueta anotada (`git tag -a v0.6.0 -m "v0.6.0"`) y una release en GitHub.

## Antes de abrir un pull request

```bash
npm run check        # tipos, lint y tests (lo mismo que la CI)
npm run build:web    # build de producción
```

Reglas del proyecto:

- **Solo web.** No se añade código ni configuración nativa.
- **Seguridad en Postgres.** Toda tabla nueva lleva políticas RLS y su migración en `supabase/migrations/`.
- **Datos mínimos.** Solo nombre, email y planes de entrenamiento: nada de datos personales ni de salud.
- **Español** en los textos de la interfaz y en los comentarios.
- **Secretos fuera del repositorio.** Las claves van en `app/.env.local` (ignorado por git) o en las variables de Vercel y Supabase.
