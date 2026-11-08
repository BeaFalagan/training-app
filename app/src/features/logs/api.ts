import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import type { WorkoutLog } from '@/lib/types';

export function useClientLogs(clientId: string | undefined, limit = 60) {
  return useQuery({
    queryKey: ['logs', clientId, limit],
    enabled: !!clientId,
    queryFn: async () =>
      unwrap<WorkoutLog[]>(
        await supabase
          .from('workout_logs')
          .select('*')
          .eq('client_id', clientId!)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })
          .limit(limit),
      ),
  });
}

/** Actividad reciente de todos los clientes del entrenador (RLS filtra) */
export function useTrainerActivity(limit = 20) {
  return useQuery({
    queryKey: ['logs', 'activity', limit],
    queryFn: async () =>
      unwrap<(WorkoutLog & { client: { id: string; full_name: string } | null })[]>(
        await supabase
          .from('workout_logs')
          .select('*, client:profiles!workout_logs_client_id_fkey(id, full_name)')
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(limit),
      ),
  });
}

export interface SaveLogInput {
  client_id: string;
  day_id: string | null;
  day_title: string | null;
  started_at: string;
  duration_seconds: number;
  rounds_completed: number | null;
}

export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveLogInput) =>
      unwrap<WorkoutLog>(
        await supabase
          .from('workout_logs')
          .insert({ ...input, completed_at: new Date().toISOString() })
          .select()
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs'] }),
  });
}

/** Estadísticas simples a partir de los registros */
export function computeStats(logs: WorkoutLog[]) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const thisWeek = logs.filter((l) => new Date(l.started_at) >= monday);
  const totalMinutes = Math.round(logs.reduce((a, l) => a + (l.duration_seconds ?? 0), 0) / 60);

  // Racha: semanas consecutivas (hasta la actual) con al menos un entrenamiento
  const weeks = new Set(
    logs.map((l) => {
      const d = new Date(l.started_at);
      const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
      return m.toDateString();
    }),
  );
  let streak = 0;
  const cursor = new Date(monday);
  if (!weeks.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 7); // la semana actual aún puede completarse
  while (weeks.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  return { total: logs.length, thisWeek: thisWeek.length, totalMinutes, streak };
}
