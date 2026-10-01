// Liest den Zugangsdaten-Export des Informatik-Biber (CSV oder Excel),
// ergänzt um eine Spalte mit dem IServ-Accountnamen.

import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { normalizeAccount } from './config.js';

// Spaltenerkennung: normalisierter Kopf -> Feld
const ALIASES = {
  account: ['iserv', 'iservaccount', 'iservaccountname', 'iservaccounts', 'iservlogin', 'iservbenutzer', 'iservbenutzername', 'iservkonto', 'iservname', 'account', 'accountname', 'konto'],
  username: ['benutzername', 'username', 'login', 'loginname', 'benutzer', 'biberbenutzername', 'biberlogin', 'nutzername'],
  password: ['passwort', 'password', 'kennwort', 'pw', 'biberpasswort'],
  firstName: ['vorname', 'firstname', 'vornamen'],
  lastName: ['nachname', 'lastname', 'familienname', 'name'],
  className: ['klassenkursname', 'klasse', 'kurs', 'klassekurs', 'klassenname', 'kursname', 'gruppe', 'lerngruppe', 'class'],
  level: ['stufe', 'jahrgang', 'jahrgangsstufe', 'klassenstufe', 'level', 'altersstufe'],
};

export const FIELD_LABELS = {
  account: 'IServ-Account',
  username: 'Benutzername',
  password: 'Passwort',
  firstName: 'Vorname',
  lastName: 'Nachname',
  className: 'Klasse/Kurs',
  level: 'Stufe',
};

function normHeader(h) {
  return String(h ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function mapHeaders(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (map[field] !== undefined) continue;
      if (aliases.includes(n)) { map[field] = i; return; }
    }
  });
  // "Name" nur als Nachname werten, wenn es keinen expliziten Nachnamen gibt – bereits über Reihenfolge gelöst.
  return map;
}

function decodeText(buf) {
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf); // Excel-CSV (ANSI)
  return text.replace(/^﻿/, '');
}

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const counts = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of first) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function readTable(buffer, filename = '') {
  const isXlsx = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK" = ZIP
  if (isXlsx || /\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Die Excel-Datei enthält kein Tabellenblatt.');
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = [];
      for (let i = 1; i <= row.cellCount; i++) {
        const cell = row.getCell(i);
        let v = cell.text ?? '';
        if (v && typeof v === 'object') v = v.text ?? '';
        vals.push(String(v ?? '').trim());
      }
      rows.push(vals);
    });
    return rows;
  }
  if (/\.xls$/i.test(filename)) {
    throw new Error('Das alte .xls-Format wird nicht unterstützt. Bitte als .xlsx oder .csv speichern.');
  }
  const text = decodeText(buffer);
  return parse(text, {
    delimiter: detectDelimiter(text),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });
}

/**
 * Liefert { rows, warnings, errors, columns } – rows sind bereits normalisiert.
 */
export async function parseCredentialFile(buffer, filename) {
  if (!buffer?.length) throw new Error('Die Datei ist leer.');
  const table = (await readTable(buffer, filename)).filter((r) => r.some((c) => String(c).trim()));
  if (table.length < 2) throw new Error('Die Datei enthält keine Datenzeilen.');

  // Kopfzeile: erste Zeile, in der Benutzername UND Passwort erkannt werden (Exporte haben manchmal Titelzeilen)
  let headerIdx = -1, map = {};
  for (let i = 0; i < Math.min(table.length, 10); i++) {
    const m = mapHeaders(table[i]);
    if (m.username !== undefined && m.password !== undefined) { headerIdx = i; map = m; break; }
  }
  if (headerIdx < 0) {
    throw new Error('Spalten „Benutzername“ und „Passwort“ wurden nicht gefunden. Bitte den Zugangsdaten-Export des Informatik-Biber verwenden.');
  }

  const warnings = [];
  const errors = [];
  if (map.account === undefined) {
    warnings.push('Keine Spalte „IServ“ gefunden – alle Zeilen werden zunächst ohne Zuordnung übernommen und können im Admin-Bereich zugeordnet werden.');
  }

  const get = (row, f) => (map[f] === undefined ? '' : String(row[map[f]] ?? '').trim());
  const rows = [];
  const seenUser = new Map();
  const seenAcc = new Map();

  table.slice(headerIdx + 1).forEach((raw, i) => {
    const line = headerIdx + i + 2;
    const r = {
      line,
      account: normalizeAccount(get(raw, 'account')),
      username: get(raw, 'username'),
      password: get(raw, 'password'),
      firstName: get(raw, 'firstName'),
      lastName: get(raw, 'lastName'),
      className: get(raw, 'className'),
      level: get(raw, 'level'),
      issues: [],
    };
    if (!r.username && !r.password) return; // Leerzeile
    if (!r.username) { errors.push(`Zeile ${line}: Benutzername fehlt.`); return; }
    if (!r.password) { errors.push(`Zeile ${line}: Passwort fehlt (${r.username}).`); return; }
    if (r.account && !/^[a-z0-9._-]+$/.test(r.account)) {
      r.issues.push('IServ-Account enthält ungewöhnliche Zeichen');
    }
    const uk = r.username.toLowerCase();
    if (seenUser.has(uk)) {
      warnings.push(`Zeile ${line}: Benutzername ${r.username} doppelt (auch Zeile ${seenUser.get(uk)}) – die spätere Zeile gilt.`);
    }
    seenUser.set(uk, line);
    if (r.account) {
      if (seenAcc.has(r.account)) {
        warnings.push(`Zeile ${line}: IServ-Account ${r.account} doppelt (auch Zeile ${seenAcc.get(r.account)}) – nur die spätere Zeile wird zugeordnet.`);
      }
      seenAcc.set(r.account, line);
    } else {
      r.issues.push('ohne IServ-Zuordnung');
    }
    rows.push(r);
  });

  if (!rows.length) throw new Error('Keine gültigen Datenzeilen gefunden.');
  const columns = Object.keys(map).map((f) => FIELD_LABELS[f]);
  return { rows, warnings, errors, columns };
}
