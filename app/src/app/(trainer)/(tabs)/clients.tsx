import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Grid, Header, IconButton, Input, ListRow, Loading, Screen, Text } from '@/components/ui';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClients } from '@/features/clients/api';
import { useTrainerPlans } from '@/features/plans/api';
import { weekStartISO } from '@/lib/dates';
import { colors, spacing } from '@/theme';

export default function ClientsScreen() {
  const { profile } = useAuth();
  const { data, isPending, error, refetch, isRefetching } = useClients(profile?.id);
  const [q, setQ] = useState('');
  const isDesktop = useIsDesktop();
  const plans = useTrainerPlans(profile?.id);
  const weekStart = weekStartISO();
  const weekBadge = (clientId: string) => {
    const p = plans.data?.find((x) => x.client_id === clientId && x.week_start === weekStart);
    if (!p) return <Badge label="Sin plan esta semana" tone="primary" />;
    return p.status === 'published' ? <Badge label="Semana publicada" tone="success" /> : <Badge label="Borrador" tone="warning" />;
  };
  const columns = useColumns(6, 340);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((c) => !term || c.full_name.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term))
      .sort((a, b) => Number(b.active) - Number(a.active));
  }, [data, q]);

  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Header
        eyebrow={`${data.length} ${data.length === 1 ? 'cliente' : 'clientes'}`}
        title="Clientes"
        right={
          isDesktop ? (
            <Button title="Invitar cliente" icon="person-add-outline" fullWidth={false} onPress={() => router.push('/client/invite')} />
          ) : (
            <IconButton
              icon="person-add"
              background={colors.primary}
              accessibilityLabel="Invitar cliente"
              onPress={() => router.push('/client/invite')}
            />
          )
        }
      />
      {data.length > 0 ? (
        <Input placeholder="Buscar por nombre o email" value={q} onChangeText={setQ} autoCapitalize="none" />
      ) : null}

      {filtered.length > 0 && isDesktop ? (
        <Grid columns={columns}>
          {filtered.map((c) => (
            <Card key={c.id} onPress={() => router.push(`/client/${c.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={c.full_name} uri={c.avatar_url} size={52} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h3" numberOfLines={1}>
                  {c.full_name || c.email || 'Sin nombre'}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  {c.email}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {c.must_change_password ? <Badge label="Pendiente de activar" tone="warning" /> : null}
                  {!c.active ? <Badge label="Inactivo" /> : weekBadge(c.id)}
                </View>
              </View>
            </Card>
          ))}
        </Grid>
      ) : filtered.length > 0 ? (
        <Card style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 0 }}>
          {filtered.map((c) => (
            <ListRow
              key={c.id}
              left={<Avatar name={c.full_name} uri={c.avatar_url} />}
              title={c.full_name || c.email || 'Sin nombre'}
              subtitle={c.email}
              onPress={() => router.push(`/client/${c.id}`)}
              right={!c.active ? <Badge label="Inactivo" /> : weekBadge(c.id)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="people-outline"
          title={data.length ? 'Sin resultados' : 'Tu primer cliente'}
          message={
            data.length
              ? 'Prueba con otro nombre.'
              : 'Invita a un cliente por email. Recibirá un código para activar su cuenta y ver sus entrenamientos.'
          }
          action={
            !data.length ? <Button title="Invitar cliente" onPress={() => router.push('/client/invite')} fullWidth={false} /> : null
          }
        />
      )}
    </Screen>
  );
}
