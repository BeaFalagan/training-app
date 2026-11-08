import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseVideo } from '@/components/ExerciseVideo';
import { ProgressRing } from '@/components/ProgressRing';
import { ErrorState, Loading, Text } from '@/components/ui';
import { useDay } from '@/features/plans/api';
import { requiredEquipment } from '@/features/plans/equipment';
import {
  BLOCK_TYPE_LABEL,
  buildSteps,
  describeTarget,
  initialPlayerState,
  playerReducer,
  remainingSeconds,
  stepElapsedMs,
  totalElapsedMs,
  type WorkoutStep,
} from '@/features/workout/engine';
import { useWorkoutFeedback } from '@/features/workout/feedback';
import { formatClock } from '@/lib/dates';
import { useIsDesktop } from '@/lib/responsive';
import type { BlockExerciseWithExercise } from '@/lib/types';
import { showAlert } from '@/lib/alert';
import { colors, fonts, radius, spacing } from '@/theme';

type Step = WorkoutStep<BlockExerciseWithExercise>;

const PHASE = {
  prepare: { color: colors.warning, label: 'Prepárate' },
  work: { color: colors.primaryBright, label: 'Trabajo' },
  rest: { color: colors.rest, label: 'Descanso' },
} as const;

export default function PlayerScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { data: day, isPending, error, refetch } = useDay(dayId);
  const steps = useMemo(() => (day ? (buildSteps(day.workout_blocks) as Step[]) : []), [day]);

  if (isPending) return <Loading label="Preparando entrenamiento…" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!steps.length) return <ErrorState message="Este día no tiene ejercicios." onRetry={() => router.back()} />;
  return <Player steps={steps} dayId={day.id} dayTitle={day.title} equipment={requiredEquipment(day).map((i) => i.label)} />;
}

function Player({ steps, dayId, dayTitle, equipment }: { steps: Step[]; dayId: string; dayTitle: string; equipment: string[] }) {
  useKeepAwake();
  const { width } = useWindowDimensions();
  const isDesktop = useIsDesktop();
  // En escritorio el contenido del temporizador se centra con un ancho cómodo
  const desktopColumn = isDesktop ? ({ width: '100%', maxWidth: 1320, alignSelf: 'center' } as const) : null;
  const desktopBody = isDesktop ? ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64, minHeight: '100%', paddingHorizontal: spacing.xxl } as const) : null;
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const feedback = useWorkoutFeedback(sound);
  const lastBeep = useRef<string | null>(null);

  const step = steps[state.index];
  const running = state.status === 'running';
  const remaining = remainingSeconds(step, state, now);
  const elapsedStep = stepElapsedMs(state, now) / 1000;
  const phase = PHASE[step.kind];

  // Reloj: refresco frecuente solo mientras corre
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [running]);

  // Arranque automático
  useEffect(() => {
    dispatch({ type: 'start', now: Date.now() });
  }, []);

  // Pitidos 3-2-1 y avance automático al llegar a 0
  useEffect(() => {
    if (!running) return;
    if (remaining !== null) {
      const key = `${state.index}:${remaining}`;
      if (remaining > 0 && remaining <= 3 && lastBeep.current !== key) {
        lastBeep.current = key;
        feedback('tick');
      }
      if (remaining === 0) dispatch({ type: 'next', now: Date.now(), total: steps.length });
    }
    // For Time con time cap
    if (step.mode === 'for_time' && step.duration && elapsedStep >= step.duration) {
      dispatch({ type: 'next', now: Date.now(), total: steps.length });
    }
  }, [remaining, running, state.index, step, elapsedStep, steps.length, feedback]);

  // Sonido al empezar cada fase de trabajo
  useEffect(() => {
    if (state.status === 'running' && step.kind === 'work') feedback('go');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  // Al terminar → pantalla de resumen
  useEffect(() => {
    if (state.status !== 'finished') return;
    feedback('finish');
    router.replace({
      pathname: '/workout/finish',
      params: {
        dayId,
        dayTitle,
        duration: String(Math.round(totalElapsedMs(state, Date.now()) / 1000)),
        rounds: String(state.roundsCompleted),
        startedAt: new Date(state.startedAt ?? Date.now()).toISOString(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const exit = useCallback(() => {
    const wasRunning = state.status === 'running';
    if (wasRunning) dispatch({ type: 'pause', now: Date.now() });
    showAlert('¿Salir del entrenamiento?', 'Puedes terminarlo ahora y guardar lo hecho, o descartarlo.', [
      { text: 'Continuar', style: 'cancel', onPress: () => wasRunning && dispatch({ type: 'resume', now: Date.now() }) },
      { text: 'Terminar y guardar', onPress: () => dispatch({ type: 'finish', now: Date.now() }) },
      { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [state.status]);

  const togglePlay = () =>
    dispatch(running ? { type: 'pause', now: Date.now() } : { type: 'resume', now: Date.now() });
  const next = () => dispatch({ type: 'next', now: Date.now(), total: steps.length });
  const prev = () => dispatch({ type: 'prev', now: Date.now() });

  const ringSize = isDesktop ? 340 : Math.min(width * 0.62, 280);
  const progress =
    step.duration && step.mode !== 'reps' ? Math.min(1, elapsedStep / step.duration) : step.mode === 'reps' ? 1 : 0;
  const nextStep = steps.slice(state.index + 1).find((s) => s.kind === 'work');
  const videoExercise = step.kind === 'work' ? step.blockExercise?.exercise : nextStep?.blockExercise?.exercise;
  const isList = step.mode === 'amrap' || step.mode === 'for_time';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Barra superior */}
      <View style={styles.top}>
        <Pressable onPress={exit} hitSlop={10} accessibilityLabel="Salir">
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="label" numberOfLines={1}>
            {step.blockName} · {BLOCK_TYPE_LABEL[step.blockType]}
          </Text>
          <Text variant="small" color={colors.textFaint}>
            {formatClock(totalElapsedMs(state, now) / 1000)} · paso {state.index + 1}/{steps.length}
          </Text>
        </View>
        <Pressable onPress={() => setSound((s) => !s)} hitSlop={10} accessibilityLabel={sound ? 'Silenciar' : 'Activar sonido'}>
          <Ionicons name={sound ? 'volume-high' : 'volume-mute'} size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((state.index + 1) / steps.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, desktopColumn, desktopBody]} showsVerticalScrollIndicator={false}>
        <View style={isDesktop ? styles.mainColDesktop : styles.mainCol}>
          {/* Fase */}
          <View style={[styles.phasePill, { backgroundColor: phase.color }]}>
            <Text style={styles.phaseText}>{step.kind === 'work' && step.round ? `${phase.label} · ${step.round}/${step.totalRounds}` : phase.label}</Text>
          </View>

          {/* Temporizador */}
          <ProgressRing size={ringSize} progress={progress} color={phase.color}>
            {step.mode === 'reps' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.bigNumber, { fontSize: ringSize * 0.28 }]}>{step.blockExercise?.reps ?? '✓'}</Text>
                <Text variant="label">{step.blockExercise?.reps && /^\d+$/.test(step.blockExercise.reps) ? 'repeticiones' : 'a tu ritmo'}</Text>
              </View>
            ) : step.mode === 'for_time' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.bigNumber, { fontSize: ringSize * 0.24 }]}>{formatClock(elapsedStep)}</Text>
                <Text variant="label">{step.duration ? `cap ${formatClock(step.duration)}` : 'cronómetro'}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.bigNumber, { fontSize: ringSize * (remaining !== null && remaining >= 600 ? 0.22 : 0.3) }]}>
                  {remaining !== null && remaining >= 60 ? formatClock(remaining) : remaining}
                </Text>
                <Text variant="label">{state.status === 'paused' ? 'en pausa' : 'segundos'}</Text>
              </View>
            )}
          </ProgressRing>

          {/* Qué toca */}
          <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg }}>
            <Text variant="h1" align="center" numberOfLines={2}>
              {step.title}
            </Text>
            {step.subtitle ? (
              <Text variant="bodyStrong" color={colors.textMuted} align="center">
                {step.subtitle}
              </Text>
            ) : null}
            {step.kind === 'work' && step.blockExercise?.notes ? (
              <Text variant="small" color={colors.warning} align="center">
                {step.blockExercise.notes}
              </Text>
            ) : null}
            {state.index === 0 && step.kind === 'prepare' && equipment.length ? (
              <View style={styles.equipBox}>
                <Text variant="label" color={colors.warning} align="center">
                  Ten preparado
                </Text>
                <Text variant="bodyStrong" align="center">
                  {equipment.join(' · ')}
                </Text>
              </View>
            ) : null}
            {step.kind !== 'work' && step.nextTitle ? (
              <Text variant="bodyStrong" align="center">
                Siguiente: <Text variant="bodyStrong" color={colors.primaryBright}>{step.nextTitle}</Text>
              </Text>
            ) : null}
          </View>
        </View>
        <View style={isDesktop ? styles.sideColDesktop : styles.sideCol}>
          {/* AMRAP / For Time: lista de ejercicios + contador de rondas */}
          {isList ? (
            <View style={styles.list}>
              {step.exercises?.map((be) => (
                <View key={be.id} style={styles.listRow}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {be.exercise.name}
                  </Text>
                  <Text variant="small">{describeTarget(be)}</Text>
                </View>
              ))}
              <View style={styles.roundCounter}>
                <Pressable style={styles.roundBtn} onPress={() => dispatch({ type: 'removeRound' })} accessibilityLabel="Restar ronda">
                  <Ionicons name="remove" size={22} color={colors.text} />
                </Pressable>
                <View style={{ alignItems: 'center', minWidth: 90 }}>
                  <Text style={[styles.bigNumber, { fontSize: 40 }]}>{state.roundsCompleted}</Text>
                  <Text variant="label">rondas</Text>
                </View>
                <Pressable
                  style={[styles.roundBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    dispatch({ type: 'addRound' });
                    feedback('tick');
                  }}
                  accessibilityLabel="Sumar ronda"
                >
                  <Ionicons name="add" size={22} color={colors.white} />
                </Pressable>
              </View>
            </View>
          ) : videoExercise ? (
            <View style={{ width: '100%', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {step.kind !== 'work' ? <Text variant="label">Vista previa</Text> : null}
              <ExerciseVideo key={videoExercise.id} exercise={videoExercise} controls={false} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Controles */}
      <View style={[styles.controls, desktopColumn]}>
        <ControlButton icon="play-skip-back" label="Anterior" onPress={prev} disabled={state.index === 0} />
        <Pressable
          onPress={step.mode === 'reps' || step.mode === 'for_time' ? next : togglePlay}
          style={({ pressed }) => [styles.mainBtn, { backgroundColor: phase.color, opacity: pressed ? 0.85 : 1 }]}
          accessibilityLabel={step.mode === 'reps' ? 'Hecho' : running ? 'Pausa' : 'Reanudar'}
        >
          {step.mode === 'reps' || step.mode === 'for_time' ? (
            <Text style={styles.mainBtnText}>{step.mode === 'for_time' ? 'FIN' : 'HECHO'}</Text>
          ) : (
            <Ionicons name={running ? 'pause' : 'play'} size={40} color={colors.white} />
          )}
        </Pressable>
        <ControlButton
          icon={step.mode === 'reps' || step.mode === 'for_time' ? (running ? 'pause' : 'play') : 'play-skip-forward'}
          label={step.mode === 'reps' || step.mode === 'for_time' ? (running ? 'Pausa' : 'Seguir') : 'Saltar'}
          onPress={step.mode === 'reps' || step.mode === 'for_time' ? togglePlay : next}
        />
      </View>
    </SafeAreaView>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.ctrl, disabled && { opacity: 0.3 }]} accessibilityLabel={label}>
      <Ionicons name={icon} size={26} color={colors.text} />
      <Text variant="label" style={{ fontSize: 9 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  equipBox: {
    marginTop: spacing.sm,
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progressTrack: { height: 3, backgroundColor: colors.surfaceAlt, marginHorizontal: spacing.lg, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: colors.primaryBright, borderRadius: 2 },
  body: { alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xl },
  mainCol: { width: '100%', alignItems: 'center', gap: spacing.xl },
  mainColDesktop: { flex: 1, alignItems: 'center', gap: spacing.xl, maxWidth: 560 },
  sideCol: { width: '100%', alignItems: 'center' },
  sideColDesktop: { flex: 1.2, alignItems: 'stretch', maxWidth: 720 },
  phasePill: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  phaseText: { fontFamily: fonts.bold, color: colors.white, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' },
  bigNumber: { fontFamily: fonts.display, color: colors.text, fontVariant: ['tabular-nums'] },
  list: { width: '100%', paddingHorizontal: spacing.lg, gap: spacing.sm },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  roundCounter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.md },
  roundBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ctrl: { alignItems: 'center', gap: 4, width: 72 },
  mainBtn: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  mainBtnText: { fontFamily: fonts.display, color: colors.white, fontSize: 18, letterSpacing: 1 },
});
