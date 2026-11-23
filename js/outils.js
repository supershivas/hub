// Page « Mini-outils » : petits calculateurs du quotidien, un par onglet.
// Ajouter un outil = ajouter une entrée à OUTILS (slug, titre, icône, rendu).
//
// Les valeurs saisies restent dans ce navigateur : hub-outil-<slug> pour chaque
// outil, hub-outil-salaires pour les salaires de J et B, communs aux outils.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lire = cle => { try { return JSON.parse(localStorage.getItem(cle)) || {}; } catch { return {}; } };
const garder = (cle, val) => { try { localStorage.setItem(cle, JSON.stringify(val)); } catch { /* stockage indisponible */ } };

// « 2 450,50 », « 2450.5 », « 2 450 € » → 2450.5 ; vide ou illisible → NaN
const nombre = s => {
  const t = String(s ?? '').replace(/[\s  €]/g, '').replace(',', '.');
  return t === '' || !/^\d*\.?\d*$/.test(t) ? NaN : Number(t);
};
const euros = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const pourcent = n => n.toLocaleString('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

const SALAIRES = 'hub-outil-salaires';
// Avant la v1.6.0, les salaires étaient gardés avec la répartition.
const lireSalaires = () => {
  const s = lire(SALAIRES);
  if (s.salaireJ != null || s.salaireB != null) return s;
  const { salaireJ, salaireB } = lire('hub-outil-repartition');
  return { salaireJ, salaireB };
};

const champ = (etat, nom, label) => `
  <label class="mo-champ">
    <span>${label}</span>
    <span class="mo-montant"><input name="${nom}" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(etat[nom] || '')}"><span>€</span></span>
  </label>`;
const ligne = (nom, detail, somme) => `
  <div class="mo-part">
    <span class="mo-nom">${nom}</span>
    <span class="mo-pct">${detail}</span>
    <strong>${somme == null ? '—' : euros(somme)}</strong>
  </div>`;

// Formulaire commun : le bloc des salaires, puis le bloc propre à l'outil.
// calculer(valeurs, partJ) renvoie le HTML du résultat ; partJ est null sans salaires.
function outilSalaires(zone, cle, { titre, champs, calculer }) {
  const salaires = lireSalaires();
  const etat = lire(cle);
  zone.innerHTML = `
    <form class="mo-form" autocomplete="off">
      <section class="mo-bloc">
        <h2>Salaires</h2>
        <div class="mo-duo">${champ(salaires, 'salaireJ', 'Salaire J')}${champ(salaires, 'salaireB', 'Salaire B')}</div>
        <p class="hint">Communs aux mini-outils, gardés dans ce navigateur.</p>
      </section>
      <section class="mo-bloc">
        <h2>${titre}</h2>
        ${champs.length > 1 ? `<div class="mo-duo">${champs.map(([n, l]) => champ(etat, n, l)).join('')}</div>` : champs.map(([n, l]) => champ(etat, n, l)).join('')}
        <div class="mo-resultat" aria-live="polite"></div>
      </section>
    </form>`;
  const form = zone.querySelector('form');
  const resultat = zone.querySelector('.mo-resultat');
  form.addEventListener('submit', e => e.preventDefault());
  const maj = () => {
    const j = nombre(form.salaireJ.value), b = nombre(form.salaireB.value);
    const partJ = j >= 0 && b >= 0 && j + b > 0 ? j / (j + b) : null;
    const valeurs = Object.fromEntries(champs.map(([n]) => [n, nombre(form[n].value)]));
    resultat.innerHTML = partJ == null
      ? '<p class="hint">Entrez les deux salaires pour faire le calcul.</p>'
      : calculer(valeurs, partJ);
  };
  form.addEventListener('input', e => {
    const n = e.target.name;
    if (n === 'salaireJ' || n === 'salaireB') { salaires[n] = e.target.value; garder(SALAIRES, salaires); }
    else if (n) { etat[n] = e.target.value; garder(cle, etat); }
    maj();
  });
  maj();
}

// Montant en centimes partagé selon partJ : arrondi sur J, B prend le reste
// (la somme tombe juste).
const partager = (centimes, partJ) => { const cJ = Math.round(centimes * partJ); return [cJ, centimes - cJ]; };

/* ── Répartition proportionnelle aux salaires ── */
function repartition(zone, cle) {
  outilSalaires(zone, cle, {
    titre: 'Montant à répartir',
    champs: [['montant', 'Montant']],
    calculer: ({ montant }, partJ) => {
      if (!(montant >= 0)) {
        return ligne('J', pourcent(partJ), null) + ligne('B', pourcent(1 - partJ), null)
          + '<p class="hint">Entrez un montant pour voir la part de chacun.</p>';
      }
      const [cJ, cB] = partager(Math.round(montant * 100), partJ);
      return ligne('J', pourcent(partJ), cJ / 100) + ligne('B', pourcent(1 - partJ), cB / 100);
    },
  });
}

/* ── Équilibre : qui doit combien à qui, après des dépenses communes ── */
function equilibre(zone, cle) {
  outilSalaires(zone, cle, {
    titre: 'Dépenses communes payées',
    champs: [['payeJ', 'Payé par J'], ['payeB', 'Payé par B']],
    calculer: ({ payeJ, payeB }, partJ) => {
      const pJ = Math.round((payeJ >= 0 ? payeJ : 0) * 100), pB = Math.round((payeB >= 0 ? payeB : 0) * 100);
      if (!(payeJ >= 0 || payeB >= 0)) return '<p class="hint">Entrez ce que chacun a payé pour les dépenses communes.</p>';
      const total = pJ + pB;
      const [dJ, dB] = partager(total, partJ);
      const ecart = pJ - dJ; // > 0 : J a payé plus que sa part, B lui doit l'écart
      const verdict = ecart === 0
        ? '<p class="mo-verdict"><i class="ti ti-circle-check" aria-hidden="true"></i> Vous êtes quittes.</p>'
        : `<p class="mo-verdict"><i class="ti ti-arrow-right" aria-hidden="true"></i> <span><b>${ecart > 0 ? 'B' : 'J'}</b> doit <strong>${euros(Math.abs(ecart) / 100)}</strong> à <b>${ecart > 0 ? 'J' : 'B'}</b></span></p>`;
      return `<p class="hint">Total : ${euros(total / 100)}. Part de chacun selon les salaires :</p>`
        + ligne('J', `${pourcent(partJ)} · payé ${euros(pJ / 100)}`, dJ / 100)
        + ligne('B', `${pourcent(1 - partJ)} · payé ${euros(pB / 100)}`, dB / 100)
        + verdict;
    },
  });
}

const OUTILS = [
  { slug: 'repartition', titre: 'Répartition', icone: 'scale', description: 'Partager une dépense en proportion des salaires de J et B.', rendu: repartition },
  { slug: 'equilibre', titre: 'Équilibre', icone: 'arrows-exchange', description: 'Après des dépenses communes, savoir qui doit combien à qui, en proportion des salaires.', rendu: equilibre },
];

export function renderOutils(view, slug) {
  const outil = OUTILS.find(o => o.slug === slug) || OUTILS[0];
  document.title = `Mini-outils — ${outil.titre}`;
  view.innerHTML = `
    <div class="hero">
      <h1>Mini-outils</h1>
      <p>${esc(outil.description)}</p>
    </div>
    <nav class="chips mo-onglets" aria-label="Mini-outils">
      ${OUTILS.map(o => `<a class="chip" href="#/outils/${o.slug}" aria-pressed="${o === outil}"><i class="ti ti-${o.icone}" aria-hidden="true"></i>${esc(o.titre)}</a>`).join('')}
    </nav>
    <div class="mo-zone"></div>`;
  outil.rendu(view.querySelector('.mo-zone'), `hub-outil-${outil.slug}`);
}
