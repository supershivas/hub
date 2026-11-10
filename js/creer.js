// Page « Créer » : deux formulaires qui écrivent le prompt de démarrage d'un
// nouveau projet, à coller dans la première session Claude Code.
//
// - Nouveau jeu : l'outil de game-system, qui LIT ses fichiers sur GitHub
//   (templates/PROMPT-NOUVEAU-JEU.md, GENRES.md, INSPIRATION.md,
//   MES-INSPIRATIONS.md) : changer ces fichiers change l'outil.
// - Nouvelle app : même principe, à partir de templates/PROMPT-NOUVELLE-APP.md
//   de design-system, avec les apps du hub comme modèles possibles.
//
// Les brouillons sont gardés dans ce navigateur (hub-creer-jeu, hub-creer-app).

const GS_RAW = 'https://raw.githubusercontent.com/supershivas/game-system/main/';
const GS_BLOB = 'https://github.com/supershivas/game-system/blob/main/';
const DS_RAW = 'https://raw.githubusercontent.com/supershivas/design-system/main/';
const MAX_INSPI = 6;
const MAX_MODELES = 3;

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && !['list', 'form'].includes(k) && !k.includes('-')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(k => k != null && k !== false));
  return e;
};
const icon = name => el('i', { class: `ti ti-${name}`, 'aria-hidden': 'true' });
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lignes = s => (s || '').split('\n').map(x => x.trim().replace(/^[-*]\s*/, '')).filter(Boolean);

const cache = new Map();
function lire(url) {
  if (!cache.has(url)) {
    const p = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return cache.get(url);
}

// ─── Catalogues de game-system ────────────────────────────────────────────
function colonne1(ls) {
  return ls.filter(l => l.startsWith('|') && !/^\|\s*:?-/.test(l)).slice(1).map(l => l.split('|')[1].trim()).filter(Boolean);
}
function parseGenres(md) {
  const parties = md.split(/^## /m).slice(1);
  const parTitre = t => parties.find(p => p.startsWith(t)) || '';
  const ls = s => s.split('\n').map(l => l.trim());
  return {
    familles: parTitre('1.').split(/^### /m).slice(1).map(bloc => ({
      titre: bloc.split('\n')[0].replace(/^[A-Z]\.\s*/, '').trim(), genres: colonne1(ls(bloc)),
    })),
    vues: colonne1(ls(parTitre('2.'))),
    rendus: colonne1(ls(parTitre('3.'))),
    publics: colonne1(ls(parTitre('4.'))),
    sessions: colonne1(ls(parTitre('5.'))),
  };
}
// perso : MES-INSPIRATIONS.md (étages : noyau, fil, réserve) ; sinon INSPIRATION.md
function parseInspiration(md, perso = false) {
  const items = [];
  const net = t => (t || '').replace(/\*/g, '');
  let section = '', sous = '';
  for (const l of md.split('\n')) {
    if (l.startsWith('## ')) { section = l.slice(3).trim(); sous = ''; continue; }
    if (l.startsWith('### ')) { sous = l.slice(4).trim(); continue; }
    // - **Nom** (repère) [servi : Jeu] — ce qu'on en prend.
    const m = l.match(/^- \*\*(.+?)\*\*\s*(?:\(([^)]*)\))?\s*(?:\[\s*servi\s*:\s*([^\]]*)\])?\s*(?:—\s*(.*))?$/);
    if (!m || !section || section.startsWith('Comment')) continue;
    const etage = !perso ? 'general' : section.startsWith('Le noyau') ? 'noyau' : section.startsWith('La réserve') ? 'reserve' : 'fil';
    items.push({ perso, etage, section, sous, nom: m[1], repere: net(m[2]), servi: (m[3] || '').trim(), desc: net(m[4]) });
  }
  return items;
}

// ─── Les deux outils ──────────────────────────────────────────────────────
const OUTILS = {
  jeu: {
    titre: 'Nouveau jeu',
    cle: 'hub-creer-jeu',
    placeholderNom: 'Kingvi SNO 7',
    champsTexte: ['nom', 'repo', 'pitch', 'references', 'lot', 'critere', 'refus'],
    async charger() {
      const [modele, genres, inspiration, mes] = await Promise.all([
        lire(GS_RAW + 'templates/PROMPT-NOUVEAU-JEU.md'), lire(GS_RAW + 'GENRES.md'),
        lire(GS_RAW + 'INSPIRATION.md'), lire(GS_RAW + 'MES-INSPIRATIONS.md').catch(() => ''),
      ]);
      const g = parseGenres(genres);
      return {
        modele,
        inspi: [...parseInspiration(mes, true), ...parseInspiration(inspiration)],
        sections: [
          ['Le jeu', [
            { id: 'genre', titre: 'Genre', aide: 'Plusieurs = un jeu hybride ; Claude demandera laquelle porte la boucle principale.', plusieurs: true, groupes: g.familles.map(f => [f.titre, f.genres]), precision: true },
            { id: 'vue', titre: 'Vue', options: g.vues },
            { id: 'public', titre: 'Public', options: g.publics },
            { id: 'session', titre: "Forme d'une session", options: g.sessions },
          ]],
          ["L'image et le son", [
            { id: 'rendu', titre: 'Rendu', aide: 'Voir les profils techniques de game-system.', options: g.rendus, precision: true },
            { id: 'palette', titre: 'Palette', options: ['3 couleurs (fond, encre, accent)', 'Game Boy (4 tons)', 'PICO-8 (16)', 'Sweetie 16', 'Endesga 32', 'Sur mesure'], precision: true, aidePrecision: 'Ambiance ou couleurs voulues' },
            { id: 'resolution', titre: 'Résolution logique et taille du héros', texte: '320 × 180, héros de 16 px' },
            { id: 'son', titre: 'Son', options: ['Bruitages synthétisés seulement', 'Musique en fichiers + bruitages synthétisés', 'Musique générative', 'Aucun son pour la v0'] },
          ]],
          ['Jouer', [
            { id: 'cible', titre: 'Cible', options: ['Téléphone en portrait', 'Téléphone en paysage', 'Bureau', 'Téléphone et bureau'] },
            { id: 'commandes', titre: 'Commandes', plusieurs: true, options: ['Clavier', 'Toucher / gestes au doigt', 'Souris', 'Manette'] },
            { id: 'langues', titre: 'Langues', options: ['Français seulement', 'Français + anglais'] },
            { id: 'horizon', titre: 'Horizon', options: ['Navigateur seulement', 'Porte ouverte vers Steam'] },
          ]],
          ["L'atelier du développeur", [
            { id: 'labo', titre: 'Labo', options: ['Dès la v0', 'Plus tard', 'Jamais'] },
            { id: 'atelier', titre: 'Atelier', plusieurs: true, options: ['Dessins (éditeur de pixels)', 'Réglages chiffrés', 'Placement sur la carte / niveaux', 'Textes et dialogues', "Pas d'atelier pour l'instant"] },
            { id: 'outils', titre: 'Outils de vérification', plusieurs: true, options: ['Tests des règles et de la sauvegarde', "Captures et audit d'écran", 'Lisibilité (contraste, silhouettes)', "Simulateur d'équilibrage", 'Harnais de playtest'] },
            { id: 'agents', titre: "Équipe d'agents", options: ['Aucune', 'Légère (game-designer, testeur, gardien du ton)', 'Complète (designers, testeurs, joueurs fictifs, /playtest)'] },
          ]],
        ],
      };
    },
  },
  app: {
    titre: 'Nouvelle app',
    cle: 'hub-creer-app',
    placeholderNom: 'Carnet de courses',
    champsTexte: ['nom', 'repo', 'pitch', 'references', 'lot', 'ecrans', 'critere', 'refus'],
    async charger() {
      const modele = await lire(DS_RAW + 'templates/PROMPT-NOUVELLE-APP.md');
      return {
        modele,
        sections: [
          ['Cadrage', [
            { id: 'categorie', titre: 'Catégorie', aide: 'Primaire : usage quotidien, tout le socle et toutes les fonctionnalités avancées. Secondaire : usage ponctuel, le socle seulement.', options: ['Primaire', 'Secondaire'] },
            { id: 'cible', titre: 'Cible', options: ['Mobile et bureau', 'Uniquement mobile (cadre de téléphone sur ordinateur)', 'Uniquement bureau (bandeau sur téléphone)'] },
            { id: 'stack', titre: 'Stack', options: ['Vanilla JS statique (sans build)', 'React + Vite', 'Next.js'] },
            { id: 'hebergement', titre: 'Hébergement', options: ['GitHub Pages', 'Vercel'] },
          ]],
          ['Contenu', [
            { id: 'donnees', titre: 'Données', options: ['Aucune', 'Locales + export et import JSON', 'Supabase (projet existant, tables préfixées)'], precision: true, aidePrecision: 'Ce que l’app stocke (entrées, listes, fichiers…)' },
            { id: 'modele', titre: 'Modèle visuel', aide: 'Si l’app a une barre latérale ou un tableau de bord.', options: ['Idée', 'Source', 'Aucun'] },
            { id: 'extras', titre: 'Options avancées', aide: 'Facultatives pour une app secondaire ; une app primaire les a toutes.', plusieurs: true, options: ['Mode sombre', 'PWA installable', 'Import JSON', 'Labo', 'Atelier', 'Corbeille / annulation'] },
          ]],
        ],
      };
    },
  },
};

// ─── État d'un formulaire (gardé dans ce navigateur) ──────────────────────
const vide = () => ({ nom: '', repo: '', pitch: '', references: '', choix: [], decisions: {}, precisions: {}, lot: '', ecrans: '', critere: '', refus: '' });
function charger(cle) {
  try { return { ...vide(), ...JSON.parse(localStorage.getItem(cle) || '{}') }; } catch { return vide(); }
}

/** Affiche la page Créer dans `view`. `sorte` : 'jeu' ou 'app'. */
export function renderCreate(view, sorte, { projects = [], toast = () => {} } = {}) {
  sorte = sorte === 'app' ? 'app' : 'jeu';
  const outil = OUTILS[sorte];
  let etat = charger(outil.cle);
  let donnees = null;               // { modele, sections, inspi? }
  const garder = () => { try { localStorage.setItem(outil.cle, JSON.stringify(etat)); } catch { /* stockage indisponible */ } };
  document.title = `Créer — ${outil.titre}`;

  // Les « choix » : inspirations (jeu) ou apps modèles (app)
  const apps = projects.filter(p => p.visible !== false && p.type === 'app')
    .map(p => ({ nom: p.title, repere: (p.links?.repo || '').replace(/^https:\/\/github\.com\//, ''), desc: p.summary || '', tier: p.tier }));
  const maxChoix = sorte === 'jeu' ? MAX_INSPI : MAX_MODELES;
  const catalogue = () => (sorte === 'jeu' ? donnees?.inspi || [] : apps);

  // ── Champs ──
  const champ = (nom, label, opts = {}) => {
    const props = { name: nom, placeholder: opts.placeholder || '', value: etat[nom] || '', required: !!opts.requis,
      oninput: e => { etat[nom] = e.target.value; maj(); } };
    const input = opts.rows ? el('textarea', { ...props, rows: opts.rows }) : el('input', props);
    return el('label', { class: 'cr-champ' },
      el('span', {}, label, opts.requis ? el('span', { class: 'cr-requis' }, 'obligatoire') : null),
      opts.prefixe ? el('span', { class: 'cr-prefixe' }, el('span', {}, opts.prefixe), input) : input,
      opts.aide ? el('small', {}, opts.aide) : null);
  };
  const bloc = (titre, ...kids) => el('section', { class: 'cr-bloc' }, el('h2', {}, titre), ...kids);

  const etiquettes = el('div', { class: 'cr-etiquettes' });
  const zoneDecisions = el('div', {}, el('p', { class: 'hint' }, 'Chargement des catalogues…'));
  const sortie = el('textarea', { class: 'cr-prompt', readOnly: true, rows: 18, 'aria-label': 'Prompt généré' });
  const compte = el('span', { class: 'hint' });
  const manque = el('p', { class: 'cr-manque' });

  const ouvrirChoix = (tirage = false) => modaleChoix.ouvrir(tirage);
  const blocProjet = sorte === 'jeu'
    ? bloc('Le jeu',
      champ('nom', 'Nom du jeu', { requis: true, placeholder: outil.placeholderNom }),
      champ('repo', 'Repo GitHub', { prefixe: 'supershivas/', placeholder: 'nom-du-jeu', aide: 'Déduit du nom si vide.' }),
      champ('pitch', 'Le pitch', { requis: true, rows: 4, placeholder: "Ce qu'on fait, ce qu'on ressent, pour qui. Deux ou trois phrases." }),
      champ('references', 'Références et inspirations', { rows: 2, placeholder: '« un Zelda contemplatif », une couleur, un souvenir…' }),
      el('div', { class: 'cr-champ' }, el('span', {}, 'Inspirations choisies'), etiquettes,
        el('div', { class: 'cr-actions' },
          el('button', { type: 'button', class: 'btn', onclick: () => ouvrirChoix() }, icon('bulb'), "Piocher dans l'inspiration"),
          el('button', { type: 'button', class: 'btn', onclick: () => ouvrirChoix(true) }, icon('dice-5'), 'Tirer au sort'))))
    : bloc("L'app",
      champ('nom', "Nom de l'app", { requis: true, placeholder: outil.placeholderNom }),
      champ('repo', 'Repo GitHub', { prefixe: 'supershivas/', placeholder: 'nom-de-l-app', aide: 'Déduit du nom si vide.' }),
      champ('pitch', 'À quoi elle sert', { requis: true, rows: 4, placeholder: 'Pour qui, quel usage, à quel moment. Une ou deux phrases.' }),
      champ('references', 'Références', { rows: 2, placeholder: 'Une app du commerce, un geste, un écran que tu aimes…' }),
      el('div', { class: 'cr-champ' }, el('span', {}, 'Apps du hub à prendre pour modèle'), etiquettes,
        el('div', { class: 'cr-actions' },
          el('button', { type: 'button', class: 'btn', onclick: () => ouvrirChoix() }, icon('apps'), 'Choisir parmi mes apps'))));

  const blocLot = sorte === 'jeu'
    ? bloc('Le lot minimal',
      champ('lot', 'Ce qui doit exister en premier', { rows: 3, placeholder: 'Une brique par ligne. Vide : Claude Code propose.' }),
      champ('critere', 'Critère de validation', { placeholder: '« une partie dure 5 à 8 minutes », « 200 objets à 60 images/s »…' }),
      champ('refus', 'Ce que le jeu refuse', { rows: 3, placeholder: 'Une ligne par refus : pas de tutoriel bavard, aucune urgence…' }))
    : bloc('La v1.0.0',
      champ('lot', 'Fonctionnalités', { rows: 3, placeholder: 'Une par ligne. Vide : Claude Code en propose 3 ou 4.' }),
      champ('ecrans', 'Écrans', { rows: 2, placeholder: 'Un par ligne : accueil (liste), fiche, réglages…' }),
      champ('critere', 'Critère de validation', { placeholder: '« je saisis une entrée en moins de 10 secondes sur téléphone »…' }),
      champ('refus', "Ce que l'app refuse", { rows: 3, placeholder: 'Une ligne par refus : pas de compte, pas de notifications…' }));

  // Effacer : deux touchers, jamais window.confirm
  const effacer = el('button', { type: 'button', class: 'btn', onclick: () => {
    if (!effacer.dataset.arme) {
      effacer.dataset.arme = '1';
      effacer.lastChild.textContent = 'Confirmer l’effacement';
      setTimeout(() => { delete effacer.dataset.arme; effacer.lastChild.textContent = 'Tout effacer'; }, 3000);
      return;
    }
    etat = vide(); garder(); renderCreate(view, sorte, { projects, toast });
  } }, icon('eraser'), el('span', {}, 'Tout effacer'));

  const form = el('form', { class: 'cr-form', autocomplete: 'off', onsubmit: e => e.preventDefault() },
    blocProjet,
    el('p', { class: 'hint' }, 'Chaque décision est facultative : laissée sur « À me demander », Claude Code la pose en question à choix multiples au début de la session.'),
    zoneDecisions, blocLot, el('div', { class: 'cr-actions' }, effacer));

  const aside = el('aside', { class: 'cr-sortie', 'aria-label': 'Le prompt' },
    el('div', { class: 'cr-sortie-tete' }, el('h2', {}, 'Le prompt'), compte),
    manque, sortie,
    el('div', { class: 'cr-actions' },
      el('button', { type: 'button', class: 'btn primary', onclick: copier }, icon('copy'), 'Copier'),
      el('button', { type: 'button', class: 'btn', onclick: telecharger }, icon('download'), 'Télécharger .md')),
    el('p', { class: 'hint' }, `À coller au début de la première session Claude Code, dans le repo du nouveau ${sorte === 'jeu' ? 'jeu' : 'projet'} (créé vide sur GitHub). Le formulaire est gardé dans ce navigateur.`),
    sorte === 'jeu' ? el('p', { class: 'hint' }, 'Sources : ', el('a', { href: 'https://supershivas.github.io/game-system/', target: '_blank', rel: 'noopener' }, 'game-system'), ' (prompt, genres et inspirations, lus en direct).') : null);

  const modaleChoix = creerModale();

  view.replaceChildren(
    el('div', { class: 'hero' }, el('h1', {}, 'Créer'), el('p', {}, 'Écrire le prompt de démarrage d’un nouveau projet, à coller dans Claude Code.')),
    el('div', { class: 'chips cr-sortes', role: 'group', 'aria-label': 'Sorte de projet' },
      ...Object.entries(OUTILS).map(([k, o]) => el('a', { class: 'chip', href: `#/creer/${k}`, 'aria-pressed': String(k === sorte) }, icon(k === 'jeu' ? 'device-gamepad-2' : 'app-window'), o.titre))),
    el('div', { class: 'cr-colonnes' }, form, aside),
    modaleChoix.dialog);

  // ── Décisions ──
  function construireDecisions() {
    zoneDecisions.replaceChildren(...donnees.sections.map(([titre, liste]) => bloc(titre, ...liste.map(decision))));
  }
  function decision(d) {
    const div = el('div', { class: 'cr-decision' }, el('span', { class: 'cr-titre' }, d.titre));
    if (d.aide) div.append(el('small', {}, d.aide));
    if (d.texte) {
      div.append(el('input', { value: etat.decisions[d.id] || '', placeholder: `${d.texte} — vide : à me demander`, 'aria-label': d.titre,
        oninput: e => { etat.decisions[d.id] = e.target.value; maj(); } }));
    } else if (d.plusieurs) {
      const choix = el('div', { class: 'cr-choix' });
      const valeurs = new Set(etat.decisions[d.id] || []);
      for (const [famille, options] of d.groupes || [[null, d.options]]) {
        if (famille) choix.append(el('span', { class: 'cr-famille' }, famille));
        for (const o of options) {
          choix.append(el('label', {}, el('input', { type: 'checkbox', checked: valeurs.has(o), onchange: e => {
            const s = new Set(etat.decisions[d.id] || []);
            e.target.checked ? s.add(o) : s.delete(o);
            etat.decisions[d.id] = [...s]; maj();
          } }), o));
        }
      }
      div.append(choix, el('small', {}, 'Rien de coché : à me demander.'));
    } else {
      const choix = el('div', { class: 'cr-choix', role: 'radiogroup', 'aria-label': d.titre });
      const nom = `d-${d.id}`;
      const courant = etat.decisions[d.id] || '';
      choix.append(el('label', { class: 'cr-demander' }, el('input', { type: 'radio', name: nom, checked: !courant, onchange: () => { etat.decisions[d.id] = ''; maj(); } }), 'À me demander'));
      for (const o of d.options) choix.append(el('label', {}, el('input', { type: 'radio', name: nom, checked: courant === o, onchange: () => { etat.decisions[d.id] = o; maj(); } }), o));
      div.append(choix);
    }
    if (d.precision) {
      div.append(el('input', { class: 'cr-autre', value: etat.precisions[d.id] || '', placeholder: d.aidePrecision || 'Précision (facultatif)', 'aria-label': `${d.titre} : précision`,
        oninput: e => { etat.precisions[d.id] = e.target.value; maj(); } }));
    }
    return div;
  }

  // ── Choix (inspirations ou apps modèles) ──
  function etiquettesChoisies() {
    etiquettes.replaceChildren(
      ...etat.choix.map(n => el('button', { type: 'button', class: 'chip cr-etiquette', 'aria-label': `Retirer ${n}`, onclick: () => basculer(n) }, n, icon('x'))),
      el('small', { class: 'hint' }, etat.choix.length ? `${etat.choix.length} / ${maxChoix}` : `Aucune pour l'instant (${maxChoix} au plus).`));
  }
  function basculer(nom) {
    const s = new Set(etat.choix);
    if (!s.has(nom) && s.size >= maxChoix) { toast(`${maxChoix} au plus : retires-en une d'abord`); return; }
    s.has(nom) ? s.delete(nom) : s.add(nom);
    etat.choix = [...s];
    maj();
    modaleChoix.rendre();
  }

  // ── La modale de choix, au premier plan ──
  function creerModale() {
    const filtre = el('input', { type: 'search', placeholder: sorte === 'jeu' ? 'Filtrer : neige, Japon, silhouette…' : 'Filtrer mes apps', 'aria-label': 'Filtrer', oninput: () => rendre() });
    const tirageZone = el('div', { class: 'cr-tirage', hidden: true });
    const liste = el('div', { class: 'cr-inspi' });
    const nb = el('span', { class: 'hint' });
    const fermer = () => dialog.close();
    const ouverts = new Set();
    const dialog = el('dialog', { class: 'cr-modale', 'aria-label': sorte === 'jeu' ? 'Inspiration' : 'Apps modèles',
      onclick: e => { if (e.target === dialog) fermer(); } },
      el('div', { class: 'cr-modale-boite' },
        el('div', { class: 'modal-head' },
          el('h2', {}, sorte === 'jeu' ? 'Inspiration' : 'Apps modèles'), nb,
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fermer', onclick: fermer }, icon('x'))),
        el('div', { class: 'cr-modale-outils' },
          el('label', { class: 'search' }, icon('search'), filtre),
          sorte === 'jeu' ? el('button', { type: 'button', class: 'btn', onclick: tirer }, icon('dice-5'), 'Tirer au sort') : null),
        el('div', { class: 'cr-modale-corps' },
          tirageZone,
          el('p', { class: 'hint' }, sorte === 'jeu'
            ? ['Toucher une entrée l’ajoute au prompt (6 au plus) ; la toucher à nouveau l’en retire. Sources : ',
              el('a', { href: GS_BLOB + 'MES-INSPIRATIONS.md', target: '_blank', rel: 'noopener' }, 'MES-INSPIRATIONS.md'),
              ' (le noyau, puis les fils repliés ; la réserve n’apparaît qu’au filtre) et ',
              el('a', { href: GS_BLOB + 'INSPIRATION.md', target: '_blank', rel: 'noopener' }, 'INSPIRATION.md'), ' (culture générale).']
            : 'Toucher une app l’ajoute au prompt (3 au plus) : Claude Code lira son CLAUDE.md pour reprendre ses choix.'),
          liste),
        el('div', { class: 'cr-modale-pied' }, el('button', { type: 'button', class: 'btn primary', onclick: fermer }, icon('check'), 'Terminé'))));

    function carte(it, choisis) {
      const on = choisis.has(it.nom);
      return el('button', { type: 'button', class: `cr-item${on ? ' on' : ''}`, 'aria-pressed': String(on), onclick: () => basculer(it.nom) },
        el('b', {}, it.nom, it.repere ? el('span', { class: 'cr-repere' }, ` (${it.repere})`) : null),
        it.servi ? el('span', { class: 'cr-servi' }, `servi : ${it.servi}`) : null,
        it.tier ? el('span', { class: 'cr-servi' }, it.tier[0].toUpperCase() + it.tier.slice(1)) : null,
        el('span', { class: 'cr-desc' }, it.desc));
    }
    function rendre() {
      if (!dialog.open) return;
      const items = catalogue();
      nb.textContent = `${etat.choix.length} / ${maxChoix}`;
      if (!items.length) { liste.replaceChildren(el('p', { class: 'hint' }, sorte === 'jeu' ? 'Chargement…' : 'Aucune app dans le hub.')); return; }
      const f = norm(filtre.value.trim());
      const choisis = new Set(etat.choix);
      const correspond = it => !f || norm(`${it.nom} ${it.repere} ${it.desc} ${it.section || ''} ${it.sous || ''}`).includes(f);
      const grille = its => el('div', { class: 'cr-grille' }, its.map(it => carte(it, choisis)));
      if (sorte === 'app') {
        const its = items.filter(correspond);
        liste.replaceChildren(its.length ? grille(its) : el('p', { class: 'hint' }, 'Rien ne correspond.'));
        return;
      }
      const repli = (cle, titre, its, contenu) => {
        const d = el('details', { class: 'cr-repli', open: !!f || ouverts.has(cle) },
          el('summary', {}, titre, el('span', { class: 'tag' }, String(its.length))), contenu);
        d.addEventListener('toggle', () => { if (!f) d.open ? ouverts.add(cle) : ouverts.delete(cle); });
        return d;
      };
      const grouper = (its, cle) => {
        const m = new Map();
        for (const it of its) { if (!m.has(it[cle])) m.set(it[cle], []); m.get(it[cle]).push(it); }
        return m;
      };
      const blocs = [];
      const perso = items.filter(it => it.perso && correspond(it));
      const noyau = perso.filter(it => it.etage === 'noyau');
      const fils = grouper(perso.filter(it => it.etage === 'fil'), 'sous');
      const reserve = perso.filter(it => it.etage === 'reserve');
      if (noyau.length || fils.size || (f && reserve.length)) {
        blocs.push(el('section', { class: 'cr-section' }, el('h3', {}, 'Mes inspirations'),
          noyau.length ? el('div', {}, el('h4', {}, 'Le noyau'), grille(noyau)) : null,
          ...[...fils].map(([fil, its]) => repli(`fil:${fil}`, fil, its, grille(its))),
          f && reserve.length ? repli('reserve', 'La réserve', reserve, grille(reserve)) : null));
      }
      const general = grouper(items.filter(it => !it.perso && correspond(it)), 'section');
      if (general.size) {
        blocs.push(el('section', { class: 'cr-section' }, el('h3', {}, 'Culture générale'),
          ...[...general].map(([section, its]) => repli(`gen:${section}`, section, its,
            [...grouper(its, 'sous')].map(([sous, s]) => el('div', {}, sous ? el('h4', {}, sous) : null, grille(s)))))));
      }
      liste.replaceChildren(...(blocs.length ? blocs : [el('p', { class: 'hint' }, 'Rien ne correspond.')]));
    }
    // Un tirage : de moi, une période, une œuvre, un jeu
    function tirer() {
      const items = catalogue();
      if (!items.length) return;
      const auHasard = l => l[Math.floor(Math.random() * l.length)];
      const pioche = prefixe => auHasard(items.filter(i => !i.perso && i.section.startsWith(prefixe)));
      const tirage = [
        ['De moi', auHasard(items.filter(i => i.perso && i.etage !== 'reserve'))],
        ['Période ou lieu', pioche('Périodes')], ["L'image", pioche('Œuvres')], ['La mécanique', pioche('Jeux')],
      ].filter(([, i]) => i);
      tirageZone.hidden = false;
      tirageZone.replaceChildren(
        el('ol', {}, tirage.map(([role, it]) => el('li', {}, el('strong', {}, `${role} : `), `${it.nom}${it.repere ? ` (${it.repere})` : ''} — ${it.desc}`))),
        el('div', { class: 'cr-actions' },
          el('button', { type: 'button', class: 'btn primary', onclick: () => {
            const s = new Set(etat.choix);
            let refusees = 0;
            tirage.forEach(([, it]) => { if (s.has(it.nom)) return; if (s.size < maxChoix) s.add(it.nom); else refusees++; });
            etat.choix = [...s]; maj(); rendre();
            toast(refusees ? `Ajoutées, sauf ${refusees} : ${maxChoix} au plus` : 'Ajoutées au prompt');
          } }, icon('plus'), 'Ajouter au prompt'),
          el('button', { type: 'button', class: 'btn', onclick: tirer }, icon('refresh'), 'Relancer')));
    }
    return {
      dialog, rendre,
      ouvrir(tirage) {
        // le toast doit passer devant la modale (couche supérieure) : on l'y range le temps qu'elle est ouverte
        const t = document.getElementById('toast');
        if (t) { dialog.append(t); dialog.addEventListener('close', () => document.body.append(t), { once: true }); }
        dialog.showModal();
        rendre();
        if (tirage) tirer(); else tirageZone.hidden = true;
      },
    };
  }

  // ── Le prompt ──
  function generer() {
    const nom = etat.nom.trim() || (sorte === 'jeu' ? '[Nom du jeu]' : "[Nom de l'app]");
    const repo = etat.repo.trim() || slug(etat.nom) || '[repo]';
    const pitch = etat.pitch.trim();
    let p = donnees.modele.split(/\n---\n/).slice(1).join('\n---\n').trim();
    p = p.replaceAll(sorte === 'jeu' ? '[Nom du jeu]' : "[Nom de l'app]", nom).replaceAll('supershivas/[repo]', `supershivas/${repo}`);
    if (pitch) p = p.replace(sorte === 'jeu' ? /Le pitch : \[[\s\S]*?\]\n/ : /À quoi elle sert : \[[\s\S]*?\]\n/, `${sorte === 'jeu' ? 'Le pitch' : 'À quoi elle sert'} : ${pitch}\n`);

    const ajouts = [];
    if (etat.references.trim()) ajouts.push(`Références : ${etat.references.trim()}`);
    if (etat.choix.length) {
      const details = etat.choix.map(n => {
        const it = catalogue().find(x => x.nom === n);
        if (!it) return `- **${n}**`;
        if (sorte === 'app') return `- **${n}**${it.repere ? ` (\`${it.repere}\`)` : ''} — ${it.desc}`;
        return `- **${n}**${it.repere ? ` (${it.repere})` : ''} — ${it.desc}${it.servi ? ` (déjà servi : ${it.servi})` : ''}${it.perso ? ' *(à moi)*' : ''}`;
      });
      ajouts.push(sorte === 'jeu'
        ? `Inspirations (game-system : \`MES-INSPIRATIONS.md\` pour celles marquées « à moi », \`INSPIRATION.md\` pour les autres ; on prend l'air, on invente les noms) :\n${details.join('\n')}`
        : `Apps existantes à prendre pour modèle (lis leur \`CLAUDE.md\` et reprends leurs choix d'organisation, de composants et de données quand ils conviennent) :\n${details.join('\n')}`);
    }
    const decisions = [];
    for (const [, liste] of donnees.sections) {
      for (const d of liste) {
        const v = etat.decisions[d.id];
        const pr = (etat.precisions[d.id] || '').trim();
        const val = Array.isArray(v) ? v.join(', ') : (v || '').trim();
        if (val || pr) decisions.push(`- **${d.titre}** : ${[val, pr].filter(Boolean).join(' — ')}`);
      }
    }
    const liste = (titre, texte) => { const l = lignes(texte); if (l.length) decisions.push(`- **${titre}** :\n${l.map(x => `  - ${x}`).join('\n')}`); };
    liste(sorte === 'jeu' ? 'Lot minimal' : 'Fonctionnalités de la v1.0.0', etat.lot);
    if (sorte === 'app') liste('Écrans', etat.ecrans);
    if (etat.critere.trim()) decisions.push(`- **Critère de validation** : ${etat.critere.trim()}`);
    liste(sorte === 'jeu' ? 'Ce que le jeu refuse' : "Ce que l'app refuse", etat.refus);
    if (decisions.length) {
      ajouts.push(`**Décisions déjà prises** — ne me les repose pas. Au point 2, pose seulement les questions qui restent (saute un tour qui n'en a plus), et reprends ces décisions telles quelles dans le résumé :\n${decisions.join('\n')}`);
    }
    if (ajouts.length) p = p.replace("\nAvant d'écrire du code :", `\n${ajouts.join('\n\n')}\n\nAvant d'écrire du code :`);
    return p;
  }

  function maj() {
    garder();
    const repoInput = form.querySelector('[name="repo"]');
    repoInput.placeholder = slug(etat.nom) || (sorte === 'jeu' ? 'nom-du-jeu' : 'nom-de-l-app');
    etiquettesChoisies();
    if (!donnees) return;
    const texte = generer();
    sortie.value = texte;
    const m = [!etat.nom.trim() && 'le nom', !etat.pitch.trim() && (sorte === 'jeu' ? 'le pitch' : "l'usage")].filter(Boolean);
    manque.textContent = m.length ? `Il manque ${m.join(' et ')}.` : '';
    const toutes = donnees.sections.flatMap(([, l]) => l);
    const prises = toutes.filter(d => { const v = etat.decisions[d.id]; return Array.isArray(v) ? v.length : (v || '').trim(); }).length;
    compte.textContent = `${prises} / ${toutes.length} décisions · ${texte.length.toLocaleString('fr')} caractères`;
  }

  async function copier() {
    try { await navigator.clipboard.writeText(sortie.value); }
    catch { sortie.select(); document.execCommand('copy'); }
    toast(etat.nom.trim() && etat.pitch.trim() ? 'Prompt copié' : 'Copié — il manque encore le nom ou ' + (sorte === 'jeu' ? 'le pitch' : "l'usage"));
  }
  function telecharger() {
    const a = el('a', { href: URL.createObjectURL(new Blob([sortie.value], { type: 'text/markdown' })),
      download: `prompt-${etat.repo.trim() || slug(etat.nom) || (sorte === 'jeu' ? 'nouveau-jeu' : 'nouvelle-app')}.md` });
    document.body.append(a); a.click(); a.remove();
  }

  maj();
  outil.charger().then(d => {
    donnees = d;
    construireDecisions();
    maj();
    modaleChoix.rendre();
  }).catch(e => {
    zoneDecisions.replaceChildren(el('p', { class: 'cr-manque' }, `Impossible de lire les fichiers ${sorte === 'jeu' ? 'de game-system' : 'de design-system'} (${e.message}).`));
  });
}
