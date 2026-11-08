import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ErrorState, Grid, IconButton, Input, Loading, Screen, SectionTitle, Text } from '@/components/ui';
import {
  useAddBlock,
  useAddDay,
  useDeleteBlock,
  useDeleteDay,
  useDeletePlan,
  useDuplicatePlan,
  usePlan,
  usePublishPlan,
  useSwapPositions,
  useUpdateDay,
  useUpdatePlan,
} from '@/features/plans/api';
import { BLOCK_TYPE_HINT, BLOCK_TYPE_LABEL, describeBlock, describeTarget } from '@/features/workout/engine';
import { addDays, DAY_NAMES, DAY_SHORT, dateOfPlanDay, formatShortDate, formatWeekRange, parseISODate, toISODate } from '@/lib/dates';
import { confirm, showError } from '@/lib/errors';
import { showAlert } from '@/lib/alert';
import { useColumns } from '@/lib/responsive';
import { supabase } from '@/lib/supabase';
import type { BlockType, DayWithBlocks, PlanWithDays } from '@/lib/types';
import { colors, fonts, radius, spacing } from '@/theme';

const BLOCK_TYPES: BlockType[] = ['standard', 'circuit', 'emom', 'amrap', 'tabata', 'for_time'];

export default function PlanEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isPending, error, refetch } = usePlan(id);
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  return <PlanEditor key={plan.id} plan={plan} />;
}

function PlanEditor({ plan }: { plan: PlanWithDays }) {
  const updatePlan = useUpdatePlan();
  const publish = usePublishPlan();
  const duplicate = useDuplicatePlan();
  const deletePlan = useDeletePlan();
  const addDay = useAddDay();

  // Al abrir, selecciona el primer día con entrenamiento
  const [selectedDow, setSelectedDow] = useState(() => plan.plan_days[0]?.day_of_week ?? 1);
  const [title, setTitle] = useState(plan.title);
  const day = useMemo(() => plan.plan_days.find((d) => d.day_of_week === selectedDow), [plan, selectedDow]);

  const isPublished = plan.status === 'published';
  const totalBlocks = plan.plan_days.reduce((a, d) => a + d.workout_blocks.length, 0);

  async function onPublish() {
    if (totalBlocks === 0) return showAlert('Plan vacío', 'Añade al menos un bloque con ejercicios antes de publicar.');
    try {
      await publish.mutateAsync(plan);
      showAlert(
        isPublished ? 'Plan actualizado' : '¡Plan publicado!',
        'Tu cliente ya puede verlo en la app.',
      );
    } catch (e) {
      showError(e);
    }
  }

  function onMore() {
    const duplicateNext = async () => {
      try {
        const next = toISODate(addDays(parseISODate(plan.week_start), 7));
        const newId = await duplicate.mutateAsync({ planId: plan.id, weekStart: next });
        router.replace(`/plan/${newId}`);
      } catch (e) {
        showError(e);
      }
    };
    const remove = async () => {
      if (!(await confirm('Eliminar plan', 'Se borrarán todos los días y bloques de esta semana.'))) return;
      try {
        await deletePlan.mutateAsync(plan.id);
        router.back();
      } catch (e) {
        showError(e);
      }
    };
    showAlert('Opciones del plan', undefined, [
      { text: 'Duplicar a la semana siguiente', onPress: duplicateNext },
      { text: 'Mover a la semana anterior', onPress: () => moveWeek(-1) },
      { text: 'Mover a la semana siguiente', onPress: () => moveWeek(1) },
      { text: 'Eliminar plan', style: 'destructive', onPress: remove },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  /** Mover el plan de semana: siempre con confirmación y avisando de lo que implica */
  async function moveWeek(delta: number) {
    const next = toISODate(addDays(parseISODate(plan.week_start), 7 * delta));
    try {
      const { data: taken } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('client_id', plan.client_id)
        .eq('week_start', next)
        .neq('id', plan.id)
        .limit(1);
      if (taken?.length) {
        showAlert('Semana ocupada', `Este cliente ya tiene un plan la semana del ${formatWeekRange(next)}.`);
        return;
      }
      const dayIds = plan.plan_days.map((d) => d.id);
      const { count } = dayIds.length
        ? await supabase.from('workout_logs').select('id', { count: 'exact', head: true }).in('day_id', dayIds)
        : { count: 0 };
      const warning = count
        ? `\n\nAtención: ya ha completado ${count} ${count === 1 ? 'sesión' : 'sesiones'} de este plan.`
        : '';
      const ok = await confirm(
        'Mover plan de semana',
        `El plan pasará a la semana del ${formatWeekRange(next)} y el cliente dejará de verlo en la del ${formatWeekRange(plan.week_start)}.${warning}`,
        'Mover',
      );
      if (!ok) return;
      await updatePlan.mutateAsync({ id: plan.id, week_start: next });
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen width="medium"
      edges={['top', 'bottom']}
      footer={
        <Button
          title={isPublished ? 'Guardar cambios' : 'Publicar al cliente'}
          icon={isPublished ? 'refresh' : 'send'}
          size="lg"
          onPress={onPublish}
          loading={publish.isPending}
        />
      }
    >
      <View style={styles.topBar}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
        <Badge label={isPublished ? 'Publicado' : 'Borrador'} tone={isPublished ? 'success' : 'warning'} />
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="Más opciones" onPress={onMore} />
      </View>

      <View style={styles.weekRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text variant="label" color={colors.text}>
          Semana del {formatWeekRange(plan.week_start)}
        </Text>
      </View>

      <Input
        value={title}
        onChangeText={setTitle}
        onBlur={() => title.trim() && title !== plan.title && updatePlan.mutate({ id: plan.id, title: title.trim() })}
        style={{ fontFamily: fonts.display, fontSize: 20, textTransform: 'uppercase' }}
      />

      <View style={styles.days}>
        {DAY_SHORT.map((label, i) => {
          const dow = i + 1;
          const has = plan.plan_days.some((d) => d.day_of_week === dow);
          const active = dow === selectedDow;
          return (
            <Pressable
              key={dow}
              onPress={() => setSelectedDow(dow)}
              style={[styles.day, has && styles.dayHas, active && styles.dayActive]}
              accessibilityLabel={`${DAY_NAMES[i]}${has ? ', con entrenamiento' : ''}`}
            >
              <Text style={[styles.dayLabel, active && { color: colors.white }]}>{label}</Text>
              <Text style={[styles.dayNum, active && { color: colors.white }]}>
                {dateOfPlanDay(plan.week_start, dow).getDate()}
              </Text>
              {has ? <View style={[styles.dot, active && { backgroundColor: colors.white }]} /> : null}
            </Pressable>
          );
        })}
      </View>

      {day ? (
        <DayEditor key={day.id} day={day} planId={plan.id} weekStart={plan.week_start} />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <Ionicons name="bed-outline" size={32} color={colors.textFaint} />
          <Text variant="h3">{DAY_NAMES[selectedDow - 1]} · descanso</Text>
          <Text variant="small" align="center">
            {formatShortDate(dateOfPlanDay(plan.week_start, selectedDow))}
          </Text>
          <Button
            title="Añadir entrenamiento"
            icon="add"
            fullWidth={false}
            loading={addDay.isPending}
            onPress={() =>
              addDay
                .mutateAsync({ plan_id: plan.id, day_of_week: selectedDow, title: `Día ${plan.plan_days.length + 1}` })
                .catch(showError)
            }
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}
    </Screen>
  );
}

function DayEditor({ day, planId, weekStart }: { day: DayWithBlocks; planId: string; weekStart: string }) {
  const updateDay = useUpdateDay();
  const deleteDay = useDeleteDay();
  const addBlock = useAddBlock();
  const deleteBlock = useDeleteBlock();
  const swap = useSwapPositions('workout_blocks');
  const [title, setTitle] = useState(day.title);
  const [notes, setNotes] = useState(day.notes ?? '');
  const [choosing, setChoosing] = useState(false);
  const blockColumns = useColumns(2, 460);
  const blocks = day.workout_blocks;

  /** Atajo: crea un bloque de series y abre directamente el selector de ejercicios */
  async function onQuickAdd() {
    try {
      const nextPos = blocks.length ? Math.max(...blocks.map((b) => b.position)) + 1 : 0;
      const b = await addBlock.mutateAsync({ day_id: day.id, type: 'standard', position: nextPos });
      router.push({ pathname: '/pick-exercises', params: { blockId: b.id, planId, start: '0' } });
    } catch (e) {
      showError(e);
    }
  }

  async function onAddBlock(type: BlockType) {
    setChoosing(false);
    try {
      const nextPos = blocks.length ? Math.max(...blocks.map((b) => b.position)) + 1 : 0;
      const b = await addBlock.mutateAsync({ day_id: day.id, type, position: nextPos });
      router.push({ pathname: '/block/[id]', params: { id: b.id, planId } });
    } catch (e) {
      showError(e);
    }
  }

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            label={`${DAY_NAMES[day.day_of_week - 1]} · ${formatShortDate(dateOfPlanDay(weekStart, day.day_of_week))}`}
            value={title}
            onChangeText={setTitle}
            onBlur={() => title.trim() && title !== day.title && updateDay.mutate({ id: day.id, title: title.trim() })}
            placeholder="Ej: Pierna + Core"
          />
        </View>
        <IconButton
          icon="trash-outline"
          color={colors.danger}
          accessibilityLabel="Eliminar día"
          onPress={async () => {
            if (await confirm('Quitar entrenamiento', `Se borrará el entrenamiento del ${DAY_NAMES[day.day_of_week - 1].toLowerCase()}.`)) {
              deleteDay.mutate(day.id);
            }
          }}
        />
      </View>
      <Input
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== (day.notes ?? '') && updateDay.mutate({ id: day.id, notes: notes.trim() || null })}
        placeholder="Notas para el cliente (calentamiento, objetivo del día…)"
        multiline
      />

      <SectionTitle
        title={`Bloques (${blocks.length})`}
        action={
          blocks.length ? (
            <Pressable onPress={() => router.push(`/workout/${day.id}`)} hitSlop={8}>
              <Text variant="small" color={colors.primaryBright}>
                Vista previa ›
              </Text>
            </Pressable>
          ) : null
        }
      />

      <Grid columns={blockColumns} gap={spacing.md}>
        {blocks.map((b, i) => (
          <Card key={b.id} onPress={() => router.push({ pathname: '/block/[id]', params: { id: b.id, planId } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={styles.blockLetter}>
                <Text style={{ fontFamily: fonts.display, color: colors.white }}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={1}>
                  {b.name}
                </Text>
                <Text variant="small">
                  {BLOCK_TYPE_LABEL[b.type]} · {describeBlock(b)}
                </Text>
              </View>
              <IconButton
                icon="chevron-up"
                size={16}
                accessibilityLabel="Subir bloque"
                onPress={() => i > 0 && swap.mutate([b, blocks[i - 1]])}
              />
              <IconButton
                icon="close"
                size={16}
                accessibilityLabel="Eliminar bloque"
                onPress={async () => {
                  if (await confirm('Eliminar bloque', `¿Eliminar "${b.name}"?`)) deleteBlock.mutate(b.id);
                }}
              />
            </View>
            {b.block_exercises.length ? (
              b.block_exercises.map((be) => (
                <View key={be.id} style={styles.exRow}>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {be.exercise.name}
                  </Text>
                  <Text variant="small">{describeTarget(be)}</Text>
                </View>
              ))
            ) : (
              <Text variant="small" color={colors.warning}>
                Sin ejercicios · toca para añadir
              </Text>
            )}
          </Card>
        ))}
      </Grid>

      {choosing ? (
        <View style={styles.typeGrid}>
          {BLOCK_TYPES.map((t) => (
            <Pressable key={t} style={styles.typeCard} onPress={() => onAddBlock(t)}>
              <Text variant="h3">{BLOCK_TYPE_LABEL[t]}</Text>
              <Text variant="small" numberOfLines={2}>
                {BLOCK_TYPE_HINT[t]}
              </Text>
            </Pressable>
          ))}
          <Button title="Cancelar" variant="ghost" onPress={() => setChoosing(false)} />
        </View>
      ) : blocks.length === 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Button title="Añadir ejercicios" icon="barbell-outline" onPress={onQuickAdd} loading={addBlock.isPending} />
          <Button title="Elegir formato (circuito, EMOM, AMRAP…)" icon="options-outline" variant="ghost" onPress={() => setChoosing(true)} />
        </View>
      ) : (
        <Button title="Añadir bloque" icon="add" variant="outline" onPress={() => setChoosing(true)} loading={addBlock.isPending} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dayHas: { borderColor: colors.primary },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  dayNum: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primaryBright },
  blockLetter: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
});
