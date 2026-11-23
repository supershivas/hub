// Page « Mini-outils » : petits calculateurs du quotidien, un par onglet.
// Ajouter un outil = ajouter une entrée à OUTILS (slug, titre, icône, rendu).
//
// Les valeurs saisies restent dans ce navigateur (hub-outil-<slug>).

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

/* ── Répartition proportionnelle aux salaires ── */
function repartition(zone, cle) {
  const etat = lire(cle);
  const champ = (nom, label, aide) => `
    <label class="mo-champ">
      <span>${label}</span>
      <span class="mo-montant"><input name="${nom}" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(etat[nom] || '')}"><span>€</span></span>
      ${aide ? `<small>${aide}</small>` : ''}
    </label>`;
  zone.innerHTML = `
    <form class="mo-form" autocomplete="off">
      <section class="mo-bloc">
        <h2>Salaires</h2>
        <div class="mo-duo">
          ${champ('salaireJ', 'Salaire J')}
          ${champ('salaireB', 'Salaire B')}
        </div>
        <p class="hint">Gardés dans ce navigateur pour la prochaine fois.</p>
      </section>
      <section class="mo-bloc">
        <h2>Montant à répartir</h2>
        ${champ('montant', 'Montant')}
        <div class="mo-resultat" aria-live="polite"></div>
      </section>
    </form>`;
  const form = zone.querySelector('form');
  const resultat = zone.querySelector('.mo-resultat');
  form.addEventListener('submit', e => e.preventDefault());

  const calculer = () => {
    const j = nombre(form.salaireJ.value), b = nombre(form.salaireB.value), m = nombre(form.montant.value);
    if (!(j >= 0 && b >= 0) || j + b === 0) {
      resultat.innerHTML = '<p class="hint">Entrez les deux salaires pour calculer la répartition.</p>';
      return;
    }
    const partJ = j / (j + b);
    const ligne = (nom, part, somme) => `
      <div class="mo-part">
        <span class="mo-nom">${nom}</span>
        <span class="mo-pct">${pourcent(part)}</span>
        <strong>${somme == null ? '—' : euros(somme)}</strong>
      </div>`;
    if (!(m >= 0)) {
      resultat.innerHTML = ligne('J', partJ, null) + ligne('B', 1 - partJ, null)
        + '<p class="hint">Entrez un montant pour voir la part de chacun.</p>';
      return;
    }
    // Arrondi au centime sur J, B prend le reste : la somme tombe juste.
    const centimes = Math.round(m * 100);
    const cJ = Math.round(centimes * partJ);
    resultat.innerHTML = ligne('J', partJ, cJ / 100) + ligne('B', 1 - partJ, (centimes - cJ) / 100);
  };

  form.addEventListener('input', e => {
    if (e.target.name) { etat[e.target.name] = e.target.value; garder(cle, etat); }
    calculer();
  });
  calculer();
}

const OUTILS = [
  { slug: 'repartition', titre: 'Répartition', icone: 'scale', description: 'Partager une dépense en proportion des salaires de J et B.', rendu: repartition },
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
