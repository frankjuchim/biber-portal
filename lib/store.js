// Verschlüsselter Datenspeicher (AES-256-GCM) als eine Datei.
// Für die Größenordnung einer Schule (einige hundert bis wenige tausend Zeilen)
// ist das robust, ohne native Abhängigkeiten und vollständig "at rest" verschlüsselt.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalizeAccount } from './config.js';
import { splitGroups } from './teacher.js';

const FILE = 'store.enc.json';

export const DEFAULT_SETTINGS = {
  phaseMode: 'auto', // auto | vorbereitung | schnupper | pause | wettbewerb | beendet
  schnupperStart: '2026-09-14',
  schnupperEnd: '2026-11-06',
  contestStart: '2026-11-09',
  contestEnd: '2026-11-20',
  loginUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login',
  schnupperUrl: 'https://wettbewerb.informatik-biber.de/index.php?action=login',
  credentialsVisible: true,
  // Direkt-Login: Benutzername und Passwort werden per Formular an loginUrl geschickt
  directLogin: true,
  notice: '',
};

function emptyData() {
  return { version: 1, credentials: [], settings: { ...DEFAULT_SETTINGS }, audit: [] };
}

export class Store {
  constructor(dir, secret) {
    this.dir = dir;
    this.file = path.join(dir, FILE);
    // Schlüsselableitung aus beliebig langem Geheimnis
    this.key = crypto.scryptSync(secret, 'biber-portal/v1', 32);
    fs.mkdirSync(dir, { recursive: true });
    this.data = this.#load();
  }

  #load() {
    if (!fs.existsSync(this.file)) return emptyData();
    const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(raw.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(raw.tag, 'base64'));
    let plain;
    try {
      plain = Buffer.concat([decipher.update(Buffer.from(raw.data, 'base64')), decipher.final()]);
    } catch {
      throw new Error('Datenspeicher konnte nicht entschlüsselt werden – ist DATA_KEY korrekt?');
    }
    const data = JSON.parse(plain.toString('utf8'));
    data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    data.credentials ||= [];
    data.audit ||= [];
    return data;
  }

  #save() {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(this.data), 'utf8'), cipher.final()]);
    const payload = JSON.stringify({
      v: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: enc.toString('base64'),
    });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, payload, { mode: 0o600 });
    fs.renameSync(tmp, this.file); // atomar
  }

  // ---------- Einstellungen ----------
  get settings() {
    return { ...DEFAULT_SETTINGS, ...this.data.settings }; // neue Einstellungen mit Standardwert
  }
  updateSettings(patch, actor) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.log(actor, 'settings', 'Einstellungen geändert');
    this.#save();
  }

  // ---------- Zugangsdaten ----------
  all() {
    return this.data.credentials;
  }
  byId(id) {
    return this.data.credentials.find((c) => c.id === id);
  }
  byAccount(account) {
    const a = normalizeAccount(account);
    if (!a) return null;
    return this.data.credentials.find((c) => c.account === a) || null;
  }

  stats() {
    const c = this.data.credentials;
    return {
      total: c.length,
      assigned: c.filter((x) => x.account).length,
      unassigned: c.filter((x) => !x.account).length,
      viewed: c.filter((x) => x.firstViewedAt).length,
    };
  }

  /**
   * Übernimmt geprüfte Importzeilen.
   * mode "replace": alle bisherigen Zugangsdaten werden ersetzt.
   * mode "merge": Abgleich über den Biber-Benutzernamen; bestehende Abrufzähler bleiben erhalten.
   */
  importRows(rows, mode, actor) {
    const now = new Date().toISOString();
    const existing = new Map(this.data.credentials.map((c) => [c.username.toLowerCase(), c]));
    const next = mode === 'replace' ? [] : [...this.data.credentials];
    const index = new Map(next.map((c, i) => [c.username.toLowerCase(), i]));
    let added = 0, updated = 0;

    for (const r of rows) {
      const key = r.username.toLowerCase();
      const prev = existing.get(key);
      const rec = {
        id: prev?.id || crypto.randomUUID(),
        account: normalizeAccount(r.account),
        username: r.username,
        password: r.password,
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        className: r.className || '',
        level: r.level || '',
        // weitere Gruppen: aus der Datei, sonst bisherige behalten
        groups: r.groups ?? prev?.groups ?? [],
        importedAt: now,
        firstViewedAt: prev?.firstViewedAt || null,
        lastViewedAt: prev?.lastViewedAt || null,
        viewCount: prev?.viewCount || 0,
      };
      if (index.has(key)) {
        next[index.get(key)] = rec;
        updated++;
      } else {
        index.set(key, next.length);
        next.push(rec);
        added++;
      }
    }
    // Ein IServ-Account darf nur einmal zugeordnet sein: spätere Zeile gewinnt.
    const seen = new Map();
    for (let i = next.length - 1; i >= 0; i--) {
      const a = next[i].account;
      if (!a) continue;
      if (seen.has(a)) next[i] = { ...next[i], account: '' };
      else seen.set(a, i);
    }
    this.data.credentials = next;
    this.log(actor, 'import', `${mode === 'replace' ? 'Ersetzt' : 'Ergänzt'}: ${added} neu, ${updated} aktualisiert`);
    this.#save();
    return { added, updated };
  }

  /** Prüft und normalisiert die Felder eines einzelnen Zugangs (Formular). */
  #validate(fields, selfId) {
    const t = (v, n) => String(v ?? '').trim().slice(0, n);
    const username = t(fields.username, 120);
    const password = String(fields.password ?? '').trim();
    if (!username) throw new Error('Der Biber-Benutzername fehlt.');
    if (!password) throw new Error('Das Passwort fehlt.');
    if (password.length > 120) throw new Error('Das Passwort ist zu lang.');
    const account = normalizeAccount(fields.account);
    if (account && !/^[a-z0-9._-]+$/.test(account)) {
      throw new Error('Der IServ-Account darf nur Kleinbuchstaben, Ziffern, Punkt, Binde- und Unterstrich enthalten.');
    }
    const others = this.data.credentials.filter((c) => c.id !== selfId);
    const dupU = others.find((c) => c.username.toLowerCase() === username.toLowerCase());
    if (dupU) {
      const who = [dupU.firstName, dupU.lastName].filter(Boolean).join(' ') || dupU.account || 'ohne Namen';
      throw new Error(`Der Biber-Benutzername „${username}“ ist schon vergeben (${who}).`);
    }
    if (account) {
      const dupA = others.find((c) => c.account === account);
      if (dupA) throw new Error(`Der IServ-Account „${account}“ ist bereits ${dupA.username} zugeordnet.`);
    }
    return {
      username,
      password,
      account,
      firstName: t(fields.firstName, 80),
      lastName: t(fields.lastName, 80),
      className: t(fields.className, 40),
      level: t(fields.level, 20),
      groups: splitGroups(fields.groups),
    };
  }

  /** Legt einen einzelnen Zugang an (Formular). */
  addOne(fields, actor) {
    const v = this.#validate(fields, null);
    const rec = {
      id: crypto.randomUUID(),
      ...v,
      importedAt: new Date().toISOString(),
      source: 'formular',
      firstViewedAt: null,
      lastViewedAt: null,
      viewCount: 0,
    };
    this.data.credentials.push(rec);
    this.log(actor, 'create', `Einzeln angelegt: ${rec.username}${rec.account ? ` → ${rec.account}` : ''}`);
    this.#save();
    return rec;
  }

  /** Ändert einen bestehenden Zugang (Formular). Abrufzähler bleiben erhalten. */
  update(id, fields, actor) {
    const rec = this.byId(id);
    if (!rec) throw new Error('Eintrag nicht gefunden.');
    const v = this.#validate(fields, id);
    const flat = (x) => (Array.isArray(x) ? x.join('\n') : x || '');
    const changed = Object.keys(v).filter((k) => flat(rec[k]) !== flat(v[k]));
    Object.assign(rec, v, { updatedAt: new Date().toISOString() });
    const label = { username: 'Benutzername', password: 'Passwort', account: 'IServ', firstName: 'Vorname', lastName: 'Nachname', className: 'Klasse', level: 'Stufe', groups: 'Gruppen' };
    this.log(actor, 'update', `${rec.username} geändert${changed.length ? ` (${changed.map((k) => label[k]).join(', ')})` : ' (keine Änderung)'}`);
    this.#save();
    return { rec, changed };
  }

  /**
   * Weitere Gruppen per IServ-Account setzen (Gruppenliste).
   * mode "add": ergänzen; mode "replace": weitere Gruppen aller Zugänge durch die Datei ersetzen.
   */
  importGroups(memberships, mode, actor) {
    const byAcc = new Map(memberships.map((m) => [normalizeAccount(m.account), m.groups]));
    let matched = 0;
    for (const c of this.data.credentials) {
      const groups = c.account ? byAcc.get(c.account) : undefined;
      if (groups) {
        c.groups = splitGroups(mode === 'replace' ? groups : [...(c.groups || []), ...groups]);
        matched++;
      } else if (mode === 'replace') {
        c.groups = [];
      }
    }
    const known = new Set(this.data.credentials.map((c) => c.account).filter(Boolean));
    const unknown = [...byAcc.keys()].filter((a) => !known.has(a)).length;
    this.log(actor, 'groups', `Gruppen ${mode === 'replace' ? 'ersetzt' : 'ergänzt'}: ${matched} Zugänge${unknown ? `, ${unknown} Accounts ohne Zugang` : ''}`);
    this.#save();
    return { matched, unknown };
  }

  assign(id, account, actor) {
    const rec = this.byId(id);
    if (!rec) throw new Error('Eintrag nicht gefunden.');
    const a = normalizeAccount(account);
    if (a) {
      const other = this.byAccount(a);
      if (other && other.id !== id) {
        throw new Error(`Der IServ-Account „${a}“ ist bereits ${other.username} zugeordnet.`);
      }
    }
    rec.account = a;
    this.log(actor, 'assign', `${rec.username} → ${a || '(keine Zuordnung)'}`);
    this.#save();
    return rec;
  }

  remove(id, actor) {
    const rec = this.byId(id);
    if (!rec) return;
    this.data.credentials = this.data.credentials.filter((c) => c.id !== id);
    this.log(actor, 'delete', `Eintrag ${rec.username} gelöscht`);
    this.#save();
  }

  clearAll(actor) {
    const n = this.data.credentials.length;
    this.data.credentials = [];
    this.log(actor, 'clear', `Alle ${n} Zugangsdaten gelöscht`);
    this.#save();
  }

  markViewed(id) {
    const rec = this.byId(id);
    if (!rec) return;
    const now = new Date().toISOString();
    rec.firstViewedAt ||= now;
    rec.lastViewedAt = now;
    rec.viewCount = (rec.viewCount || 0) + 1;
    this.#save();
  }

  // ---------- Protokoll (nur Admin-Aktionen) ----------
  log(actor, action, detail) {
    this.data.audit.unshift({ at: new Date().toISOString(), actor: actor || 'system', action, detail });
    this.data.audit = this.data.audit.slice(0, 200);
  }
  /** Protokolleintrag ohne Datenänderung (z. B. Kartendruck). */
  note(actor, action, detail) {
    this.log(actor, action, detail);
    this.#save();
  }
  audit(limit = 25) {
    return this.data.audit.slice(0, limit);
  }
}
