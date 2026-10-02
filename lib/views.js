// Serverseitige HTML-Vorlagen (ohne Template-Engine, alles escaped).
// Tonalität: kurz, klar, selbstbewusst.

import { PHASES, daysUntil, formatDateDe, contestYear, levelInfo } from './phase.js';

export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const ICON = {
  copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15V6a3 3 0 0 1 3-3h7"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  arrow: `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  ext: `<svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/></svg>`,
  key: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></svg>`,
};

// Schullogos jeweils in Hell- und Dunkelvariante (Umschaltung per CSS).
function themedImg(name, alt, cls = '') {
  return `<img class="logo-light ${cls}" src="/img/${name}.png" alt="${esc(alt)}"><img class="logo-dark ${cls}" src="/img/${name}-dark.png" alt="${esc(alt)}">`;
}

function background() {
  return `<div class="bg" aria-hidden="true"><div class="bg-mesh"><i></i><i></i><i></i></div><div class="bg-grid"></div><div class="bg-grain"></div></div>`;
}

export function layout({ title, body, user = null, csrf = '', cfg, page = '' }) {
  const staff = user && (user.isAdmin || user.isTeacher);
  const links = user
    ? `${user.isAdmin ? `<a href="/admin" class="${page === 'admin' || page === 'import' ? 'active' : ''}">${ICON.grid}<span class="lbl">Verwaltung</span></a>` : ''}
       ${staff ? `<a href="/karten" class="${page === 'teacher' || page === 'cards' ? 'active' : ''}">${ICON.print}<span class="lbl">Karten</span></a>
         <a href="/" class="${page === 'student' ? 'active' : ''}">${ICON.key}<span class="lbl">Meine Daten</span></a>` : ''}
       <span class="nav-user" title="${esc(user.account)}">${esc(user.name || user.account)}</span>
       <form method="post" action="/logout" class="inline"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="nav-btn" type="submit" aria-label="Abmelden">${ICON.logout}<span class="lbl">Abmelden</span></button></form>`
    : '';
  const footLinks = [
    cfg.schoolUrl ? `<a href="${esc(cfg.schoolUrl)}" target="_blank" rel="noopener">Schulwebseite</a>` : '',
    cfg.impressumUrl ? `<a href="${esc(cfg.impressumUrl)}">Impressum</a>` : '',
    cfg.datenschutzUrl ? `<a href="${esc(cfg.datenschutzUrl)}">Datenschutz</a>` : '',
    `<a href="https://bwinf.de/biber/" target="_blank" rel="noopener">Informatik-Biber</a>`,
  ].filter(Boolean).join('');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Biber-Portal · ${esc(cfg.schoolName)}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#a4c64d">
<link rel="stylesheet" href="/css/app.css">
<script src="/js/theme.js"></script>
</head>
<body class="page-${esc(page)}">
${background()}
<header class="nav" data-nav>
  <div class="nav-inner">
    <a class="brand" href="/">${themedImg('mpg-mark', '')}<span class="brand-text">Biber-Portal<small>${esc(cfg.schoolName)}</small></span></a>
    <nav class="nav-links" aria-label="Hauptnavigation">
      ${links}
      <button class="nav-btn theme" type="button" data-theme-toggle aria-label="Hell/Dunkel umschalten">${ICON.moon}</button>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="foot-school">
    ${themedImg('mpg-mark', '')}
    <span><strong>Biber-Portal · ${esc(cfg.schoolName)}</strong>${cfg.schoolAddress ? `<span>${esc(cfg.schoolAddress)}</span>` : ''}</span>
    <span class="foot-mintec">${themedImg('mintec-logo', 'MINT-EC-Schule')}</span>
  </div>
  <nav>${footLinks}</nav>
</footer>
<div class="toast" role="status" aria-live="polite" hidden></div>
<script src="/js/app.js" defer></script>
${page === 'admin' || page === 'import' ? '<script src="/js/admin.js" defer></script>' : ''}
</body>
</html>`;
}

// ---------------- Startseite ----------------
export function landingPage({ cfg, error, devLogin, csrf, year }) {
  const school = esc(cfg.schoolName);
  const logo = (inner) => (cfg.schoolUrl ? `<a href="${esc(cfg.schoolUrl)}" target="_blank" rel="noopener">${inner}</a>` : `<span>${inner}</span>`);
  return `
<section class="hero">
  <div class="school-logos reveal">
    ${logo(themedImg('mpg-logo', `${cfg.schoolName} – Europaschule in Niedersachsen`))}
    <span class="sep" aria-hidden="true"></span>
    <span class="mintec">${themedImg('mintec-logo', 'MINT-EC-Schule')}</span>
  </div>
  <p class="eyebrow reveal">Informatik-Biber ${esc(year)} · am Maxe</p>
  <h1 class="display" data-split>Deine Zugangsdaten.<br><span class="grad-word">Ein Klick.</span></h1>
  <p class="sub reveal">Mit IServ anmelden. Kopieren. Loslegen.</p>
  ${error ? `<div class="alert error">${esc(error)}</div>` : ''}
  <div class="hero-cta reveal"><a class="btn btn-primary btn-xl magnetic" href="/auth/login">Mit IServ anmelden ${ICON.arrow}</a></div>
  <p class="fine reveal">Dein IServ-Passwort bleibt bei IServ.</p>
  ${devLogin ? `
  <form class="dev-login reveal" method="post" action="/auth/dev">
    <input type="hidden" name="_csrf" value="${esc(csrf)}">
    <input name="account" placeholder="Entwicklung: iserv.account" aria-label="Accountname" required>
    <button class="btn btn-quiet" type="submit">Anmelden</button>
  </form>` : ''}
</section>
<section class="steps">
  <article class="tile spot reveal"><span class="num">01</span><h3>Anmelden.</h3><p>Mit deinem IServ-Konto. Sonst nichts.</p></article>
  <article class="tile spot reveal"><span class="num">02</span><h3>Kopieren.</h3><p>Benutzername und Passwort. Je ein Tipp.</p></article>
  <article class="tile spot reveal"><span class="num">03</span><h3>Loslegen.</h3><p>Direkt zum Schnupper-Biber oder zum Wettbewerb.</p></article>
</section>
<section class="school">
  <article class="tile spot reveal">
    <span class="k">Informatik am Maxe</span>
    <h3 class="h3">Knobeln. Denken. Biber.</h3>
    <p>Der Informatik-Biber ist einer der größten Schülerwettbewerbe Deutschlands – knifflige Aufgaben, ganz ohne Vorkenntnisse. Am ${school} knobeln alle Jahrgänge mit.</p>
    <p>Als MINT-EC-Schule mit MINT-Profil fördern wir Mathematik, Informatik, Naturwissenschaften und Technik besonders – der Biber gehört fest dazu.</p>
    <div class="badges"><span class="badge mint">MINT-EC-Schule</span><span class="badge green">Europaschule in Niedersachsen</span><span class="badge">MINT-Profil</span></div>
  </article>
  <article class="tile spot reveal">
    <span class="k">Fragen?</span>
    <h3 class="h3">Frag deine Informatik-Lehrkraft.</h3>
    <p>Sie schaltet die Zugangsdaten frei und hilft, wenn etwas nicht klappt.</p>
    ${cfg.schoolAddress || cfg.schoolUrl ? `<p class="contact">${school}${cfg.schoolAddress ? `<br>${esc(cfg.schoolAddress)}` : ''}${cfg.schoolUrl ? `<br><a href="${esc(cfg.schoolUrl)}" target="_blank" rel="noopener">${esc(cfg.schoolUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}</p>` : ''}
  </article>
</section>`;
}

function timeline(s, phase) {
  const short = (d) => formatDateDe(d, 'short');
  const [cs, ce] = [short(s.contestStart), short(s.contestEnd)];
  const sameMonth = s.contestStart.slice(0, 7) === s.contestEnd.slice(0, 7);
  const steps = [
    { key: 'schnupper', label: 'Schnupper-Biber', date: `bis ${short(s.schnupperEnd)}` },
    { key: 'wettbewerb', label: 'Biberwochen', date: sameMonth ? `${cs.split(' ')[0]}–${ce}` : `${cs} – ${ce}` },
    { key: 'beendet', label: 'Ergebnisse', date: 'Dezember' },
  ];
  const order = ['vorbereitung', 'schnupper', 'pause', 'wettbewerb', 'beendet'];
  const pos = order.indexOf(phase);
  return `<ol class="timeline">${steps
    .map((st) => {
      const i = order.indexOf(st.key);
      const state = pos > i ? 'done' : pos === i ? 'now' : '';
      return `<li class="${state}"><span class="tl-dot"></span><strong>${esc(st.label)}</strong><span>${esc(st.date)}</span></li>`;
    })
    .join('')}</ol>`;
}

// ---------------- Schüleransicht ----------------
export function studentPage({ cfg, user, cred, settings, phase, preview = false }) {
  const year = contestYear(settings);
  const lvl = cred ? levelInfo(cred) : null;
  const levelLine = lvl
    ? `<p class="level-line">Angemeldet für ${lvl.label ? `<strong>${esc(lvl.label)}</strong>${lvl.group ? ' · ' : ''}` : ''}${lvl.group ? `Biber-Aufgaben der Altersgruppe <strong>${esc(lvl.group)}</strong>` : ''}</p>`
    : '';
  const p = PHASES[phase];
  const first = (user.givenName || (user.name || '').split(' ')[0] || '').trim();
  const visible = cred && (settings.credentialsVisible || preview);
  const direct = settings.directLogin && /^https:\/\//i.test(settings.loginUrl || '');
  const primaryUrl = p.target === 'schnupper' ? settings.schnupperUrl : settings.loginUrl;
  const days = daysUntil(settings.contestStart);
  const showCountdown = ['vorbereitung', 'schnupper', 'pause'].includes(phase) && days > 0;

  let credBlock;
  if (!cred) {
    credBlock = `
<section class="panel empty spot reveal">
  <h2 class="h3">Noch keine Zugangsdaten hinterlegt.</h2>
  <p>Für <code>${esc(user.account)}</code> ist noch nichts da.</p>
  <p class="muted">Sprich deine Informatik-Lehrkraft an. Danach Seite neu laden.</p>
</section>`;
  } else if (!visible) {
    credBlock = `
<section class="panel empty spot reveal">
  <h2 class="h3">Bereit. Noch gesperrt.</h2>
  <p>Deine Zugangsdaten werden im Unterricht freigeschaltet.</p>
  ${levelLine}
</section>`;
  } else {
    credBlock = `
<section class="panel cred spot reveal" data-cred>
  <header class="panel-head"><span class="kicker">Informatik-Biber ${esc(year)}</span>${cred.className ? `<span class="tag">${esc(cred.className)}</span>` : ''}</header>
  ${levelLine}

  <div class="field" data-field="username">
    <span class="idx">01</span>
    <div><span class="k">Benutzername</span><output class="v" data-value data-decode>${esc(cred.username)}</output></div>
    <div class="field-act">
      <button class="btn btn-quiet copy" type="button" data-copy="username"><span class="ico">${ICON.copy}${ICON.check}</span><span class="lbl">Kopieren</span></button>
    </div>
  </div>

  <div class="field" data-field="password">
    <span class="idx">02</span>
    <div><span class="k">Passwort</span><output class="v secret is-hidden" data-value data-secret="${esc(cred.password)}">••••••••</output></div>
    <div class="field-act">
      <button class="btn btn-quiet" type="button" data-reveal aria-pressed="false">${ICON.eye}<span class="lbl">Anzeigen</span></button>
      <button class="btn btn-quiet copy" type="button" data-copy="password"><span class="ico">${ICON.copy}${ICON.check}</span><span class="lbl">Kopieren</span></button>
    </div>
  </div>

  <div class="meter" aria-hidden="true"><i data-meter></i></div>

  ${direct ? `
  <form class="go" method="post" action="${esc(settings.loginUrl)}" target="_blank" data-direct-login>
    <span class="idx">03</span>
    <input type="hidden" name="username" value="${esc(cred.username)}">
    <input type="hidden" name="password" value="${esc(cred.password)}">
    <input type="hidden" name="login" value="Anmelden">
    <div class="go-main">
      <button class="btn btn-primary btn-xl magnetic" type="submit" data-go>Direkt einloggen ${ICON.ext}</button>
      <div class="go-links">
        <a class="link" href="${esc(settings.loginUrl)}" target="_blank" rel="noopener">Login-Seite öffnen ›</a>
        <button class="link" type="button" data-print>Zugangskarte drucken ›</button>
      </div>
    </div>
  </form>
  <p class="hint">Neuer Tab – du bist sofort beim Biber angemeldet.${p.target === 'schnupper' ? ' Dort unter „Wettbewerbe“ den Schnupper-Biber starten.' : ''} Klappt’s nicht? „Login-Seite öffnen“ und Daten einfügen.</p>` : `
  <div class="go">
    <span class="idx">03</span>
    <div class="go-main">
      <a class="btn btn-primary btn-xl magnetic" href="${esc(primaryUrl)}" target="_blank" rel="noopener" data-go>${esc(p.cta)} ${ICON.ext}</a>
      <div class="go-links">
        ${p.target === 'schnupper' ? `<a class="link" href="${esc(settings.loginUrl)}" target="_blank" rel="noopener">Nur anmelden ›</a>` : ''}
        <button class="link" type="button" data-print>Zugangskarte drucken ›</button>
      </div>
    </div>
  </div>
  <p class="hint">Neuer Tab. Dort „Anmelden“ – und einfügen.</p>`}
</section>`;
  }

  return `
${preview ? `<div class="banner reveal">Vorschau als <strong>${esc(user.account)}</strong>. Abrufe werden nicht gezählt.</div>` : ''}
<section class="hero tight">
  <p class="eyebrow reveal"><span class="live phase-${esc(phase)}"></span>${esc(p.label)}</p>
  <h1 class="display" data-split>${first ? `Hallo, ${esc(first)}.` : 'Hallo.'}</h1>
  <p class="sub reveal">${visible ? 'Deine Zugangsdaten. Bereit.' : `Informatik-Biber ${year}.`}</p>
</section>

${settings.notice ? `<div class="notice reveal">${esc(settings.notice)}</div>` : ''}

${credBlock}

<section class="bento">
  ${showCountdown ? `
  <article class="tile spot reveal">
    <span class="k">Biberwochen</span>
    <p class="mega"><span data-countup="${days}">${days}</span></p>
    <p class="tile-foot">${days === 1 ? 'Tag' : 'Tage'} bis zum Start.</p>
  </article>` : ''}
  <article class="tile spot reveal">
    <span class="k">Jetzt</span>
    <h3 class="h3">${esc(p.title)}</h3>
    <p>${esc(p.text)}</p>
    ${timeline(settings, phase)}
  </article>
  <article class="tile spot reveal">
    <span class="k">Gut zu wissen</span>
    <ul class="bold-list">
      <li>Ein Login.<span>Für Schnupper-Biber und Wettbewerb.</span></li>
      <li>Nur für dich.<span>Nicht weitergeben.</span></li>
      <li>Vergessen?<span>Hier steht’s. Immer.</span></li>
    </ul>
  </article>
</section>
${visible ? `
<section class="print-card" aria-hidden="true">
  <div class="print-logos"><img src="/img/mpg-logo.png" alt=""><img src="/img/mintec-logo.png" alt=""></div>
  <h2>Informatik-Biber ${esc(year)} · Zugangskarte</h2>
  <p><strong>Name:</strong> ${esc([cred.firstName, cred.lastName].filter(Boolean).join(' ') || user.name || '')}${cred.className ? ` (${esc(cred.className)})` : ''}</p>
  ${lvl ? `<p><strong>Stufe:</strong> ${esc([lvl.label, lvl.group ? `Altersgruppe ${lvl.group}` : ''].filter(Boolean).join(' · '))}</p>` : ''}
  <p><strong>Benutzername:</strong> <span class="mono">${esc(cred.username)}</span></p>
  <p><strong>Passwort:</strong> <span class="mono">${esc(cred.password)}</span></p>
  <p><strong>Anmeldung:</strong> wettbewerb.informatik-biber.de</p>
  <p class="print-school">${esc(cfg?.schoolName || '')}</p>
</section>` : ''}`;
}

// ---------------- Meldungen ----------------
export function messagePage({ title, text, action }) {
  return `
<section class="hero">
  <h1 class="display" data-split>${esc(title)}</h1>
  <p class="sub reveal">${esc(text)}</p>
  ${action ? `<div class="hero-cta reveal"><a class="btn btn-primary btn-lg magnetic" href="${esc(action.href)}">${esc(action.label)} ${ICON.arrow}</a></div>` : ''}
</section>`;
}
