import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { VideoBadge } from '@/components/VideoBadge';
import { Button, Card, ChipSelect, EmptyState, Grid, Header, IconButton, Input, ListRow, Loading, Screen } from '@/components/ui';
import { MUSCLE_GROUPS, useExercises } from '@/features/exercises/api';
import { ExerciseCard } from '@/features/exercises/ExerciseCard';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import { useAddBlockExercises } from '@/features/plans/api';
import { showError } from '@/lib/errors';
import { colors, spacing } from '@/theme';

/** Selector múltiple de ejercicios para añadir a un bloque */
export default function PickExercisesScreen() {
  const { blockId, start } = useLocalSearchParams<{ blockId: string; planId: string; start: string }>();
  const { data, isPending } = useExercises();
  const add = useAddBlockExercises();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('Todos');
  const [selected, setSelected] = useState<string[]>([]);
  const isDesktop = useIsDesktop();
  const pickColumns = useColumns(5, 230);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (e) => (group === 'Todos' || e.muscle_group === group) && (!term || e.name.toLowerCase().includes(term)),
    );
  }, [data, q, group]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function onAdd() {
    try {
      await add.mutateAsync({ block_id: blockId, exercise_ids: selected, startPosition: Number(start) || 0 });
      router.back();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen width="medium"
      edges={['top', 'bottom']}
      footer={
        <Button
          title={selected.length ? `Añadir ${selected.length}` : 'Selecciona ejercicios'}
          size="lg"
          disabled={!selected.length}
          onPress={onAdd}
          loading={add.isPending}
        />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.md }}>
        <IconButton icon="close" accessibilityLabel="Cerrar" onPress={() => router.back()} />
      </View>
      <Header eyebrow="Biblioteca" title="Añadir ejercicios" />
      <Input placeholder="Buscar" value={q} onChangeText={setQ} />
      <ChipSelect options={['Todos', ...MUSCLE_GROUPS].map((g) => ({ value: g, label: g }))} value={group} onChange={setGroup} />
      {isPending ? (
        <Loading />
      ) : filtered.length && isDesktop ? (
        <Grid columns={pickColumns}>
          {filtered.map((e) => (
            <ExerciseCard key={e.id} exercise={e} selected={selected.includes(e.id)} onPress={() => toggle(e.id)} />
          ))}
        </Grid>
      ) : filtered.length ? (
        <Card style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: 0 }}>
          {filtered.map((e) => {
            const order = selected.indexOf(e.id);
            return (
              <ListRow
                key={e.id}
                left={<VideoBadge hasVideo={!!(e.video_path || e.video_url)} animation={e.animation} />}
                title={e.name}
                subtitle={[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}
                onPress={() => toggle(e.id)}
                right={
                  order >= 0 ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    </View>
                  ) : (
                    <Ionicons name="ellipse-outline" size={26} color={colors.textFaint} />
                  )
                }
              />
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon="barbell-outline"
          title="Sin ejercicios"
          message="Crea ejercicios en la biblioteca primero."
          action={<Button title="Nuevo ejercicio" onPress={() => router.push('/exercise-edit/new')} fullWidth={false} />}
        />
      )}
    </Screen>
  );
}
