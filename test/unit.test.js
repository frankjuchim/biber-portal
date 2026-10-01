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
