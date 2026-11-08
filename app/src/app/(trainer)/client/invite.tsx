import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AccessCodeCard } from '@/features/clients/AccessCodeCard';
import { Button, Header, IconButton, Input, Screen, Text } from '@/components/ui';
import { useInviteClient, type AccessCode } from '@/features/clients/api';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function InviteClientScreen() {
  const invite = useInviteClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AccessCode | null>(null);

  async function onInvite() {
    setError(null);
    if (!fullName.trim()) return setError('Indica el nombre del cliente');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Email no válido');
    try {
      setCreated(
        await invite.mutateAsync({
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (created) {
    return (
      <Screen width="narrow" edges={['top', 'bottom']}>
        <Header eyebrow="Cliente creado" title={fullName.split(' ')[0] || 'Listo'} />
        <Text variant="body" color={colors.textMuted}>
          Pásale este código. Con su email y el código entrará en la app y creará su propia contraseña.
        </Text>
        <AccessCodeCard name={fullName} email={email.trim().toLowerCase()} code={created.code} />
        <Button title="Ir a su ficha" variant="outline" onPress={() => router.replace(`/client/${created.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen width="narrow" edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.md }}>
        <IconButton icon="close" accessibilityLabel="Cerrar" onPress={() => router.back()} />
      </View>
      <Header eyebrow="Nuevo miembro" title="Invitar cliente" />
      <Text variant="body" color={colors.textMuted}>
        Solo necesitamos su nombre y su email. Te daremos un código de acceso para que se lo envíes por WhatsApp o email.
      </Text>
      <Input label="Nombre completo *" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <Input label="Email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      {error ? (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button title="Crear cliente" size="lg" icon="person-add-outline" onPress={onInvite} loading={invite.isPending} />
    </Screen>
  );
}
