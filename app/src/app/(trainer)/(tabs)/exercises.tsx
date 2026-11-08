import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button, Card, ChipSelect, EmptyState, ErrorState, Grid, Header, IconButton, Input, ListRow, Loading, Screen } from '@/components/ui';
import { VideoBadge } from '@/components/VideoBadge';
import { MUSCLE_GROUPS, useExercises } from '@/features/exercises/api';
import { ExerciseCard } from '@/features/exercises/ExerciseCard';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

export default function ExercisesScreen() {
  const { data, isPending, error, refetch, isRefetching } = useExercises();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('Todos');
  const isDesktop = useIsDesktop();
  const columns = useColumns(8, 250);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (e) => (group === 'Todos' || e.muscle_group === group) && (!term || e.name.toLowerCase().includes(term)),
    );
  }, [data, q, group]);

  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Header
        eyebrow={`${data.length} ejercicios`}
        title="Biblioteca"
        right={
          isDesktop ? (
            <Button title="Nuevo ejercicio" icon="add" fullWidth={false} onPress={() => router.push('/exercise-edit/new')} />
          ) : (
            <IconButton icon="add" background={colors.primary} accessibilityLabel="Nuevo ejercicio" onPress={() => router.push('/exercise-edit/new')} />
          )
        }
      />
      <Input placeholder="Buscar ejercicio" value={q} onChangeText={setQ} />
      <ChipSelect
        options={['Todos', ...MUSCLE_GROUPS].map((g) => ({ value: g, label: g }))}
        value={group}
        onChange={setGroup}
      />

      {filtered.length > 0 && isDesktop ? (
        <Grid columns={columns}>
          {filtered.map((e) => (
            <ExerciseCard key={e.id} exercise={e} onPress={() => router.push(`/exercise-edit/${e.id}`)} />
          ))}
        </Grid>
      ) : filtered.length > 0 ? (
        <Card style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 0 }}>
          {filtered.map((e) => (
            <ListRow
              key={e.id}
              left={<VideoBadge hasVideo={!!(e.video_path || e.video_url)} animation={e.animation} />}
              title={e.name}
              subtitle={[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/exercise-edit/${e.id}`)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="barbell-outline"
          title={data.length ? 'Sin resultados' : 'Crea tu biblioteca'}
          message="Añade ejercicios con un vídeo explicativo y claves técnicas. Los usarás para montar los planes."
          action={!data.length ? <Button title="Nuevo ejercicio" onPress={() => router.push('/exercise-edit/new')} fullWidth={false} /> : null}
        />
      )}
    </Screen>
  );
}
