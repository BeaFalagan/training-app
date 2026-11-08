import { router } from 'expo-router';

/**
 * Vuelve al inicio limpiando la pila de pantallas (login, código…).
 * La pantalla de inicio decide a dónde ir según la sesión y el perfil.
 */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}
