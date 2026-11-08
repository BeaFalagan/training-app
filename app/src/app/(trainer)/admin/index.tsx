import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/HeroBanner';
import { Avatar, Badge, Button, Card, ChipSelect, EmptyState, ErrorState, Grid, IconButton, Input, Loading, Screen, Text } from '@/components/ui';
import { useDeleteUser, useResetUserCode, useSetTrainer, useAllProfiles } from '@/features/admin/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { AccessCodeCard } from '@/features/clients/AccessCodeCard';
import { showAlert } from '@/lib/alert';
import { confirm, showError } from '@/lib/errors';
import { useColumns, useIsDesktop } from '@/lib/responsive';
import type { Profile } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';

type Tab = 'trainers' | 'clients';

export default function AdminScreen() {
  const { profile: me } = useAuth();
  const { data, isPending, error, refetch } = useAllProfiles();
  const [tab, setTab] = useState<Tab>('trainers');
  const [q, setQ] = useState('');
  const [moving, setMoving] = useState<Profile | null>(null);
  const [code, setCode] = useState<{ user: Profile; code: string } | null>(null);
  const del = useDeleteUser();
  const reset = useResetUserCode();
  const isDesktop = useIsDesktop();
  const columns = useColumns(4, 320);

  const trainers = useMemo(() => (data ?? []).filter((p) => p.role === 'trainer'), [data]);
  const clients = useMemo(() => (data ?? []).filter((p) => p.role === 'client'), [data]);
  const list = (tab === 'trainers' ? trainers : clients).filter((p) => {
    const t = q.trim().toLowerCase();
    return !t || p.full_name.toLowerCase().includes(t) || p.email?.toLowerCase().includes(t);
  });

  if (!me?.is_admin) return <Redirect href="/dashboard" />;
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const trainerName = (id: string | null) => trainers.find((t) => t.id === id)?.full_name || 'Sin entrenador';

  async function onDelete(user: Profile) {
    const what = user.role === 'trainer' ? 'entrenador' : 'cliente';
    const ok = await confirm(
      `Eliminar ${what}`,
      `Se eliminará la cuenta de ${user.full_name || user.email}${user.role === 'client' ? ', con sus planes e historial' : ''}. No se puede deshacer.`,
    );
    if (!ok) return;
    try {
      await del.mutateAsync(user.id);
      showAlert('Eliminado', `${user.full_name || user.email} ya no tiene acceso a la app.`);
    } catch (e) {
      showError(e);
    }
  }

  async function onReset(user: Profile) {
    const ok = await confirm('Nuevo código de acceso', `La contraseña actual de ${user.full_name} dejará de funcionar.`, 'Generar');
    if (!ok) return;
    try {
      const r = await reset.mutateAsync(user.id);
      setCode({ user, code: r.code });
    } catch (e) {
      showError(e);
    }
  }

  const newButtons = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button title="Nuevo entrenador" icon="barbell-outline" size="sm" onPress={() => router.push({ pathname: '/admin/new', params: { role: 'trainer' } })} fullWidth={false} />
      <Button title="Nuevo cliente" icon="person-add-outline" size="sm" variant="outline" onPress={() => router.push({ pathname: '/admin/new', params: { role: 'client' } })} fullWidth={false} />
    </View>
  );

  return (
    <Screen>
      <View style={{ paddingTop: spacing.md }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard'))} />
      </View>
      <HeroBanner
        photo="alt"
        eyebrow="Administración"
        title="Usuarios"
        subtitle={`${trainers.length} ${trainers.length === 1 ? 'entrenador' : 'entrenadores'} · ${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`}
        right={isDesktop ? newButtons : undefined}
      />
      {!isDesktop ? newButtons : null}

      {code ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="bodyStrong">Código nuevo para {code.user.full_name}</Text>
          <AccessCodeCard name={code.user.full_name} email={code.user.email ?? ''} code={code.code} />
          <Button title="Cerrar" variant="ghost" onPress={() => setCode(null)} />
        </View>
      ) : null}

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md, alignItems: isDesktop ? 'center' : 'stretch' }}>
        <ChipSelect<Tab>
          options={[
            { value: 'trainers', label: `Entrenadores (${trainers.length})` },
            { value: 'clients', label: `Clientes (${clients.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ flex: 1 }}>
          <Input placeholder="Buscar por nombre o email" value={q} onChangeText={setQ} autoCapitalize="none" />
        </View>
      </View>

      {list.length ? (
        <Grid columns={columns} gap={spacing.md}>
          {list.map((u) => {
            const clientCount = clients.filter((c) => c.trainer_id === u.id).length;
            const isMe = u.id === me.id;
            return (
              <Card key={u.id} style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar name={u.full_name} uri={u.avatar_url} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="h3" numberOfLines={1}>
                      {u.full_name || 'Sin nombre'}
                    </Text>
                    <Text variant="small" numberOfLines={1}>
                      {u.email}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {isMe ? <Badge label="Tú" tone="primary" /> : null}
                  {u.is_admin ? <Badge label="Admin" tone="primary" /> : null}
                  {u.must_change_password ? <Badge label="Pendiente de activar" tone="warning" /> : null}
                  {u.role === 'trainer' ? (
                    <Badge label={`${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'}`} />
                  ) : (
                    <Badge label={`Entrenador: ${trainerName(u.trainer_id)}`} />
                  )}
                </View>
                {!isMe ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {u.role === 'client' ? (
                      <Button title="Cambiar entrenador" icon="swap-horizontal" size="sm" variant="outline" onPress={() => setMoving(u)} fullWidth={false} />
                    ) : null}
                    <Button title="Código" icon="key-outline" size="sm" variant="outline" onPress={() => onReset(u)} fullWidth={false} />
                    <Button title="Eliminar" icon="trash-outline" size="sm" variant="danger" onPress={() => onDelete(u)} fullWidth={false} />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </Grid>
      ) : (
        <Card>
          <EmptyState icon="people-outline" title="Sin resultados" message={q ? 'Prueba con otro nombre.' : 'Todavía no hay usuarios de este tipo.'} />
        </Card>
      )}

      {moving ? <MoveClient client={moving} trainers={trainers} onClose={() => setMoving(null)} /> : null}
    </Screen>
  );
}

/** Selector de entrenador para un cliente */
function MoveClient({ client, trainers, onClose }: { client: Profile; trainers: Profile[]; onClose: () => void }) {
  const setTrainer = useSetTrainer();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text variant="h2">Cambiar entrenador</Text>
          <Text variant="body" color={colors.textMuted}>
            Elige el nuevo entrenador de {client.full_name}. Sus planes pasarán también al nuevo entrenador.
          </Text>
          {trainers.map((t) => {
            const current = t.id === client.trainer_id;
            return (
              <Pressable
                key={t.id}
                disabled={current || setTrainer.isPending}
                onPress={async () => {
                  try {
                    await setTrainer.mutateAsync({ clientId: client.id, trainerId: t.id });
                    onClose();
                    showAlert('Hecho', `${client.full_name} ahora entrena con ${t.full_name}.`);
                  } catch (e) {
                    showError(e);
                  }
                }}
                style={({ hovered }) => [styles.option, current && styles.optionCurrent, hovered && !current && { borderColor: colors.primary }]}
              >
                <Avatar name={t.full_name} size={36} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {t.full_name}
                </Text>
                {current ? <Badge label="Actual" tone="success" /> : null}
              </Pressable>
            );
          })}
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCurrent: { opacity: 0.6 },
});
