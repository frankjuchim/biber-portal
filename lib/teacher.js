// Lehrkräfte erkennen (IServ-Rollen/-Gruppen) und Zugänge nach Gruppen ordnen.

/**
 * Sammelt lesbare Bezeichnungen aus Rollen- und Gruppen-Claims.
 * IServ liefert z. B. roles: [{ uuid, id, displayName }] und groups: [{ id, act, name }];
 * einfache Zeichenketten werden ebenfalls verstanden.
 */
export function claimLabels(claims = {}) {
  const out = new Set();
  for (const [key, value] of Object.entries(claims)) {
    if (!/role|group/i.test(key)) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === 'string') out.add(entry.trim());
      else if (entry && typeof entry === 'object') {
        for (const f of ['displayName', 'name', 'act', 'id']) if (typeof entry[f] === 'string') out.add(entry[f].trim());
      }
    }
  }
  out.delete('');
  return [...out];
}

/** Anzeigenamen der IServ-Rollen (für den Hinweis „erkannt als …“). */
export function roleNames(claims = {}) {
  const roles = claims.roles || claims['iserv:roles'] || [];
  return (Array.isArray(roles) ? roles : [roles])
    .map((r) => (typeof r === 'string' ? r : r?.displayName || r?.name || ''))
    .filter(Boolean)
    .slice(0, 6);
}

export function detectTeacher(claims, account, cfg) {
  if (cfg.admins.has(account) || cfg.teacherAccounts.has(account)) return true;
  const wanted = new Set(cfg.teacherRoles);
  return claimLabels(claims).some((l) => wanted.has(l.toLowerCase()));
}

export const NO_GROUP = '–';
const byName = (a, b) => a.localeCompare(b, 'de', { numeric: true });

/** Zerlegt „Informatik 10, AG Robotik; 10a“ in einzelne Gruppennamen (ohne Dubletten). */
export function splitGroups(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[,;|\n]+/);
  const seen = new Set();
  const out = [];
  for (const g of list) {
    const name = String(g).trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out.slice(0, 50);
}

/** Alle Gruppen eines Zugangs: Klasse/Kurs aus dem Biber-Export plus weitere Gruppen. */
export function groupsOfCred(c) {
  return splitGroups([c.className || '', ...(c.groups || [])]);
}

/**
 * Gruppen mit Anzahl, natürlich sortiert. Ein Zugang kann in mehreren Gruppen
 * stehen (z. B. Klasse 10a, Informatik-Kurs, AG) und zählt dann in jeder.
 */
export function groupsOf(credentials) {
  const map = new Map();
  for (const c of credentials) {
    const gs = groupsOfCred(c);
    for (const key of gs.length ? gs : [NO_GROUP]) map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map]
    .map(([key, count]) => ({ key, label: key === NO_GROUP ? 'Ohne Klasse/Kurs' : key, count }))
    .sort((a, b) => (a.key === NO_GROUP) - (b.key === NO_GROUP) || byName(a.key, b.key));
}

export const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ');

/**
 * Karten für die gewählten Gruppen: [{ c, group }], je Gruppe nach Name sortiert.
 * Wer in mehreren gewählten Gruppen ist, bekommt nur eine Karte (in der ersten Gruppe);
 * `skipped` zählt diese Doppelungen.
 */
export function credentialsForGroups(credentials, keys) {
  const order = [...new Set(keys)].sort((a, b) => (a === NO_GROUP) - (b === NO_GROUP) || byName(a, b));
  const done = new Set();
  const entries = [];
  let skipped = 0;
  for (const group of order) {
    const members = credentials
      .filter((c) => {
        const gs = groupsOfCred(c);
        return group === NO_GROUP ? gs.length === 0 : gs.includes(group);
      })
      .sort((a, b) =>
        (a.lastName || '').localeCompare(b.lastName || '', 'de') ||
        (a.firstName || '').localeCompare(b.firstName || '', 'de') ||
        byName(a.username, b.username));
    for (const c of members) {
      if (done.has(c.id ?? c.username)) { skipped++; continue; }
      done.add(c.id ?? c.username);
      entries.push({ c, group: group === NO_GROUP ? '' : group });
    }
  }
  return { entries, skipped };
}
