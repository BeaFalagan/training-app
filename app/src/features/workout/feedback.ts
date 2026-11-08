import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

const sources = {
  tick: require('../../../assets/sounds/tick.wav'),
  go: require('../../../assets/sounds/go.wav'),
  finish: require('../../../assets/sounds/finish.wav'),
};

const VIBRATION: Record<keyof typeof sources, number | number[]> = { tick: 30, go: 120, finish: [100, 80, 100] };

/** Pitidos y vibración del temporizador (la vibración solo en navegadores que la admiten). */
export function useWorkoutFeedback(enabled: boolean) {
  const tick = useAudioPlayer(sources.tick);
  const go = useAudioPlayer(sources.go);
  const finish = useAudioPlayer(sources.finish);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  const play = useCallback(
    (kind: keyof typeof sources) => {
      if (enabled) {
        const p = kind === 'tick' ? tick : kind === 'go' ? go : finish;
        try {
          p.seekTo(0);
          p.play();
        } catch {
          // El audio no debe romper nunca el entrenamiento
        }
      }
      if (typeof navigator !== 'undefined') navigator.vibrate?.(VIBRATION[kind]);
    },
    [enabled, tick, go, finish],
  );

  return play;
}
