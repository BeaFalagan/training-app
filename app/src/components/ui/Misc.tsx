import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useIsDesktop } from '@/lib/responsive';
import { colors, fonts, radius, spacing } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

const logo = require('../../../assets/brand/logo-circle.png');

export function Logo({ size = 120 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Entreno" />;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primaryBright} size="large" />
      {label ? <Text variant="small">{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { padding: spacing.xl }]}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <Text variant="body" align="center">
        {message}
      </Text>
      {onRetry ? <Button title="Reintentar" variant="outline" onPress={onRetry} fullWidth={false} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primaryBright} />
      </View>
      <Text variant="h2" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="small" align="center" style={{ maxWidth: 280 }}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/** Cabecera de pantalla: etiqueta pequeña + título grande + acción opcional */
export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? <Text variant="label">{eyebrow}</Text> : null}
        <Text variant="h1" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color={colors.text}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

/** Selector horizontal de opciones (chips) */
export function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const isDesktop = useIsDesktop();
  const chips = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        onPress={() => onChange(o.value)}
        style={({ hovered }) => [
          styles.chip,
          hovered && !active && { borderColor: colors.primary },
          active && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        <Text style={[styles.chipText, active && { color: colors.white }]}>{o.label}</Text>
      </Pressable>
    );
  });
  // En escritorio, todas las opciones a la vista en varias líneas; en pantallas estrechas, fila con scroll
  if (isDesktop) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {chips}
    </ScrollView>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.text }}>{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

/** Contador numérico con botones − / + */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <View style={styles.stepper}>
      <Text variant="label" style={{ flex: 1 }}>
        {label}
      </Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - step))} accessibilityLabel={`Restar ${label}`}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text variant="bodyStrong" style={{ minWidth: 64, textAlign: 'center' }}>
        {format ? format(value) : value}
      </Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + step))} accessibilityLabel={`Sumar ${label}`}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingTop: spacing.lg },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Dos columnas en escritorio (izquierda / derecha), apiladas en pantallas estrechas.
 * `ratio` reparte el ancho: [izquierda, derecha].
 */
export function Columns({ left, right, ratio = [1, 1] }: { left: ReactNode; right: ReactNode; ratio?: [number, number] }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' }}>
      <View style={{ flex: ratio[0], gap: spacing.lg, minWidth: 0 }}>{left}</View>
      <View style={{ flex: ratio[1], gap: spacing.lg, minWidth: 0 }}>{right}</View>
    </View>
  );
}
