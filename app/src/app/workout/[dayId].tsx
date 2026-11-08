import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { VideoBadge } from '@/components/VideoBadge';
import { Badge, Button, Card, ErrorState, Grid, IconButton, Loading, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDay } from '@/features/plans/api';
import { dayStats } from '@/features/plans/components';
import { requiredEquipment } from '@/features/plans/equipment';
import { BLOCK_TYPE_LABEL, describeBlock, describeTarget } from '@/features/workout/engine';
import { DAY_NAMES } from '@/lib/dates';
import { useColumns } from '@/lib/responsive';
import { colors, fonts, radius, spacing } from '@/theme';

/** Resumen del entrenamiento del día antes de empezar */
export default function WorkoutOverviewScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { profile } = useAuth();
  const { data: day, isPending, error, refetch } = useDay(dayId);
  const columns = useColumns(3, 440);

  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  const s = dayStats(day);
  const isTrainer = profile?.role === 'trainer';

  return (
    <Screen width="wide"
      edges={['top', 'bottom']}
      footer={
        s.exercises > 0 ? (
          <Button
            title={isTrainer ? 'Probar temporizador' : 'Empezar entrenamiento'}
            size="lg"
            icon="play"
            onPress={() => router.push(`/workout/player/${day.id}`)}
          />
        ) : undefined
      }
    >
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="label">{DAY_NAMES[day.day_of_week - 1]}</Text>
        <Text variant="hero">{day.title}</Text>
        <Text variant="small">
          ~{s.minutes} min · {s.blocks} bloques · {s.exercises} ejercicios
        </Text>
      </View>

      {requiredEquipment(day).length ? (
        <Card accent>
          <Text variant="label">Material necesario</Text>
          <Text variant="small">Tenlo preparado antes de empezar.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
            {requiredEquipment(day).map((item) => (
              <View key={item.label} style={styles.equip}>
                <Ionicons name={item.icon} size={16} color={colors.primaryBright} />
                <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {day.notes ? (
        <Card accent>
          <Text variant="label">Indicaciones</Text>
          <Text variant="body">{day.notes}</Text>
        </Card>
      ) : null}

      <Grid columns={columns} gap={spacing.xl}>
        {day.workout_blocks.map((b, i) => (
          <View key={b.id} style={{ gap: spacing.sm }}>
            <View style={styles.blockHeader}>
              <View style={styles.letter}>
                <Text style={{ fontFamily: fonts.display, color: colors.white, fontSize: 18 }}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h2">{b.name}</Text>
                <Text variant="small">{describeBlock(b)}</Text>
              </View>
              <Badge label={BLOCK_TYPE_LABEL[b.type]} tone="primary" />
            </View>
            {b.notes ? <Text variant="small">{b.notes}</Text> : null}
            <Card style={{ padding: 4, gap: 0 }}>
              {b.block_exercises.map((be) => (
                <Pressable
                  key={be.id}
                  onPress={() => router.push(`/exercise/${be.exercise.id}`)}
                  style={({ pressed }) => [styles.exRow, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  <VideoBadge hasVideo={!!(be.exercise.video_path || be.exercise.video_url)} animation={be.exercise.animation} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{be.exercise.name}</Text>
                    <Text variant="small">{describeTarget(be) || '—'}</Text>
                    {be.notes ? (
                      <Text variant="small" color={colors.warning}>
                        {be.notes}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </Grid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  letter: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  equip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
});
