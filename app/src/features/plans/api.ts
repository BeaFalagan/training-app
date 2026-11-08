import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { BLOCK_DEFAULTS, BLOCK_TYPE_LABEL } from '@/features/workout/engine';
import { showAlert } from '@/lib/alert';
import { addDays, formatWeekRange, parseISODate, toISODate, weekStartISO } from '@/lib/dates';
import { showError } from '@/lib/errors';
import { unwrap } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import type {
  BlockExercise,
  BlockType,
  DayWithBlocks,
  PlanDay,
  PlanWithDays,
  WeeklyPlan,
  WorkoutBlock,
} from '@/lib/types';

const DAY_SELECT = '*, workout_blocks(*, block_exercises(*, exercise:exercises(*)))';
const PLAN_SELECT = `*, plan_days(${DAY_SELECT})`;

const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function sortDay(day: DayWithBlocks): DayWithBlocks {
  return {
    ...day,
    workout_blocks: [...(day.workout_blocks ?? [])]
      .sort(byPos)
      .map((b) => ({ ...b, block_exercises: [...(b.block_exercises ?? [])].sort(byPos) })),
  };
}

export function sortPlan(plan: PlanWithDays): PlanWithDays {
  return {
    ...plan,
    plan_days: [...(plan.plan_days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week).map(sortDay),
  };
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/** Planes de un cliente (vista del entrenador), más recientes primero */
export function useClientPlans(clientId: string | undefined) {
  return useQuery({
    queryKey: ['plans', 'client', clientId],
    enabled: !!clientId,
    queryFn: async () =>
      unwrap<(WeeklyPlan & { plan_days: { id: string }[] })[]>(
        await supabase
          .from('weekly_plans')
          .select('*, plan_days(id)')
          .eq('client_id', clientId!)
          .order('week_start', { ascending: false }),
      ),
  });
}

export function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['plan', planId],
    enabled: !!planId,
    queryFn: async () =>
      sortPlan(unwrap<PlanWithDays>(await supabase.from('weekly_plans').select(PLAN_SELECT).eq('id', planId!).single())),
  });
}

/** Plan publicado de una semana concreta (vista del cliente) */
export function useWeekPlan(clientId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: ['plan', 'week', clientId, weekStart],
    enabled: !!clientId,
    queryFn: async () => {
      const res = await supabase
        .from('weekly_plans')
        .select(PLAN_SELECT)
        .eq('client_id', clientId!)
        .eq('week_start', weekStart)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const plan = unwrap<PlanWithDays | null>(res);
      return plan ? sortPlan(plan) : null;
    },
  });
}

export function useDay(dayId: string | undefined) {
  return useQuery({
    queryKey: ['day', dayId],
    enabled: !!dayId,
    queryFn: async () => {
      const res = await supabase
        .from('plan_days')
        .select(`${DAY_SELECT}, plan:weekly_plans(id, title, week_start, client_id)`)
        .eq('id', dayId!)
        .single();
      const day = unwrap<DayWithBlocks & { plan: Pick<WeeklyPlan, 'id' | 'title' | 'week_start' | 'client_id'> }>(res);
      return { ...sortDay(day), plan: day.plan };
    },
  });
}

// ---------------------------------------------------------------------------
// Escrituras (entrenador)
// ---------------------------------------------------------------------------

function useInvalidatePlans() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['plan'] });
    qc.invalidateQueries({ queryKey: ['plans'] });
    qc.invalidateQueries({ queryKey: ['day'] });
  };
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { trainer_id: string; client_id: string; week_start: string; title?: string }) =>
      unwrap<WeeklyPlan>(await supabase.from('weekly_plans').insert(input).select().single()),
    onSuccess: invalidate,
  });
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WeeklyPlan> & { id: string }) =>
      unwrap<WeeklyPlan>(await supabase.from('weekly_plans').update(patch).eq('id', id).select().single()),
    onSuccess: invalidate,
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('weekly_plans').delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

/** Publica el plan: desde ese momento el cliente lo ve en su app. */
export function usePublishPlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (plan: Pick<WeeklyPlan, 'id'>) =>
      unwrap(
        await supabase
          .from('weekly_plans')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', plan.id),
      ),
    onSuccess: invalidate,
  });
}

export function useDuplicatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { planId: string; weekStart: string; clientId?: string }) =>
      unwrap<string>(
        await supabase.rpc('duplicate_plan', {
          p_plan: input.planId,
          p_week_start: input.weekStart,
          p_client: input.clientId ?? null,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useAddDay() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { plan_id: string; day_of_week: number; title?: string }) =>
      unwrap<PlanDay>(await supabase.from('plan_days').insert(input).select().single()),
    onSuccess: invalidate,
  });
}

export function useUpdateDay() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PlanDay> & { id: string }) =>
      unwrap(await supabase.from('plan_days').update(patch).eq('id', id)),
    onSuccess: invalidate,
  });
}

export function useDeleteDay() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('plan_days').delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

export function useAddBlock() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { day_id: string; type: BlockType; position: number }) => {
      const d = BLOCK_DEFAULTS[input.type];
      return unwrap<WorkoutBlock>(
        await supabase
          .from('workout_blocks')
          .insert({
            ...input,
            name: BLOCK_TYPE_LABEL[input.type],
            rounds: d.rounds ?? 1,
            work_seconds: d.work_seconds ?? null,
            rest_seconds: d.rest_seconds ?? null,
            rest_between_rounds: d.rest_between_rounds ?? null,
            time_cap_seconds: d.time_cap_seconds ?? null,
          })
          .select()
          .single(),
      );
    },
    onSuccess: invalidate,
  });
}

export function useUpdateBlock() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WorkoutBlock> & { id: string }) =>
      unwrap(await supabase.from('workout_blocks').update(patch).eq('id', id)),
    onSuccess: invalidate,
  });
}

export function useDeleteBlock() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workout_blocks').delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

export function useAddBlockExercises() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (input: { block_id: string; exercise_ids: string[]; startPosition: number; reps?: string }) =>
      unwrap(
        await supabase.from('block_exercises').insert(
          input.exercise_ids.map((exercise_id, i) => ({
            block_id: input.block_id,
            exercise_id,
            position: input.startPosition + i,
            reps: input.reps ?? '10',
          })),
        ),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateBlockExercise() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<BlockExercise> & { id: string }) =>
      unwrap(await supabase.from('block_exercises').update(patch).eq('id', id)),
    onSuccess: invalidate,
  });
}

export function useDeleteBlockExercise() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('block_exercises').delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

/** Intercambia la posición de dos elementos (bloques o ejercicios de un bloque) */
export function useSwapPositions(table: 'workout_blocks' | 'block_exercises') {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async ([a, b]: [{ id: string; position: number }, { id: string; position: number }]) => {
      // Si las posiciones coinciden (datos antiguos), usamos el índice como desempate
      const pa = a.position === b.position ? b.position + 1 : b.position;
      unwrap(await supabase.from(table).update({ position: pa }).eq('id', a.id));
      unwrap(await supabase.from(table).update({ position: a.position }).eq('id', b.id));
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------------------
// Vista semanal del entrenador
// ---------------------------------------------------------------------------

export type PlanSummary = Pick<WeeklyPlan, 'id' | 'client_id' | 'week_start' | 'status' | 'title'> & { plan_days: { id: string }[] };

/** Todos los planes del entrenador (resumen), más recientes primero */
export function useTrainerPlans(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['plans', 'trainer', trainerId],
    enabled: !!trainerId,
    queryFn: async () =>
      unwrap<PlanSummary[]>(
        await supabase
          .from('weekly_plans')
          .select('id, client_id, week_start, status, title, plan_days(id)')
          .eq('trainer_id', trainerId!)
          .order('week_start', { ascending: false }),
      ),
  });
}

/** Primera semana libre (sin plan) a partir de `from` */
export function firstFreeWeek(from: Date, takenWeeks: string[]) {
  const taken = new Set(takenWeeks);
  let week = from;
  while (taken.has(toISODate(week))) week = addDays(week, 7);
  return toISODate(week);
}

/**
 * Repetir una semana: copia el plan (días, bloques y ejercicios) a la siguiente
 * semana libre —como mínimo la actual— como borrador, y abre el editor.
 */
export function useRepeatPlan() {
  const duplicate = useDuplicatePlan();
  const repeat = async (plan: Pick<WeeklyPlan, 'id' | 'week_start'>, clientWeeks: string[]) => {
    const current = parseISODate(weekStartISO());
    const afterSource = addDays(parseISODate(plan.week_start), 7);
    const target = firstFreeWeek(afterSource > current ? afterSource : current, clientWeeks);
    try {
      const newId = await duplicate.mutateAsync({ planId: plan.id, weekStart: target });
      showAlert('Semana repetida', `Copiada a la semana del ${formatWeekRange(target)} como borrador. Revísala y publícala cuando esté lista.`);
      router.push(`/plan/${newId}`);
    } catch (e) {
      showError(e);
    }
  };
  return { repeat, isPending: duplicate.isPending };
}
