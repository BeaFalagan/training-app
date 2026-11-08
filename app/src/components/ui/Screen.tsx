import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { DESKTOP_GUTTER, useIsDesktop } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

/**
 * Ancho del contenido en escritorio: formularios estrechos y editores medianos (centrados);
 * los paneles ocupan todo el ancho disponible.
 */
export type ScreenWidth = 'narrow' | 'medium' | 'wide';
const MAX_WIDTH: Record<ScreenWidth, number | undefined> = { narrow: 560, medium: 1240, wide: undefined };

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
  width?: ScreenWidth;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  refreshing,
  onRefresh,
  contentStyle,
  footer,
  width = 'wide',
}: Props) {
  const isDesktop = useIsDesktop();
  // En escritorio el contenido se centra con un ancho máximo y márgenes más amplios
  const desktop: ViewStyle | null = isDesktop
    ? { width: '100%', maxWidth: MAX_WIDTH[width], alignSelf: 'center', paddingHorizontal: DESKTOP_GUTTER, paddingTop: spacing.xl }
    : null;
  const inner = [padded && styles.padded, desktop, contentStyle];

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <View style={styles.flex}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, ...inner]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh && !isDesktop ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primaryBright} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, ...inner]}>{children}</View>
        )}
        {footer ? (
          <View style={styles.footer}>
            <View style={isDesktop ? { width: '100%', maxWidth: MAX_WIDTH[width], alignSelf: 'center', paddingHorizontal: spacing.xl } : null}>
              {footer}
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/**
 * Cuadrícula adaptable: en escritorio reparte los hijos en filas de `columns`
 * columnas del mismo ancho; en pantallas estrechas (columns = 1) los apila.
 */
export function Grid({ columns, gap = spacing.lg, children }: { columns: number; gap?: number; children: ReactNode }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean) as ReactNode[];
  if (columns <= 1) return <View style={{ gap }}>{items}</View>;
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={{ flex: 1, minWidth: 0 }}>
              {row[c] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  scrollContent: { paddingBottom: spacing.xxxl, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
