import { useWindowDimensions } from 'react-native';

/** Ancho a partir del cual la web usa el diseño de escritorio (menú lateral, cuadrículas) */
export const DESKTOP_BREAKPOINT = 900;
/** Ancho del menú lateral en escritorio */
export const SIDEBAR_WIDTH = 260;
/** Margen horizontal del contenido en escritorio (a cada lado) */
export const DESKTOP_GUTTER = 40;

/** true con pantalla ancha (diseño de escritorio) */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

/**
 * Número de columnas de una cuadrícula según el espacio disponible:
 * caben tantas como permita `minWidth` por columna, hasta `max`.
 * En pantallas estrechas siempre 1.
 */
export function useColumns(max = 3, minWidth = 320): number {
  const { width } = useWindowDimensions();
  if (width < DESKTOP_BREAKPOINT) return 1;
  const available = width - SIDEBAR_WIDTH - DESKTOP_GUTTER * 2;
  return Math.max(1, Math.min(max, Math.floor(available / minWidth)));
}
