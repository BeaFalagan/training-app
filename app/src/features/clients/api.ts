import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LOGIN_URL } from '@/lib/config';
import { unwrap } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export function useClients(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['clients', trainerId],
    enabled: !!trainerId,
    queryFn: async () =>
      unwrap<Profile[]>(
        await supabase.from('profiles').select('*').eq('trainer_id', trainerId!).order('full_name'),
      ),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => unwrap<Profile>(await supabase.from('profiles').select('*').eq('id', id!).single()),
  });
}

export interface InviteInput {
  email: string;
  full_name: string;
}

export interface AccessCode {
  id: string;
  code: string;
}

/** Llama a la Edge Function invite-client y devuelve el código de acceso generado */
async function callInviteFunction(body: object): Promise<AccessCode> {
  const { data, error } = await supabase.functions.invoke<AccessCode & { error?: string }>('invite-client', { body });
  if (error) {
    // Recupera el mensaje que devuelve la función (p. ej. "Ya existe una cuenta…")
    const res = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(res?.error ?? error.message);
  }
  if (!data || data.error) throw new Error(data?.error ?? 'No se pudo generar el código');
  return { id: data.id, code: data.code };
}

/** Da de alta un cliente y devuelve su código de acceso temporal */
export function useInviteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) => callInviteFunction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

/** Genera un código de acceso nuevo para un cliente (si lo ha perdido u olvidó su contraseña) */
export function useResetAccessCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => callInviteFunction({ action: 'reset', client_id: clientId }),
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['client', r.id] }),
  });
}

/** Mensaje listo para enviar al cliente por WhatsApp, email… */
export function accessCodeMessage(name: string, email: string, code: string) {
  const first = name.trim().split(' ')[0];
  return (
    `¡Hola${first ? ` ${first}` : ''}! Ya tienes acceso a Entreno, tu app de entrenamiento 💪\n\n` +
    `1. Entra en ${LOGIN_URL}\n` +
    `2. Pulsa «Tengo un código de invitación»\n` +
    `3. Email: ${email}\n` +
    `4. Código: ${code}\n\n` +
    `Después crearás tu propia contraseña.`
  );
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Profile> & { id: string }) =>
      unwrap<Profile>(await supabase.from('profiles').update(patch).eq('id', id).select().single()),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client', p.id] });
      qc.invalidateQueries({ queryKey: ['profile', p.id] });
    },
  });
}

