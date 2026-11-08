import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useIsDesktop } from '@/lib/responsive';
import { colors } from '@/theme';

import { Sidebar, type NavItem } from './Sidebar';

/**
 * En escritorio, envuelve la zona (entrenador o cliente) con el menú lateral fijo.
 * En pantallas estrechas no añade nada: se usan las pestañas inferiores.
 */
export function WebShell({ items, accountHref, children }: { items: NavItem[]; accountHref: Href; children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <Sidebar items={items} accountHref={accountHref} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export const TRAINER_NAV: NavItem[] = [
  { href: '/dashboard', match: ['/dashboard'], label: 'Inicio', icon: 'grid-outline' },
  { href: '/clients', match: ['/clients', '/client', '/plan', '/block'], label: 'Clientes', icon: 'people-outline' },
  { href: '/exercises', match: ['/exercises', '/exercise-edit', '/pick-exercises'], label: 'Ejercicios', icon: 'barbell-outline' },
];

export const ADMIN_NAV_ITEM: NavItem = { href: '/admin', match: ['/admin'], label: 'Administración', icon: 'shield-checkmark-outline' };

export const CLIENT_NAV: NavItem[] = [
  { href: '/today', match: ['/today', '/workout'], label: 'Hoy', icon: 'flash-outline' },
  { href: '/week', match: ['/week'], label: 'Mi semana', icon: 'calendar-outline' },
  { href: '/progress', match: ['/progress'], label: 'Progreso', icon: 'stats-chart-outline' },
];
