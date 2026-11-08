import type { AlertButton } from 'react-native';

export interface PendingAlert {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (alert: PendingAlert) => void;
let listener: Listener | null = null;

/** Lo registra <AlertHost /> para mostrar los avisos con el diseño de la app */
export function setAlertListener(l: Listener | null) {
  listener = l;
}

/**
 * Avisos y menús de opciones con el diseño de la app y todos los botones a la vista.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const btns = buttons?.length ? buttons : [{ text: 'Aceptar' }];
  if (listener) {
    listener({ title, message, buttons: btns });
    return;
  }
  // Por si el host aún no está montado
  window.alert(message ? `${title}\n\n${message}` : title);
  btns.find((b) => b.style !== 'cancel')?.onPress?.();
}
