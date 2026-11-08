import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Header, IconButton, Input, Text } from '@/components/ui';
import { AuthShell } from '@/components/web/AuthShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { goHome } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

/**
 * Activación de cuenta (código de acceso que da el entrenador) o recuperación
 * de contraseña (código del email de recuperación). Tras verificar, se pasa a
 * /set-password con la sesión ya iniciada.
 */
export default function VerifyScreen() {
  const { mode } = useLocalSearchParams<{ mode: 'invite' | 'recovery' }>();
  const isInvite = mode !== 'recovery';
  const { signIn, verifyCode, sendRecoveryCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(isInvite);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const onSendCode = () =>
    run(async () => {
      if (!email.includes('@')) throw new Error('Introduce un email válido');
      await sendRecoveryCode(email);
      setCodeSent(true);
    });

  const onVerify = () =>
    run(async () => {
      if (isInvite) {
        // El código de acceso es una contraseña temporal generada por el entrenador
        if (code.trim().length < 6) throw new Error('Revisa el código que te ha enviado tu entrenador');
        try {
          await signIn(email, code.trim().toUpperCase());
        } catch {
          throw new Error('El email o el código no son correctos');
        }
        // El inicio detecta que debe crear su contraseña y le lleva a esa pantalla
        return goHome();
      } else {
        if (code.trim().length < 6) throw new Error('El código tiene 6 dígitos');
        await verifyCode(email, code, 'recovery');
      }
      router.replace({ pathname: '/set-password', params: { mode: 'recovery' } });
    });

  return (
    <AuthShell>
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <Header
        eyebrow={isInvite ? 'Bienvenida' : 'Recuperar acceso'}
        title={isInvite ? 'Activa tu cuenta' : 'Nueva contraseña'}
      />
      <Text variant="body" color={colors.textMuted}>
        {isInvite
          ? 'Introduce tu email y el código de acceso que te ha enviado tu entrenador.'
          : codeSent
            ? 'Te hemos enviado un código de 6 dígitos. Revisa también la carpeta de spam.'
            : 'Introduce tu email y te enviaremos un código para crear una nueva contraseña.'}
      </Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!(codeSent && !isInvite)}
      />
      {codeSent ? (
        <Input
          label="Código"
          value={code}
          onChangeText={(t) =>
            setCode(isInvite ? t.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) : t.replace(/\D/g, '').slice(0, 6))
          }
          keyboardType={isInvite ? 'default' : 'number-pad'}
          autoCapitalize="characters"
          autoCorrect={false}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          placeholder={isInvite ? 'ABCD2345' : '123456'}
          style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
        />
      ) : null}
      {error ? (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      ) : null}

      {codeSent ? (
        <Button title="Verificar" size="lg" onPress={onVerify} loading={loading} />
      ) : (
        <Button title="Enviar código" size="lg" onPress={onSendCode} loading={loading} />
      )}
      {codeSent && !isInvite ? (
        <Button title="Reenviar código" variant="ghost" onPress={onSendCode} disabled={loading} />
      ) : null}
    </AuthShell>
  );
}
