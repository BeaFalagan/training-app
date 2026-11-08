/**
 * Ilustraciones animadas de ejercicios.
 *
 * Cada animación se define con unas pocas posturas clave (keyframes) de una
 * figura articulada. Entre posturas se interpolan los ángulos y posiciones,
 * y la cinemática inversa (IK) mantiene pies y manos fijos en el suelo, el
 * banco, etc.
 *
 * Este archivo es lógica pura: produce una lista de formas (líneas, círculos,
 * rectángulos) que luego dibuja ExerciseAnimation.tsx o un
 * script de previsualización a SVG.
 *
 * Convención de ángulos (grados): 0 = hacia abajo, 90 = hacia delante (la
 * figura mira a la derecha), 180 = hacia arriba, -90 = hacia atrás.
 */

export type Vec = [number, number];
type Limb = 'armN' | 'armF' | 'legN' | 'legF';
/** N = extremidad cercana (delante); F = lejana (detrás). En vista frontal: N = derecha de la pantalla. */

export interface Pose {
  /** Posición de la cadera (raíz de la figura) */
  hip: Vec;
  /** Dirección cadera → hombros */
  torso: number;
  /** Dirección cuello → cabeza (por defecto, la del tronco) */
  head?: number;
  /** [brazo, antebrazo] o [muslo, pierna] en ángulos absolutos */
  armN?: [number, number];
  armF?: [number, number];
  legN?: [number, number];
  legF?: [number, number];
  /** Dirección del pie (por defecto 90: apoyado mirando al frente) */
  footN?: number;
  footF?: number;
  /** Cinemática inversa: la mano/tobillo va al punto [x, y]; bend = ±1 elige hacia dónde se dobla el codo/rodilla */
  ik?: Partial<Record<Limb, [number, number, number]>>;
  /** Puntos libres que se interpolan entre posturas (p. ej. la posición de la comba) */
  points?: Record<string, Vec>;
}

export type Prop =
  | { type: 'dumbbell'; hand: 'N' | 'F' }
  | { type: 'goblet' }
  | { type: 'kettlebell' }
  | { type: 'wheel' }
  | { type: 'band'; from: Joint | Vec; to: Joint | Vec; color: string }
  | { type: 'bench'; x: number; y: number; w: number }
  | { type: 'treadmill' }
  | { type: 'rower' }
  | { type: 'wall'; x: number }
  | { type: 'rope' };

export interface AnimationSpec {
  label: string;
  view: 'side' | 'front';
  frames: Pose[];
  /** pingpong: A→B→A… · cycle: A→B→C→…→A */
  loop: 'pingpong' | 'cycle';
  /** ms por transición */
  speed?: number;
  /** ms de pausa en cada postura */
  hold?: number;
  props?: Prop[];
}

export type Joint =
  | 'hip' | 'neck' | 'head'
  | 'shoulderN' | 'elbowN' | 'handN' | 'shoulderF' | 'elbowF' | 'handF'
  | 'hipN' | 'kneeN' | 'ankleN' | 'toeN' | 'hipF' | 'kneeF' | 'ankleF' | 'toeF';

export type Shape =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: string }
  | { k: 'circle'; cx: number; cy: number; r: number; fill: string; stroke?: string; w?: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: string };

// ---------------------------------------------------------------------------
// Figura
// ---------------------------------------------------------------------------

export const VIEWBOX = { x: 0, y: -22, w: 200, h: 212 };
export const FLOOR_Y = 186;

const L = { torso: 52, neck: 6, headR: 11, ua: 29, fa: 27, th: 44, sh: 42, foot: 16 };
const COLORS = {
  near: '#FFFFFF',
  far: '#7C7C7C',
  weight: '#3B82F6',
  weightDark: '#1E3A8A',
  prop: '#3A3A3A',
  floor: '#2A2A2A',
};

const rad = (a: number) => (a * Math.PI) / 180;
const dir = (a: number): Vec => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Vec, v: Vec, s = 1): Vec => [p[0] + v[0] * s, p[1] + v[1] * s];
const angleOf = (v: Vec) => (Math.atan2(v[0], v[1]) * 180) / Math.PI;

/** Cinemática inversa de dos segmentos: devuelve [ángulo1, ángulo2] */
function solveIK(root: Vec, target: Vec, l1: number, l2: number, bend: number): [number, number] {
  const v: Vec = [target[0] - root[0], target[1] - root[1]];
  const d = Math.min(Math.max(Math.hypot(v[0], v[1]), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = angleOf(v);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const alpha = (Math.acos(Math.min(1, Math.max(-1, cosA))) * 180) / Math.PI;
  const a1 = base + bend * alpha;
  const joint = add(root, dir(a1), l1);
  return [a1, angleOf([target[0] - joint[0], target[1] - joint[1]])];
}

export function solvePose(p: Pose, view: 'side' | 'front'): Record<Joint, Vec> {
  const hip = p.hip;
  const t = dir(p.torso);
  const neck = add(hip, t, L.torso);
  const perp: Vec = [-t[1], t[0]];
  const sw = view === 'front' ? 13 : 0;
  const hw = view === 'front' ? 9 : 0;
  const shoulderN = add(neck, perp, sw);
  const shoulderF = add(neck, perp, -sw);
  const hipN = add(hip, perp, hw);
  const hipF = add(hip, perp, -hw);
  const head = add(neck, dir(p.head ?? p.torso), L.neck + L.headR);

  const limb = (name: Limb, root: Vec, l1: number, l2: number, fallback: [number, number]) => {
    const ik = p.ik?.[name];
    const [a1, a2] = ik ? solveIK(root, [ik[0], ik[1]], l1, l2, ik[2]) : (p[name] ?? fallback);
    const mid = add(root, dir(a1), l1);
    return [mid, add(mid, dir(a2), l2)] as const;
  };

  const [elbowN, handN] = limb('armN', shoulderN, L.ua, L.fa, [5, 5]);
  const [elbowF, handF] = limb('armF', shoulderF, L.ua, L.fa, [-5, -5]);
  const [kneeN, ankleN] = limb('legN', hipN, L.th, L.sh, [0, 0]);
  const [kneeF, ankleF] = limb('legF', hipF, L.th, L.sh, [0, 0]);
  const toeN = add(ankleN, dir(p.footN ?? (view === 'front' ? 60 : 90)), L.foot);
  const toeF = add(ankleF, dir(p.footF ?? (view === 'front' ? -60 : 90)), L.foot);

  return { hip, neck, head, shoulderN, elbowN, handN, shoulderF, elbowF, handF, hipN, kneeN, ankleN, toeN, hipF, kneeF, ankleF, toeF };
}

// ---------------------------------------------------------------------------
// Interpolación
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const lerpPair = (a: [number, number] | undefined, b: [number, number] | undefined, t: number) =>
  a && b ? ([lerp(a[0], b[0], t), lerp(a[1], b[1], t)] as [number, number]) : (a ?? b);

export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const ik: Pose['ik'] = {};
  for (const k of ['armN', 'armF', 'legN', 'legF'] as Limb[]) {
    const x = a.ik?.[k];
    const y = b.ik?.[k];
    if (x && y) ik[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), x[2]];
    else if (x || y) ik[k] = (t < 0.5 ? x : y) ?? undefined;
  }
  return {
    hip: lerpV(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    head: a.head !== undefined || b.head !== undefined ? lerp(a.head ?? a.torso, b.head ?? b.torso, t) : undefined,
    armN: lerpPair(a.armN, b.armN, t),
    armF: lerpPair(a.armF, b.armF, t),
    legN: lerpPair(a.legN, b.legN, t),
    legF: lerpPair(a.legF, b.legF, t),
    footN: a.footN !== undefined || b.footN !== undefined ? lerp(a.footN ?? 90, b.footN ?? 90, t) : undefined,
    footF: a.footF !== undefined || b.footF !== undefined ? lerp(a.footF ?? 90, b.footF ?? 90, t) : undefined,
    ik,
    points: a.points && b.points ? Object.fromEntries(Object.keys(a.points).map((k) => [k, lerpV(a.points![k], b.points![k] ?? a.points![k], t)])) : (a.points ?? b.points),
  };
}

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Postura en el instante `ms` de la animación */
export function poseAt(spec: AnimationSpec, ms: number): Pose {
  const f = spec.frames;
  if (f.length === 1) return f[0];
  const speed = spec.speed ?? 900;
  const hold = spec.hold ?? 180;
  const seq = spec.loop === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
  const seg = speed + hold;
  const total = seg * seq.length;
  const local = ((ms % total) + total) % total;
  const i = Math.floor(local / seg);
  const tIn = local - i * seg;
  const t = tIn < hold ? 0 : ease((tIn - hold) / speed);
  return interpolatePose(seq[i], seq[(i + 1) % seq.length], t);
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

const seg = (a: Vec, b: Vec, w: number, c: string): Shape => ({ k: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], w, c });

function dumbbellShapes(hand: Vec, elbow: Vec, view: 'side' | 'front'): Shape[] {
  if (view === 'side') {
    // Visto de lado, la mancuerna se ve de frente: un disco
    return [
      { k: 'circle', cx: hand[0], cy: hand[1], r: 8, fill: COLORS.weight },
      { k: 'circle', cx: hand[0], cy: hand[1], r: 3, fill: COLORS.weightDark },
    ];
  }
  const f = angleOf([hand[0] - elbow[0], hand[1] - elbow[1]]);
  const axis = dir(f + 90);
  const a = add(hand, axis, -10);
  const b = add(hand, axis, 10);
  return [
    seg(a, b, 4, COLORS.weightDark),
    seg(add(a, axis, -1), add(a, axis, 4), 11, COLORS.weight),
    seg(add(b, axis, 1), add(b, axis, -4), 11, COLORS.weight),
  ];
}

function propShapes(prop: Prop, j: Record<Joint, Vec>, view: 'side' | 'front', layer: 'back' | 'front', pose?: Pose): Shape[] {
  const pt = (x: Joint | Vec): Vec => (typeof x === 'string' ? j[x] : x);
  switch (prop.type) {
    case 'bench':
      return layer === 'back'
        ? [
            { k: 'rect', x: prop.x, y: prop.y, w: prop.w, h: 9, r: 3, fill: COLORS.prop },
            seg([prop.x + 10, prop.y + 8], [prop.x + 10, FLOOR_Y], 5, COLORS.prop),
            seg([prop.x + prop.w - 10, prop.y + 8], [prop.x + prop.w - 10, FLOOR_Y], 5, COLORS.prop),
          ]
        : [];
    case 'treadmill':
      return layer === 'back'
        ? [
            { k: 'rect', x: 30, y: 178, w: 150, h: 8, r: 4, fill: COLORS.prop },
            seg([172, 180], [182, 92], 5, COLORS.prop),
            seg([182, 92], [160, 88], 5, COLORS.prop),
            { k: 'rect', x: 174, y: 78, w: 18, h: 12, r: 3, fill: COLORS.prop },
          ]
        : [];
    case 'rower':
      return layer === 'back'
        ? [
            seg([28, 176], [178, 176], 5, COLORS.prop),
            seg([150, 176], [146, 156], 5, COLORS.prop),
            { k: 'circle', cx: 176, cy: 152, r: 16, fill: COLORS.prop },
            { k: 'rect', x: j.hip[0] - 12, y: j.hip[1] + 3, w: 24, h: 6, r: 3, fill: COLORS.prop },
          ]
        : [];
    case 'rope': {
      // La comba: de una mano al punto de giro y de ahí a la otra mano
      const p = pose?.points?.rope;
      if (!p || layer !== 'front') return [];
      return [seg(j.handN, p, 2.5, '#BDBDBD'), seg(p, j.handF, 2.5, '#BDBDBD')];
    }
    case 'wall':
      return layer === 'back' ? [{ k: 'rect', x: prop.x, y: -22, w: 8, h: FLOOR_Y + 22, r: 0, fill: COLORS.prop }] : [];
    case 'band':
      return layer === 'front' ? [seg(pt(prop.from), pt(prop.to), 3, prop.color)] : [];
    case 'dumbbell': {
      if (layer !== 'front') return [];
      const n = prop.hand === 'N';
      return dumbbellShapes(n ? j.handN : j.handF, n ? j.elbowN : j.elbowF, view);
    }
    case 'goblet': {
      if (layer !== 'front') return [];
      const h = j.handN;
      return [
        seg([h[0], h[1] - 9], [h[0], h[1] + 9], 4, COLORS.weightDark),
        seg([h[0] - 6, h[1] - 10], [h[0] + 6, h[1] - 10], 7, COLORS.weight),
        seg([h[0] - 6, h[1] + 10], [h[0] + 6, h[1] + 10], 7, COLORS.weight),
      ];
    }
    case 'kettlebell': {
      if (layer !== 'front') return [];
      const h = j.handN;
      return [
        { k: 'circle', cx: h[0], cy: h[1] + 4, r: 6, fill: 'none', stroke: COLORS.weight, w: 3 },
        { k: 'circle', cx: h[0], cy: h[1] + 13, r: 9, fill: COLORS.weight },
      ];
    }
    case 'wheel': {
      if (layer !== 'front') return [];
      const h = j.handN;
      return [
        { k: 'circle', cx: h[0], cy: FLOOR_Y - 8, r: 8, fill: COLORS.weight },
        { k: 'circle', cx: h[0], cy: FLOOR_Y - 8, r: 2.5, fill: COLORS.weightDark },
      ];
    }
  }
}

export function renderPose(spec: AnimationSpec, pose: Pose): Shape[] {
  const v = spec.view;
  const j = solvePose(pose, v);
  const out: Shape[] = [seg([4, FLOOR_Y + 2], [196, FLOOR_Y + 2], 2, COLORS.floor)];
  const props = spec.props ?? [];
  props.forEach((p) => out.push(...propShapes(p, j, v, 'back', pose)));

  const W = 9;
  const arm = (s: 'N' | 'F', c: string) => [seg(j[`shoulder${s}`], j[`elbow${s}`], W, c), seg(j[`elbow${s}`], j[`hand${s}`], W - 1, c)];
  const leg = (s: 'N' | 'F', c: string) => [
    seg(j[`hip${s}`], j[`knee${s}`], W + 1, c),
    seg(j[`knee${s}`], j[`ankle${s}`], W, c),
    seg(j[`ankle${s}`], j[`toe${s}`], W - 2, c),
  ];
  const head: Shape = { k: 'circle', cx: j.head[0], cy: j.head[1], r: L.headR, fill: COLORS.near };
  const neck = seg(j.neck, add(j.neck, dir(pose.head ?? pose.torso), L.neck + 2), 7, COLORS.near);

  // En vista lateral, la pesa de la mano lejana va detrás del cuerpo
  const farWeights = props.filter((p) => p.type === 'dumbbell' && p.hand === 'F');
  const nearProps = props.filter((p) => !(p.type === 'dumbbell' && p.hand === 'F'));

  if (v === 'side') {
    out.push(...arm('F', COLORS.far), ...leg('F', COLORS.far));
    farWeights.forEach((p) => out.push(...propShapes(p, j, v, 'front', pose)));
    out.push(seg(j.hip, j.neck, 14, COLORS.near), neck, head);
    out.push(...leg('N', COLORS.near), ...arm('N', COLORS.near));
  } else {
    out.push(...leg('F', COLORS.near), ...leg('N', COLORS.near));
    out.push(seg(j.hipF, j.hipN, 12, COLORS.near), seg(j.hip, j.neck, 20, COLORS.near), seg(j.shoulderF, j.shoulderN, 10, COLORS.near));
    out.push(neck, head, ...arm('F', COLORS.near), ...arm('N', COLORS.near));
    farWeights.forEach((p) => out.push(...propShapes(p, j, v, 'front', pose)));
  }
  nearProps.forEach((p) => out.push(...propShapes(p, j, v, 'front', pose)));
  return out;
}

export function renderAt(key: string, ms: number): Shape[] {
  const spec = ANIMATIONS[key];
  return spec ? renderPose(spec, poseAt(spec, ms)) : [];
}

// ---------------------------------------------------------------------------
// Biblioteca de animaciones
// ---------------------------------------------------------------------------

const GROUND = FLOOR_Y - 4; // altura del tobillo apoyado
const DB_BOTH: Prop[] = [
  { type: 'dumbbell', hand: 'F' },
  { type: 'dumbbell', hand: 'N' },
];
/** Colores habituales de las gomas elásticas (de menor a mayor resistencia) */
const BAND = { amarilla: '#F2C94C', roja: '#E5484D', negra: '#8A8A8A', morada: '#9B59B6', verde: '#2FB36F' };
const standLegs = (x = 100): Pose['ik'] => ({ legN: [x + 2, GROUND, 1], legF: [x - 2, GROUND, 1] });

const squatTop: Pose = { hip: [100, 97], torso: 180, armN: [25, 155], armF: [25, 155], ik: standLegs(100) };
const squatBottom: Pose = { hip: [72, 140], torso: 145, armN: [-10, 120], armF: [-10, 120], ik: standLegs(100) };

const pushTop = (hands: number): Pose => ({
  hip: [111, 141], torso: 109.4, footN: 20, footF: 20,
  ik: { armN: [hands, GROUND, -1], armF: [hands - 3, GROUND, -1], legN: [30, 170, 1], legF: [27, 171, 1] },
});

export const ANIMATIONS: Record<string, AnimationSpec> = {
  goblet_squat: {
    label: 'Sentadilla goblet (mancuerna)',
    view: 'side', loop: 'pingpong', props: [{ type: 'goblet' }],
    frames: [squatTop, squatBottom],
  },
  db_thruster: {
    label: 'Thruster con mancuernas',
    view: 'side', loop: 'pingpong', speed: 750, props: DB_BOTH,
    frames: [
      { hip: [72, 140], torso: 150, armN: [-5, 160], armF: [-5, 160], ik: standLegs(100) },
      { hip: [92, 97], torso: 180, armN: [176, 180], armF: [176, 180], ik: standLegs(100) },
    ],
  },
  db_swing: {
    label: 'Swing con mancuerna',
    view: 'side', loop: 'pingpong', speed: 650, props: [{ type: 'goblet' }],
    frames: [
      { hip: [72, 110], torso: 112, armN: [-28, -28], armF: [-28, -28], ik: standLegs(100) },
      { hip: [100, 97], torso: 183, armN: [92, 92], armF: [92, 92], ik: standLegs(100) },
    ],
  },
  push_up: {
    label: 'Flexiones',
    view: 'side', loop: 'pingpong',
    frames: [
      pushTop(160),
      { ...pushTop(160), hip: [116, 162], torso: 95 },
    ],
  },
  knee_push_up: {
    label: 'Flexiones de rodillas',
    view: 'side', loop: 'pingpong',
    frames: [
      { hip: [102, 154], torso: 125.6, legN: [-54.3, -100], legF: [-54.3, -100], footN: 10, footF: 10, ik: { armN: [150, GROUND, -1], armF: [147, GROUND, -1] } },
      { hip: [109, 170], torso: 103.2, legN: [-76.7, -100], legF: [-76.7, -100], footN: 10, footF: 10, ik: { armN: [150, GROUND, -1], armF: [147, GROUND, -1] } },
    ],
  },
  romanian_deadlift: {
    label: 'Peso muerto rumano',
    view: 'side', loop: 'pingpong', speed: 1100, props: DB_BOTH,
    frames: [
      { hip: [100, 97], torso: 180, armN: [3, 3], armF: [3, 3], ik: standLegs(100) },
      { hip: [70, 103], torso: 100, armN: [0, 0], armF: [0, 0], ik: standLegs(100) },
    ],
  },
  plank: {
    label: 'Plancha',
    view: 'side', loop: 'pingpong', speed: 1600, hold: 300,
    frames: [
      { hip: [109, 159], torso: 98.8, armN: [0, 90], armF: [0, 90], footN: 20, footF: 20, ik: { legN: [24, 172, 1], legF: [21, 173, 1] } },
      { hip: [109, 161], torso: 98, armN: [0, 90], armF: [0, 90], footN: 20, footF: 20, ik: { legN: [24, 172, 1], legF: [21, 173, 1] } },
    ],
  },
  side_plank: {
    label: 'Plancha lateral',
    view: 'front', loop: 'pingpong', speed: 1400, hold: 300,
    frames: [
      { hip: [87, 154], torso: 255, armF: [0, -90], armN: [180, 180], footN: 100, footF: 100, ik: { legN: [177, 165, 1], legF: [172, GROUND, 1] } },
      { hip: [89, 162], torso: 246, armF: [0, -90], armN: [180, 180], footN: 100, footF: 100, ik: { legN: [177, 165, 1], legF: [172, GROUND, 1] } },
    ],
  },
  lunge_alternate: {
    label: 'Zancada alterna',
    view: 'side', loop: 'cycle', speed: 800, hold: 200, props: DB_BOTH,
    frames: [
      { hip: [100, 97], torso: 180, armN: [0, 0], armF: [0, 0], ik: standLegs(100) },
      { hip: [100, 140], torso: 178, armN: [0, 0], armF: [0, 0], footF: 30, ik: { legN: [140, GROUND, 1], legF: [52, 176, 1] } },
      { hip: [100, 97], torso: 180, armN: [0, 0], armF: [0, 0], ik: standLegs(100) },
      { hip: [100, 140], torso: 178, armN: [0, 0], armF: [0, 0], footN: 30, ik: { legF: [140, GROUND, 1], legN: [52, 176, 1] } },
    ],
  },
  split_squat: {
    label: 'Zancada estática',
    view: 'side', loop: 'pingpong', props: DB_BOTH,
    frames: [
      { hip: [92, 106], torso: 180, armN: [0, 0], armF: [0, 0], footF: 35, ik: { legN: [128, GROUND, 1], legF: [55, 177, 1] } },
      { hip: [92, 142], torso: 180, armN: [0, 0], armF: [0, 0], footF: 35, ik: { legN: [128, GROUND, 1], legF: [55, 177, 1] } },
    ],
  },
  calf_raise: {
    label: 'Elevación de gemelos a dos piernas',
    view: 'side', loop: 'pingpong', speed: 700, hold: 250, props: DB_BOTH,
    frames: [
      { hip: [99, 97], torso: 180, armN: [0, 0], armF: [0, 0], ik: { legN: [100, GROUND, 1], legF: [97, GROUND, 1] } },
      { hip: [104, 84], torso: 180, armN: [0, 0], armF: [0, 0], footN: 30, footF: 30, ik: { legN: [108, 168, 1], legF: [105, 168, 1] } },
    ],
  },
  single_calf_raise: {
    label: 'Elevación de gemelos de pie (una pierna)',
    view: 'side', loop: 'pingpong', speed: 700, hold: 250,
    props: [{ type: 'wall', x: 146 }, { type: 'dumbbell', hand: 'F' }],
    frames: [
      { hip: [100, 98], torso: 182, armF: [0, 0], legF: [8, -70], ik: { legN: [106, GROUND, 1], armN: [144, 72, -1] } },
      { hip: [104, 88], torso: 182, armF: [0, 0], legF: [8, -70], footN: 40, ik: { legN: [110.6, 172, 1], armN: [144, 64, -1] } },
    ],
  },
  lateral_raise: {
    label: 'Elevaciones laterales',
    view: 'front', loop: 'pingpong', speed: 1000, props: DB_BOTH,
    frames: [
      { hip: [100, 98], torso: 180, armN: [10, 8], armF: [-10, -8], ik: { legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
      { hip: [100, 98], torso: 180, armN: [86, 90], armF: [-86, -90], ik: { legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
    ],
  },
  shoulder_press: {
    label: 'Press militar con mancuernas',
    view: 'side', loop: 'pingpong', props: DB_BOTH,
    frames: [
      { hip: [100, 97], torso: 180, armN: [12, 172], armF: [12, 172], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [178, 180], armF: [178, 180], ik: standLegs(100) },
    ],
  },
  biceps_curl: {
    label: 'Curl de bíceps',
    view: 'side', loop: 'pingpong', props: DB_BOTH,
    frames: [
      { hip: [100, 97], torso: 180, armN: [2, 2], armF: [2, 2], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [6, 160], armF: [6, 160], ik: standLegs(100) },
    ],
  },
  hammer_curl: {
    label: 'Curl martillo (alterno)',
    view: 'side', loop: 'cycle', speed: 750, props: DB_BOTH,
    frames: [
      { hip: [100, 97], torso: 180, armN: [2, 2], armF: [2, 2], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [6, 160], armF: [2, 2], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [2, 2], armF: [2, 2], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [2, 2], armF: [6, 160], ik: standLegs(100) },
    ],
  },
  triceps_extension: {
    label: 'Extensión de tríceps',
    view: 'side', loop: 'pingpong', props: [{ type: 'dumbbell', hand: 'N' }],
    frames: [
      { hip: [100, 97], torso: 180, armN: [176, 180], armF: [176, 180], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [168, 335], armF: [168, 335], ik: standLegs(100) },
    ],
  },
  one_arm_row: {
    label: 'Remo con mancuerna apoyado',
    view: 'side', loop: 'pingpong', props: [{ type: 'bench', x: 62, y: 141, w: 96 }, { type: 'dumbbell', hand: 'N' }],
    frames: [
      { hip: [85, 97], torso: 95, armN: [0, 0], legF: [0, -90], ik: { legN: [80, GROUND, 1], armF: [142, 137, -1] } },
      { hip: [85, 97], torso: 95, armN: [-125, 0], legF: [0, -90], ik: { legN: [80, GROUND, 1], armF: [142, 137, -1] } },
    ],
  },
  bent_over_row: {
    label: 'Remo inclinado con mancuernas',
    view: 'side', loop: 'pingpong', props: DB_BOTH,
    frames: [
      { hip: [78, 106], torso: 115, armN: [0, 0], armF: [0, 0], ik: standLegs(100) },
      { hip: [78, 106], torso: 115, armN: [-120, 0], armF: [-120, 0], ik: standLegs(100) },
    ],
  },
  floor_press: {
    label: 'Press de pecho en el suelo',
    view: 'side', loop: 'pingpong', props: DB_BOTH,
    frames: [
      { hip: [100, 176], torso: -92, head: -95, armN: [90, 180], armF: [90, 180], ik: { legN: [148, GROUND, 1], legF: [145, GROUND, 1] } },
      { hip: [100, 176], torso: -92, head: -95, armN: [180, 180], armF: [180, 180], ik: { legN: [148, GROUND, 1], legF: [145, GROUND, 1] } },
    ],
  },
  single_glute_bridge: {
    label: 'Puente de glúteo unilateral',
    view: 'side', loop: 'pingpong', speed: 1000, hold: 250,
    frames: [
      { hip: [100, 176], torso: -94.4, head: -95, armN: [90, 90], armF: [90, 90], legF: [118, 118], ik: { legN: [150, GROUND, 1] } },
      { hip: [96, 152], torso: -67.4, head: -95, armN: [70, 90], armF: [70, 90], legF: [112, 112], ik: { legN: [150, GROUND, 1] } },
    ],
  },
  monster_walk: {
    label: 'Monster walk',
    view: 'front', loop: 'pingpong', speed: 700,
    props: [{ type: 'band', from: 'kneeF', to: 'kneeN', color: '#F2C94C' }],
    frames: [
      { hip: [100, 112], torso: 180, armN: [15, 10], armF: [-15, -10], ik: { legN: [112, GROUND, 1], legF: [88, GROUND, -1] } },
      { hip: [106, 112], torso: 178, armN: [15, 10], armF: [-15, -10], ik: { legN: [128, GROUND, 1], legF: [88, GROUND, -1] } },
    ],
  },
  russian_twist: {
    label: 'Russian twist',
    view: 'front', loop: 'pingpong', speed: 750, hold: 150, props: [{ type: 'dumbbell', hand: 'N' }],
    frames: [
      { hip: [100, 174], torso: 163, head: 155, footN: 70, footF: -70, ik: { legN: [118, GROUND, 1], legF: [82, GROUND, -1], armN: [140, 172, -1], armF: [136, 170, -1] } },
      { hip: [100, 174], torso: 197, head: 205, footN: 70, footF: -70, ik: { legN: [118, GROUND, 1], legF: [82, GROUND, -1], armN: [64, 170, 1], armF: [60, 172, 1] } },
    ],
  },
  burpee: {
    label: 'Burpees',
    view: 'side', loop: 'cycle', speed: 420, hold: 80,
    frames: [
      { hip: [100, 98], torso: 180, ik: { legN: [108, GROUND, 1], legF: [104, GROUND, 1], armN: [104, 100, 1], armF: [102, 100, 1] } },
      { hip: [100, 148], torso: 115, ik: { legN: [120, GROUND, 1], legF: [116, GROUND, 1], armN: [160, GROUND, -1], armF: [157, GROUND, -1] } },
      { hip: [111, 141], torso: 109.4, footN: 20, footF: 20, ik: { legN: [30, 170, 1], legF: [27, 171, 1], armN: [160, GROUND, -1], armF: [157, GROUND, -1] } },
      { hip: [100, 148], torso: 115, ik: { legN: [120, GROUND, 1], legF: [116, GROUND, 1], armN: [160, GROUND, -1], armF: [157, GROUND, -1] } },
      { hip: [104, 86], torso: 182, footN: 40, footF: 40, ik: { legN: [112, 174, 1], legF: [108, 174, 1], armN: [110, -18, -1], armF: [106, -18, -1] } },
    ],
  },
  treadmill_walk: {
    label: 'Cinta de caminar',
    view: 'side', loop: 'cycle', speed: 380, hold: 0, props: [{ type: 'treadmill' }],
    frames: [
      { hip: [95, 92], torso: 178, armN: [-25, -12], armF: [25, 45], footN: 105, footF: 55, ik: { legN: [122, 174, 1], legF: [70, 172, 1] } },
      { hip: [95, 90], torso: 178, armN: [0, 12], armF: [0, 12], footF: 70, ik: { legN: [96, 174, 1], legF: [90, 156, 1] } },
      { hip: [95, 92], torso: 178, armF: [-25, -12], armN: [25, 45], footF: 105, footN: 55, ik: { legF: [122, 174, 1], legN: [70, 172, 1] } },
      { hip: [95, 90], torso: 178, armN: [0, 12], armF: [0, 12], footN: 70, ik: { legF: [96, 174, 1], legN: [90, 156, 1] } },
    ],
  },
  jump_rope: {
    label: 'Comba',
    view: 'side', loop: 'cycle', speed: 170, hold: 0, props: [{ type: 'rope' }],
    frames: [
      { hip: [98, 90], torso: 180, armN: [18, 75], armF: [14, 70], footN: 40, footF: 40, ik: { legN: [102, 175, 1], legF: [99, 175, 1] }, points: { rope: [100, 186] } },
      { hip: [98, 97], torso: 180, armN: [18, 75], armF: [14, 70], ik: { legN: [102, GROUND, 1], legF: [99, GROUND, 1] }, points: { rope: [152, 96] } },
      { hip: [98, 98], torso: 180, armN: [18, 75], armF: [14, 70], ik: { legN: [102, GROUND, 1], legF: [99, GROUND, 1] }, points: { rope: [100, -16] } },
      { hip: [98, 96], torso: 180, armN: [18, 75], armF: [14, 70], ik: { legN: [102, GROUND, 1], legF: [99, GROUND, 1] }, points: { rope: [46, 96] } },
    ],
  },
  dead_bug: {
    label: 'Dead bug',
    view: 'side', loop: 'cycle', speed: 900, hold: 200,
    frames: [
      { hip: [96, 176], torso: -92, head: -95, armN: [180, 180], armF: [180, 180], legN: [180, 90], legF: [178, 90] },
      { hip: [96, 176], torso: -92, head: -95, armN: [-105, -105], armF: [180, 180], legN: [180, 90], legF: [100, 100] },
      { hip: [96, 176], torso: -92, head: -95, armN: [180, 180], armF: [180, 180], legN: [180, 90], legF: [178, 90] },
      { hip: [96, 176], torso: -92, head: -95, armN: [180, 180], armF: [-105, -105], legN: [100, 100], legF: [178, 90] },
    ],
  },
  crunch: {
    label: 'Crunch abdominal',
    view: 'side', loop: 'pingpong', speed: 700, hold: 200,
    frames: [
      { hip: [100, 176], torso: -92, head: -95, armN: [95, 95], armF: [95, 95], ik: { legN: [150, GROUND, 1], legF: [146, GROUND, 1] } },
      { hip: [100, 176], torso: -122, head: -128, armN: [108, 108], armF: [108, 108], ik: { legN: [150, GROUND, 1], legF: [146, GROUND, 1] } },
    ],
  },
  leg_raise: {
    label: 'Elevación de piernas tumbado',
    view: 'side', loop: 'pingpong', speed: 1000, hold: 200,
    frames: [
      { hip: [96, 177], torso: -92, head: -95, armN: [92, 92], armF: [92, 92], legN: [96, 96], legF: [97, 97] },
      { hip: [96, 177], torso: -92, head: -95, armN: [92, 92], armF: [92, 92], legN: [178, 178], legF: [176, 176] },
    ],
  },
  bird_dog: {
    label: 'Bird dog',
    view: 'side', loop: 'pingpong', speed: 1000, hold: 400,
    frames: [
      { hip: [82, 136], torso: 92, head: 95, legN: [0, -90], legF: [2, -90], footN: -90, footF: -90, ik: { armN: [136, GROUND, -1], armF: [132, GROUND, -1] } },
      { hip: [82, 136], torso: 92, head: 95, armN: [92, 92], legN: [0, -90], legF: [-88, -90], footN: -90, footF: -120, ik: { armF: [132, GROUND, -1] } },
    ],
  },
  superman: {
    label: 'Superman',
    view: 'side', loop: 'pingpong', speed: 900, hold: 500,
    frames: [
      { hip: [86, 178], torso: 90, head: 90, armN: [90, 90], armF: [90, 90], legN: [-90, -90], legF: [-90, -90], footN: -90, footF: -90 },
      { hip: [86, 178], torso: 102, head: 108, armN: [108, 110], armF: [108, 110], legN: [-102, -104], legF: [-102, -104], footN: -110, footF: -110 },
    ],
  },
  wall_sit: {
    label: 'Sentadilla isométrica en pared',
    view: 'side', loop: 'pingpong', speed: 1500, hold: 400, props: [{ type: 'wall', x: 42 }],
    frames: [
      { hip: [62, 140], torso: 180, armN: [40, 85], armF: [40, 85], ik: { legN: [106, GROUND, 1], legF: [103, GROUND, 1] } },
      { hip: [62, 141], torso: 179, armN: [40, 85], armF: [40, 85], ik: { legN: [106, GROUND, 1], legF: [103, GROUND, 1] } },
    ],
  },
  glute_bridge: {
    label: 'Puente de glúteo',
    view: 'side', loop: 'pingpong', speed: 900, hold: 300,
    frames: [
      { hip: [100, 176], torso: -94.4, head: -95, armN: [90, 90], armF: [90, 90], ik: { legN: [150, GROUND, 1], legF: [146, GROUND, 1] } },
      { hip: [96, 152], torso: -67.4, head: -95, armN: [70, 90], armF: [70, 90], ik: { legN: [150, GROUND, 1], legF: [146, GROUND, 1] } },
    ],
  },
  band_row: {
    label: 'Remo con goma',
    view: 'side', loop: 'pingpong', speed: 800, hold: 200,
    props: [{ type: 'wall', x: 170 }, { type: 'band', from: 'handN', to: [168, 92], color: '#E5484D' }],
    frames: [
      { hip: [92, 100], torso: 178, armN: [88, 90], armF: [88, 90], ik: { legN: [100, GROUND, 1], legF: [97, GROUND, 1] } },
      { hip: [92, 100], torso: 182, armN: [-35, 88], armF: [-35, 88], ik: { legN: [100, GROUND, 1], legF: [97, GROUND, 1] } },
    ],
  },
  band_pull_apart: {
    label: 'Aperturas con goma',
    view: 'front', loop: 'pingpong', speed: 800, hold: 200,
    props: [{ type: 'band', from: 'handF', to: 'handN', color: '#F2C94C' }],
    frames: [
      { hip: [100, 98], torso: 180, ik: { armN: [107, 64, -1], armF: [93, 64, 1], legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
      { hip: [100, 98], torso: 180, ik: { armN: [168, 50, -1], armF: [32, 50, 1], legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
    ],
  },
  band_squat: {
    label: 'Sentadilla con goma',
    view: 'side', loop: 'pingpong', props: [{ type: 'band', from: 'ankleN', to: 'handN', color: BAND.negra }],
    frames: [
      { hip: [100, 97], torso: 180, armN: [20, 168], armF: [20, 168], ik: standLegs(100) },
      { hip: [72, 140], torso: 148, armN: [-12, 138], armF: [-12, 138], ik: standLegs(100) },
    ],
  },
  band_chest_press: {
    label: 'Press de pecho con goma',
    view: 'side', loop: 'pingpong', speed: 800, props: [{ type: 'band', from: 'handN', to: 'shoulderN', color: BAND.morada }],
    frames: [
      { hip: [96, 98], torso: 180, armN: [-60, 92], armF: [-60, 92], ik: { legN: [112, GROUND, 1], legF: [84, GROUND, 1] } },
      { hip: [96, 98], torso: 178, armN: [92, 92], armF: [92, 92], ik: { legN: [112, GROUND, 1], legF: [84, GROUND, 1] } },
    ],
  },
  band_face_pull: {
    label: 'Face pull con goma',
    view: 'side', loop: 'pingpong', speed: 800, props: [{ type: 'wall', x: 172 }, { type: 'band', from: 'handN', to: [170, 42], color: BAND.roja }],
    frames: [
      { hip: [92, 100], torso: 178, armN: [100, 100], armF: [100, 100], ik: { legN: [100, GROUND, 1], legF: [97, GROUND, 1] } },
      { hip: [92, 100], torso: 182, armN: [-112, 125], armF: [-112, 125], ik: { legN: [100, GROUND, 1], legF: [97, GROUND, 1] } },
    ],
  },
  band_curl: {
    label: 'Curl de bíceps con goma',
    view: 'side', loop: 'pingpong', props: [{ type: 'band', from: 'ankleN', to: 'handN', color: BAND.roja }],
    frames: [
      { hip: [100, 97], torso: 180, armN: [2, 4], armF: [2, 4], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [6, 160], armF: [6, 160], ik: standLegs(100) },
    ],
  },
  band_pushdown: {
    label: 'Extensión de tríceps con goma',
    view: 'side', loop: 'pingpong', speed: 750, props: [{ type: 'wall', x: 158 }, { type: 'band', from: 'handN', to: [156, -6], color: BAND.roja }],
    frames: [
      { hip: [100, 97], torso: 172, armN: [8, 150], armF: [8, 150], ik: standLegs(102) },
      { hip: [100, 97], torso: 172, armN: [6, 8], armF: [6, 8], ik: standLegs(102) },
    ],
  },
  band_kickback: {
    label: 'Patada de glúteo con goma',
    view: 'side', loop: 'pingpong', speed: 800, hold: 250, props: [{ type: 'band', from: 'ankleN', to: 'handN', color: BAND.roja }],
    frames: [
      { hip: [82, 136], torso: 92, head: 95, legN: [0, -90], legF: [2, -90], footN: -90, footF: -90, ik: { armN: [136, GROUND, -1], armF: [132, GROUND, -1] } },
      { hip: [82, 136], torso: 92, head: 95, legN: [-100, -100], legF: [2, -90], footN: -100, footF: -90, ik: { armN: [136, GROUND, -1], armF: [132, GROUND, -1] } },
    ],
  },
  band_lateral_raise: {
    label: 'Elevaciones laterales con goma',
    view: 'front', loop: 'pingpong', speed: 1000,
    props: [
      { type: 'band', from: 'ankleN', to: 'handN', color: BAND.amarilla },
      { type: 'band', from: 'ankleF', to: 'handF', color: BAND.amarilla },
    ],
    frames: [
      { hip: [100, 97], torso: 180, armN: [10, 8], armF: [-10, -8], ik: { legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
      { hip: [100, 97], torso: 180, armN: [84, 88], armF: [-84, -88], ik: { legN: [108, GROUND, 1], legF: [92, GROUND, -1] } },
    ],
  },
  band_shoulder_press: {
    label: 'Press militar con goma',
    view: 'side', loop: 'pingpong', props: [{ type: 'band', from: 'ankleN', to: 'handN', color: BAND.roja }],
    frames: [
      { hip: [100, 97], torso: 180, armN: [12, 172], armF: [12, 172], ik: standLegs(100) },
      { hip: [100, 97], torso: 180, armN: [178, 180], armF: [178, 180], ik: standLegs(100) },
    ],
  },
};

/** Opciones para el selector del editor de ejercicios */
export const ANIMATION_OPTIONS = Object.entries(ANIMATIONS)
  .map(([value, s]) => ({ value, label: s.label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

