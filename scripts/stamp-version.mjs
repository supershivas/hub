// Estampille les fichiers chargés par la page avec la version (?v=X.Y.Z), pour
// que le cache de GitHub Pages (10 min) ne mêle pas anciens et nouveaux modules.
// node scripts/stamp-version.mjs          → réécrit les estampilles
// node scripts/stamp-version.mjs --check  → échoue si une estampille n'est pas à jour
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('version.json', 'utf8'));
const FICHIERS = ['index.html', 'js/app.js'];
// index.html : mobile.css, css/style.css, js/app.js ; app.js : ses imports locaux
const CIBLE = /((?:href|src)="(?:mobile\.css|css\/style\.css|js\/app\.js)|from '\.\.?\/[\w./-]+\.js)(?:\?v=[\d.]+)?(["'])/g;
let ecarts = 0;
for (const f of FICHIERS) {
  const avant = readFileSync(f, 'utf8');
  const apres = avant.replace(CIBLE, `$1?v=${version}$2`);
  if (apres !== avant) {
    ecarts++;
    if (!process.argv.includes('--check')) writeFileSync(f, apres);
  }
}
if (process.argv.includes('--check')) {
  if (ecarts) { console.error(`Estampilles à refaire (v${version}) : node scripts/stamp-version.mjs`); process.exit(1); }
  console.log(`OK : estampilles en v${version}`);
} else console.log(`Estampillé en v${version}`);
