#!/usr/bin/env node
// Capture la page d'accueil de la démo de chaque projet sans miniature, et renseigne `thumbnail`.
//   node scripts/screenshot.mjs            # projets sans miniature
//   node scripts/screenshot.mjs --all      # tous les projets (remplace les miniatures)
//   node scripts/screenshot.mjs slug1 slug2
// Nécessite Playwright (npm i --no-save playwright && npx playwright install chromium).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data/projects.json');
const db = JSON.parse(readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
const only = args.filter(a => !a.startsWith('--'));
const all = args.includes('--all');

const todo = db.projects.filter(p => p.links?.demo && p.type &&
  (only.length ? only.includes(p.slug) : all || !p.thumbnail));
if (!todo.length) { console.log('Rien à capturer.'); process.exit(0); }

const browser = await chromium.launch({ args: ['--no-sandbox'] });
let failed = 0;
for (const p of todo) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(p.links.demo, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500);
    mkdirSync(join(root, 'assets/projects', p.slug), { recursive: true });
    const rel = `assets/projects/${p.slug}/thumb.jpg`;
    await page.screenshot({ path: join(root, rel), type: 'jpeg', quality: 78 });
    p.thumbnail = rel;
    console.log('OK  ', p.slug);
  } catch (e) {
    failed++;
    console.warn('ECHEC', p.slug, '-', e.message.split('\n')[0]);
  } finally { await page.close(); }
}
await browser.close();
writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
