import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { HeroBanner, ProgressBar } from '@/components/HeroBanner';
import { Avatar, Badge, Button, Card, EmptyState, Grid, ListRow, Screen, SectionTitle, Stat, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClients } from '@/features/clients/api';
import { useTrainerActivity } from '@/features/logs/api';
import { firstFreeWeek, useCreatePlan, useRepeatPlan, useTrainerPlans, type PlanSummary } from '@/features/plans/api';
import { formatDuration, formatRelative, formatWeekRange, parseISODate, startOfWeek, weekStartISO } from '@/lib/dates';
import { showError } from '@/lib/errors';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import type { Profile } from '@/lib/types';
import { colors, spacing } from '@/theme';

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const clients = useClients(profile?.id);
  const activity = useTrainerActivity(100);
  const plans = useTrainerPlans(profile?.id);
  const isDesktop = useIsDesktop();
  const columns = useColumns(4, 340);

  const weekStart = weekStartISO();
  const monday = startOfWeek();
  const active = useMemo(() => (clients.data ?? []).filter((c) => c.active), [clients.data]);
  const weekLogs = useMemo(() => (activity.data ?? []).filter((l) => new Date(l.completed_at!) >= monday), [activity.data, monday]);
  const currentPlans = (plans.data ?? []).filter((p) => p.week_start === weekStart);
  const publishedCount = active.filter((c) => currentPlans.some((p) => p.client_id === c.id && p.status === 'published')).length;
  const withoutPlan = active.filter((c) => !currentPlans.some((p) => p.client_id === c.id)).length;
  const firstName = profile?.full_name.split(' ')[0] || 'Coach';

  // Primero los clientes que necesitan algo: sin plan, luego borrador, luego publicados
  const order = (c: Profile) => {
    const p = currentPlans.find((x) => x.client_id === c.id);
    return !p ? 0 : p.status === 'draft' ? 1 : 2;
  };
  const sortedClients = [...active].sort((a, b) => order(a) - order(b));

  const actions = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button title="Invitar cliente" icon="person-add-outline" size="sm" onPress={() => router.push('/client/invite')} fullWidth={false} />
      <Button title="Nuevo ejercicio" icon="add" variant="outline" size="sm" onPress={() => router.push('/exercise-edit/new')} fullWidth={false} />
      {profile?.is_admin ? (
        <Button title="Administración" icon="shield-checkmark-outline" variant="outline" size="sm" onPress={() => router.push('/admin')} fullWidth={false} />
      ) : null}
    </View>
  );

  const activityList =
    activity.data && activity.data.length > 0 ? (
      <Card style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 0 }}>
        {activity.data.slice(0, 10).map((log) => (
          <ListRow
            key={log.id}
            left={<Avatar name={log.client?.full_name} size={38} />}
            title={log.client?.full_name ?? 'Cliente'}
            subtitle={`${log.day_title ?? 'Entrenamiento'} · ${formatDuration(log.duration_seconds ?? 0)}`}
            onPress={log.client ? () => router.push(`/client/${log.client!.id}`) : undefined}
            right={
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text variant="small">{formatRelative(log.completed_at!)}</Text>
              </View>
            }
          />
        ))}
      </Card>
    ) : (
      <Card>
        <EmptyState icon="pulse-outline" title="Sin actividad aún" message="Aquí verás cada sesión que completen tus clientes, con su esfuerzo y sus comentarios." />
      </Card>
    );

  return (
    <Screen
      refreshing={clients.isRefetching || activity.isRefetching}
      onRefresh={() => {
        clients.refetch();
        activity.refetch();
        plans.refetch();
      }}
    >
      <HeroBanner
        eyebrow={`Semana del ${formatWeekRange(weekStart)}`}
        title={`Hola, ${firstName}`}
        subtitle={
          active.length
            ? `${publishedCount} de ${active.length} ${active.length === 1 ? 'cliente tiene' : 'clientes tienen'} su semana publicada`
            : 'Invita a tu primer cliente para empezar'
        }
        right={isDesktop ? actions : undefined}
      />
      {!isDesktop ? actions : null}

      <Grid columns={isDesktop ? 4 : 2} gap={spacing.md}>
        <Stat value={active.length} label="Clientes activos" />
        <Stat value={`${publishedCount}/${active.length}`} label="Semanas publicadas" />
        <Stat value={weekLogs.length} label="Sesiones semana" />
        <Stat value={withoutPlan} label="Sin plan esta semana" />
      </Grid>

      <SectionTitle title="Esta semana" />
      {sortedClients.length ? (
        <Grid columns={columns} gap={spacing.md}>
          {sortedClients.map((c) => (
            <ClientWeekCard
              key={c.id}
              client={c}
              plans={(plans.data ?? []).filter((p) => p.client_id === c.id)}
              sessionsDone={weekLogs.filter((l) => l.client?.id === c.id).length}
            />
          ))}
        </Grid>
      ) : (
        <Card>
          <EmptyState
            icon="people-outline"
            title="Sin clientes todavía"
            message="Invita a un cliente y prepárale su primera semana."
            action={<Button title="Invitar cliente" onPress={() => router.push('/client/invite')} fullWidth={false} />}
          />
        </Card>
      )}

      <SectionTitle title="Actividad reciente" />
      {activityList}
    </Screen>
  );
}

/** Estado de la semana de un cliente con la acción que toca */
function ClientWeekCard({ client, plans, sessionsDone }: { client: Profile; plans: PlanSummary[]; sessionsDone: number }) {
  const { profile } = useAuth();
  const weekStart = weekStartISO();
  const current = plans.find((p) => p.week_start === weekStart);
  const last = plans.find((p) => p.week_start < weekStart) ?? plans[0];
  const repeater = useRepeatPlan();
  const createPlan = useCreatePlan();
  const weeks = plans.map((p) => p.week_start);

  async function create() {
    const target = firstFreeWeek(parseISODate(weekStart), weeks);
    try {
      const plan = await createPlan.mutateAsync({
        trainer_id: profile!.id,
        client_id: client.id,
        week_start: target,
        title: `Semana ${formatWeekRange(target)}`,
      });
      router.push(`/plan/${plan.id}`);
    } catch (e) {
      showError(e);
    }
  }

  const days = current?.plan_days.length ?? 0;
  const status = !current ? 'none' : current.status;

  return (
    <Card accent={status === 'none'} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={client.full_name} uri={client.avatar_url} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h3" numberOfLines={1} onPress={() => router.push(`/client/${client.id}`)}>
            {client.full_name || client.email}
          </Text>
          {status === 'published' ? (
            <Badge label="Semana publicada" tone="success" />
          ) : status === 'draft' ? (
            <Badge label="Borrador sin publicar" tone="warning" />
          ) : (
            <Badge label="Sin plan esta semana" tone="primary" />
          )}
        </View>
      </View>

      {status === 'published' ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="small">Entrenamientos hechos</Text>
            <Text variant="bodyStrong">
              {sessionsDone}/{days}
            </Text>
          </View>
          <ProgressBar value={days ? sessionsDone / days : 0} color={sessionsDone >= days && days ? colors.success : colors.primaryBright} />
        </View>
      ) : null}

      {status === 'none' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {last ? (
            <Button
              title="Repetir última"
              icon="repeat"
              size="sm"
              onPress={() => repeater.repeat(last, weeks)}
              loading={repeater.isPending}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button title="Crear" icon="add" size="sm" variant={last ? 'outline' : 'primary'} onPress={create} loading={createPlan.isPending} style={{ flex: 1 }} />
        </View>
      ) : status === 'draft' ? (
        <Button title="Revisar y publicar" icon="send" size="sm" onPress={() => router.push(`/plan/${current!.id}`)} />
      ) : (
        <Button title="Ver plan" icon="eye-outline" size="sm" variant="outline" onPress={() => router.push(`/plan/${current!.id}`)} />
      )}
    </Card>
  );
}
