import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { CLIENT_NAV, WebShell } from '@/components/web/WebShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

export default function ClientLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (profile?.role !== 'client') return <Redirect href="/" />;
  return (
    <WebShell items={CLIENT_NAV} accountHref="/me">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </WebShell>
  );
}
