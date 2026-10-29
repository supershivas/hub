#!/usr/bin/env node
// Ajoute un projet à data/projects.json, ou valide le fichier.
//   node scripts/new-project.mjs --validate
//   node scripts/new-project.mjs <slug-du-depot> --type app|jeu|site --title "Titre" --tech "JavaScript" [--summary "…"] [--demo URL] [--repo URL]
// Sans Node 20+ ni dépendance : tout est dans ce fichier.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data/projects.json');
const TYPES = ['app', 'jeu', 'site'];
const STATUS = ['active', 'archive', 'prototype'];

function validate(db) {
  const errors = [];
  const slugs = new Set();
  if (!Array.isArray(db.projects)) errors.push('« projects » doit être un tableau');
  (db.projects || []).forEach((p, i) => {
    const at = `projects[${i}] (${p.slug || '?'})`;
    for (const k of ['slug', 'title', 'type', 'tech', 'summary']) if (!p[k] || typeof p[k] !== 'string') errors.push(`${at} : « ${k} » manquant`);
    if (p.type && !TYPES.includes(p.type)) errors.push(`${at} : type « ${p.type} » invalide (${TYPES.join(', ')})`);
    if (p.status && !STATUS.includes(p.status)) errors.push(`${at} : status « ${p.status} » invalide`);
    if (p.slug && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(p.slug)) errors.push(`${at} : slug invalide`);
    if (slugs.has(p.slug)) errors.push(`${at} : slug en double`);
    slugs.add(p.slug);
    for (const f of [p.thumbnail, ...(p.screenshots || [])].filter(Boolean))
      if (!existsSync(join(root, f))) errors.push(`${at} : image introuvable « ${f} »`);
    for (const [k, u] of Object.entries(p.links || {}))
      if (typeof u === 'string' && !/^https?:\/\//.test(u)) errors.push(`${at} : lien « ${k} » doit commencer par http(s)://`);
  });
  return errors;
}

const args = process.argv.slice(2);
const db = JSON.parse(readFileSync(file, 'utf8'));

if (args.includes('--validate') || args.length === 0) {
  const errors = validate(db);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK : ${db.projects.length} projets, ${db.projects.filter(p => p.visible !== false).length} visibles.`);
  process.exit(0);
}

const slug = args[0];
const opt = name => { const i = args.indexOf('--' + name); return i > -1 ? args[i + 1] : undefined; };
const type = opt('type') || 'app';
const tech = opt('tech') || 'JavaScript';
const title = opt('title') || slug;
const owner = 'supershivas';
const project = {
  slug, title, type, tech,
  stack: [tech], tags: [],
  summary: opt('summary') || 'À compléter.',
  description: opt('summary') || 'À compléter.',
  thumbnail: null, screenshots: [],
  links: { demo: opt('demo') ?? `https://${owner}.github.io/${slug}/`, repo: opt('repo') ?? `https://github.com/${owner}/${slug}`, article: null, sources: [] },
  status: 'active', featured: false, visible: true,
};
if (db.projects.some(p => p.slug === slug)) { console.error(`Le slug « ${slug} » existe déjà.`); process.exit(1); }
db.projects.push(project);
const errors = validate(db);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
mkdirSync(join(root, 'assets/projects', slug), { recursive: true });
console.log(`Projet « ${slug} » ajouté. Dossier d'images : assets/projects/${slug}/\nComplète data/projects.json (résumé, description, stack, captures), puis : node scripts/new-project.mjs --validate`);
