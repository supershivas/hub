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

## Ajout automatique des nouvelles apps

Le workflow `.github/workflows/sync-repos.yml` tourne toutes les 6 heures (et à la demande : onglet Actions → « Synchroniser les projets » → Run workflow). Il ajoute à `data/projects.json` chaque dépôt public du compte absent du fichier, avec titre et résumé tirés de la démo ou de la description GitHub, puis capture la démo et redéploie le site.

- Pour que le type soit juste, donne au dépôt le topic GitHub `game` ou `jeu` (jeux) ou `site` ; sans topic, c'est une app.
- Pour ne jamais lister un dépôt : ajoute son nom à `ignoredRepos` dans `data/projects.json`. Pour le masquer : `visible: false`.
- Les entrées créées automatiquement sont à relire : complète le résumé et la description à ta guise.
- Déclenchement immédiat possible depuis un autre dépôt : `repository_dispatch` de type `nouvelle-app`.

Captures : `node scripts/screenshot.mjs` (projets sans miniature) ou `--all` (toutes), après `npm i --no-save playwright`.

## Design system

Tokens, `mobile.css` et `app-update.js` viennent de `supershivas/design-system` et sont resynchronisés par `sh scripts/sync-design-system.sh` (lancé aussi au démarrage de session Claude Code).
