// Genera el logo y las ilustraciones de la web y la app a partir de las figuras
// animadas de los ejercicios (src/features/exercises/figure.ts).
//
//   node scripts/generate-art.mjs <carpeta-salida>
//
// Escribe un SVG por imagen. Para pasarlos a PNG/JPG basta con abrirlos en un
// navegador (o Chrome sin interfaz) y hacer una captura del tamaño indicado.
import fs from 'node:fs';
import path from 'node:path';

import { ANIMATIONS, renderPose, VIEWBOX } from '../src/features/exercises/figure.ts';

const out = process.argv[2] ?? 'art';
fs.mkdirSync(out, { recursive: true });

const BLUE = '#2563EB';
const BLUE_BRIGHT = '#3B82F6';

/** Figura de un ejercicio en una postura concreta, como grupo SVG */
function figure(key, frame, x, y, scale, opacity = 1) {
  const spec = ANIMATIONS[key];
  const pose = spec.frames[Math.min(frame, spec.frames.length - 1)];
  const shapes = renderPose(spec, pose)
    .map((s) => {
      if (s.k === 'line')
        return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="round"/>`;
      if (s.k === 'circle')
        return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill ?? 'none'}" stroke="${s.stroke ?? 'none'}" stroke-width="${s.w ?? 0}"/>`;
      return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r ?? 0}" fill="${s.fill}"/>`;
    })
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-VIEWBOX.x} ${-VIEWBOX.y})" opacity="${opacity}">${shapes}</g>`;
}

/** Fondo oscuro con brillo azul, cuadrícula suave y suelo */
function scene(w, h, figures, { glowX = 0.7, glowY = 0.35, floor = 0.86 } = {}) {
  const fy = Math.round(h * floor);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="glow" cx="${glowX}" cy="${glowY}" r="0.75">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#1E3A8A" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#0A0A0A" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#FFFFFF" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BLUE_BRIGHT}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#0A0A0A" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0A0A0A"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect y="${fy}" width="${w}" height="${h - fy}" fill="url(#floor)" opacity="0.6"/>
  <line x1="0" y1="${fy}" x2="${w}" y2="${fy}" stroke="${BLUE_BRIGHT}" stroke-opacity="0.5" stroke-width="2"/>
  ${figures.join('\n  ')}
</svg>`;
}

/** Coloca figuras sobre la línea de suelo: el suelo de cada figura es FLOOR_Y = 186 */
const onFloor = (key, frame, x, floorY, scale, opacity) => figure(key, frame, x, floorY - (186 - VIEWBOX.y) * scale, scale, opacity);

const images = {
  // Portada de la landing (1600 × 1000)
  hero: scene(1600, 1000, [
    onFloor('band_row', 1, 640, 860, 2.2, 0.35),
    onFloor('goblet_squat', 1, 820, 860, 3.2),
    onFloor('db_thruster', 2, 1150, 860, 2.6, 0.75),
  ]),
  // Cabeceras de la app (1600 × 600)
  banner: scene(
    1600,
    600,
    [
      onFloor('lunge_alternate', 1, 760, 530, 1.9, 0.5),
      onFloor('shoulder_press', 1, 980, 530, 2.2),
      onFloor('jump_rope', 1, 1240, 530, 1.9, 0.6),
    ],
    { glowX: 0.72, glowY: 0.4, floor: 0.88 },
  ),
  'banner-2': scene(
    1600,
    600,
    [onFloor('band_pull_apart', 1, 900, 530, 2.2), onFloor('band_squat', 1, 1180, 530, 2.0, 0.55)],
    { glowX: 0.68, glowY: 0.4, floor: 0.88 },
  ),
  // Acceso (1000 × 1400, vertical)
  acceso: scene(1000, 1400, [onFloor('romanian_deadlift', 1, 160, 1180, 3.6)], { glowX: 0.5, glowY: 0.45, floor: 0.84 }),
  // Galería de la landing (900 × 1200, vertical)
  'ej-sentadilla': scene(900, 1200, [onFloor('goblet_squat', 1, 110, 1010, 3.4)], { glowX: 0.5, glowY: 0.5 }),
  'ej-flexiones': scene(900, 1200, [onFloor('push_up', 1, 60, 1010, 3.8)], { glowX: 0.5, glowY: 0.6 }),
  'ej-goma': scene(900, 1200, [onFloor('band_row', 1, 110, 1010, 3.4)], { glowX: 0.5, glowY: 0.5 }),
  'ej-comba': scene(900, 1200, [onFloor('jump_rope', 1, 110, 1010, 3.4)], { glowX: 0.5, glowY: 0.45 }),
  'ej-plancha': scene(900, 1200, [onFloor('plank', 0, 60, 1010, 3.8)], { glowX: 0.5, glowY: 0.6 }),
};

// Logo: «E» geométrica blanca sobre círculo azul
images.logo = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BLUE_BRIGHT}"/>
      <stop offset="1" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#g)"/>
  <circle cx="256" cy="256" r="222" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="6"/>
  <g fill="#FFFFFF">
    <rect x="166" y="146" width="56" height="220" rx="14"/>
    <rect x="166" y="146" width="190" height="52" rx="14"/>
    <rect x="166" y="230" width="150" height="52" rx="14"/>
    <rect x="166" y="314" width="190" height="52" rx="14"/>
  </g>
</svg>`;

for (const [name, svg] of Object.entries(images)) fs.writeFileSync(path.join(out, `${name}.svg`), svg);
console.log(`✔ ${Object.keys(images).length} imágenes en ${out}/`);
