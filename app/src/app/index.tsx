import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Button, ErrorState, Loading } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing } from '@/theme';

/** Punto de entrada de la app: redirige según sesión y rol */
export default function Index() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  if (loading) return <Loading />;
  if (!session) {
    // En producción, la página principal es la landing estática: recargamos para mostrarla
    if (!__DEV__) {
      window.location.assign('/');
      return <Loading />;
    }
    return <Redirect href="/login" />;
  }
  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl }}>
        <ErrorState message="No hemos podido cargar tu perfil." onRetry={() => refreshProfile()} />
        <Button title="Cerrar sesión" variant="ghost" onPress={signOut} />
      </View>
    );
  }
  // Entró con un código de acceso temporal: primero crea su contraseña
  if (profile.must_change_password) return <Redirect href={{ pathname: '/set-password', params: { mode: 'invite' } }} />;
  return <Redirect href={profile.role === 'trainer' ? '/dashboard' : '/today'} />;
}
