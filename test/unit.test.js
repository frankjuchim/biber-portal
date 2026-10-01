import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';

import { parseCredentialFile } from '../lib/importer.js';
import { Store } from '../lib/store.js';
import { currentPhase, daysUntil } from '../lib/phase.js';
import { normalizeAccount } from '../lib/config.js';

const CSV = 'Klassen-/Kursname;Stufe;Vorname;Nachname;Benutzername;Passwort;IServ\n' +
  '10a;9-10;Max;Mustermann;biber-max;Pw1!;Max.Mustermann@jbg-hoya.de\n' +
  '10a;9-10;Jörg;Übel;biber-joerg;Pw2!;\n' +
  '10b;9-10;Erika;Musterfrau;biber-erika;Pw3!;erika.musterfrau\n';

test('normalizeAccount entfernt Domain und Großschreibung', () => {
  assert.equal(normalizeAccount('  Max.Mustermann@schule.de '), 'max.mustermann');
  assert.equal(normalizeAccount(''), '');
});

test('CSV (UTF-8, Semikolon) wird erkannt', async () => {
  const r = await parseCredentialFile(Buffer.from(CSV, 'utf8'), 'x.csv');
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[0].account, 'max.mustermann');
  assert.equal(r.rows[1].account, '');
  assert.equal(r.rows[1].firstName, 'Jörg');
  assert.equal(r.rows[2].className, '10b');
});

test('CSV in Windows-1252 (Excel-Export) wird korrekt dekodiert', async () => {
  const bytes = Buffer.from(CSV.replace(/,/g, ','), 'latin1');
  const r = await parseCredentialFile(bytes, 'x.csv');
  assert.equal(r.rows[1].lastName, 'Übel');
});

test('Komma-CSV ohne IServ-Spalte liefert Warnung', async () => {
  const csv = 'Benutzername,Passwort,Vorname\nb1,p1,A\nb2,p2,B\n';
  const r = await parseCredentialFile(Buffer.from(csv), 'x.csv');
  assert.equal(r.rows.length, 2);
  assert.ok(r.warnings.some((w) => w.includes('IServ')));
});

test('fehlende Pflichtspalten werden gemeldet', async () => {
  await assert.rejects(() => parseCredentialFile(Buffer.from('a;b\n1;2\n'), 'x.csv'), /Benutzername/);
});

test('XLSX mit Titelzeile wird gelesen', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Zugangsdaten');
  ws.addRow(['Informatik-Biber 2026 – Zugangsdaten']);
  ws.addRow(['Klassen-/Kursname', 'Vorname', 'Nachname', 'Benutzername', 'Passwort', 'IServ-Account']);
  ws.addRow(['11', 'Ali', 'Kaya', 'biber-ali', 'Geheim9', 'ali.kaya']);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const r = await parseCredentialFile(buf, 'x.xlsx');
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].account, 'ali.kaya');
  assert.equal(r.rows[0].password, 'Geheim9');
});

test('Store: verschlüsselt, Import, Zuordnung, Merge', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biber-'));
  const s = new Store(dir, 'x'.repeat(40));
  const r = await parseCredentialFile(Buffer.from(CSV), 'x.csv');
  s.importRows(r.rows, 'replace', 'test');
  assert.equal(s.stats().total, 3);
  assert.equal(s.stats().unassigned, 1);
  assert.equal(s.byAccount('MAX.MUSTERMANN').username, 'biber-max');

  // Datei enthält kein Klartext-Passwort
  const raw = fs.readFileSync(path.join(dir, 'store.enc.json'), 'utf8');
  assert.ok(!raw.includes('biber-max') && !raw.includes('Pw1!'));

  // Zuordnung nachtragen, Doppelzuordnung verhindern
  const joerg = s.all().find((c) => c.username === 'biber-joerg');
  s.assign(joerg.id, 'joerg.uebel', 'test');
  assert.throws(() => s.assign(joerg.id, 'max.mustermann', 'test'), /bereits/);

  // Abruf zählen und beim Merge behalten
  s.markViewed(joerg.id);
  s.importRows([{ username: 'biber-joerg', password: 'neu', account: 'joerg.uebel' }], 'merge', 'test');
  const again = s.byAccount('joerg.uebel');
  assert.equal(again.password, 'neu');
  assert.equal(again.viewCount, 1);
  assert.equal(s.stats().total, 3);

  // Neu laden (Entschlüsselung) und falscher Schlüssel
  const s2 = new Store(dir, 'x'.repeat(40));
  assert.equal(s2.stats().total, 3);
  assert.throws(() => new Store(dir, 'y'.repeat(40)), /DATA_KEY/);
});

test('Phasen nach Datum (Europe/Berlin)', () => {
  const st = { phaseMode: 'auto', schnupperStart: '2026-09-14', schnupperEnd: '2026-11-06', contestStart: '2026-11-09', contestEnd: '2026-11-20' };
  assert.equal(currentPhase(st, new Date('2026-09-01T10:00:00Z')), 'vorbereitung');
  assert.equal(currentPhase(st, new Date('2026-09-30T10:00:00Z')), 'schnupper');
  assert.equal(currentPhase(st, new Date('2026-11-07T10:00:00Z')), 'pause');
  assert.equal(currentPhase(st, new Date('2026-11-08T23:30:00Z')), 'wettbewerb'); // 00:30 Berlin am 9.11.
  assert.equal(currentPhase(st, new Date('2026-11-21T10:00:00Z')), 'beendet');
  assert.equal(currentPhase({ ...st, phaseMode: 'wettbewerb' }, new Date('2026-09-30T10:00:00Z')), 'wettbewerb');
  assert.equal(daysUntil('2026-11-09', new Date('2026-09-30T10:00:00Z')), 40);
});

test('Lehrkräfte werden über IServ-Rollen, Gruppen oder Accountliste erkannt', async () => {
  const { detectTeacher, claimLabels, groupsOf, credentialsForGroups } = await import('../lib/teacher.js');
  const cfg = { admins: new Set(['admin.konto']), teacherAccounts: new Set(['extra.lehrer']), teacherRoles: ['lehrer', 'lehrkraft'] };
  // IServ-Format (Scope iserv:roles / iserv:groups)
  assert.ok(detectTeacher({ roles: [{ uuid: 'x', id: 'ROLE_1', displayName: 'Lehrer' }] }, 'a.b', cfg));
  assert.ok(detectTeacher({ groups: [{ id: 'g', act: 'lehrkraft', name: 'Lehrkräfte' }] }, 'a.b', cfg));
  assert.ok(detectTeacher({ roles: ['LEHRER'] }, 'a.b', cfg));
  assert.ok(detectTeacher({}, 'admin.konto', cfg));
  assert.ok(detectTeacher({}, 'extra.lehrer', cfg));
  assert.ok(!detectTeacher({ roles: [{ displayName: 'Schüler' }], groups: [{ act: 'klasse.8b', name: 'Klasse 8b' }] }, 'max.m', cfg));
  assert.ok(!detectTeacher({ name: 'Lehrer' }, 'max.m', cfg)); // nur Rollen-/Gruppen-Claims zählen
  assert.deepEqual(claimLabels({ roles: [{ displayName: 'Lehrer', id: 'ROLE_T' }] }).sort(), ['Lehrer', 'ROLE_T']);

  const creds = [
    { username: 'u3', className: '10a', lastName: 'Zander' },
    { username: 'u1', className: '9b', lastName: 'Arndt' },
    { username: 'u2', className: '10a', lastName: 'Becker' },
    { username: 'u4', className: '' },
  ];
  assert.deepEqual(groupsOf(creds).map((g) => [g.key, g.count]), [['9b', 1], ['10a', 2], ['–', 1]]);
  assert.deepEqual(credentialsForGroups(creds, ['10a', '9b']).entries.map((e) => e.c.username), ['u1', 'u2', 'u3']);
});

test('Schüler:innen in mehreren Gruppen: zählen überall, gedruckt wird einmal', async () => {
  const { groupsOf, credentialsForGroups, splitGroups, groupsOfCred } = await import('../lib/teacher.js');
  assert.deepEqual(splitGroups('Informatik 10, AG Robotik; informatik 10 |  10a '), ['Informatik 10', 'AG Robotik', '10a']);
  const creds = [
    { id: 'a', username: 'ua', className: '10a', lastName: 'Arndt', groups: ['Informatik 10', 'AG Robotik'] },
    { id: 'b', username: 'ub', className: '10b', lastName: 'Becker', groups: ['Informatik 10'] },
    { id: 'c', username: 'uc', className: '10a', lastName: 'Cramer', groups: [] },
  ];
  assert.deepEqual(groupsOfCred(creds[0]), ['10a', 'Informatik 10', 'AG Robotik']);
  assert.deepEqual(groupsOf(creds).map((g) => [g.key, g.count]), [['10a', 2], ['10b', 1], ['AG Robotik', 1], ['Informatik 10', 2]]);
  // Kurs über Klassengrenzen hinweg
  assert.deepEqual(credentialsForGroups(creds, ['Informatik 10']).entries.map((e) => [e.c.username, e.group]), [['ua', 'Informatik 10'], ['ub', 'Informatik 10']]);
  // gemeinsame Auswahl: keine doppelten Karten
  const { entries, skipped } = credentialsForGroups(creds, ['Informatik 10', '10a', 'AG Robotik']);
  assert.deepEqual(entries.map((e) => [e.c.username, e.group]), [['ua', '10a'], ['uc', '10a'], ['ub', 'Informatik 10']]);
  assert.equal(skipped, 2);
});

test('IServ-Gruppenliste: eine Zeile pro Mitgliedschaft, Personen zusammengefasst', async () => {
  const { parseGroupFile } = await import('../lib/importer.js');
  // Format wie der IServ-Export „Gruppenliste“ (UTF-8 mit BOM, Semikolon, Anführungszeichen)
  const csv = '\ufeffGruppe;Nachname;Vorname;Account;Klasse/Information\n' +
    '"Jahrgang 10";Muster;"Anna Lena";anna.lena.muster;10a\n' +
    '"Jahrgang 10";Beispiel;Tom;tom.beispiel;10b\n' +
    '"Kurs 10-Informatik";Muster;"Anna Lena";anna.lena.muster;10a\n' +
    '"Kurs 10-Informatik";Beispiel;Tom;tom.beispiel;10b\n' +
    '"AG Robotik";Muster;"Anna Lena";Anna.Lena.Muster;10a\n';
  const { persons, rows, hasNames } = await parseGroupFile(Buffer.from(csv), 'Export_Grouplist.csv');
  assert.equal(rows, 5);
  assert.ok(hasNames);
  assert.deepEqual(persons, [
    { account: 'anna.lena.muster', firstName: 'Anna Lena', lastName: 'Muster', className: '10a', groups: ['Jahrgang 10', 'Kurs 10-Informatik', 'AG Robotik'] },
    { account: 'tom.beispiel', firstName: 'Tom', lastName: 'Beispiel', className: '10b', groups: ['Jahrgang 10', 'Kurs 10-Informatik'] },
  ]);
});

test('Zuordnung Biber → IServ über Klasse + Name: nur eindeutige Treffer', async () => {
  const { matchCredentials, normClass, normName } = await import('../lib/matching.js');
  assert.equal(normClass('Klasse 10C'), '10c');
  assert.equal(normName('Zoé Bräunlich-Søren'), 'zoe braeunlich soren');
  const persons = [
    { account: 'anna.lena.muster', firstName: 'Anna Lena', lastName: 'Muster', className: '10a' },
    { account: 'tom.beispiel', firstName: 'Tom', lastName: 'Beispiel', className: '10b' },
    { account: 'mia.schulz', firstName: 'Mia', lastName: 'Schulz', className: '10c' },
    { account: 'mia.schulz2', firstName: 'Mia', lastName: 'Schulz', className: '10c' }, // gleicher Name, gleiche Klasse
    { account: 'ben.mueller', firstName: 'Ben', lastName: 'Müller', className: '10d' },
    { account: 'ben.mueller2', firstName: 'Ben', lastName: 'Müller', className: '10e' }, // gleicher Name, andere Klasse
    { account: 'schon.da', firstName: 'Schon', lastName: 'Da', className: '10a' },
  ];
  const creds = [
    { id: '1', username: 'b1', firstName: 'Anna', lastName: 'Muster', className: 'Klasse 10A' }, // nur 1. Vorname
    { id: '2', username: 'b2', firstName: 'Tom', lastName: 'Beispiel', className: '10b' },
    { id: '3', username: 'b3', firstName: 'Mia', lastName: 'Schulz', className: '10c' },
    { id: '4', username: 'b4', firstName: 'Ben', lastName: 'Mueller', className: '10e' },
    { id: '5', username: 'b5', firstName: 'Ben', lastName: 'Müller', className: 'Info-AG' }, // Klasse unbekannt, Name doppelt
    { id: '6', username: 'b6', firstName: 'Gibt', lastName: 'Esnicht', className: '10a' },
    { id: '7', username: 'b7', firstName: 'Schon', lastName: 'Da', className: '10a', account: 'schon.da' },
  ];
  const m = matchCredentials(creds, persons);
  const got = Object.fromEntries(m.proposals.map((p) => [p.cred.username, [p.person.account, p.level.id]]));
  assert.deepEqual(got, {
    b2: ['tom.beispiel', 'klasse'],
    b4: ['ben.mueller2', 'klasse'],
    b1: ['anna.lena.muster', 'vorname'],
  });
  assert.deepEqual(m.ambiguous.map((a) => [a.cred.username, a.candidates.map((c) => c.account)]), [
    ['b3', ['mia.schulz', 'mia.schulz2']],
    ['b5', ['ben.mueller', 'ben.mueller2']], // nicht „der übrig gebliebene“ Ben Müller
  ]);
  assert.deepEqual(m.unmatched.map((c) => c.username), ['b6']);
  assert.equal(m.alreadyAssigned, 1);

  // Gruppen und Zuordnungen landen im Speicher
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biber-groups-'));
  const store = new Store(dir, 'k'.repeat(40));
  store.importRows([
    { username: 'b1', password: 'p', account: '', firstName: 'Anna', lastName: 'Muster', className: '10a' },
    { username: 'b2', password: 'p', account: 'tom.beispiel', className: '10b', groups: ['Alt'] },
  ], 'replace', 't');
  const id1 = store.all()[0].id;
  assert.equal(store.assignMany([{ credId: id1, account: 'anna.lena.muster' }, { credId: id1, account: 'x' }], 't'), 1);
  assert.deepEqual(store.importGroups([{ account: 'anna.lena.muster', groups: ['Kurs Info'] }, { account: 'tom.beispiel', groups: ['Kurs Info'] }, { account: 'fremd', groups: ['Z'] }], 'add', 't'), { matched: 2, unknown: 1 });
  assert.deepEqual(store.byAccount('tom.beispiel').groups, ['Alt', 'Kurs Info']);
  store.importGroups([{ account: 'anna.lena.muster', groups: ['Neu'] }], 'replace', 't');
  assert.deepEqual(store.byAccount('tom.beispiel').groups, []);
  // erneuter Biber-Import ohne Gruppenspalte behält Gruppen
  store.importRows([{ username: 'b1', password: 'p2', account: 'anna.lena.muster', className: '10a' }], 'merge', 't');
  assert.deepEqual(store.byAccount('anna.lena.muster').groups, ['Neu']);
});
