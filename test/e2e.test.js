// Ende-zu-Ende: echter OIDC-Ablauf gegen den Mock-IServ inkl. PKCE, Admin-Import und Schüleransicht.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { startMock } from '../tools/mock-iserv.js';
import { createApp } from '../server.js';
import { loadConfig } from '../lib/config.js';

let mock, server, base;

before(async () => {
  mock = await startMock(4100);
  process.env.ISERV_URL = 'http://localhost:4100';
  process.env.MOCK_ISSUER = 'http://localhost:4100';
  process.env.BASE_URL = 'http://localhost:3100';
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'biber-e2e-'));
  process.env.ADMIN_ACCOUNTS = 'andre.bodendiek';
  const { app } = createApp(loadConfig());
  await new Promise((r) => { server = app.listen(3100, r); });
  base = 'http://localhost:3100';
});
after(() => { server?.closeAllConnections?.(); server?.close(); mock?.closeAllConnections?.(); mock?.close(); });

// Minimaler Browser mit Cookie-Jar
function browser() {
  const jar = new Map();
  async function go(url, opts = {}) {
    const u = new URL(url, base);
    const headers = { ...(opts.headers || {}) };
    const cookies = [...jar].filter(([, v]) => v.host === u.host).map(([k, v]) => `${k}=${v.value}`).join('; ');
    if (cookies) headers.cookie = cookies;
    if (process.env.DBG) console.log('>>', opts.method || 'GET', u.toString().slice(0, 90));
    const res = await fetch(u, { ...opts, headers, redirect: 'manual' });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i), { value: pair.slice(i + 1), host: u.host });
    }
    if ([301, 302, 303].includes(res.status) && !opts.noFollow) {
      return go(new URL(res.headers.get('location'), u).toString(), { method: 'GET' });
    }
    return { res, text: await res.text(), url: u.toString() };
  }
  return { go };
}

async function login(b, account, startPath = '/auth/login') {
  const start = await b.go(startPath); // folgt zu Mock-Auswahlseite
  assert.match(start.text, /Mock-IServ/);
  const hidden = Object.fromEntries([...start.text.matchAll(/name="(\w+)" value="([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&quot;/g, '"')]));
  const body = new URLSearchParams({ ...hidden, user: account });
  return b.go('http://localhost:4100/iserv/auth/auth', { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
}
const csrfOf = (html) => html.match(/name="_csrf" value="([^"]+)"/)[1];

test('kompletter Ablauf', async () => {
  // 1) Admin meldet sich an und importiert
  const admin = browser();
  let page = await login(admin, 'andre.bodendiek');
  assert.match(page.text, /Verwaltung/);
  const csv = 'Klassen-/Kursname;Vorname;Nachname;Benutzername;Passwort;IServ\n10a;Max;Mustermann;biber-max;S3cret!;max.mustermann\n10a;Erika;Musterfrau;biber-erika;Pw<b>;\n';
  const fd = new FormData();
  fd.set('_csrf', csrfOf(page.text));
  fd.set('file', new Blob([csv], { type: 'text/csv' }), 'export.csv');
  page = await admin.go('/admin/import', { method: 'POST', body: fd });
  assert.match(page.text, /2 Zugangsdaten erkannt/);
  const token = page.text.match(/name="token" value="([^"]+)"/)[1];
  page = await admin.go('/admin/import/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfOf(page.text), token, mode: 'replace' }),
  });
  assert.match(page.text, /Import abgeschlossen: 2 neu/);
  assert.match(page.text, /1 Einträge haben noch keinen IServ-Account/);

  // Zuordnung nachtragen
  const id = page.text.match(/\/admin\/credentials\/([\w-]+)\/assign[\s\S]*?value=""/)?.[1];
  assert.ok(id);
  page = await admin.go(`/admin/credentials/${id}/assign`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfOf(page.text), account: 'Erika.Musterfrau' }),
  });
  assert.match(page.text, /erika\.musterfrau zugeordnet/);

  // CSRF-Schutz
  const bad = await admin.go('/admin/clear', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'confirm=L%C3%96SCHEN&_csrf=falsch' });
  assert.equal(bad.res.status, 403);

  // 2) Schüler sieht eigene Daten, HTML ist escaped
  const erika = browser();
  page = await login(erika, 'erika.musterfrau');
  assert.match(page.text, /Hallo, Erika\./);
  assert.match(page.text, /biber-erika/);
  assert.ok(page.text.includes('Pw&lt;b&gt;') && !page.text.includes('Pw<b>'));
  assert.ok(!page.text.includes('biber-max'));
  assert.equal(page.res.headers.get('cache-control'), 'no-store');
  assert.match(page.res.headers.get('content-security-policy'), /script-src 'self'/);
  // Direkt-Login: Formular an die Biber-Anmeldeseite, von der CSP erlaubt
  assert.match(page.text, /<form class="go" method="post" action="https:\/\/wettbewerb\.informatik-biber\.de\/index\.php\?action=login" target="biber"/);
  assert.match(page.text, /name="username" value="biber-erika"/);
  assert.match(page.res.headers.get('content-security-policy'), /form-action 'self' https:\/\/wettbewerb\.informatik-biber\.de/);

  // Kein Admin-Zugriff
  const forb = await erika.go('/admin');
  assert.equal(forb.res.status, 403);

  // 3) Konto ohne Daten
  const lena = browser();
  page = await login(lena, 'lena.ohnedaten');
  assert.match(page.text, /Noch keine Zugangsdaten hinterlegt/);

  // 4) Abruf wurde gezählt
  page = await admin.go('/admin');
  assert.match(page.text, /(Schnupper|Wettbewerb) 1×/); // je nach aktuellem Zeitraum

  // 5) Zugangsdaten verbergen
  page = await admin.go('/admin/settings', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfOf(page.text), phaseMode: 'wettbewerb', schnupperStart: '2026-09-14', schnupperEnd: '2026-11-06', contestStart: '2026-11-09', contestEnd: '2026-11-20', loginUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', schnupperUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', notice: 'Start Montag 3. Stunde' }),
  });
  assert.match(page.text, /Einstellungen gespeichert/);
  page = await erika.go('/');
  assert.match(page.text, /werden im Unterricht freigeschaltet/);
  assert.match(page.text, /Start Montag 3. Stunde/);
  assert.ok(!page.text.includes('biber-erika'));

  // 6) Abmelden
  page = await erika.go('/');
  page = await erika.go('/logout', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: csrfOf(page.text) }) });
  assert.match(page.text, /abgemeldet/);
  page = await erika.go('/');
  assert.match(page.text, /Mit IServ anmelden/);
});

test('manipulierter state wird abgewiesen', async () => {
  const b = browser();
  await b.go('/auth/login', { noFollow: true });
  const page = await b.go('/auth/callback?code=abc&state=falsch');
  assert.match(page.text, /hat nicht geklappt/);
});

test('einzelne Zugänge per Formular anlegen und bearbeiten', async () => {
  const form = { 'content-type': 'application/x-www-form-urlencoded' };
  const admin = browser();
  let page = await login(admin, 'andre.bodendiek');
  page = await admin.go('/admin');
  assert.match(page.text, /Einzeln\./);
  // Sichtbarkeit wieder einschalten (vorheriger Test hat sie ausgeschaltet)
  page = await admin.go('/admin/settings', {
    method: 'POST', headers: form,
    body: new URLSearchParams({ _csrf: csrfOf(page.text), phaseMode: 'auto', schnupperStart: '2026-09-14', schnupperEnd: '2026-11-06', contestStart: '2026-11-09', contestEnd: '2026-11-20', loginUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', schnupperUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', notice: '', credentialsVisible: '1', directLogin: '1' }),
  });

  // Anlegen mit „Anlegen & nächster“ → leeres Formular mit Erfolgsmeldung
  page = await admin.go('/admin/credentials', {
    method: 'POST', headers: form,
    body: new URLSearchParams({ _csrf: csrfOf(page.text), firstName: 'Lena', lastName: 'Ohnedaten', className: '8c', level: '7-8', username: 'biber-lena', password: 'Erst-Pw-1', account: ' Lena.Ohnedaten ', next: 'again' }),
  });
  assert.match(page.text, /Neuer Zugang\./);
  assert.match(page.text, /biber-lena angelegt und lena\.ohnedaten zugeordnet/);

  // Doppelter Benutzername → Fehler, Eingaben bleiben erhalten
  page = await admin.go('/admin/credentials', {
    method: 'POST', headers: form,
    body: new URLSearchParams({ _csrf: csrfOf(page.text), firstName: 'Zweit', username: 'BIBER-LENA', password: 'x', account: '' }),
  });
  assert.equal(page.res.status, 422);
  assert.match(page.text, /schon vergeben/);
  assert.match(page.text, /value="Zweit"/);

  // Doppelter IServ-Account → Fehler
  page = await admin.go('/admin/credentials', {
    method: 'POST', headers: form,
    body: new URLSearchParams({ _csrf: csrfOf(page.text), username: 'biber-neu', password: 'x', account: 'lena.ohnedaten' }),
  });
  assert.match(page.text, /bereits biber-lena zugeordnet/);

  // Schülerin sieht ihre Daten
  const lena = browser();
  page = await login(lena, 'lena.ohnedaten');
  assert.match(page.text, /Erst-Pw-1/);

  // Bearbeiten: Passwort ändern
  page = await admin.go('/admin');
  const id = page.text.match(/\/admin\/credentials\/([\w-]+)\/edit" title="Bearbeiten" aria-label="biber-lena/)[1];
  page = await admin.go(`/admin/credentials/${id}/edit`);
  assert.match(page.text, /Zugang bearbeiten\./);
  assert.match(page.text, /value="Erst-Pw-1"/);
  page = await admin.go(`/admin/credentials/${id}`, {
    method: 'POST', headers: form,
    body: new URLSearchParams({ _csrf: csrfOf(page.text), firstName: 'Lena', lastName: 'Ohnedaten', className: '8c', level: '7-8', username: 'biber-lena', password: 'Neu-Pw-2', account: 'lena.ohnedaten' }),
  });
  assert.match(page.text, /biber-lena gespeichert/);
  assert.match(page.text, /biber-lena geändert \(Passwort\)/);

  page = await lena.go('/');
  assert.match(page.text, /Neu-Pw-2/);
  assert.ok(!page.text.includes('Erst-Pw-1'));
});

test('Lehrkraft (IServ-Rolle) druckt Zugangskarten einer Gruppe', async () => {
  const teacher = browser();
  let page = await login(teacher, 'petra.pauker'); // Rolle „Lehrer“ über iserv:roles
  assert.match(page.url, /\/karten$/);
  assert.match(page.text, /Zugangskarten\./);
  assert.match(page.text, /IServ-Rolle: Lehrer/);
  assert.match(page.text, /name="g" value="8c"/);
  assert.ok(!page.text.includes('Verwaltung</span>'));

  page = await teacher.go('/karten/druck?g=8c&n=10&split=1');
  assert.match(page.text, /class="sheet n10"/);
  assert.match(page.text, /biber-lena/);
  assert.match(page.text, /Neu-Pw-2/);
  assert.ok(!page.text.includes('biber-erika')); // andere Gruppe nicht dabei
  assert.equal(page.res.headers.get('cache-control'), 'no-store');

  assert.ok(!page.text.includes('localhost:3100')); // keine Portal-Adresse auf der Karte

  // Gruppenliste: lena zusätzlich im Kurs „Informatik 10“ → eigene Gruppe, Karte mit Kursname
  const admin0 = browser();
  page = await login(admin0, 'andre.bodendiek');
  page = await admin0.go('/admin');
  const fd = new FormData();
  fd.set('_csrf', csrfOf(page.text));
  // IServ-Gruppenliste: Zeile pro Gruppe; lena ist schon zugeordnet, „Neu Person“ hat keinen Zugang
  fd.set('file', new Blob(['\ufeffGruppe;Nachname;Vorname;Account;Klasse/Information\n"Informatik 10";Ohnedaten;Lena;lena.ohnedaten;8c\n"AG Robotik";Ohnedaten;Lena;lena.ohnedaten;8c\n"AG Robotik";Person;Neu;neu.person;8c\n']), 'Export_Grouplist.csv');
  page = await admin0.go('/admin/groups', { method: 'POST', body: fd });
  assert.match(page.text, /2 Personen erkannt/);
  page = await admin0.go('/admin/groups/confirm', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: csrfOf(page.text), token: page.text.match(/name="token" value="([^"]+)"/)[1], mode: 'add', assign: '1' }),
  });
  assert.match(page.text, /Gruppen für 1 Zugänge/);
  assert.ok(!page.text.includes('neu.person')); // Personen ohne Biber-Zugang werden nicht gespeichert
  page = await teacher.go('/karten');
  assert.match(page.text, /name="g" value="Informatik 10"/);
  assert.match(page.text, /name="g" value="8c"/);
  page = await teacher.go('/karten/druck?g=Informatik%2010');
  assert.match(page.text, /<em>Informatik 10<\/em>/);
  assert.match(page.text, /biber-lena/);
  page = await teacher.go('/karten/druck?g=8c&g=Informatik%2010&g=AG%20Robotik');
  assert.equal(page.text.match(/class="card"/g).length, 1);
  assert.match(page.text, /in mehreren gewählten Gruppen/);

  // Verwaltung bleibt gesperrt
  assert.equal((await teacher.go('/admin')).res.status, 403);

  // Schüler:innen haben keinen Zugriff
  const max = browser();
  await login(max, 'max.mustermann');
  assert.equal((await max.go('/karten')).res.status, 403);
  assert.equal((await max.go('/karten/druck?g=8c')).res.status, 403);

  // Druck wird protokolliert
  const admin = browser();
  page = await login(admin, 'andre.bodendiek');
  page = await admin.go('/admin');
  assert.match(page.text, /Karten gedruckt: 8c \(1\)/);
  assert.match(page.text, /Gruppen ergänzt: 1 Zugänge, 1 Accounts ohne Zugang/);
});

test('Team: zweite Person gibt per Team-Code ihre Zugangsdaten frei', async () => {
  const form = { 'content-type': 'application/x-www-form-urlencoded' };
  const post = (b, url, page, data) => b.go(url, { method: 'POST', headers: form, body: new URLSearchParams({ _csrf: csrfOf(page.text), ...data }) });

  // Erste Person (normales Fenster)
  const pc = browser();
  let page = await login(pc, 'erika.musterfrau');
  assert.match(page.text, /biber-erika/);
  assert.match(page.text, /Team-Code anzeigen/);
  assert.match(page.text, /privates Fenster/);
  assert.match(page.text, /localhost:3100/); // Portal-Adresse für das private Fenster

  // Zweite Person (privates Fenster = eigene Cookies) erzeugt einen Code
  const priv = browser();
  let p2 = await login(priv, 'lena.ohnedaten');
  p2 = await post(priv, '/team/code', p2, {});
  const shown = p2.text.match(/<output class="v mono">([A-Z0-9]{3})-([A-Z0-9]{3})<\/output>/);
  assert.ok(shown, 'Team-Code wird angezeigt');
  const code = shown[1] + shown[2];
  assert.ok(!/[01IO]/.test(code));
  assert.match(p2.text, /Gültig bis \d{2}:\d{2} Uhr/);

  // Eigener Code wird abgewiesen
  const self = await post(priv, '/team/join', p2, { code });
  assert.match(self.text, /dein eigener Code/);

  // Falscher Code
  page = await post(pc, '/team/join', page, { code: 'ZZZZZZ' });
  assert.match(page.text, /unbekannt oder abgelaufen/);

  // Richtiger Code (tolerant: klein, mit Bindestrich und Leerzeichen)
  page = await post(pc, '/team/join', page, { code: ` ${code.slice(0, 3).toLowerCase()}-${code.slice(3).toLowerCase()} ` });
  assert.match(page.text, /Hallo, Erika\./); // erste Person bleibt angemeldet
  assert.match(page.text, /Teampartner:in · Lena Ohnedaten/);
  assert.match(page.text, /biber-lena/);
  assert.match(page.text, /Eure Zugangsdaten/);
  assert.equal((page.text.match(/data-cred/g) || []).length, 2);
  const direct = page.text.match(/<form class="go"[\s\S]*?<\/form>/)[0];
  assert.match(direct, /value="biber-erika"/);
  assert.ok(!direct.includes('biber-lena'));

  // Code ist einmalig
  const again = browser();
  let p3 = await login(again, 'max.mustermann');
  p3 = await post(again, '/team/join', p3, { code });
  assert.match(p3.text, /unbekannt oder abgelaufen/);
  assert.ok(!p3.text.includes('biber-lena'));

  // Ohne Gruppen-Nummer für die Altersgruppe: nur zum Kopieren
  assert.ok(!page.text.includes('data-team-join'));
  assert.match(page.text, /Melde deine\(n\) Team-Partner\(in\) an/);

  // Admin trägt Gruppen-Nummern ein (Erika: Klasse 10a → Altersgruppe 9–10)
  const admin = browser();
  let ap = await login(admin, 'andre.bodendiek');
  ap = await admin.go('/admin');
  const settingsBody = (extra) => new URLSearchParams({ _csrf: csrfOf(ap.text), phaseMode: 'auto', schnupperStart: '2026-09-14', schnupperEnd: '2026-11-06', contestStart: '2026-11-09', contestEnd: '2026-11-20', loginUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', schnupperUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login', notice: '', credentialsVisible: '1', directLogin: '1', ...extra });
  ap = await admin.go('/admin/settings', { method: 'POST', headers: form, body: settingsBody({ 'tg_schnupper_9-10': '12x' }) });
  assert.match(ap.text, /nur Ziffern/);
  ap = await admin.go('/admin/settings', { method: 'POST', headers: form, body: settingsBody({ 'tg_schnupper_9-10': '1234', 'tg_wettbewerb_9-10': '5678' }) });
  assert.match(ap.text, /Einstellungen gespeichert/);
  assert.match(ap.text, /name="tg_schnupper_9-10" value="1234"/);

  page = await pc.go('/');
  const join = page.text.match(/<form class="go team-go"[\s\S]*?<\/form>/)[0];
  assert.match(join, /action="https:\/\/wettbewerb\.informatik-biber\.de\/index\.php\?action=user_join&amp;grp_id=(1234|5678)" target="biber"/);
  assert.match(join, /name="team_username" value="biber-lena"/);
  assert.match(join, /name="team_password" value="Neu-Pw-2"/);
  assert.match(join, /name="team_login" value="ins Team!"/);
  assert.match(page.text, /1\. Direkt einloggen/);
  assert.match(page.text, /unterschiedlichen Altersgruppen \(9–10 und 7–8\)/);
  assert.match(page.res.headers.get('content-security-policy'), /form-action 'self' https:\/\/wettbewerb\.informatik-biber\.de/);

  // Entfernen
  page = await post(pc, '/team/remove', page, {});
  assert.ok(!page.text.includes('biber-lena'));
  assert.match(page.text, /Code deiner Teampartner:in eingeben/);

  // Schutz gegen Durchprobieren: nach 8 Fehlversuchen gesperrt
  for (let i = 0; i < 8; i++) page = await post(pc, '/team/join', page, { code: `QQQQQ${'ABCDEFGH'[i]}` });
  page = await post(pc, '/team/join', page, { code: 'QQQQQQ' });
  assert.match(page.text, /Zu viele falsche Codes/);

  // Zweite Person ohne Zugangsdaten kann keinen Code erzeugen
  const nocred = browser();
  let p4 = await login(nocred, 'andre.bodendiek');
  p4 = await nocred.go('/');
  assert.ok(!p4.text.includes('Team-Code anzeigen')); // ohne eigene Zugangsdaten kein Team-Bereich
  p4 = await post(nocred, '/team/code', p4, {});
  assert.ok(!/<output class="v mono">/.test(p4.text)); // und auch kein Code

  // Ohne Anmeldung keine Team-Aktionen
  const anon = browser();
  const r = await anon.go('/team/join', { method: 'POST', headers: form, body: 'code=ABCDEF', noFollow: true });
  assert.ok([302, 403].includes(r.res.status));

  // Abmelden entfernt beide
  page = await pc.go('/');
  page = await post(pc, '/logout', page, {});
  assert.match(page.text, /auch in IServ abmelden/);
  page = await pc.go('/');
  assert.match(page.text, /Mit IServ anmelden/);
});
