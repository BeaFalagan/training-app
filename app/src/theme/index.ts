/**
 * Sistema de diseño de Entreno.
 * Fondo oscuro, texto blanco y azul como color de acento.
 */
export const colors = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceAlt: '#1D1D1D',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textMuted: '#9C9C9C',
  textFaint: '#5E5E5E',
  primary: '#2563EB',
  primaryBright: '#3B82F6',
  primaryDark: '#1E3A8A',
  primarySoft: 'rgba(37, 99, 235, 0.18)',
  white: '#FFFFFF',
  black: '#000000',
  success: '#2FB36F',
  successSoft: 'rgba(47, 179, 111, 0.16)',
  warning: '#F2A33A',
  warningSoft: 'rgba(242, 163, 58, 0.16)',
  danger: '#E5484D',
  rest: '#14B8A6', // fases de descanso del temporizador
  restSoft: 'rgba(20, 184, 166, 0.18)',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const fonts = {
  display: 'ArchivoBlack_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.text, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.text, textTransform: 'uppercase' },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.text, textTransform: 'uppercase' },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  // Etiquetas espaciadas en mayúsculas
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 2.5, color: colors.textMuted, textTransform: 'uppercase' },
  timer: { fontFamily: fonts.display, fontSize: 96, lineHeight: 104, color: colors.text, fontVariant: ['tabular-nums'] },
} as const;

export type TextVariant = keyof typeof type;
