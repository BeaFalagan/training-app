import { useEffect, useMemo, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { ANIMATIONS, poseAt, renderPose, VIEWBOX, type Shape } from './figure';

interface Props {
  animation: string;
  /** false = imagen fija (miniaturas) */
  playing?: boolean;
  style?: ViewStyle;
}

/** Ilustración animada de un ejercicio, con la estética de la app. */
export function ExerciseAnimation({ animation, playing = true, style }: Props) {
  const spec = ANIMATIONS[animation];
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (!playing || !spec) return;
    const start = Date.now();
    let last = 0;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      // ~30 fps es suficiente y ahorra batería
      if (now - last >= 33) {
        last = now;
        setMs(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, spec]);

  const shapes = useMemo(() => {
    if (!spec) return [];
    // En reposo mostramos la postura más representativa (la segunda)
    return renderPose(spec, playing ? poseAt(spec, ms) : (spec.frames[1] ?? spec.frames[0]));
  }, [spec, playing, ms]);

  if (!spec) return null;
  return (
    <View style={style} accessibilityLabel={`Animación: ${spec.label}`}>
      <Svg width="100%" height="100%" viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}>
        {shapes.map((s, i) => (
          <ShapeView key={i} s={s} />
        ))}
      </Svg>
    </View>
  );
}

function ShapeView({ s }: { s: Shape }) {
  switch (s.k) {
    case 'line':
      return <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth={s.w} strokeLinecap="round" />;
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.w} />;
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={s.fill} />;
  }
}

export function hasAnimation(key: string | null | undefined): key is string {
  return !!key && key in ANIMATIONS;
}
