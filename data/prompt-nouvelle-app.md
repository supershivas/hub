# Prompt de base — nouvelle app

Modèle lu par l'outil « Créer › Nouvelle app » du hub (js/creer.js), qui
remplace les crochets et insère les décisions déjà prises avant « Avant
d'écrire du code ». Version étoffée de `design-system/templates/PROMPT-NOUVELLE-APP.md`.

---

Nouvelle app : **[Nom de l'app]** (repo `supershivas/[repo]`).

À quoi elle sert : [une ou deux phrases : pour qui, quel usage, dans quel moment de la journée.]

Avant d'écrire du code :

1. **Récupère le design system** et lis ce qu'il faut :
   ```
   git clone --depth 1 https://github.com/supershivas/design-system /tmp/design-system
   ```
   Lis `/tmp/design-system/CONVENTIONS.md` en entier : elles s'appliquent à
   cette app, suis leur section 11 (« Nouvelle app »). Lis aussi
   `/tmp/design-system/README.md` (le tableau des apps existantes) et le
   `CLAUDE.md` des apps citées plus haut comme références ou comme modèle
   visuel (`https://raw.githubusercontent.com/supershivas/<repo>/main/CLAUDE.md`),
   pour reprendre leurs choix au lieu d'en inventer de nouveaux.

2. **Pose-moi les décisions à trancher** avec l'outil `AskUserQuestion`, en
   questions à choix multiples (2 à 4 options, jamais de question ouverte
   quand un choix suffit). Déduis les options de ma description : ne me
   propose pas une option absurde pour cette app, mets en premier celle que
   tu recommandes, suffixée « (Recommandé) », avec sa raison en une phrase
   dans la description. Si je réponds « Other », prends ma réponse telle
   quelle. Trois tours au plus, de 4 questions au plus :

   **Tour 1 — cadrage**
   - **Catégorie** : primaire (usage quotidien : tout le socle et toutes les
     fonctionnalités avancées) ou secondaire (usage ponctuel : le socle
     seulement).
   - **Cible** : mobile et bureau, uniquement mobile (cadre de téléphone sur
     ordinateur), uniquement bureau (bandeau discret sur téléphone).
   - **Stack** : vanilla JS statique (modules ES, sans build), React + Vite,
     Next.js. Recommande la plus légère qui suffit.
   - **Hébergement** : GitHub Pages (statique), Vercel (Next.js, fonctions
     serveur).

   **Tour 2 — contenu** (adapte les options à ma description)
   - **Données** : aucune, locales + export JSON (et import), Supabase
     (projet existant, tables préfixées par le nom de l'app ; jamais de
     nouveau projet sans me demander). Une app primaire passe par Supabase.
   - **Fonctionnalités de la v1.0.0** (sélection multiple) : 3 à 4
     fonctionnalités plausibles déduites de ma description, qui suffisent à
     ce que je m'en serve dès demain.
   - **Modèle visuel** : si l'app a une barre latérale ou un tableau de
     bord, laquelle des apps existantes sert de modèle (Idée, Source,
     aucune).
   - tout autre point flou de ma description (écran d'accueil, unité de
     contenu, partage…).

   **Tour 3 — périmètre** (seulement s'il reste des questions)
   - **Labo** et **Atelier** (sélection multiple) : obligatoires ou non selon
     la catégorie (sections 8 ter et 8 quater des conventions).
   - **Ce que l'app refuse** (sélection multiple) : 3 à 4 refus plausibles
     (pas de compte, pas de notifications, pas de collaboration, pas de
     tableau de bord chiffré…), pour garder la v1.0.0 petite.
   - **Critère de validation** : 2 ou 3 critères concrets (« je saisis une
     entrée en moins de 10 secondes sur téléphone », « l'export JSON se
     réimporte sans perte »).

   Résume mes choix en quelques lignes avant de commencer, puis propose-moi
   en une liste courte le **modèle de données** (entités, champs, clés) et
   les **écrans** de la v1.0.0 ; attends mon accord s'il y a une ambiguïté.

3. **Installe le socle** : copie depuis `/tmp/design-system/templates/` :
   `sync-design-system.sh` → `scripts/`, `claude-settings.json` →
   `.claude/settings.json`, `CLAUDE.app.md` → `CLAUDE.md` (remplis toutes ses
   sections avec mes réponses : description, URL de production, catégorie,
   cible, stack, stockage et préfixe des tables, exceptions aux
   conventions). Lance `sh scripts/sync-design-system.sh`.

Ensuite, construis la **v1.0.0**, et seulement elle, avec tout le socle des
conventions :

- `version.json` (`1.0.0`) et `CHANGELOG.md` ;
- en-tête : nom cliquable à gauche (vrai lien vers l'accueil, qui referme
  les modales), roue crantée à droite (`aria-label="Réglages"`, sans texte) ;
- réglages avec, en bas et dans cet ordre, la version, les 5 dernières
  versions et l'export JSON ;
- mise à jour automatique avec `app-update.js` du design system (copié une
  fois, il suit ensuite par le sync) et le toast « Mis à jour en vX.Y.Z » ;
- tokens (`design-tokens.json`) et `mobile.css`, jamais de couleur, rayon ou
  police en dur ; icônes au trait Tabler (`ti ti-*`), jamais d'emoji ;
- `favicon.svg`, `favicon.ico` (16, 32, 48) et `apple-touch-icon.png` (180),
  un motif simple lisible à 16 px ;
- zones tactiles de 44 px, champs de 16 px sur mobile, `:hover` dans
  `@media (hover: hover)`, confirmations dans une modale (jamais
  `window.confirm`) ;
- aucun secret commité.

Pour une app primaire, ajoute les fonctionnalités avancées listées dans les
conventions (Supabase et authentification, mode sombre, PWA, import,
temps réel, corbeille, parité visuelle, Labo, Atelier si le contenu se
modifie). Pour une app uniquement mobile, `phone-frame.js`.

**Vérifie avant de pousser** : ouvre l'app avec Playwright (Chromium est
déjà installé) en 375 px et en 1280 px, sans erreur dans la console ;
l'export JSON se télécharge ; le nom ramène à l'accueil depuis chaque vue.

Pousse sur `main`. Pour GitHub Pages, rappelle-moi de régler Settings →
Pages → Source sur « GitHub Actions » au premier push (ou ajoute le
workflow `pages.yml`). Donne au dépôt une description GitHub (le hub
l'ajoutera tout seul). Donne-moi l'URL de production cliquable et propose-moi
la ligne à ajouter au tableau du README de `design-system`.
