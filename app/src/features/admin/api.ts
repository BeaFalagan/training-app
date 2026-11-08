import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

/** Todos los usuarios (solo administradores pueden leerlos todos) */
export function useAllProfiles() {
  return useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => unwrap<Profile[]>(await supabase.from('profiles').select('*').order('full_name')),
  });
}

async function callAdmin<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>('admin-users', { body });
  if (error) {
    const res = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(res?.error ?? error.message);
  }
  if (!data || (data as { error?: string }).error) throw new Error((data as { error?: string })?.error ?? 'Error desconocido');
  return data;
}

export interface CreateUserInput {
  role: 'trainer' | 'client';
  email: string;
  full_name: string;
  trainer_id?: string;
}

function useAdminMutation<I, O>(fn: (input: I) => Promise<O>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export const useCreateUser = () =>
  useAdminMutation((input: CreateUserInput) => callAdmin<{ id: string; code: string }>({ action: 'create', ...input }));

export const useDeleteUser = () => useAdminMutation((userId: string) => callAdmin<{ ok: true }>({ action: 'delete', user_id: userId }));

export const useSetTrainer = () =>
  useAdminMutation((input: { clientId: string; trainerId: string }) =>
    callAdmin<{ ok: true }>({ action: 'set_trainer', client_id: input.clientId, trainer_id: input.trainerId }),
  );

export const useResetUserCode = () =>
  useAdminMutation((userId: string) => callAdmin<{ id: string; code: string }>({ action: 'reset_code', user_id: userId }));
