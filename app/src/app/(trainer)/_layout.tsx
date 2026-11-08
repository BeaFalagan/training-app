import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { ADMIN_NAV_ITEM, TRAINER_NAV, WebShell } from '@/components/web/WebShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

export default function TrainerLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (profile?.role !== 'trainer') return <Redirect href="/" />;
  return (
    <WebShell items={profile.is_admin ? [...TRAINER_NAV, ADMIN_NAV_ITEM] : TRAINER_NAV} accountHref="/account">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="pick-exercises" options={{ presentation: 'modal' }} />
        <Stack.Screen name="client/invite" options={{ presentation: 'modal' }} />
      </Stack>
    </WebShell>
  );
}
