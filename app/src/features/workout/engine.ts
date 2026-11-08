/**
 * Motor de entrenamiento.
 *
 * 1. `buildSteps` convierte los bloques de un día en una lista lineal de pasos
 *    (preparación, trabajo, descanso) que el reproductor recorre.
 * 2. `playerReducer` gestiona el estado del reproductor (play/pausa/siguiente)
 *    a partir de marcas de tiempo, así la cuenta atrás no deriva aunque el
 *    intervalo de refresco se retrase o la app pase a segundo plano.
 *
 * Es lógica pura (sin React ni React Native) y tiene tests en engine.test.ts.
 */
import type { BlockType } from '../../lib/types';

// Tipos mínimos para que el motor no dependa de la forma exacta de la BD
export interface EngineExercise {
  id: string;
  name: string;
}
export interface EngineBlockExercise {
  id: string;
  position: number;
  reps: string | null;
  duration_seconds: number | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: EngineExercise;
}
export interface EngineBlock {
  id: string;
  position: number;
  name: string;
  type: BlockType;
  rounds: number;
  work_seconds: number | null;
  rest_seconds: number | null;
  rest_between_rounds: number | null;
  time_cap_seconds: number | null;
  block_exercises: EngineBlockExercise[];
}

export type StepKind = 'prepare' | 'work' | 'rest';
/**
 * countdown: cuenta atrás, avanza sola al llegar a 0
 * reps:      sin tiempo, el usuario pulsa "Hecho"
 * amrap:     cuenta atrás + contador de rondas
 * for_time:  cronómetro ascendente con time cap opcional
 */
export type StepMode = 'countdown' | 'reps' | 'amrap' | 'for_time';

export interface WorkoutStep<BE extends EngineBlockExercise = EngineBlockExercise> {
  id: string;
  kind: StepKind;
  mode: StepMode;
  /** Segundos (cuenta atrás o time cap). Undefined en modo reps / for_time sin cap. */
  duration?: number;
  title: string;
  subtitle?: string;
  blockIndex: number;
  blockName: string;
  blockType: BlockType;
  round?: number;
  totalRounds?: number;
  blockExercise?: BE;
  /** Lista de ejercicios del bloque (AMRAP / For Time) */
  exercises?: BE[];
  /** Título del siguiente paso de trabajo, para mostrar "Siguiente: …" */
  nextTitle?: string;
}

export interface BuildOptions {
  prepareSeconds?: number;
  transitionSeconds?: number;
}

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  standard: 'Series',
  circuit: 'Circuito',
  emom: 'EMOM',
  amrap: 'AMRAP',
  tabata: 'Tabata',
  for_time: 'For Time',
};

export const BLOCK_TYPE_HINT: Record<BlockType, string> = {
  standard: 'Series × repeticiones con descanso entre series',
  circuit: 'Rondas de varios ejercicios encadenados',
  emom: 'Cada minuto empieza un ejercicio; descansa lo que sobre',
  amrap: 'Máximas rondas posibles en el tiempo indicado',
  tabata: 'Intervalos de trabajo y descanso (20/10 clásico)',
  for_time: 'Completa el trabajo lo más rápido posible',
};

/** Valores por defecto razonables para cada tipo de bloque. */
export const BLOCK_DEFAULTS: Record<BlockType, Partial<EngineBlock>> = {
  standard: { rounds: 3, rest_seconds: 60 },
  circuit: { rounds: 3, rest_seconds: 15, rest_between_rounds: 90 },
  emom: { rounds: 10, work_seconds: 60 },
  amrap: { rounds: 1, time_cap_seconds: 12 * 60 },
  tabata: { rounds: 8, work_seconds: 20, rest_seconds: 10 },
  for_time: { rounds: 3, time_cap_seconds: 20 * 60 },
};

export function describeTarget(be: Pick<EngineBlockExercise, 'reps' | 'duration_seconds' | 'load'>): string {
  const parts: string[] = [];
  if (be.reps) parts.push(/^\d+$/.test(be.reps) ? `${be.reps} reps` : be.reps);
  if (be.duration_seconds) parts.push(`${be.duration_seconds} s`);
  if (be.load) parts.push(be.load);
  return parts.join(' · ');
}

export function describeBlock(b: Omit<EngineBlock, 'block_exercises' | 'id' | 'position' | 'name'>): string {
  switch (b.type) {
    case 'standard':
      return `${b.rounds} series${b.rest_seconds ? ` · ${b.rest_seconds}s descanso` : ''}`;
    case 'circuit':
      return `${b.rounds} rondas${b.rest_between_rounds ? ` · ${b.rest_between_rounds}s entre rondas` : ''}`;
    case 'emom':
      return `${b.rounds} min · cada ${b.work_seconds ?? 60}s`;
    case 'amrap':
      return `${Math.round((b.time_cap_seconds ?? 600) / 60)} min`;
    case 'tabata':
      return `${b.rounds} × ${b.work_seconds ?? 20}/${b.rest_seconds ?? 10}`;
    case 'for_time':
      return `${b.rounds} rondas${b.time_cap_seconds ? ` · cap ${Math.round(b.time_cap_seconds / 60)} min` : ''}`;
  }
}

export function buildSteps<BE extends EngineBlockExercise>(
  blocks: (Omit<EngineBlock, 'block_exercises'> & { block_exercises: BE[] })[],
  opts: BuildOptions = {},
): WorkoutStep<BE>[] {
  const prepareSeconds = opts.prepareSeconds ?? 10;
  const transitionSeconds = opts.transitionSeconds ?? 20;
  const steps: WorkoutStep<BE>[] = [];
  let seq = 0;
  const id = () => `s${seq++}`;

  const sorted = [...blocks]
    .sort((a, b) => a.position - b.position)
    .map((b) => ({ ...b, block_exercises: [...b.block_exercises].sort((x, y) => x.position - y.position) }))
    .filter((b) => b.block_exercises.length > 0);

  sorted.forEach((block, blockIndex) => {
    const base = { blockIndex, blockName: block.name, blockType: block.type };
    const exs = block.block_exercises;
    const rounds = Math.max(1, block.rounds || 1);

    // Preparación al inicio / transición entre bloques
    steps.push({
      ...base,
      id: id(),
      kind: 'prepare',
      mode: 'countdown',
      duration: blockIndex === 0 ? prepareSeconds : transitionSeconds,
      title: blockIndex === 0 ? 'Prepárate' : 'Siguiente bloque',
      subtitle: `${block.name} · ${BLOCK_TYPE_LABEL[block.type]}`,
    });

    const work = (be: BE, round: number, totalRounds: number, duration?: number): WorkoutStep<BE> => {
      const d = duration ?? be.duration_seconds ?? undefined;
      return {
        ...base,
        id: id(),
        kind: 'work',
        mode: d ? 'countdown' : 'reps',
        duration: d,
        title: be.exercise.name,
        subtitle: describeTarget(be) || undefined,
        round,
        totalRounds,
        blockExercise: be,
      };
    };
    const rest = (seconds: number, title = 'Descanso', round?: number, totalRounds?: number): WorkoutStep<BE> => ({
      ...base,
      id: id(),
      kind: 'rest',
      mode: 'countdown',
      duration: seconds,
      title,
      round,
      totalRounds,
    });

    switch (block.type) {
      case 'standard': {
        exs.forEach((be) => {
          const restS = be.rest_seconds ?? block.rest_seconds ?? 60;
          for (let set = 1; set <= rounds; set++) {
            steps.push(work(be, set, rounds));
            if (restS > 0) steps.push(rest(restS, 'Descanso', set, rounds));
          }
        });
        break;
      }
      case 'circuit': {
        for (let r = 1; r <= rounds; r++) {
          exs.forEach((be, i) => {
            steps.push(work(be, r, rounds));
            const isLastInRound = i === exs.length - 1;
            if (!isLastInRound) {
              const restS = be.rest_seconds ?? block.rest_seconds ?? 0;
              if (restS > 0) steps.push(rest(restS, 'Descanso', r, rounds));
            }
          });
          const between = block.rest_between_rounds ?? 60;
          if (r < rounds && between > 0) steps.push(rest(between, 'Descanso entre rondas', r, rounds));
        }
        break;
      }
      case 'tabata': {
        const workS = block.work_seconds ?? 20;
        const restS = block.rest_seconds ?? 10;
        for (let r = 1; r <= rounds; r++) {
          steps.push(work(exs[(r - 1) % exs.length], r, rounds, workS));
          if (r < rounds && restS > 0) steps.push(rest(restS, 'Descanso', r, rounds));
        }
        break;
      }
      case 'emom': {
        const interval = block.work_seconds ?? 60;
        for (let m = 1; m <= rounds; m++) {
          steps.push(work(exs[(m - 1) % exs.length], m, rounds, interval));
        }
        break;
      }
      case 'amrap': {
        steps.push({
          ...base,
          id: id(),
          kind: 'work',
          mode: 'amrap',
          duration: block.time_cap_seconds ?? 600,
          title: 'AMRAP',
          subtitle: `${Math.round((block.time_cap_seconds ?? 600) / 60)} minutos`,
          exercises: exs,
        });
        break;
      }
      case 'for_time': {
        steps.push({
          ...base,
          id: id(),
          kind: 'work',
          mode: 'for_time',
          duration: block.time_cap_seconds ?? undefined,
          title: 'For Time',
          subtitle: `${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}`,
          totalRounds: rounds,
          exercises: exs,
        });
        break;
      }
    }
  });

  // Quitar descansos al final del entrenamiento y descansos justo antes de una transición
  const cleaned = steps.filter((s, i) => {
    if (s.kind !== 'rest') return true;
    const next = steps[i + 1];
    return next !== undefined && next.kind !== 'prepare';
  });

  // Rellenar "Siguiente: …"
  let nextTitle: string | undefined;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    cleaned[i].nextTitle = nextTitle;
    if (cleaned[i].kind === 'work') nextTitle = cleaned[i].title;
  }
  return cleaned;
}

/** Duración estimada en segundos (los pasos de repeticiones cuentan ~40 s). */
export function estimateDuration(steps: WorkoutStep[], secondsPerRepStep = 40): number {
  return steps.reduce((acc, s) => acc + (s.duration ?? secondsPerRepStep), 0);
}

// ---------------------------------------------------------------------------
// Estado del reproductor
// ---------------------------------------------------------------------------

export interface PlayerState {
  index: number;
  status: 'idle' | 'running' | 'paused' | 'finished';
  /** ms acumulados en el paso actual antes de la última reanudación */
  stepAccumMs: number;
  /** ms acumulados en todo el entrenamiento antes de la última reanudación */
  totalAccumMs: number;
  /** marca de tiempo de la última reanudación (null si está parado) */
  resumedAt: number | null;
  startedAt: number | null;
  /** Rondas completadas registradas en bloques AMRAP / For Time */
  roundsCompleted: number;
}

export type PlayerAction =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'next'; now: number; total: number }
  | { type: 'prev'; now: number }
  | { type: 'addRound' }
  | { type: 'removeRound' }
  | { type: 'finish'; now: number };

export const initialPlayerState: PlayerState = {
  index: 0,
  status: 'idle',
  stepAccumMs: 0,
  totalAccumMs: 0,
  resumedAt: null,
  startedAt: null,
  roundsCompleted: 0,
};

const running = (s: PlayerState, now: number) => (s.resumedAt !== null ? now - s.resumedAt : 0);

export function stepElapsedMs(s: PlayerState, now: number): number {
  return s.stepAccumMs + running(s, now);
}

export function totalElapsedMs(s: PlayerState, now: number): number {
  return s.totalAccumMs + running(s, now);
}

export function playerReducer(s: PlayerState, a: PlayerAction): PlayerState {
  switch (a.type) {
    case 'start':
      if (s.status !== 'idle') return s;
      return { ...s, status: 'running', resumedAt: a.now, startedAt: a.now };
    case 'pause':
      if (s.status !== 'running') return s;
      return {
        ...s,
        status: 'paused',
        stepAccumMs: stepElapsedMs(s, a.now),
        totalAccumMs: totalElapsedMs(s, a.now),
        resumedAt: null,
      };
    case 'resume':
      if (s.status !== 'paused') return s;
      return { ...s, status: 'running', resumedAt: a.now };
    case 'next': {
      if (s.status === 'finished') return s;
      const totalAccumMs = totalElapsedMs(s, a.now);
      if (s.index + 1 >= a.total) {
        return { ...s, status: 'finished', totalAccumMs, stepAccumMs: 0, resumedAt: null };
      }
      return {
        ...s,
        index: s.index + 1,
        stepAccumMs: 0,
        totalAccumMs,
        resumedAt: s.resumedAt !== null ? a.now : null,
      };
    }
    case 'prev': {
      if (s.status === 'finished') return s;
      return {
        ...s,
        index: Math.max(0, s.index - 1),
        stepAccumMs: 0,
        totalAccumMs: totalElapsedMs(s, a.now),
        resumedAt: s.resumedAt !== null ? a.now : null,
      };
    }
    case 'addRound':
      return { ...s, roundsCompleted: s.roundsCompleted + 1 };
    case 'removeRound':
      return { ...s, roundsCompleted: Math.max(0, s.roundsCompleted - 1) };
    case 'finish':
      return { ...s, status: 'finished', totalAccumMs: totalElapsedMs(s, a.now), resumedAt: null };
  }
}

/** Segundos que quedan en el paso (redondeado hacia arriba), o null si no tiene cuenta atrás. */
export function remainingSeconds(step: WorkoutStep | undefined, s: PlayerState, now: number): number | null {
  if (!step || step.duration === undefined || step.mode === 'reps' || step.mode === 'for_time') return null;
  return Math.max(0, Math.ceil(step.duration - stepElapsedMs(s, now) / 1000));
}
