// Lehrkräfte: Gruppen wählen und Zugangskarten (mehrere pro DIN-A4-Blatt) drucken.

import { esc, ICON } from './views.js';
import { fullName } from './teacher.js';

export const LAYOUTS = {
  8: { cols: 2, rows: 4, label: '8 pro Blatt (2 × 4) · groß' },
  10: { cols: 2, rows: 5, label: '10 pro Blatt (2 × 5)' },
  12: { cols: 3, rows: 4, label: '12 pro Blatt (3 × 4) · kompakt' },
};

export function teacherPage({ user, groups, total, roles }) {
  const rows = groups.length
    ? groups.map((g) => `
      <label class="group-row">
        <input type="checkbox" name="g" value="${esc(g.key)}">
        <span class="group-name">${esc(g.label)}</span>
        <span class="status">${g.count} ${g.count === 1 ? 'Zugang' : 'Zugänge'}</span>
      </label>`).join('')
    : '<p class="muted">Noch keine Zugangsdaten importiert. Die Biber-Koordination lädt sie in der Verwaltung hoch.</p>';

  return `
<section class="hero tight">
  <p class="eyebrow reveal">Für Lehrkräfte</p>
  <h1 class="display" data-split>Zugangskarten.</h1>
  <p class="sub reveal">Gruppe wählen. Drucken. Schneiden. Austeilen.</p>
</section>

<section class="panel block spot reveal">
  <form method="get" action="/karten/druck" target="_blank" class="cards-form" data-cards-form>
    <div class="block-head">
      <div><h2 class="h3">Gruppen</h2><p>${total} Zugänge in ${groups.length} ${groups.length === 1 ? 'Gruppe' : 'Gruppen'} (Klasse/Kurs aus dem Biber-Export).</p></div>
      ${groups.length > 1 ? '<button class="btn btn-ghost" type="button" data-select-all>Alle auswählen</button>' : ''}
    </div>
    <div class="group-list">${rows}</div>
    ${groups.length ? `
    <div class="settings-grid cards-options">
      <label>Karten pro Blatt<select name="n">${Object.entries(LAYOUTS).map(([n, l]) => `<option value="${n}"${n === '8' ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}</select></label>
      <label>Neue Seite je Gruppe<select name="split"><option value="1" selected>Ja</option><option value="0">Nein, fortlaufend</option></select></label>
    </div>
    <div class="actions"><button class="btn btn-primary magnetic" type="submit" data-cards-submit disabled>${ICON.grid}Karten erstellen ${ICON.ext}</button></div>` : ''}
  </form>
</section>

<section class="duo">
  <article class="tile spot reveal">
    <span class="k">Drucken</span>
    <ul class="bold-list">
      <li>DIN A4, Hochformat.<span>Skalierung 100 % („Tatsächliche Größe“), Kopf- und Fußzeilen aus.</span></li>
      <li>Entlang der Linien schneiden.<span>Jede Karte gehört genau einer Person.</span></li>
      <li>Reste vernichten.<span>Übrige Karten nicht offen liegen lassen.</span></li>
    </ul>
  </article>
  <article class="tile spot reveal">
    <span class="k">Hinweis</span>
    <p>Jeder Druck wird mit deinem IServ-Account protokolliert.</p>
    <p class="muted small">Angemeldet als ${esc(user.account)}${roles?.length ? ` · IServ-Rolle: ${esc(roles.join(', '))}` : ''}.</p>
  </article>
</section>`;
}

function card(c, cfg, portalHost) {
  const name = fullName(c);
  return `
  <article class="card">
    <header class="card-head">
      <img src="/img/mpg-mark.png" alt="">
      <span><strong>Informatik-Biber 2026</strong><small>${esc(cfg.schoolName)}</small></span>
      ${c.className ? `<em>${esc(c.className)}</em>` : ''}
    </header>
    <p class="card-name">${esc(name || ' ')}</p>
    <dl>
      <dt>Benutzername</dt><dd>${esc(c.username)}</dd>
      <dt>Passwort</dt><dd>${esc(c.password)}</dd>
    </dl>
    <p class="card-howto">Auf der Seite „Anmelden“ Benutzername und Passwort eingeben – dann unter „Wettbewerbe“ starten. Daten nicht weitergeben.</p>
    <footer class="card-foot">Anmelden: <b>wettbewerb.informatik-biber.de</b>${portalHost ? `<br>oder mit IServ: <b>${esc(portalHost)}</b>` : ''}</footer>
  </article>`;
}

/** Druckbogen: Blätter à n Karten; optional neue Seite je Gruppe. */
export function cardsSheet({ cfg, creds, perPage, split, groupLabels }) {
  const layout = LAYOUTS[perPage] || LAYOUTS[8];
  const size = layout.cols * layout.rows;
  let portalHost = '';
  try { portalHost = new URL(cfg.baseUrl).host; } catch { /* egal */ }

  // in Blöcke aufteilen (je Gruppe neu beginnen, wenn gewünscht)
  const chunks = [];
  const blocks = [];
  if (split) {
    const byGroup = new Map();
    for (const c of creds) {
      const k = c.className || '–';
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k).push(c);
    }
    blocks.push(...byGroup.values());
  } else blocks.push(creds);
  for (const block of blocks) for (let i = 0; i < block.length; i += size) chunks.push(block.slice(i, i + size));

  const sheets = chunks.map((chunk, i) => `
  <section class="sheet n${perPage}">
    ${chunk.map((c) => card(c, cfg, portalHost)).join('')}
    ${'<article class="card blank"></article>'.repeat(size - chunk.length)}
    <span class="sheet-no">${i + 1}/${chunks.length}</span>
  </section>`).join('');

  return `
<div class="sheet-bar">
  <div>
    <strong>${creds.length} ${creds.length === 1 ? 'Karte' : 'Karten'} · ${chunks.length} ${chunks.length === 1 ? 'Blatt' : 'Blätter'}</strong>
    <span class="muted">${esc(groupLabels.join(', '))} · A4, Skalierung 100 %, ohne Kopf-/Fußzeilen</span>
  </div>
  <div class="actions">
    <a class="btn btn-ghost" href="/karten">Zurück</a>
    <button class="btn btn-primary" type="button" data-print-page>Drucken</button>
  </div>
</div>
<div class="sheets">${sheets || '<p class="muted">Keine Zugänge in dieser Auswahl.</p>'}</div>`;
}
