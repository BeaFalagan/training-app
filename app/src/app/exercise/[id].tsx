import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ExerciseVideo } from '@/components/ExerciseVideo';
import { Badge, Card, Columns, ErrorState, IconButton, Loading, Screen, SectionTitle, Text } from '@/components/ui';
import { useExercise } from '@/features/exercises/api';
import { colors, fonts, spacing } from '@/theme';

/** Ficha del ejercicio con vídeo explicativo */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: e, isPending, error, refetch } = useExercise(id);
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <Screen width="medium" edges={['top', 'bottom']}>
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <Columns
        ratio={[1.3, 1]}
        left={<ExerciseVideo exercise={e} muted={false} />}
        right={
          <>
          <Text variant="h1">{e.name}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {e.muscle_group ? <Badge label={e.muscle_group} tone="primary" /> : null}
            {e.equipment ? <Badge label={e.equipment} /> : null}
          </View>
          {e.description ? <Text variant="body">{e.description}</Text> : null}
          {e.cues.length ? (
            <>
              <SectionTitle title="Claves técnicas" />
              <Card>
                {e.cues.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                    <Text style={{ fontFamily: fonts.display, color: colors.primaryBright }}>{i + 1}</Text>
                    <Text variant="body" style={{ flex: 1 }}>
                      {c}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          </>
        }
      />
    </Screen>
  );
}
