/// <reference types="node" />
// Ejecutar con: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSteps,
  initialPlayerState,
  playerReducer,
  remainingSeconds,
  totalElapsedMs,
  type EngineBlock,
  type EngineBlockExercise,
} from './engine.ts';

const ex = (id: string, extra: Partial<EngineBlockExercise> = {}): EngineBlockExercise => ({
  id,
  position: Number(id.replace(/\D/g, '')) || 0,
  reps: '10',
  duration_seconds: null,
  load: null,
  rest_seconds: null,
  notes: null,
  exercise: { id: `e-${id}`, name: `Ejercicio ${id}` },
  ...extra,
});

const block = (extra: Partial<EngineBlock>): EngineBlock => ({
  id: 'b',
  position: 0,
  name: 'Bloque',
  type: 'standard',
  rounds: 3,
  work_seconds: null,
  rest_seconds: null,
  rest_between_rounds: null,
  time_cap_seconds: null,
  block_exercises: [ex('1')],
  ...extra,
});

test('standard: series con descanso, sin descanso final', () => {
  const steps = buildSteps([block({ rounds: 3, rest_seconds: 45 })]);
  assert.deepEqual(
    steps.map((s) => s.kind),
    ['prepare', 'work', 'rest', 'work', 'rest', 'work'],
  );
  assert.equal(steps[1].mode, 'reps');
  assert.equal(steps[2].duration, 45);
  assert.equal(steps[0].nextTitle, 'Ejercicio 1');
});

test('tabata: 8 × 20/10 por defecto', () => {
  const steps = buildSteps([block({ type: 'tabata', rounds: 8, block_exercises: [ex('1'), ex('2')] })]);
  const work = steps.filter((s) => s.kind === 'work');
  const rest = steps.filter((s) => s.kind === 'rest');
  assert.equal(work.length, 8);
  assert.equal(rest.length, 7);
  assert.ok(work.every((s) => s.duration === 20 && s.mode === 'countdown'));
  assert.equal(work[1].title, 'Ejercicio 2'); // alterna ejercicios
});

test('emom: un paso de 60 s por minuto, rotando ejercicios', () => {
  const steps = buildSteps([block({ type: 'emom', rounds: 4, block_exercises: [ex('1'), ex('2')] })]);
  const work = steps.filter((s) => s.kind === 'work');
  assert.equal(work.length, 4);
  assert.deepEqual(work.map((s) => s.title), ['Ejercicio 1', 'Ejercicio 2', 'Ejercicio 1', 'Ejercicio 2']);
  assert.ok(work.every((s) => s.duration === 60));
});

test('circuito: descanso entre rondas y transición entre bloques', () => {
  const steps = buildSteps([
    block({ id: 'a', type: 'circuit', rounds: 2, rest_between_rounds: 90, block_exercises: [ex('1'), ex('2')] }),
    block({ id: 'b', position: 1, type: 'amrap', time_cap_seconds: 300 }),
  ]);
  assert.deepEqual(
    steps.map((s) => `${s.kind}:${s.mode}`),
    ['prepare:countdown', 'work:reps', 'work:reps', 'rest:countdown', 'work:reps', 'work:reps',
     'prepare:countdown', 'work:amrap'],
  );
  assert.equal(steps[3].duration, 90);
  assert.equal(steps[7].duration, 300);
});

test('bloques vacíos se ignoran', () => {
  assert.equal(buildSteps([block({ block_exercises: [] })]).length, 0);
});

test('reproductor: pausa no consume tiempo y next acumula total', () => {
  const steps = buildSteps([block({ type: 'tabata', rounds: 2 })]);
  let s = playerReducer(initialPlayerState, { type: 'start', now: 0 });
  assert.equal(remainingSeconds(steps[0], s, 4_000), 6);
  s = playerReducer(s, { type: 'pause', now: 4_000 });
  assert.equal(remainingSeconds(steps[0], s, 60_000), 6); // en pausa no avanza
  s = playerReducer(s, { type: 'resume', now: 60_000 });
  s = playerReducer(s, { type: 'next', now: 66_000, total: steps.length });
  assert.equal(s.index, 1);
  assert.equal(totalElapsedMs(s, 66_000), 10_000);
  assert.equal(remainingSeconds(steps[1], s, 71_000), 15);
});

test('reproductor: next en el último paso termina', () => {
  let s = playerReducer(initialPlayerState, { type: 'start', now: 0 });
  s = playerReducer(s, { type: 'next', now: 1000, total: 1 });
  assert.equal(s.status, 'finished');
});
