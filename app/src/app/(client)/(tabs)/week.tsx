import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Badge, Card, EmptyState, Grid, Header, IconButton, Loading, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClientLogs } from '@/features/logs/api';
import { useWeekPlan } from '@/features/plans/api';
import { dayStats, WeekStrip } from '@/features/plans/components';
import { BLOCK_TYPE_LABEL } from '@/features/workout/engine';
import { addDays, DAY_NAMES, dateOfPlanDay, formatShortDate, formatWeekRange, parseISODate, toISODate, weekStartISO } from '@/lib/dates';
import { useColumns } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

export default function WeekScreen() {
  const columns = useColumns(4, 360);
  const { profile } = useAuth();
  const [weekStart, setWeekStart] = useState(weekStartISO());
  const plan = useWeekPlan(profile?.id, weekStart);
  const logs = useClientLogs(profile?.id);
  const completed = useMemo(() => new Set((logs.data ?? []).map((l) => l.day_id).filter(Boolean) as string[]), [logs.data]);
  const isCurrent = weekStart === weekStartISO();
  const move = (n: number) => setWeekStart(toISODate(addDays(parseISODate(weekStart), 7 * n)));

  return (
    <Screen refreshing={plan.isRefetching} onRefresh={() => plan.refetch()}>
      <Header eyebrow={isCurrent ? 'Esta semana' : formatWeekRange(weekStart)} title={plan.data?.title ?? 'Mi semana'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" size={18} accessibilityLabel="Semana anterior" onPress={() => move(-1)} />
        <Text variant="label" color={colors.text}>
          {formatWeekRange(weekStart)}
        </Text>
        <IconButton icon="chevron-forward" size={18} accessibilityLabel="Semana siguiente" onPress={() => move(1)} />
      </View>
      <WeekStrip plan={plan.data} weekStart={weekStart} completedDayIds={completed} />

      {plan.isPending ? (
        <Loading />
      ) : !plan.data ? (
        <EmptyState icon="calendar-clear-outline" title="Sin plan" message="No hay entrenamientos publicados para esta semana." />
      ) : (
        <Grid columns={columns}>
          {plan.data.plan_days.map((d) => {
            const s = dayStats(d);
            const done = completed.has(d.id);
            return (
              <Card key={d.id} onPress={() => router.push(`/workout/${d.id}`)} accent={done}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="label">
                    {DAY_NAMES[d.day_of_week - 1]} · {formatShortDate(dateOfPlanDay(weekStart, d.day_of_week))}
                  </Text>
                  {done ? <Badge label="Hecho" tone="success" /> : null}
                </View>
                <Text variant="h2">{d.title}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {d.workout_blocks.map((b) => (
                    <Badge key={b.id} label={BLOCK_TYPE_LABEL[b.type]} tone="primary" />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text variant="small">
                    ~{s.minutes} min · {s.exercises} ejercicios
                  </Text>
                </View>
              </Card>
            );
          })}
        </Grid>
      )}
    </Screen>
  );
}
