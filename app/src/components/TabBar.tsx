import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

import { useIsDesktop } from '@/lib/responsive';
import { colors, fonts } from '@/theme';

export const tabScreenOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.white,
  tabBarInactiveTintColor: colors.textFaint,
  tabBarStyle: {
    backgroundColor: colors.black,
    borderTopColor: colors.border,
  },
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  sceneStyle: { backgroundColor: colors.bg },
};

/** En web de escritorio la navegación va en el menú lateral: ocultamos la barra inferior */
export function useTabScreenOptions(): BottomTabNavigationOptions {
  const isDesktop = useIsDesktop();
  return isDesktop ? { ...tabScreenOptions, tabBarStyle: { display: 'none' } } : tabScreenOptions;
}

/** Icono de pestaña: tabBarIcon: tabIcon('flash-outline') */
export function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />;
  };
}
