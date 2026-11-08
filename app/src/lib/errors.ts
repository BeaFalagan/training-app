import { showAlert } from './alert';

const NETWORK_ERROR = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

export function errorMessage(e: unknown): string {
  const raw =
    e instanceof Error
      ? e.message
      : e && typeof e === 'object' && 'message' in e
        ? String((e as { message: unknown }).message)
        : '';
  // Cortes de conexión: mensaje claro en lugar del error técnico del navegador
  if (NETWORK_ERROR.test(raw)) return 'No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  return raw || 'Ha ocurrido un error inesperado';
}

export function showError(e: unknown, title?: string) {
  const msg = errorMessage(e);
  showAlert(title ?? (msg.startsWith('No hay conexión') ? 'Sin conexión' : 'Error'), msg);
}

/** Confirmación con botón destructivo */
export function confirm(title: string, message: string, confirmText = 'Eliminar'): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
