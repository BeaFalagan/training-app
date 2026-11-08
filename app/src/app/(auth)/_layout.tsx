import { Stack } from 'expo-router';

import { colors } from '@/theme';

// La navegación tras iniciar sesión la hace cada pantalla con goHome(), para
// evitar redirecciones duplicadas (p. ej. al entrar con código de acceso).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
