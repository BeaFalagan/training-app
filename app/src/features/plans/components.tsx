import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Text } from '@/components/ui';
import { equipmentSummary } from '@/features/plans/equipment';
import { BLOCK_TYPE_LABEL, buildSteps, estimateDuration } from '@/features/workout/engine';
import { DAY_NAMES, DAY_SHORT, dateOfPlanDay, formatShortDate, isoDayOfWeek, toISODate } from '@/lib/dates';
import type { DayWithBlocks, PlanWithDays } from '@/lib/types';
import { colors, fonts, radius, spacing } from '@/theme';

export function dayStats(day: DayWithBlocks) {
  const exercises = day.workout_blocks.reduce((a, b) => a + b.block_exercises.length, 0);
  const minutes = Math.round(estimateDuration(buildSteps(day.workout_blocks)) / 60);
  return { blocks: day.workout_blocks.length, exercises, minutes };
}

/** Tira semanal L-D con estado de cada día */
export function WeekStrip({
  plan,
  weekStart,
  completedDayIds,
  selected,
  onSelect,
}: {
  plan: PlanWithDays | null | undefined;
  weekStart: string;
  completedDayIds: Set<string>;
  selected?: number;
  onSelect?: (dow: number) => void;
}) {
  const todayISO = toISODate(new Date());
  return (
    <View style={styles.strip}>
      {DAY_SHORT.map((label, i) => {
        const dow = i + 1;
        const date = dateOfPlanDay(weekStart, dow);
        const day = plan?.plan_days.find((d) => d.day_of_week === dow);
        const done = day && completedDayIds.has(day.id);
        const isToday = toISODate(date) === todayISO;
        const isSelected = selected === dow;
        return (
          <Pressable
            key={dow}
            onPress={() => onSelect?.(dow)}
            disabled={!onSelect}
            style={[styles.cell, isToday && styles.today, isSelected && styles.selected]}
          >
            <Text style={[styles.dayLabel, (isToday || isSelected) && { color: colors.white }]}>{label}</Text>
            <Text style={styles.dayNum}>{date.getDate()}</Text>
            <View style={styles.status}>
              {done ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              ) : day ? (
                <View style={styles.dot} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tarjeta destacada del entrenamiento del día */
export function HeroWorkoutCard({
  day,
  weekStart,
  done,
  onStart,
  onOpen,
}: {
  day: DayWithBlocks;
  weekStart: string;
  done: boolean;
  onStart: () => void;
  onOpen: () => void;
}) {
  const s = dayStats(day);
  const equipment = equipmentSummary(day);
  const date = dateOfPlanDay(weekStart, day.day_of_week);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.heroWrap, pressed && { opacity: 0.92 }]}>
      <LinearGradient colors={[colors.primary, colors.primaryDark, '#1A0509']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="label" color="rgba(255,255,255,0.8)">
            {DAY_NAMES[day.day_of_week - 1]} · {formatShortDate(date)}
          </Text>
          {done ? <Badge label="Completado" tone="success" /> : null}
        </View>
        <Text variant="hero" numberOfLines={2} style={{ fontSize: 34, lineHeight: 38 }}>
          {day.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <Meta icon="time-outline" label={`~${s.minutes} min`} />
          <Meta icon="layers-outline" label={`${s.blocks} bloques`} />
          <Meta icon="barbell-outline" label={`${s.exercises} ejercicios`} />
        </View>
        {equipment ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
            <Ionicons name="bag-handle-outline" size={15} color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }} />
            <Text variant="small" color="rgba(255,255,255,0.9)" style={{ flex: 1 }}>
              <Text variant="small" color={colors.white} style={{ fontWeight: '700' }}>
                Material:{' '}
              </Text>
              {equipment}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {day.workout_blocks.map((b) => (
            <View key={b.id} style={styles.pill}>
              <Text style={styles.pillText}>{BLOCK_TYPE_LABEL[b.type]}</Text>
            </View>
          ))}
        </View>
        <Button
          title={done ? 'Repetir entrenamiento' : 'Empezar'}
          variant="secondary"
          size="lg"
          icon="play"
          onPress={onStart}
          style={{ marginTop: spacing.sm }}
        />
      </LinearGradient>
    </Pressable>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.85)" />
      <Text variant="small" color="rgba(255,255,255,0.85)">
        {label}
      </Text>
    </View>
  );
}

export function todayDow() {
  return isoDayOfWeek(new Date());
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  today: { borderColor: colors.primaryBright },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  dayNum: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  status: { height: 14, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryBright },
  heroWrap: { borderRadius: radius.xl, overflow: 'hidden' },
  hero: { padding: spacing.xl, gap: spacing.md },
  pill: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white, letterSpacing: 1, textTransform: 'uppercase' },
});
