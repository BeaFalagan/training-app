import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useVideoUrl } from '@/features/exercises/api';
import { ExerciseAnimation, hasAnimation } from '@/features/exercises/ExerciseAnimation';
import type { Exercise } from '@/lib/types';
import { colors, radius } from '@/theme';

interface Props {
  exercise: (Pick<Exercise, 'video_path' | 'video_url'> & { animation?: string | null }) | null | undefined;
  /** URI local (vista previa antes de subir) */
  localUri?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  style?: ViewStyle;
}

/** Vídeo del ejercicio en bucle (URL firmada). Sin vídeo, muestra su ilustración animada. */
export function ExerciseVideo({ exercise, localUri, autoPlay = true, muted = true, controls = true, style }: Props) {
  const remote = useVideoUrl(localUri ? null : exercise);
  const uri = localUri ?? remote.data ?? null;
  const hasVideo = !!localUri || !!exercise?.video_path || !!exercise?.video_url;

  if (!hasVideo && hasAnimation(exercise?.animation)) {
    return (
      <View style={[styles.box, styles.animation, style]}>
        <ExerciseAnimation animation={exercise.animation} style={{ flex: 1 }} />
      </View>
    );
  }
  if (!hasVideo) {
    return (
      <View style={[styles.box, styles.center, style]}>
        <Ionicons name="videocam-off-outline" size={28} color={colors.textFaint} />
        <Text variant="small">Sin vídeo</Text>
      </View>
    );
  }
  if (!uri) {
    return (
      <View style={[styles.box, styles.center, style]}>
        {remote.error ? <Text variant="small">No se pudo cargar el vídeo</Text> : <ActivityIndicator color={colors.primaryBright} />}
      </View>
    );
  }
  return <Player key={uri} uri={uri} autoPlay={autoPlay} muted={muted} controls={controls} style={style} />;
}

function Player({ uri, autoPlay, muted, controls, style }: { uri: string; autoPlay: boolean; muted: boolean; controls: boolean; style?: ViewStyle }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    if (autoPlay) p.play();
  });
  return (
    <View style={[styles.box, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={controls}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.black },
  center: { alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
  animation: { aspectRatio: 1.25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 8 },
});
