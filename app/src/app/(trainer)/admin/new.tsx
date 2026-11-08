import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Header, IconButton, Input, Screen, SectionTitle, Text } from '@/components/ui';
import { useAllProfiles, useCreateUser } from '@/features/admin/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { AccessCodeCard } from '@/features/clients/AccessCodeCard';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

/** Alta de entrenador o cliente por un administrador */
export default function AdminNewUserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = roleParam === 'trainer' ? 'trainer' : 'client';
  const { profile: me } = useAuth();
  const profiles = useAllProfiles();
  const create = useCreateUser();
  const trainers = (profiles.data ?? []).filter((p) => p.role === 'trainer');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(me?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string } | null>(null);

  if (!me?.is_admin) return <Redirect href="/dashboard" />;

  async function onCreate() {
    setError(null);
    if (!fullName.trim()) return setError('Indica el nombre');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Email no válido');
    if (role === 'client' && !trainerId) return setError('Elige un entrenador');
    try {
      const r = await create.mutateAsync({
        role,
        full_name: fullName.trim(),
        email: email.trim(),
        trainer_id: role === 'client' ? trainerId! : undefined,
      });
      setCreated({ code: r.code });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const label = role === 'trainer' ? 'entrenador' : 'cliente';

  if (created) {
    return (
      <Screen width="narrow" edges={['top', 'bottom']}>
        <Header eyebrow={`${role === 'trainer' ? 'Entrenador' : 'Cliente'} creado`} title={fullName.split(' ')[0]} />
        <Text variant="body" color={colors.textMuted}>
          Envíale este código. Entrará con su email y el código, y creará su propia contraseña.
          {role === 'trainer' ? ' Tendrá acceso a la biblioteca de ejercicios compartida desde el primer día.' : ''}
        </Text>
        <AccessCodeCard name={fullName} email={email.trim().toLowerCase()} code={created.code} />
        <Button title="Volver a administración" variant="outline" onPress={() => router.replace('/admin')} />
      </Screen>
    );
  }

  return (
    <Screen width="narrow" edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <Header eyebrow="Administración" title={`Nuevo ${label}`} />
      <Input label="Nombre completo *" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <Input label="Email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      {role === 'client' ? (
        <>
          <SectionTitle title="Entrenador" />
          <View style={{ gap: spacing.sm }}>
            {trainers.map((t) => {
              const selected = t.id === trainerId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTrainerId(t.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primaryBright : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                  }}
                >
                  <Avatar name={t.full_name} size={36} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {t.full_name}
                    {t.id === me.id ? ' (tú)' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {error ? (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      ) : null}
      <Button title={`Crear ${label}`} size="lg" icon="checkmark" onPress={onCreate} loading={create.isPending} />
    </Screen>
  );
}
