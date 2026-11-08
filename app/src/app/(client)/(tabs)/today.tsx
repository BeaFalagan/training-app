import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { HeroBanner, ProgressBar } from '@/components/HeroBanner';
import { Button, Card, EmptyState, ErrorState, ListRow, Loading, Screen, SectionTitle, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClientLogs } from '@/features/logs/api';
import { useWeekPlan } from '@/features/plans/api';
import { dayStats, HeroWorkoutCard, todayDow, WeekStrip } from '@/features/plans/components';
import { DAY_NAMES, weekStartISO } from '@/lib/dates';
import { useIsDesktop } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

const QUOTES = ['A por ello.', 'La constancia gana.', 'Un día más fuerte.', 'Hazlo por ti.', 'Paso a paso.'];

export default function TodayScreen() {
  const { profile } = useAuth();
  const weekStart = weekStartISO();
  const plan = useWeekPlan(profile?.id, weekStart);
  const logs = useClientLogs(profile?.id);
  const completed = useMemo(() => new Set((logs.data ?? []).map((l) => l.day_id).filter(Boolean) as string[]), [logs.data]);

  const isDesktop = useIsDesktop();

  if (plan.isPending) return <Loading />;
  if (plan.error) return <ErrorState message={plan.error.message} onRetry={plan.refetch} />;

  const dow = todayDow();
  const today = plan.data?.plan_days.find((d) => d.day_of_week === dow);
  const upcoming = plan.data?.plan_days.filter((d) => d.day_of_week > dow) ?? [];
  const pendingPast = plan.data?.plan_days.filter((d) => d.day_of_week < dow && !completed.has(d.id)) ?? [];
  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const totalDays = plan.data?.plan_days.length ?? 0;
  const doneDays = plan.data?.plan_days.filter((d) => completed.has(d.id)).length ?? 0;
  const weekSubtitle = totalDays
    ? doneDays >= totalDays
      ? `¡Semana completada! ${doneDays} de ${totalDays} entrenamientos`
      : `Esta semana: ${doneDays} de ${totalDays} entrenamientos hechos`
    : 'Tu entrenador está preparando tu semana';
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  const main = (
    <>
      {!plan.data ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="Tu semana está en camino"
          message="Tu entrenador aún no ha publicado el plan de esta semana. Te avisaremos en cuanto esté listo."
        />
      ) : today ? (
        <HeroWorkoutCard
          day={today}
          weekStart={weekStart}
          done={completed.has(today.id)}
          onOpen={() => router.push(`/workout/${today.id}`)}
          onStart={() => router.push(`/workout/player/${today.id}`)}
        />
      ) : (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Text variant="h2">Día de descanso</Text>
          <Text variant="small" align="center">
            Recuperar también es entrenar. Hidrátate, duerme bien y muévete suave.
          </Text>
          {upcoming[0] ? (
            <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md }}>
              <Text variant="label" align="center">
                Próximo entrenamiento · {DAY_NAMES[upcoming[0].day_of_week - 1]}
              </Text>
              <Text variant="h3" align="center">
                {upcoming[0].title}
              </Text>
              <Button title="Ver entrenamiento" icon="eye-outline" variant="outline" onPress={() => router.push(`/workout/${upcoming[0].id}`)} />
            </View>
          ) : null}
        </Card>
      )}

    </>
  );
  const side = (
    <>
      {plan.data?.notes ? (
        <Card accent>
          <Text variant="label">Nota de tu entrenador</Text>
          <Text variant="body">{plan.data.notes}</Text>
        </Card>
      ) : null}

      {pendingPast.length ? (
        <>
          <SectionTitle title="Pendientes" />
          <Card style={{ paddingVertical: 4, paddingHorizontal: 4, gap: 0 }}>
            {pendingPast.map((d) => (
              <ListRow
                key={d.id}
                title={d.title}
                subtitle={`${DAY_NAMES[d.day_of_week - 1]} · ~${dayStats(d).minutes} min`}
                onPress={() => router.push(`/workout/${d.id}`)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {upcoming.length ? (
        <>
          <SectionTitle title="Próximos días" />
          <Card style={{ paddingVertical: 4, paddingHorizontal: 4, gap: 0 }}>
            {upcoming.map((d) => (
              <ListRow
                key={d.id}
                title={d.title}
                subtitle={`${DAY_NAMES[d.day_of_week - 1]} · ~${dayStats(d).minutes} min`}
                onPress={() => router.push(`/workout/${d.id}`)}
              />
            ))}
          </Card>
        </>
      ) : null}
    </>
  );

  return (
    <Screen refreshing={plan.isRefetching} onRefresh={() => { plan.refetch(); logs.refetch(); }}>
      <HeroBanner eyebrow={quote} title={`Hola${firstName ? `, ${firstName}` : ''}`} subtitle={weekSubtitle}>
        {totalDays ? (
          <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, marginTop: -spacing.sm }}>
            <ProgressBar value={doneDays / totalDays} color={doneDays >= totalDays ? colors.success : colors.primaryBright} />
          </View>
        ) : null}
      </HeroBanner>

      <WeekStrip plan={plan.data} weekStart={weekStart} completedDayIds={completed} />

      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 3, gap: spacing.lg }}>{main}</View>
          <View style={{ flex: 2, gap: spacing.lg }}>{side}</View>
        </View>
      ) : (
        <>
          {main}
          {side}
        </>
      )}
      <View style={{ height: 8 }} />
      <Text variant="label" align="center" color={colors.textFaint}>
        Entreno
      </Text>
    </Screen>
  );
}
