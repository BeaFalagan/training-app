import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Header, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUpdateProfile } from '@/features/clients/api';
import { showError } from '@/lib/errors';
import type { Profile } from '@/lib/types';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <ProfileForm key={profile.id} profile={profile} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { signOut, refreshProfile } = useAuth();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState(profile.full_name);
  const isTrainer = profile.role === 'trainer';
  const dirty = fullName !== profile.full_name;

  async function onSave() {
    try {
      await update.mutateAsync({ id: profile.id, full_name: fullName.trim() });
      await refreshProfile();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen width="narrow">
      <Header eyebrow={isTrainer ? 'Entrenador' : 'Cliente'} title="Mi perfil" />

      <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
        <Avatar name={profile.full_name} uri={profile.avatar_url} size={88} />
        <Text variant="h2">{profile.full_name || 'Sin nombre'}</Text>
        <Text variant="small">{profile.email}</Text>
      </View>

      <Input label="Nombre completo" value={fullName} onChangeText={setFullName} />
      {dirty ? <Button title="Guardar cambios" onPress={onSave} loading={update.isPending} /> : null}

      {profile.is_admin ? (
        <Button title="Administración" variant="outline" icon="shield-checkmark-outline" onPress={() => router.push('/admin')} />
      ) : null}
      <Button title="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={signOut} />
      <Text variant="small" align="center" color={colors.textFaint}>
        Entreno · v{Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}
