import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** true mientras se recupera la sesión guardada o se carga el perfil */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Verifica el código de 6 dígitos del email de invitación o de recuperación */
  verifyCode: (email: string, code: string, kind: 'invite' | 'recovery') => Promise<void>;
  sendRecoveryCode: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setRestoring(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: profileQuery.data ?? null,
      loading: restoring || (!!userId && profileQuery.isPending),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw new Error(translateAuthError(error.message));
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async verifyCode(email, code, kind) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code.trim(),
          type: kind,
        });
        if (error) throw new Error(translateAuthError(error.message));
      },
      async sendRecoveryCode(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        if (error) throw new Error(translateAuthError(error.message));
      },
      async setPassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(translateAuthError(error.message));
      },
      refreshProfile: () => profileQuery.refetch(),
    }),
    [session, restoring, userId, profileQuery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos';
  if (/expired|invalid.*(otp|token)/i.test(msg)) return 'El código no es válido o ha caducado';
  if (/should be different from the old password/i.test(msg)) return 'La nueva contraseña debe ser distinta de la anterior';
  if (/password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres';
  if (/rate limit|security purposes/i.test(msg)) return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo';
  if (/network/i.test(msg)) return 'Sin conexión. Revisa tu red';
  return msg;
}
