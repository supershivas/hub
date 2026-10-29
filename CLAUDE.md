@.claude/conventions.md

# Hub — portfolio

## Description

Hub central qui référence toutes les apps, jeux et sites de Supershivas, avec liens vers démos, repos et articles.
Production : https://supershivas.github.io/hub/
Catégorie : secondaire. Cible : mobile et bureau.

## Stack

Vanilla JS statique (modules ES, sans build), GitHub Pages via GitHub Actions. Aucune base : tout est dans `data/projects.json`. Routage par hash (`#/`, `#/p/<slug>`, `#/liens`).

## Structure

`data/projects.json` (données), `js/app.js` (rendu), `css/style.css`, `scripts/new-project.mjs` (ajout et validation), `docs/AJOUTER-UN-PROJET.md`, `scripts/sync-repos.mjs` + `scripts/screenshot.mjs` (ajout automatique des nouveaux dépôts, workflow `sync-repos.yml`). Un ajout de projet est un changement de contenu : pas de bump de version.

## Exceptions aux conventions

Mode sombre uniquement (défaut voulu), pas de PWA ni de Supabase (app secondaire). L'export JSON des Réglages est `projects.json`.

## Pièges connus

Les projets avec `visible: false` sont masqués mais restent dans le fichier. Le lien repo de `les-carnets-wp` (privé) est volontairement absent.
