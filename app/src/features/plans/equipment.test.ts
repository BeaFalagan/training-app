/// <reference types="node" />
// Ejecutar con: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { equipmentSummary } from './equipment.ts';

const be = (name: string, equipment: string | null, load: string | null = null) => ({ load, exercise: { name, equipment } });
const day = (...items: ReturnType<typeof be>[]) => ({ workout_blocks: [{ block_exercises: items }] }) as never;

test('reúne mancuernas, gomas por color, comba, cinta y esterilla', () => {
  const summary = equipmentSummary(
    day(
      be('Sentadilla con mancuerna', 'Mancuernas', '2 × 5 kg'),
      be('Remo con goma', 'Goma', 'Goma negra'),
      be('Face pull con goma', 'Goma', 'Goma roja'),
      be('Comba', 'Comba'),
      be('Cinta de caminar', 'Cinta'),
      be('Plancha', 'Peso corporal'),
    ),
  );
  assert.equal(summary, 'Mancuernas de 5 kg · Gomas roja y negra · Comba · Cinta de caminar · Esterilla');
});

test('sin material especial no devuelve nada', () => {
  assert.equal(equipmentSummary(day(be('Sentadilla isométrica en pared', 'Peso corporal'))), '');
});

test('incluye el material escrito a mano por el entrenador', () => {
  assert.equal(equipmentSummary(day(be('Step-up', 'Banco'))), 'Banco');
});
