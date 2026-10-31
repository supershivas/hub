#!/usr/bin/env node
// Renseigne, pour chaque projet ayant un dépôt public : version, date de mise à jour,
// dernières modifications (CHANGELOG.md) et roadmap (ROADMAP.md), quand ces fichiers existent.
//   node scripts/enrich-projects.mjs [--dry-run]
// Lit raw.githubusercontent.com (sans jeton). Avec GITHUB_TOKEN, la date du dernier push sert de repli.
// Lancé par .github/workflows/sync-repos.yml, donc à jour toutes les 6 heures.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data/projects.json');
const db = JSON.parse(readFileSync(file, 'utf8'));
const dry = process.argv.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;

const raw = async (repo, branch, paths) => {
  for (const path of paths) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.text();
    } catch { /* fichier ou réseau indisponible : on essaie le suivant */ }
  }
  return null;
};

const api = async path => {
  if (!token) return null;
  try {
    const res = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
};

// Dernière section « ## x.y.z — date » du CHANGELOG.md
const latestChanges = md => {
  const section = md.split(/^##\s+/m)[1];
  if (!section) return [];
  return section.split('\n').slice(1).map(l => l.match(/^\s*[-*]\s+(.*\S)/)?.[1]).filter(Boolean).slice(0, 4);
};

// Éléments à venir d'un ROADMAP.md : puces non cochées
const roadmapItems = md => md.split('\n')
  .filter(l => /^\s*[-*]\s+/.test(l) && !/^\s*[-*]\s+\[[xX]\]/.test(l))
  .map(l => l.replace(/^\s*[-*]\s+(\[ \]\s*)?/, '').trim()).filter(Boolean).slice(0, 6);

const setOrDelete = (p, key, value) => {
  if (Array.isArray(value) ? value.length : value) p[key] = value; else delete p[key];
};

let changed = 0;
for (const p of db.projects) {
  const m = p.links?.repo?.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)\/?$/);
  if (!m) continue;
  const repo = m[1];
  const meta = await api(`repos/${repo}`);
  const branch = meta?.default_branch || 'main';
  const [versionTxt, changelog, roadmap] = await Promise.all([
    raw(repo, branch, ['version.json', 'public/version.json']),
    raw(repo, branch, ['CHANGELOG.md', 'public/CHANGELOG.md']),
    raw(repo, branch, ['ROADMAP.md', 'docs/ROADMAP.md']),
  ]);
  let version = null;
  try { version = versionTxt ? JSON.parse(versionTxt) : null; } catch { /* version.json illisible */ }
  const before = JSON.stringify(p);
  setOrDelete(p, 'version', version?.version);
  const updated = version?.date || meta?.pushed_at?.slice(0, 10);
  if (updated) p.updated = updated;
  setOrDelete(p, 'lastChanges', changelog ? latestChanges(changelog) : version?.changes?.slice(0, 4));
  setOrDelete(p, 'roadmap', roadmap ? roadmapItems(roadmap) : []);
  if (JSON.stringify(p) !== before) { changed++; console.log(`${p.slug} : ${p.version ? 'v' + p.version : 'sans version'}, ${p.updated || 'sans date'}`); }
}

console.log(`${changed} projet(s) mis à jour.`);
if (!dry && changed) writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
