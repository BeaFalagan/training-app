import type { Ionicons } from '@expo/vector-icons';

import type { DayWithBlocks } from '@/lib/types';

export interface EquipmentItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const BAND_COLORS = ['amarilla', 'roja', 'negra', 'morada', 'verde'];
/** Ejercicios en el suelo: conviene tener esterilla */
const FLOOR = /plancha|puente|crunch|dead bug|bird dog|superman|elevación de piernas|russian twist|flexiones|press de pecho en el suelo|patada de glúteo/i;

const joinEs = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

/**
 * Material necesario para un día de entrenamiento, deducido de los ejercicios
 * (campo «Material» de cada ejercicio) y de las cargas indicadas en el plan.
 */
export function requiredEquipment(day: Pick<DayWithBlocks, 'workout_blocks'>): EquipmentItem[] {
  const weights = new Set<string>();
  const bands = new Set<string>();
  const others = new Map<string, EquipmentItem>();
  let dumbbells = false;
  let floor = false;

  for (const block of day.workout_blocks) {
    for (const be of block.block_exercises) {
      const equipment = (be.exercise.equipment ?? '').trim();
      const eq = equipment.toLowerCase();
      const load = (be.load ?? '').toLowerCase();

      if (FLOOR.test(be.exercise.name)) floor = true;

      if (eq.includes('mancuerna') || /\bkg\b/.test(load)) {
        dumbbells = true;
        for (const m of load.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/g)) weights.add(m[1].replace('.', ','));
      }
      if (eq.includes('goma') || load.includes('goma')) {
        const colors = BAND_COLORS.filter((c) => load.includes(c));
        if (colors.length) colors.forEach((c) => bands.add(c));
        else bands.add('');
      }
      if (eq.includes('comba')) others.set('comba', { label: 'Comba', icon: 'infinite-outline' });
      if (eq.includes('cinta')) others.set('cinta', { label: 'Cinta de caminar', icon: 'walk-outline' });
      if (eq.includes('kettlebell')) others.set('kettlebell', { label: 'Kettlebell', icon: 'barbell-outline' });
      // Material escrito a mano por el entrenador (banco, step, fitball…)
      if (equipment && !/mancuerna|goma|comba|cinta|kettlebell|peso corporal/i.test(equipment)) {
        others.set(eq, { label: equipment, icon: 'cube-outline' });
      }
    }
  }

  const items: EquipmentItem[] = [];
  if (dumbbells) {
    const kg = [...weights].sort((a, b) => parseFloat(a) - parseFloat(b));
    items.push({ label: kg.length ? `Mancuernas de ${joinEs(kg)} kg` : 'Mancuernas', icon: 'barbell-outline' });
  }
  if (bands.size) {
    const colors = BAND_COLORS.filter((c) => bands.has(c));
    items.push({
      label: colors.length ? `${colors.length === 1 ? 'Goma' : 'Gomas'} ${joinEs(colors)}` : 'Gomas elásticas',
      icon: 'resize-outline',
    });
  }
  items.push(...others.values());
  if (floor) items.push({ label: 'Esterilla', icon: 'square-outline' });
  return items;
}

/** Versión en una línea: «Mancuernas de 5 kg · Goma roja · Comba» */
export function equipmentSummary(day: Pick<DayWithBlocks, 'workout_blocks'>): string {
  return requiredEquipment(day)
    .map((i) => i.label)
    .join(' · ');
}
