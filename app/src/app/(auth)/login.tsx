import { Redirect, router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandDivider, Button, Header, Input, Logo, Text } from '@/components/ui';
import { AuthShell } from '@/components/web/AuthShell';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { useIsDesktop } from '@/lib/responsive';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { signIn, session, loading: authLoading } = useAuth();
  const focused = useIsFocused();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  async function onSubmit() {
    setError(null);
    if (!email || !password) return setError('Introduce tu email y contraseña');
    setLoading(true);
    try {
      // Al iniciar sesión, la redirección de abajo lleva al panel
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  // Sesión guardada: no pedimos login otra vez. Solo si esta pantalla está visible,
  // para no interferir cuando se entra con código de acceso (pantalla /verify encima).
  if (focused && !authLoading && session) return <Redirect href="/" />;

  return (
    <AuthShell compactContentStyle={styles.content}>
      {!isDesktop ? (
        <Pressable onPress={() => router.replace('/')} style={styles.back}>
          <Text variant="small" color={colors.textMuted}>
            ← Volver a la web
          </Text>
        </Pressable>
      ) : null}
      {isDesktop ? (
        <Header eyebrow="Área de entrenamiento" title="Accede a tu cuenta" />
      ) : (
        <View style={styles.brand}>
          <Logo size={150} />
          <Text variant="hero" align="center" style={{ marginTop: spacing.lg }}>
            Entrena con plan
          </Text>
          <Text variant="small" align="center">
            Tu entrenamiento, tu ritmo. Accede para ver tu plan semanal.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="tu@email.com"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        {error ? (
          <Text variant="small" color={colors.danger}>
            {error}
          </Text>
        ) : null}
        <Button title="Entrar" size="lg" onPress={onSubmit} loading={loading} />
        <Pressable onPress={() => router.push({ pathname: '/verify', params: { mode: 'recovery' } })} accessibilityRole="link">
          <Text variant="small" align="center" style={styles.link}>
            ¿Has olvidado tu contraseña?
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <BrandDivider label="Entreno" />
        <Button
          title="Tengo un código de invitación"
          variant="outline"
          onPress={() => router.push({ pathname: '/verify', params: { mode: 'invite' } })}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.xxl, gap: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.sm },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  form: { gap: spacing.lg },
  link: { paddingVertical: spacing.sm, color: colors.textMuted, textDecorationLine: 'underline' },
  footer: { gap: spacing.lg },
});
