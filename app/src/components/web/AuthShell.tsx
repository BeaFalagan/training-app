import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { Logo, Screen, Text } from '@/components/ui';
import { useIsDesktop } from '@/lib/responsive';
import { colors, fonts, spacing } from '@/theme';

/**
 * Contenedor de las pantallas de acceso (login, código, contraseña).
 * En escritorio: imagen con la marca a la izquierda y el formulario a la derecha.
 * En pantallas estrechas: una sola columna.
 */
const heroPhoto = require('../../../assets/landing/acceso.jpg');

export function AuthShell({ children, compactContentStyle }: { children: ReactNode; compactContentStyle?: ViewStyle }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <Screen width="narrow" edges={['top', 'bottom']} contentStyle={compactContentStyle}>
        {children}
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.photoSide}>
        <Image source={heroPhoto} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
        <LinearGradient
          colors={['rgba(10,10,10,0.25)', 'rgba(10,10,10,0.55)', 'rgba(10,10,10,0.95)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.photoContent}>
          <Pressable onPress={() => router.replace('/')} style={styles.brandRow}>
            <Logo size={48} />
            <Text style={styles.brand}>ENTRENO</Text>
          </Pressable>
          <View style={{ gap: spacing.md }}>
            <Text style={styles.title}>Entrena con plan.</Text>
            <Text style={styles.tagline}>Tu semana de entrenamiento, siempre contigo.</Text>
            <Text variant="body" color="rgba(255,255,255,0.75)" style={{ fontSize: 16, maxWidth: 460 }}>
              Accede para ver el plan que ha preparado tu entrenador y entrenar guiado, paso a paso.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.formSide}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.replace('/')} style={styles.back}>
            <Text variant="small" color={colors.textMuted}>
              ← Volver a la web
            </Text>
          </Pressable>
          <View style={styles.form}>{children}</View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  photoSide: { flex: 1.2, overflow: 'hidden', backgroundColor: colors.black },
  photoContent: { flex: 1, justifyContent: 'space-between', padding: 48 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'flex-start' },
  brand: { fontFamily: fonts.display, fontSize: 26, color: colors.white, letterSpacing: 1 },
  title: { fontFamily: fonts.display, fontSize: 96, lineHeight: 98, color: colors.white, textTransform: 'uppercase' },
  tagline: { fontFamily: fonts.bold, fontSize: 24, color: colors.white },
  formSide: { flex: 1, backgroundColor: colors.bg, borderLeftWidth: 1, borderLeftColor: colors.border },
  formScroll: { flexGrow: 1, paddingHorizontal: 48, paddingVertical: 40 },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  form: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.lg, paddingVertical: spacing.xxl },
});
