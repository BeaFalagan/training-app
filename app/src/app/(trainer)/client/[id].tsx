import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  ChipSelect,
  EmptyState,
  ErrorState,
  Grid,
  IconButton,
  ListRow,
  Loading,
  Screen,
  SectionTitle,
  Stat,
  Text,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { AccessCodeCard } from '@/features/clients/AccessCodeCard';
import { useClient, useResetAccessCode, useUpdateProfile } from '@/features/clients/api';
import { computeStats, useClientLogs } from '@/features/logs/api';
import { useClientPlans, useCreatePlan, useRepeatPlan } from '@/features/plans/api';
import { addDays, formatDuration, formatRelative, formatWeekRange, parseISODate, toISODate, weekStartISO } from '@/lib/dates';
import { confirm, showError } from '@/lib/errors';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import type { Profile } from '@/lib/types';
import { colors, spacing } from '@/theme';

type Tab = 'plans' | 'history' | 'info';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: me } = useAuth();
  const client = useClient(id);
  const plans = useClientPlans(id);
  const logs = useClientLogs(id);
  const createPlan = useCreatePlan();
  const repeater = useRepeatPlan();
  const [tab, setTab] = useState<Tab>('plans');
  const isDesktop = useIsDesktop();
  const columns = useColumns(4, 360);

  if (client.isPending) return <Loading />;
  if (client.error) return <ErrorState message={client.error.message} onRetry={client.refetch} />;
  const c = client.data;
  const stats = computeStats(logs.data ?? []);

  const repeatPlan = (plan: { id: string; week_start: string }) =>
    repeater.repeat(plan, plans.data?.map((p) => p.week_start) ?? []);

  async function newWeek() {
    // Primera semana sin plan a partir de la actual
    const taken = new Set(plans.data?.map((p) => p.week_start));
    let week = parseISODate(weekStartISO());
    while (taken.has(toISODate(week))) week = addDays(week, 7);
    try {
      const plan = await createPlan.mutateAsync({
        trainer_id: me!.id,
        client_id: c.id,
        week_start: toISODate(week),
        title: `Semana ${formatWeekRange(toISODate(week))}`,
      });
      router.push(`/plan/${plan.id}`);
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen refreshing={plans.isRefetching} onRefresh={() => { plans.refetch(); logs.refetch(); client.refetch(); }}>
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Avatar name={c.full_name} uri={c.avatar_url} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h1" numberOfLines={2}>
            {c.full_name || 'Sin nombre'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {c.must_change_password ? (
              <Badge label="Pendiente de activar" tone="warning" />
            ) : (
              <Badge label={c.active ? 'Activo' : 'Inactivo'} tone={c.active ? 'success' : 'neutral'} />
            )}
            {stats.streak > 1 ? <Badge label={`🔥 ${stats.streak} semanas`} tone="warning" /> : null}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={stats.thisWeek} label="Esta semana" />
        <Stat value={stats.total} label="Total" />
        <Stat value={stats.totalMinutes} label="Minutos" />
      </View>

      <ChipSelect<Tab>
        options={[
          { value: 'plans', label: 'Planes' },
          { value: 'history', label: 'Historial' },
          { value: 'info', label: 'Ficha' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'plans' ? (
        <>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md }}>
            <Button title="Nueva semana" icon="add" onPress={newWeek} loading={createPlan.isPending} fullWidth={!isDesktop} />
            {plans.data?.length ? (
              <Button
                title="Repetir última semana"
                icon="repeat"
                variant="outline"
                onPress={() => repeatPlan(plans.data![0])}
                loading={repeater.isPending}
                fullWidth={!isDesktop}
              />
            ) : null}
          </View>
          {plans.data?.length ? (
            <Grid columns={columns}>
                {plans.data.map((p) => {
                  const isCurrent = p.week_start === weekStartISO();
                  return (
                    <Card key={p.id} onPress={() => router.push(`/plan/${p.id}`)} accent={isCurrent}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="label">{formatWeekRange(p.week_start)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <Badge label={p.status === 'published' ? 'Publicado' : 'Borrador'} tone={p.status === 'published' ? 'success' : 'warning'} />
                          <IconButton icon="copy-outline" size={16} accessibilityLabel="Repetir esta semana" onPress={() => repeatPlan(p)} />
                        </View>
                      </View>
                      <Text variant="h3">{p.title}</Text>
                      <Text variant="small">
                        {p.plan_days.length} {p.plan_days.length === 1 ? 'día' : 'días'} de entrenamiento{isCurrent ? ' · semana actual' : ''}
                      </Text>
                    </Card>
                  );
                })}
          </Grid>
          ) : (
            <EmptyState icon="calendar-outline" title="Sin planes" message="Crea la primera semana de entrenamiento para este cliente." />
          )}
        </>
      ) : null}

      {tab === 'history' ? (
        logs.data?.length ? (
          <Grid columns={columns}>
          {logs.data.map((l) => (
            <Card key={l.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="h3">{l.day_title ?? 'Entrenamiento'}</Text>
                <Text variant="small">{formatRelative(l.started_at)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Badge label={formatDuration(l.duration_seconds ?? 0)} />
                {l.rounds_completed ? <Badge label={`${l.rounds_completed} rondas`} tone="rest" /> : null}
              </View>
            </Card>
          ))}
          </Grid>
        ) : (
          <EmptyState icon="time-outline" title="Sin entrenamientos" message="Aquí verás cada sesión que complete." />
        )
      ) : null}

      {tab === 'info' ? (
        <View style={isDesktop ? { maxWidth: 900, width: '100%', gap: spacing.lg } : { gap: spacing.lg }}>
          <ClientInfo clientId={c.id} />
        </View>
      ) : null}
    </Screen>
  );
}

function ClientInfo({ clientId }: { clientId: string }) {
  const { data: c } = useClient(clientId);
  if (!c) return <Loading />;
  return <ClientInfoForm c={c} />;
}

/** Ficha mínima: solo nombre y email (la app no guarda más datos personales) */
function ClientInfoForm({ c }: { c: Profile }) {
  const update = useUpdateProfile();
  const resetCode = useResetAccessCode();
  const [newCode, setNewCode] = useState<string | null>(null);

  async function onResetCode() {
    const ok = await confirm(
      'Nuevo código de acceso',
      'Se generará un código nuevo y la contraseña actual del cliente dejará de funcionar.',
      'Generar',
    );
    if (!ok) return;
    try {
      setNewCode((await resetCode.mutateAsync(c.id)).code);
    } catch (e) {
      showError(e);
    }
  }

  return (
    <>
      <Card style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 0 }}>
        <ListRow title={c.full_name || '—'} subtitle="Nombre" />
        <ListRow title={c.email ?? '—'} subtitle="Email" onPress={c.email ? () => Linking.openURL(`mailto:${c.email}`) : undefined} />
      </Card>

      <SectionTitle title="Acceso" />
      {newCode ? (
        <AccessCodeCard name={c.full_name} email={c.email ?? ''} code={newCode} />
      ) : (
        <Button
          title={c.must_change_password ? 'Generar código nuevo' : 'Restablecer acceso'}
          icon="key-outline"
          variant="outline"
          onPress={onResetCode}
          loading={resetCode.isPending}
        />
      )}
      <Text variant="small">
        {c.must_change_password
          ? 'Aún no ha entrado en la app. Si perdió el código, genera uno nuevo.'
          : 'Si ha olvidado su contraseña, genera un código y envíaselo.'}
      </Text>

      <SectionTitle title="Cuenta" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Cliente activo</Text>
            <Text variant="small">Los inactivos se muestran al final de la lista.</Text>
          </View>
          <Switch
            value={c.active}
            onValueChange={(active) => update.mutate({ id: c.id, active })}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor={colors.white}
          />
        </View>
      </Card>
    </>
  );
}
