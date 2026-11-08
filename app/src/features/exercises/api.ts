import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/lib/query';
import { supabase, VIDEO_BUCKET } from '@/lib/supabase';
import type { Exercise } from '@/lib/types';

export const MUSCLE_GROUPS = [
  'Pierna',
  'Cadena posterior',
  'Pecho',
  'Espalda',
  'Hombro',
  'Brazos',
  'Core',
  'Full body',
  'Cardio',
  'Movilidad',
];

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => unwrap<Exercise[]>(await supabase.from('exercises').select('*').order('name')),
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercise', id],
    enabled: !!id && id !== 'new',
    queryFn: async () => unwrap<Exercise>(await supabase.from('exercises').select('*').eq('id', id!).single()),
  });
}

export type ExerciseInput = Partial<Exercise> & { name: string; trainer_id: string };

export function useSaveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExerciseInput) => {
      const { id, created_at: _c, ...rest } = input;
      const res = id
        ? await supabase.from('exercises').update(rest).eq('id', id).select().single()
        : await supabase.from('exercises').insert(rest).select().single();
      return unwrap<Exercise>(res);
    },
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.setQueryData(['exercise', e.id], e);
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ex: Exercise) => {
      const res = await supabase.from('exercises').delete().eq('id', ex.id);
      if (res.error?.code === '23503') {
        throw new Error('Este ejercicio está en algún plan. Quítalo de los planes antes de borrarlo.');
      }
      unwrap(res);
      const paths = [ex.video_path, ex.thumbnail_path].filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(VIDEO_BUCKET).remove(paths);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

/**
 * Sube un vídeo local a Storage y devuelve su ruta.
 * Ruta: <trainerId>/<timestamp>.<ext> (las políticas de Storage exigen la carpeta del entrenador).
 */
export async function uploadExerciseVideo(
  trainerId: string,
  localUri: string,
  mimeType = 'video/mp4',
  onProgress?: (p: number) => void,
): Promise<string> {
  const ext = mimeType.includes('quicktime') ? 'mov' : mimeType.split('/')[1] || 'mp4';
  const path = `${trainerId}/${Date.now()}.${ext}`;
  onProgress?.(0.1);
  const body = await (await fetch(localUri)).arrayBuffer();
  onProgress?.(0.4);
  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);
  onProgress?.(1);
  return path;
}

/** URL reproducible del vídeo de un ejercicio (URL firmada de 1 h o URL externa). */
export function useVideoUrl(exercise: Pick<Exercise, 'video_path' | 'video_url'> | null | undefined) {
  const path = exercise?.video_path ?? null;
  return useQuery({
    queryKey: ['video-url', path, exercise?.video_url],
    enabled: !!exercise && !!(path || exercise.video_url),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      if (!path) return exercise!.video_url!;
      const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}
