import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from '../app-update.js';

const TYPES = { app: 'App', jeu: 'Jeu', site: 'Site' };
const view = document.getElementById('view');
let data = { site: {}, links: [], projects: [] };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^(https?:|mailto:)/.test(u) ? u : '#');
const visible = list => list.filter(x => x.visible !== false);

async function loadTokens() {
  try {
    const t = await (await fetch('design-tokens.json')).json();
    const root = document.documentElement.style;
    root.setProperty('--accent', t.colors.accentFixed);
    root.setProperty('--accent-hover', t.colors.accentFixedHover);
    root.setProperty('--accent-fg', t.colors.accentFixedFg);
    root.setProperty('--radius-sm', t.radii.sm);
    root.setProperty('--radius-md', t.radii.md);
    root.setProperty('--radius-lg', t.radii.lg);
    root.setProperty('--font-sans', t.fonts.sans);
    root.setProperty('--font-title', t.fonts.title);
    root.setProperty('--font-mono', t.fonts.mono);
  } catch { /* repli : valeurs de css/style.css */ }
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}

/* ── Routage par hash : #/ (accueil, filtres en query), #/p/<slug>, #/liens ── */
function parseRoute() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query) };
}

function render() {
  const { parts, params } = parseRoute();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = (a.dataset.nav === 'liens') === (parts[0] === 'liens') && parts[0] !== 'p';
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  document.getElementById('settings').open && document.getElementById('settings').close();
  if (parts[0] === 'p' && parts[1]) renderDetail(decodeURIComponent(parts[1]));
  else if (parts[0] === 'liens') renderLinks();
  else renderHome(params);
  if (!render.first) { window.scrollTo(0, 0); }
  render.first = false;
}
render.first = true;

function thumb(p) {
  return p.thumbnail
    ? `<img src="${esc(p.thumbnail)}" alt="" loading="lazy">`
    : `<span aria-hidden="true">${esc(p.title.trim().charAt(0).toUpperCase())}</span>`;
}

/* ── Accueil ── */
function renderHome(params) {
  const projects = visible(data.projects);
  const type = params.get('type') || '';
  const tech = params.get('tech') || '';
  const q = (params.get('q') || '').trim();
  const techs = [...new Set(projects.map(p => p.tech))].sort((a, b) => a.localeCompare(b, 'fr'));
  const types = Object.keys(TYPES).filter(t => projects.some(p => p.type === t));

  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const needle = norm(q);
  const shown = projects.filter(p =>
    (!type || p.type === type) && (!tech || p.tech === tech) &&
    (!needle || norm([p.title, p.summary, p.tech, ...(p.stack || []), ...(p.tags || [])].join(' ')).includes(needle)));

  const chip = (key, value, label) =>
    `<button class="chip" type="button" data-filter="${key}" data-value="${esc(value)}" aria-pressed="${(key === 'type' ? type : tech) === value}">${esc(label)}</button>`;

  view.innerHTML = `
    <div class="hero"><h1>${esc(data.site.name || 'Projets')}</h1><p>${esc(data.site.tagline || '')}</p></div>
    <div class="toolbar">
      <label class="search"><i class="ti ti-search"></i><input type="search" id="q" placeholder="Rechercher un projet" value="${esc(q)}" aria-label="Rechercher un projet"></label>
      <div class="chips" role="group" aria-label="Filtrer par type">${chip('type', '', 'Tous')}${types.map(t => chip('type', t, TYPES[t])).join('')}</div>
      <div class="chips" role="group" aria-label="Filtrer par techno">${chip('tech', '', 'Toutes technos')}${techs.map(t => chip('tech', t, t)).join('')}</div>
      <div class="count" aria-live="polite">${shown.length} projet${shown.length > 1 ? 's' : ''}</div>
    </div>
    ${shown.length ? `<div class="grid">${shown.map(card).join('')}</div>` : '<p class="empty">Aucun projet ne correspond à ces filtres.</p>'}`;

  const go = next => {
    const sp = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    history.replaceState(null, '', '#/' + (s ? '?' + s : ''));
    renderHome(sp);
  };
  view.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () =>
    go({ type, tech, q, [b.dataset.filter]: b.dataset.value })));
  const input = view.querySelector('#q');
  input.addEventListener('input', () => {
    const pos = input.selectionStart;
    go({ type, tech, q: input.value });
    const again = view.querySelector('#q');
    again.focus(); again.setSelectionRange(pos, pos);
  });
}

function card(p) {
  return `<a class="card" href="#/p/${encodeURIComponent(p.slug)}">
    <div class="thumb">${thumb(p)}</div>
    <div class="card-body">
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.summary)}</p>
      <div class="meta"><span class="tag type">${esc(TYPES[p.type] || p.type)}</span><span class="tag">${esc(p.tech)}</span></div>
    </div></a>`;
}

/* ── Fiche projet ── */
function prose(text) {
  return String(text || '').split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => l.startsWith('- '))) return `<ul>${lines.map(l => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${esc(block)}</p>`;
  }).join('');
}

function renderDetail(slug) {
  const p = visible(data.projects).find(x => x.slug === slug);
  if (!p) { view.innerHTML = '<a class="back" href="#/"><i class="ti ti-arrow-left"></i> Projets</a><p class="empty">Projet introuvable.</p>'; return; }
  const l = p.links || {};
  const btn = (url, icon, label, primary) => url ? `<a class="btn${primary ? ' primary' : ''}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener"><i class="ti ti-${icon}"></i> ${label}</a>` : '';
  const extra = (l.sources || []).map(s => btn(s.url, 'link', esc(s.label))).join('');
  const statuses = { active: 'Actif', archive: 'Archivé', prototype: 'Prototype' };
  document.title = `${p.title} — ${data.site.name || 'Hub'}`;
  view.innerHTML = `
    <article class="detail">
      <a class="back" href="#/"><i class="ti ti-arrow-left"></i> Projets</a>
      <h1>${esc(p.title)}</h1>
      <div class="meta"><span class="tag type">${esc(TYPES[p.type] || p.type)}</span><span class="tag">${esc(p.tech)}</span>
        ${p.status ? `<span class="tag">${esc(statuses[p.status] || p.status)}</span>` : ''}${p.year ? `<span class="tag">${esc(p.year)}</span>` : ''}</div>
      <p class="lead">${esc(p.summary)}</p>
      <div class="detail-grid">
        <div>
          ${(p.screenshots || []).length ? `<div class="shots">${p.screenshots.map(s => `<img src="${esc(s)}" alt="Capture de ${esc(p.title)}" loading="lazy">`).join('')}</div>` : ''}
          <div class="prose">${prose(p.description)}</div>
        </div>
        <aside class="panel">
          <div class="link-list">${btn(l.demo, 'player-play', 'Voir la démo', true)}${btn(l.repo, 'brand-github', 'Code source')}${btn(l.article, 'article', 'Article / post-mortem')}${extra}</div>
          <div><h3>Stack</h3><div class="meta">${(p.stack || []).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>
          ${(p.tags || []).length ? `<div><h3>Tags</h3><div class="meta">${p.tags.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>` : ''}
        </aside>
      </div>
    </article>`;
}

/* ── Page Liens ── */
function renderLinks() {
  document.title = `Liens — ${data.site.name || 'Hub'}`;
  view.innerHTML = `<div class="hero"><h1>Liens</h1><p>Où me retrouver.</p></div>
    <div class="links">${visible(data.links).map(l => `
      <a class="link-card" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">
        <i class="ti ti-${esc(l.icon || 'link')}"></i><div><strong>${esc(l.label)}</strong><span>${esc(l.description || '')}</span></div></a>`).join('')}</div>`;
}

/* ── Réglages ── */
async function setupSettings() {
  const dlg = document.getElementById('settings');
  document.getElementById('settings-btn').addEventListener('click', async () => {
    const [version, entries] = await Promise.all([loadVersion(), loadChangelog()]);
    document.getElementById('version').textContent = version ? `v${version}` : 'v?';
    document.getElementById('changelog').innerHTML = entries.map(e =>
      `<li><b>v${esc(e.version)}</b> <small>${esc(e.date)}</small><ul>${e.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul></li>`).join('');
    dlg.showModal();
  });
  document.getElementById('settings-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  document.getElementById('export-btn').addEventListener('click', () => downloadJSON(data, 'projects.json'));
  document.getElementById('home-link').addEventListener('click', () => { dlg.open && dlg.close(); document.title = 'Supershivas — apps, jeux et sites'; });
}

async function init() {
  await loadTokens();
  try {
    data = await (await fetch('data/projects.json', { cache: 'no-store' })).json();
  } catch {
    view.innerHTML = '<p class="empty">Impossible de charger data/projects.json.</p>';
    return;
  }
  setupSettings();
  window.addEventListener('hashchange', () => { document.title = 'Supershivas — apps, jeux et sites'; render(); });
  render();
  startUpdateCheck({ onUpdated: v => toast(`Mis à jour en v${v}`) });
}
init();
