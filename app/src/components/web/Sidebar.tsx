import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, BrandDivider, Logo, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

export interface NavItem {
  href: Href;
  /** Prefijos de ruta que marcan el elemento como activo */
  match: string[];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Menú lateral de la versión web de escritorio */
export function Sidebar({ items, accountHref }: { items: NavItem[]; accountHref: Href }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const isActive = (item: NavItem) => item.match.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)));

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Logo size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>ENTRENO</Text>
          <Text variant="label" style={{ fontSize: 9, letterSpacing: 3 }}>
            Entrenamiento
          </Text>
        </View>
      </View>

      <View style={styles.nav}>
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Pressable
              key={item.label}
              onPress={() => router.navigate(item.href)}
              style={({ hovered, pressed }) => [
                styles.item,
                (hovered || pressed) && !active && { backgroundColor: colors.surfaceAlt },
                active && styles.itemActive,
              ]}
            >
              <Ionicons name={item.icon} size={20} color={active ? colors.white : colors.textMuted} />
              <Text style={[styles.itemText, active && { color: colors.white }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <BrandDivider label="A por ello" />

      <Pressable
        onPress={() => router.navigate(accountHref)}
        style={({ hovered }) => [styles.user, hovered && { backgroundColor: colors.surfaceAlt }]}
      >
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={36} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {profile?.full_name || 'Mi perfil'}
          </Text>
          <Text variant="small" numberOfLines={1}>
            {profile?.role === 'trainer' ? 'Entrenador' : 'Cliente'}
          </Text>
        </View>
        <Pressable onPress={signOut} hitSlop={8} accessibilityLabel="Cerrar sesión">
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.black,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  brandName: { fontFamily: fonts.display, fontSize: 24, color: colors.white, letterSpacing: 1 },
  nav: { gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.primary },
  itemText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, letterSpacing: 0.5 },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
});
