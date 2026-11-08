import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useIsDesktop } from '@/lib/responsive';
import { colors, fonts, radius, spacing } from '@/theme';

export const BANNER_PHOTOS = {
  main: require('../../assets/landing/banner.jpg'),
  alt: require('../../assets/landing/banner-2.jpg'),
};

/** Cabecera visual con imagen de fondo, saludo y acciones */
export function HeroBanner({
  photo = 'main',
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  photo?: keyof typeof BANNER_PHOTOS;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  return (
    <View style={[styles.banner, { minHeight: isDesktop ? 220 : 180 }]}>
      <Image source={BANNER_PHOTOS[photo]} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={300} />
      <LinearGradient
        colors={['rgba(10,10,10,0.92)', 'rgba(10,10,10,0.7)', 'rgba(30,58,138,0.55)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'flex-end' : 'flex-start' }]}>
        <View style={{ flex: isDesktop ? 1 : undefined, gap: 6 }}>
          {eyebrow ? (
            <Text variant="label" color={colors.primaryBright} style={{ letterSpacing: 3 }}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[styles.title, { fontSize: isDesktop ? 40 : 30, lineHeight: isDesktop ? 44 : 34 }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="rgba(255,255,255,0.8)">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  content: { padding: spacing.xl, gap: spacing.lg, justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, color: colors.white, textTransform: 'uppercase' },
});

/** Barra de progreso fina */
export function ProgressBar({ value, color = colors.primaryBright }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}
