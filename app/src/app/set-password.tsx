import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Header, Input, Screen, Text } from '@/components/ui';
import { AuthShell } from '@/components/web/AuthShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { goHome } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function SetPasswordScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { setPassword, session, refreshProfile } = useAuth();
  const [password, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    setError(null);
    if (password.length < 8) return setError('Mínimo 8 caracteres');
    if (password !== repeat) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      try {
        await setPassword(password);
      } catch (e) {
        // Si ya la había guardado antes (p. ej. un intento interrumpido), seguimos
        if (!/distinta de la anterior/.test(errorMessage(e))) throw e;
      }
      // Ya no necesita el código temporal
      const { error: e } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', session!.user.id);
      if (e) throw new Error(e.message);
      await refreshProfile();
      goHome();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <Screen width="narrow">
        <Header title="Sesión caducada" />
        <Button title="Volver al inicio" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <AuthShell>
      <Header eyebrow={mode === 'invite' ? 'Último paso' : 'Seguridad'} title="Crea tu contraseña" />
      <Text variant="body" color={colors.textMuted}>
        La usarás para entrar en la app a partir de ahora.
      </Text>
      <Input label="Contraseña" value={password} onChangeText={setPw} secureTextEntry textContentType="newPassword" />
      <Input label="Repite la contraseña" value={repeat} onChangeText={setRepeat} secureTextEntry textContentType="newPassword" />
      {error ? (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button title="Guardar y entrar" size="lg" onPress={onSave} loading={loading} />
    </AuthShell>
  );
}
