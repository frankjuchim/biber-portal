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

/** Gruppen (Klassen-/Kursname aus dem Biber-Export) mit Anzahl, natürlich sortiert. */
export function groupsOf(credentials) {
  const map = new Map();
  for (const c of credentials) {
    const key = c.className || NO_GROUP;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map]
    .map(([key, count]) => ({ key, label: key === NO_GROUP ? 'Ohne Klasse/Kurs' : key, count }))
    .sort((a, b) => (a.key === NO_GROUP) - (b.key === NO_GROUP) || a.key.localeCompare(b.key, 'de', { numeric: true }));
}

export const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ');

/** Zugänge der gewählten Gruppen, sortiert nach Gruppe, dann Nachname/Vorname. */
export function credentialsForGroups(credentials, keys) {
  const want = new Set(keys);
  return credentials
    .filter((c) => want.has(c.className || NO_GROUP))
    .sort((a, b) =>
      (a.className || '').localeCompare(b.className || '', 'de', { numeric: true }) ||
      (a.lastName || '').localeCompare(b.lastName || '', 'de') ||
      (a.firstName || '').localeCompare(b.firstName || '', 'de') ||
      a.username.localeCompare(b.username, 'de', { numeric: true }));
}
