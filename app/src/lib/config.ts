/**
 * URL pública de la web. Se toma de EXPO_PUBLIC_SITE_URL y, si no está definida,
 * del dominio desde el que se abre la app.
 */
export const PUBLIC_URL =
  process.env.EXPO_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081');

/** Página de acceso de la app */
export const LOGIN_URL = `${PUBLIC_URL}/login`;
