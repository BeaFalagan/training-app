import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, EmptyState, Grid, Header, Loading, Screen, SectionTitle, Stat, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { computeStats, useClientLogs } from '@/features/logs/api';
import { addDays, DAY_SHORT, formatDuration, formatRelative, startOfWeek, toISODate } from '@/lib/dates';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import { colors, radius, spacing } from '@/theme';

const WEEKS = 10;

export default function ProgressScreen() {
  const { profile } = useAuth();
  const logs = useClientLogs(profile?.id, 200);
  const stats = computeStats(logs.data ?? []);
  const isDesktop = useIsDesktop();
  const historyColumns = useColumns(4, 380);

  // Mapa de calor: últimas 10 semanas, columnas = semanas, filas = días
  const heat = useMemo(() => {
    const counts = new Map<string, number>();
    (logs.data ?? []).forEach((l) => {
      const k = toISODate(new Date(l.started_at));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const first = addDays(startOfWeek(), -7 * (WEEKS - 1));
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(first, w * 7 + d);
        return { key: toISODate(date), count: counts.get(toISODate(date)) ?? 0, future: date > new Date() };
      }),
    );
  }, [logs.data]);

  if (logs.isPending) return <Loading />;

  return (
    <Screen refreshing={logs.isRefetching} onRefresh={logs.refetch}>
      <Header eyebrow="Tu evolución" title="Progreso" />
      <Grid columns={isDesktop ? 4 : 2} gap={spacing.md}>
        <Stat value={stats.thisWeek} label="Esta semana" />
        <Stat value={stats.streak} label="Racha (sem.)" />
        <Stat value={stats.total} label="Sesiones" />
        <Stat value={stats.totalMinutes} label="Minutos" />
      </Grid>

      <SectionTitle title={`Últimas ${WEEKS} semanas`} />
      <Card>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ gap: 4, marginRight: 4 }}>
            {DAY_SHORT.map((d) => (
              <Text key={d} variant="small" style={{ height: 18, fontSize: 10, lineHeight: 18 }}>
                {d}
              </Text>
            ))}
          </View>
          {heat.map((week, i) => (
            <View key={i} style={{ flex: 1, gap: 4 }}>
              {week.map((c) => (
                <View
                  key={c.key}
                  style={[
                    styles.heat,
                    { backgroundColor: c.future ? 'transparent' : c.count ? colors.primaryBright : colors.surfaceAlt },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Historial" />
      {logs.data?.length ? (
        <Grid columns={historyColumns} gap={spacing.md}>
          {logs.data.slice(0, 30).map((l) => (
            <Card key={l.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="h3">{l.day_title ?? 'Entrenamiento'}</Text>
                <Text variant="small">{formatRelative(l.started_at)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Badge label={formatDuration(l.duration_seconds ?? 0)} />
                {l.rounds_completed ? <Badge label={`${l.rounds_completed} rondas`} tone="rest" /> : null}
              </View>
            </Card>
          ))}
        </Grid>
      ) : (
        <EmptyState icon="trophy-outline" title="Empieza hoy" message="Cada entrenamiento que completes aparecerá aquí." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heat: { height: 18, borderRadius: radius.sm / 2 },
});
