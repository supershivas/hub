# Ajouter un projet (2 minutes)

Tout vit dans `data/projects.json`. Aucun code à toucher.

## Méthode rapide (script)

```bash
node scripts/new-project.mjs mon-depot --type app --title "Mon app" --tech "React" --summary "Une phrase."
```

Le script crée l'entrée (démo `https://supershivas.github.io/<dépôt>/` et repo `https://github.com/supershivas/<dépôt>` par défaut, modifiables avec `--demo` et `--repo`) et le dossier `assets/projects/<slug>/`.
Ouvre ensuite `data/projects.json` pour compléter `description`, `stack`, `tags`, captures.

## Méthode manuelle

Copie le bloc de `data/example-project.json` dans le tableau `projects` de `data/projects.json`, puis remplace les valeurs.

## Champs

| Champ | Obligatoire | Rôle |
|---|---|---|
| `slug` | oui | Identifiant unique, utilisé dans l'URL `#/p/<slug>` |
| `title` | oui | Titre |
| `type` | oui | `app`, `jeu` ou `site` (filtre) |
| `tech` | oui | Techno principale (filtre) |
| `summary` | oui | Une phrase, sur la carte |
| `stack` | non | Stack complète, sur la fiche |
| `tags` | non | Mots-clés (cherchables) |
| `description` | non | Texte de la fiche : paragraphes séparés par une ligne vide, lignes `- ` = liste |
| `thumbnail` | non | Miniature, ex. `assets/projects/<slug>/thumb.png` (16:10). Absente : initiale du titre |
| `screenshots` | non | Liste de chemins d'images |
| `links.demo` / `links.repo` / `links.article` | non | Démo en ligne, dépôt, post-mortem. `null` masque le bouton |
| `links.sources` | non | Liens libres `{ "label": "…", "url": "…" }` |
| `status` | non | `active`, `archive`, `prototype` |
| `year` | non | Année |
| `featured` | non | Réservé à un usage futur (mise en avant) |
| `visible` | non | `false` = masqué sans suppression |

Le schéma complet est dans `data/projects.schema.json`.

## Images

Dépose-les dans `assets/projects/<slug>/` et référence-les par chemin relatif.

## Vérifier et publier

```bash
node scripts/new-project.mjs --validate
```

Puis `git push` sur `main` : GitHub Actions redéploie le site. Une modification de contenu ne change pas la version ; une nouvelle fonctionnalité du site passe par `version.json` et `CHANGELOG.md`.

## Page Liens

Même principe, dans le tableau `links` du même fichier : `label`, `url`, `description`, `icon` (nom d'icône Tabler sans `ti-`), `visible`.
