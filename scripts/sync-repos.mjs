#!/usr/bin/env node
// Ajoute à data/projects.json les dépôts publics du compte qui n'y figurent pas encore.
//   node scripts/sync-repos.mjs            # écrit le fichier
//   node scripts/sync-repos.mjs --dry-run  # affiche seulement
// Les dépôts à ne jamais lister vont dans « ignoredRepos » de projects.json ; un projet masqué
// (visible: false) reste connu et n'est donc pas ré-ajouté. Lancé par .github/workflows/sync-repos.yml.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data/projects.json');
const db = JSON.parse(readFileSync(file, 'utf8'));
const dry = process.argv.includes('--dry-run');
const owner = db.site.owner || 'supershivas';
const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };

async function repos() {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?type=owner&per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`API GitHub ${res.status}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

const TECH_TOPICS = { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', astro: 'Astro', phaser: 'Phaser', threejs: 'Three.js', wordpress: 'WordPress' };
const guessType = topics => (topics.some(t => /^(jeu|game|games|jeux)$/.test(t)) ? 'jeu' : topics.some(t => /^(site|website|blog)$/.test(t)) ? 'site' : 'app');
const guessTech = r => {
  const t = (r.topics || []).find(t => TECH_TOPICS[t]);
  if (t) return TECH_TOPICS[t];
  return !r.language || /^(JavaScript|HTML|CSS)$/.test(r.language) ? 'Vanilla JS' : r.language;
};

async function pageInfo(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return {};
    const html = (await res.text()).replace(/\s+/g, ' ');
    return {
      title: html.match(/<title>([^<]*)<\/title>/i)?.[1].trim(),
      description: html.match(/<meta name="description" content="([^"]*)"/i)?.[1].trim(),
    };
  } catch { return {}; }
}

const known = new Set([...db.projects.map(p => p.slug.toLowerCase()), ...(db.ignoredRepos || []).map(s => s.toLowerCase())]);
const added = [];
for (const r of await repos()) {
  if (r.fork || r.private || known.has(r.name.toLowerCase())) continue;
  const demo = r.homepage || (r.has_pages ? `https://${owner}.github.io/${r.name}/` : null);
  const info = demo ? await pageInfo(demo) : {};
  const summary = r.description || info.description || 'À compléter.';
  const tech = guessTech(r);
  db.projects.push({
    slug: r.name, title: info.title || r.name, type: guessType(r.topics || []), tech,
    stack: [tech], tags: r.topics || [], summary, description: summary,
    thumbnail: null, screenshots: [],
    links: { demo, repo: r.html_url, article: null, sources: [] },
    status: r.archived ? 'archive' : 'active', featured: false, visible: true,
  });
  added.push(r.name);
}

if (!added.length) { console.log('Aucun nouveau dépôt.'); process.exit(0); }
console.log(`${dry ? 'À ajouter' : 'Ajouté'} : ${added.join(', ')}`);
if (!dry) writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
