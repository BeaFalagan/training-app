import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button, Logo, Screen, Stat, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSaveLog } from '@/features/logs/api';
import { formatClock } from '@/lib/dates';
import { showError } from '@/lib/errors';
import { colors, spacing } from '@/theme';

/** Resumen final del entrenamiento. Solo se guarda que se ha completado, la duración y las rondas. */
export default function FinishScreen() {
  const p = useLocalSearchParams<{ dayId: string; dayTitle: string; duration: string; rounds: string; startedAt: string }>();
  const { profile } = useAuth();
  const save = useSaveLog();
  const duration = Number(p.duration) || 0;
  const rounds = Number(p.rounds) || 0;
  const isTrainer = profile?.role === 'trainer';

  async function onSave() {
    if (isTrainer) return router.dismissTo(`/workout/${p.dayId}`);
    try {
      await save.mutateAsync({
        client_id: profile!.id,
        day_id: p.dayId ?? null,
        day_title: p.dayTitle ?? null,
        started_at: p.startedAt ?? new Date().toISOString(),
        duration_seconds: duration,
        rounds_completed: rounds || null,
      });
      router.dismissTo('/today');
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen
      width="narrow"
      edges={['top', 'bottom']}
      footer={<Button title={isTrainer ? 'Cerrar vista previa' : 'Guardar entrenamiento'} size="lg" onPress={onSave} loading={save.isPending} />}
    >
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl }}>
        <Logo size={96} />
        <Text variant="label" color={colors.primaryBright}>
          Entrenamiento completado
        </Text>
        <Text variant="hero" align="center">
          ¡Buen trabajo!
        </Text>
        <Text variant="small" align="center">
          {p.dayTitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={formatClock(duration)} label="Tiempo" />
        {rounds ? <Stat value={rounds} label="Rondas" /> : null}
      </View>

      {!isTrainer ? (
        <Text variant="body" align="center" color={colors.textMuted}>
          Guarda el entrenamiento para que tu entrenador vea que lo has completado.
        </Text>
      ) : null}
    </Screen>
  );
}
