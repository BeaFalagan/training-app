import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ChipSelect, Columns, ErrorState, Header, IconButton, Input, Loading, Screen, SectionTitle, Stepper, Text } from '@/components/ui';
import {
  useDeleteBlockExercise,
  usePlan,
  useSwapPositions,
  useUpdateBlock,
  useUpdateBlockExercise,
} from '@/features/plans/api';
import { BLOCK_DEFAULTS, BLOCK_TYPE_HINT, BLOCK_TYPE_LABEL, buildSteps, estimateDuration } from '@/features/workout/engine';
import { formatDuration } from '@/lib/dates';
import { showError } from '@/lib/errors';
import type { BlockExerciseWithExercise, BlockType, BlockWithExercises } from '@/lib/types';
import { colors, fonts, spacing } from '@/theme';

const fmtSec = (v: number) => (v === 0 ? '—' : v >= 60 && v % 60 === 0 ? `${v / 60} min` : v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v} s`);

export default function BlockEditorScreen() {
  const { id, planId } = useLocalSearchParams<{ id: string; planId: string }>();
  const { data: plan, isPending, error, refetch } = usePlan(planId);
  const block = useMemo(
    () => plan?.plan_days.flatMap((d) => d.workout_blocks).find((b) => b.id === id),
    [plan, id],
  );

  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!block) return <ErrorState message="Este bloque ya no existe." onRetry={() => router.back()} />;
  return <BlockForm block={block} planId={planId} />;
}

function BlockForm({ block, planId }: { block: BlockWithExercises; planId: string }) {
  const update = useUpdateBlock();
  const [name, setName] = useState(block.name);
  const [type, setType] = useState<BlockType>(block.type);
  const [rounds, setRounds] = useState(block.rounds);
  const [work, setWork] = useState(block.work_seconds ?? 0);
  const [rest, setRest] = useState(block.rest_seconds ?? 0);
  const [restRounds, setRestRounds] = useState(block.rest_between_rounds ?? 0);
  const [cap, setCap] = useState(block.time_cap_seconds ?? 0);
  const [notes, setNotes] = useState(block.notes ?? '');

  function changeType(t: BlockType) {
    setType(t);
    const d = BLOCK_DEFAULTS[t];
    setRounds(d.rounds ?? 1);
    setWork(d.work_seconds ?? 0);
    setRest(d.rest_seconds ?? 0);
    setRestRounds(d.rest_between_rounds ?? 0);
    setCap(d.time_cap_seconds ?? 0);
    if (Object.values(BLOCK_TYPE_LABEL).includes(name)) setName(BLOCK_TYPE_LABEL[t]);
  }

  const values = {
    name: name.trim() || BLOCK_TYPE_LABEL[type],
    type,
    rounds,
    work_seconds: work || null,
    rest_seconds: rest || null,
    rest_between_rounds: restRounds || null,
    time_cap_seconds: cap || null,
    notes: notes.trim() || null,
  };

  const estimate = estimateDuration(buildSteps([{ ...block, ...values }], { prepareSeconds: 0 }));

  async function onSave() {
    try {
      await update.mutateAsync({ id: block.id, ...values });
      router.back();
    } catch (e) {
      showError(e);
    }
  }

  const show = {
    rounds: true,
    roundsLabel: type === 'standard' ? 'Series' : type === 'emom' ? 'Minutos' : 'Rondas',
    work: type === 'emom' || type === 'tabata',
    workLabel: type === 'emom' ? 'Intervalo' : 'Trabajo',
    rest: type === 'standard' || type === 'circuit' || type === 'tabata',
    restLabel: type === 'circuit' ? 'Descanso entre ejercicios' : 'Descanso',
    restRounds: type === 'circuit',
    cap: type === 'amrap' || type === 'for_time',
  };

  return (
    <Screen width="medium" edges={['top', 'bottom']} footer={<Button title="Guardar bloque" size="lg" onPress={onSave} loading={update.isPending} />}>
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <Header eyebrow={`≈ ${formatDuration(estimate)}`} title="Editar bloque" />

      <Columns
        ratio={[1, 1.3]}
        left={
          <>
          <Input label="Nombre del bloque" value={name} onChangeText={setName} placeholder="Ej: Fuerza, Metcon, Finisher" />

          <SectionTitle title="Formato" />
          <ChipSelect
            options={(Object.keys(BLOCK_TYPE_LABEL) as BlockType[]).map((t) => ({ value: t, label: BLOCK_TYPE_LABEL[t] }))}
            value={type}
            onChange={changeType}
          />
          <Text variant="small">{BLOCK_TYPE_HINT[type]}</Text>

          {type !== 'amrap' ? <Stepper label={show.roundsLabel} value={rounds} onChange={setRounds} min={1} max={60} /> : null}
          {show.work ? <Stepper label={show.workLabel} value={work} onChange={setWork} min={5} max={600} step={5} format={fmtSec} /> : null}
          {show.rest ? <Stepper label={show.restLabel} value={rest} onChange={setRest} min={0} max={600} step={5} format={fmtSec} /> : null}
          {show.restRounds ? (
            <Stepper label="Descanso entre rondas" value={restRounds} onChange={setRestRounds} min={0} max={600} step={15} format={fmtSec} />
          ) : null}
          {show.cap ? (
            <Stepper
              label={type === 'amrap' ? 'Duración' : 'Time cap'}
              value={cap}
              onChange={setCap}
              min={type === 'amrap' ? 60 : 0}
              max={3600}
              step={60}
              format={fmtSec}
            />
          ) : null}
          <Input label="Notas del bloque" value={notes} onChangeText={setNotes} multiline placeholder="Indicaciones de ritmo, técnica…" />
          </>
        }
        right={
          <>
          <SectionTitle title={`Ejercicios (${block.block_exercises.length})`} />
          {block.block_exercises.map((be, i) => (
            <BlockExerciseRow key={be.id} be={be} index={i} list={block.block_exercises} timed={type === 'emom' || type === 'tabata'} />
          ))}
          <Button
            title="Añadir ejercicios"
            icon="add"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/pick-exercises',
                params: {
                  blockId: block.id,
                  planId,
                  start: String(block.block_exercises.length ? Math.max(...block.block_exercises.map((x) => x.position)) + 1 : 0),
                },
              })
            }
          />
          </>
        }
      />
    </Screen>
  );
}

function BlockExerciseRow({
  be,
  index,
  list,
  timed,
}: {
  be: BlockExerciseWithExercise;
  index: number;
  list: BlockExerciseWithExercise[];
  timed: boolean;
}) {
  const update = useUpdateBlockExercise();
  const del = useDeleteBlockExercise();
  const swap = useSwapPositions('block_exercises');
  const [reps, setReps] = useState(be.reps ?? '');
  const [duration, setDuration] = useState(be.duration_seconds ? String(be.duration_seconds) : '');
  const [load, setLoad] = useState(be.load ?? '');
  const [rest, setRest] = useState(be.rest_seconds != null ? String(be.rest_seconds) : '');
  const [notes, setNotes] = useState(be.notes ?? '');

  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch, { onError: (e) => showError(e) });
  const toInt = (s: string) => (s.trim() ? Math.max(0, parseInt(s, 10) || 0) : null);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={styles.index}>{index + 1}</Text>
        <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {be.exercise.name}
        </Text>
        <IconButton icon="chevron-up" size={16} accessibilityLabel="Subir" onPress={() => index > 0 && swap.mutate([be, list[index - 1]])} />
        <IconButton icon="close" size={16} accessibilityLabel="Quitar ejercicio" onPress={() => del.mutate(be.id)} />
      </View>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Input label="Reps" value={reps} onChangeText={setReps} onBlur={() => save({ id: be.id, reps: reps.trim() || null })} placeholder="10" />
        </View>
        {!timed ? (
          <View style={styles.cell}>
            <Input
              label="Tiempo (s)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              onBlur={() => save({ id: be.id, duration_seconds: toInt(duration) || null })}
              placeholder="—"
            />
          </View>
        ) : null}
        <View style={styles.cell}>
          <Input label="Carga" value={load} onChangeText={setLoad} onBlur={() => save({ id: be.id, load: load.trim() || null })} placeholder="16 kg" />
        </View>
        {!timed ? (
          <View style={styles.cell}>
            <Input
              label="Desc. (s)"
              value={rest}
              onChangeText={setRest}
              keyboardType="number-pad"
              onBlur={() => save({ id: be.id, rest_seconds: toInt(rest) })}
              placeholder="auto"
            />
          </View>
        ) : null}
      </View>
      <Input value={notes} onChangeText={setNotes} onBlur={() => save({ id: be.id, notes: notes.trim() || null })} placeholder="Nota (tempo, variante…)" />
    </Card>
  );
}

const styles = StyleSheet.create({
  index: { fontFamily: fonts.display, color: colors.primaryBright, fontSize: 16, width: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexGrow: 1, flexBasis: '22%', minWidth: 70 },
});
