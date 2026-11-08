// Build de la web (Vercel):
//  1. Exporta la app Expo (SPA) y la renombra a app.html (sin indexar en buscadores).
//  2. Copia la landing estática (landing/) como página principal, pensada para SEO.
//  3. Copia las fotos de la landing a /img.
// Uso: node scripts/build-web.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

execSync('npx expo export -p web', { cwd: root, stdio: 'inherit' });

const appHtml = fs
  .readFileSync(path.join(dist, 'index.html'), 'utf8')
  .replace('<head>', '<head><meta name="robots" content="noindex, nofollow" />');
fs.writeFileSync(path.join(dist, 'app.html'), appHtml);
fs.rmSync(path.join(dist, 'index.html'));

fs.cpSync(path.join(root, 'landing'), dist, { recursive: true });
fs.cpSync(path.join(root, 'assets', 'landing'), path.join(dist, 'img'), { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'brand', 'logo-circle.png'), path.join(dist, 'img', 'logo.png'));

console.log('✔ Web lista en dist/ (landing en /, app en el resto de rutas)');
