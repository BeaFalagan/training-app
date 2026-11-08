import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ExerciseVideo } from '@/components/ExerciseVideo';
import { Button, ChipSelect, Columns, Select, ErrorState, Header, IconButton, Input, Loading, Screen, SectionTitle, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { MUSCLE_GROUPS, uploadExerciseVideo, useDeleteExercise, useExercise, useSaveExercise } from '@/features/exercises/api';
import { ANIMATION_OPTIONS } from '@/features/exercises/figure';
import { confirm, showError } from '@/lib/errors';
import { supabase, VIDEO_BUCKET } from '@/lib/supabase';
import type { Exercise } from '@/lib/types';
import { showAlert } from '@/lib/alert';
import { colors, spacing } from '@/theme';

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useExercise(id);
  if (!isNew && existing.isPending) return <Loading />;
  if (!isNew && existing.error) return <ErrorState message={existing.error.message} onRetry={existing.refetch} />;
  return <ExerciseForm key={existing.data?.id ?? 'new'} existing={isNew ? null : (existing.data ?? null)} />;
}

function ExerciseForm({ existing }: { existing: Exercise | null }) {
  const isNew = !existing;
  const { profile } = useAuth();
  const save = useSaveExercise();
  const del = useDeleteExercise();

  const [name, setName] = useState(existing?.name ?? '');
  const [muscle, setMuscle] = useState<string | null>(existing?.muscle_group ?? null);
  const [equipment, setEquipment] = useState(existing?.equipment ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [cues, setCues] = useState(existing?.cues.join('\n') ?? '');
  const [videoUrl, setVideoUrl] = useState(existing?.video_url ?? '');
  const [animation, setAnimation] = useState<string>(existing?.animation ?? '');
  const [localVideo, setLocalVideo] = useState<{ uri: string; mimeType: string } | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [uploading, setUploading] = useState(false);

  const readOnly = !isNew && existing.trainer_id !== profile?.id;
  const currentPath = removeVideo ? null : (existing?.video_path ?? null);

  async function pickVideo(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showAlert('Permiso necesario', 'Permite el acceso en los ajustes del navegador.');
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      quality: 0.8,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setLocalVideo({ uri: a.uri, mimeType: a.mimeType ?? 'video/mp4' });
    setRemoveVideo(false);
  }

  async function onSave() {
    if (!name.trim()) return showAlert('Falta el nombre', 'Ponle un nombre al ejercicio.');
    setUploading(true);
    try {
      let video_path = currentPath;
      if (localVideo) video_path = await uploadExerciseVideo(profile!.id, localVideo.uri, localVideo.mimeType);
      const oldPath = existing?.video_path;
      await save.mutateAsync({
        id: existing?.id,
        trainer_id: profile!.id,
        name: name.trim(),
        muscle_group: muscle,
        equipment: equipment.trim() || null,
        description: description.trim() || null,
        cues: cues.split('\n').map((c) => c.trim()).filter(Boolean),
        video_path,
        video_url: videoUrl.trim() || null,
        animation: animation || null,
      });
      // Borra el vídeo anterior si se ha reemplazado o quitado
      if (oldPath && oldPath !== video_path) await supabase.storage.from(VIDEO_BUCKET).remove([oldPath]);
      router.back();
    } catch (e) {
      showError(e);
    } finally {
      setUploading(false);
    }
  }

  async function onDelete() {
    if (!existing) return;
    if (!(await confirm('Eliminar ejercicio', `¿Seguro que quieres eliminar "${existing.name}"?`))) return;
    try {
      await del.mutateAsync(existing);
      router.back();
    } catch (e) {
      showError(e);
    }
  }

  const previewExercise = { video_path: currentPath, video_url: videoUrl.trim() || null, animation: animation || null };

  return (
    <Screen width="medium"
      edges={['top', 'bottom']}
      footer={!readOnly ? <Button title={uploading ? 'Subiendo vídeo…' : 'Guardar'} size="lg" onPress={onSave} loading={uploading || save.isPending} /> : undefined}
    >
      <View style={{ paddingTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton icon="arrow-back" accessibilityLabel="Volver" onPress={() => router.back()} />
        {!isNew && !readOnly ? <IconButton icon="trash-outline" color={colors.danger} accessibilityLabel="Eliminar" onPress={onDelete} /> : null}
      </View>
      <Header eyebrow="Biblioteca" title={isNew ? 'Nuevo ejercicio' : 'Editar ejercicio'} />

      <Columns
        ratio={[1.1, 1]}
        left={
          <>
          <ExerciseVideo exercise={previewExercise} localUri={localVideo?.uri} />
          {!readOnly ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Galería" icon="images-outline" variant="outline" size="sm" onPress={() => pickVideo(false)} style={{ flex: 1 }} />
              <Button title="Grabar" icon="videocam-outline" variant="outline" size="sm" onPress={() => pickVideo(true)} style={{ flex: 1 }} />
              {localVideo || currentPath ? (
                <Button
                  title="Quitar"
                  icon="close"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    setLocalVideo(null);
                    setRemoveVideo(true);
                  }}
                />
              ) : null}
            </View>
          ) : null}
          <Input
            label="O enlace a vídeo (.mp4 / .m3u8)"
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
            placeholder="https://…"
            hint="Si subes un vídeo, tiene prioridad sobre el enlace."
            editable={!readOnly}
          />

          <SectionTitle title="Ilustración animada" />
          <Text variant="small">Se muestra cuando el ejercicio no tiene vídeo.</Text>
          <Select
            options={[{ value: '', label: 'Ninguna' }, ...ANIMATION_OPTIONS]}
            value={animation}
            onChange={setAnimation}
            placeholder="Ninguna"
            disabled={readOnly}
          />
          </>
        }
        right={
          <>
          <Input label="Nombre *" value={name} onChangeText={setName} editable={!readOnly} />
          <SectionTitle title="Grupo muscular" />
          <ChipSelect options={MUSCLE_GROUPS.map((g) => ({ value: g, label: g }))} value={muscle} onChange={setMuscle} />
          <Input label="Material" value={equipment} onChangeText={setEquipment} placeholder="Kettlebell, mancuernas…" editable={!readOnly} />
          <Input label="Descripción" value={description} onChangeText={setDescription} multiline editable={!readOnly} />
          <Input
            label="Claves técnicas (una por línea)"
            value={cues}
            onChangeText={setCues}
            multiline
            placeholder={'Pecho arriba\nRodillas hacia fuera'}
            editable={!readOnly}
          />
          </>
        }
      />
      {readOnly ? <Text variant="small">Este ejercicio pertenece a otro entrenador.</Text> : null}
    </Screen>
  );
}
