@.claude/conventions.md

# Hub — portfolio

## Description

Hub central qui référence toutes les apps, jeux et sites de Supershivas, avec liens vers démos, repos et articles.
Production : https://supershivas.github.io/hub/
Catégorie : secondaire. Cible : mobile et bureau.

## Stack

Vanilla JS statique (modules ES, sans build), GitHub Pages via GitHub Actions. Aucune base : tout est dans `data/projects.json`. Routage par hash (`#/`, `#/p/<slug>`, `#/liens`).

## Structure

`data/projects.json` (données), `js/app.js` (rendu), `css/style.css`, `scripts/new-project.mjs` (ajout et validation), `docs/AJOUTER-UN-PROJET.md`, `scripts/sync-repos.mjs` + `scripts/enrich-projects.mjs` (version, date, modifications, roadmap) + `scripts/screenshot.mjs` (ajout automatique des nouveaux dépôts, workflow `sync-repos.yml`). Un ajout de projet est un changement de contenu : pas de bump de version.

## Exceptions aux conventions

Mode sombre uniquement (défaut voulu), pas de PWA ni de Supabase (app secondaire). L'export JSON des Réglages est `projects.json`.

## Pièges connus

Les étoiles se modifient sur la fiche (clic) : enregistrées dans `localStorage` (`hub-stars`), publiées par un commit sur `main` via l'API GitHub avec un jeton fin gardé dans le navigateur (`hub-gh-token`, jamais exporté).

Les champs `tier` (primaire/secondaire) et `stars` (1 à 5) se règlent à la main et pilotent le tri par étoiles ; `version`, `updated`, `lastChanges`, `roadmap` sont écrits par `enrich-projects.mjs` (ne pas les éditer). `description` ne doit pas répéter `summary`.

Les projets avec `visible: false` sont masqués mais restent dans le fichier. Le lien repo de `les-carnets-wp` (privé) est volontairement absent.
