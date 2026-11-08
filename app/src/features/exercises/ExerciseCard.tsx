import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import type { Exercise } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

import { ExerciseAnimation, hasAnimation } from './ExerciseAnimation';

/** Tarjeta de ejercicio para la cuadrícula de escritorio */
export function ExerciseCard({ exercise, onPress, selected }: { exercise: Exercise; onPress: () => void; selected?: boolean }) {
  const hasVideo = !!(exercise.video_path || exercise.video_url);
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }) => [styles.card, hovered && styles.hover, selected && styles.selected]}
    >
      {({ hovered }) => (
        <>
          <View style={styles.media}>
            {hasAnimation(exercise.animation) ? (
              // Se anima al pasar el ratón por encima
              <ExerciseAnimation animation={exercise.animation} playing={!!hovered} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Ionicons name="barbell-outline" size={36} color={colors.textFaint} />
            )}
            {hasVideo ? (
              <View style={styles.videoTag}>
                <Ionicons name="play" size={12} color={colors.white} />
                <Text style={styles.videoText}>VÍDEO</Text>
              </View>
            ) : null}
            {selected ? (
              <View style={styles.check}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </View>
            ) : null}
          </View>
          <View style={{ padding: spacing.md, gap: 6 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {exercise.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {exercise.muscle_group ? <Badge label={exercise.muscle_group} tone="primary" /> : null}
              {exercise.equipment ? <Badge label={exercise.equipment} /> : null}
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hover: { borderColor: colors.primary, transform: [{ translateY: -2 }] },
  selected: { borderColor: colors.primaryBright, borderWidth: 2 },
  media: {
    aspectRatio: 1.3,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  videoTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoText: { color: colors.white, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  check: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
