import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { ExerciseAnimation, hasAnimation } from '@/features/exercises/ExerciseAnimation';
import { colors, radius } from '@/theme';

/** Miniatura del ejercicio: icono de vídeo, ilustración fija o icono genérico */
export function VideoBadge({ hasVideo, animation }: { hasVideo: boolean; animation?: string | null }) {
  const showFigure = !hasVideo && hasAnimation(animation);
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.sm,
        backgroundColor: hasVideo ? colors.primarySoft : colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showFigure ? (
        <ExerciseAnimation animation={animation} playing={false} style={{ width: 44, height: 44, padding: 3 }} />
      ) : (
        <Ionicons name={hasVideo ? 'play' : 'barbell-outline'} size={18} color={hasVideo ? colors.primaryBright : colors.textFaint} />
      )}
    </View>
  );
}
