# Hub — portfolio Supershivas

Une adresse qui référence toutes les apps, jeux et sites : grille de cartes, fiches détaillées, filtres par type et techno, recherche, page Liens. Site statique en HTML/CSS/JS, sans build, sans backend ; dark mode par défaut.

Production : https://supershivas.github.io/hub/

## Structure

| Chemin | Rôle |
|---|---|
| `data/projects.json` | Toutes les données (projets et liens) |
| `data/projects.schema.json` | Schéma des projets |
| `data/example-project.json` | Fiche d'exemple (données fictives) à copier |
| `assets/projects/<slug>/` | Miniatures et captures |
| `index.html`, `css/`, `js/app.js` | Le site |
| `design-tokens.json`, `mobile.css`, `app-update.js` | Fichiers du design system (synchronisés) |
| `version.json`, `CHANGELOG.md` | Version affichée dans les Réglages |
| `scripts/` | `new-project.mjs` (ajout et validation), `sync-design-system.sh` |
| `.github/workflows/pages.yml` | Déploiement automatique |

## Installation locale

Aucune installation : les modules ES exigent un serveur, pas `file://`.

```bash
python3 -m http.server 8000
```

Ouvre ensuite http://localhost:8000.

## Déploiement (GitHub Pages)

1. Sur GitHub : Settings → Pages → Source : **GitHub Actions** (une seule fois).
2. Chaque push sur `main` valide `projects.json` puis publie le site.

Alternatives gratuites : Netlify ou Vercel, en pointant sur la racine du dépôt, sans commande de build.

## Ajouter un projet

Voir [docs/AJOUTER-UN-PROJET.md](docs/AJOUTER-UN-PROJET.md).

```bash
node scripts/new-project.mjs mon-depot --type jeu --title "Mon jeu" --tech "Vanilla JS"
```

## Design system

Tokens, `mobile.css` et `app-update.js` viennent de `supershivas/design-system` et sont resynchronisés par `sh scripts/sync-design-system.sh` (lancé aussi au démarrage de session Claude Code).
