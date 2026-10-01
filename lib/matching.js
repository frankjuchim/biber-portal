// Ordnet Biber-Zugänge (Name + Klasse aus dem Biber-Export) den IServ-Accounts zu,
// anhand einer IServ-Gruppenliste (Gruppe; Nachname; Vorname; Account; Klasse).
// Zugeordnet wird nur, was eindeutig ist – alles andere wird zur Prüfung angezeigt.

export function normName(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // é → e, ø bleibt ø
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** „Klasse 10c“, „10 C“, „10c“ → „10c“ */
export function normClass(s) {
  return normName(s).replace(/\bklasse\b/g, '').replace(/\s+/g, '');
}

const firstToken = (s) => normName(s).split(' ')[0] || '';

// Abgleichsstufen, von streng nach locker
const LEVELS = [
  { id: 'klasse', label: 'Klasse + Name', key: (p) => (p.cls && p.first && p.last ? `${p.cls}|${p.first}|${p.last}` : '') },
  { id: 'name', label: 'Name (Klasse abweichend)', key: (p) => (p.first && p.last ? `${p.first}|${p.last}` : '') },
  { id: 'vorname', label: 'Klasse + Nachname + 1. Vorname', key: (p) => (p.cls && p.first1 && p.last ? `${p.cls}|${p.first1}|${p.last}` : '') },
];

const prep = (firstName, lastName, className) => ({
  first: normName(firstName),
  first1: firstToken(firstName),
  last: normName(lastName),
  cls: normClass(className),
});

/**
 * @param credentials Biber-Zugänge
 * @param persons     IServ-Personen [{ account, firstName, lastName, className }]
 * @returns { proposals: [{ cred, person, level }], ambiguous: [{ cred, candidates }], unmatched: [cred], alreadyAssigned }
 */
export function matchCredentials(credentials, persons) {
  const taken = new Set(credentials.map((c) => c.account).filter(Boolean));
  const free = persons.filter((p) => !taken.has(p.account));
  const open = credentials.filter((c) => !c.account);

  const P = free.map((p) => ({ p, k: prep(p.firstName, p.lastName, p.className) }));
  const C = open.map((c) => ({ c, k: prep(c.firstName, c.lastName, c.className) }));

  const proposals = [];
  const ambiguous = new Map(); // credId -> Kandidaten
  const usedAcc = new Set();
  const doneCred = new Set();

  // Eindeutig heißt: genau eine IServ-Person UND genau ein Biber-Zugang mit diesem Schlüssel –
  // gezählt über alle, auch bereits vergebene (sonst würde „der Letzte übrig“ falsch zugeordnet).
  for (const level of LEVELS) {
    const idxP = new Map();
    for (const x of P) {
      const k = level.key(x.k);
      if (k) idxP.set(k, [...(idxP.get(k) || []), x.p]);
    }
    const idxC = new Map();
    for (const x of C) {
      const k = level.key(x.k);
      if (k) idxC.set(k, [...(idxC.get(k) || []), x.c]);
    }
    for (const [k, creds] of idxC) {
      const cands = idxP.get(k) || [];
      if (!cands.length) continue;
      const open = creds.filter((c) => !doneCred.has(c.id));
      if (!open.length) continue;
      if (cands.length === 1 && creds.length === 1 && !usedAcc.has(cands[0].account)) {
        const cred = creds[0];
        proposals.push({ cred, person: cands[0], level });
        usedAcc.add(cands[0].account);
        doneCred.add(cred.id);
        ambiguous.delete(cred.id);
      } else {
        for (const cred of open) if (!ambiguous.has(cred.id)) ambiguous.set(cred.id, { cred, candidates: cands });
      }
    }
  }

  const amb = [...ambiguous.values()].filter((a) => !doneCred.has(a.cred.id));
  const ambIds = new Set(amb.map((a) => a.cred.id));
  // „Nicht gefunden“ nur für Klassen, die in der Liste vorkommen – eine Liste nur für Jahrgang 10
  // soll nicht alle anderen Klassen als fehlend melden.
  const listClasses = new Set(persons.map((p) => normClass(p.className)).filter(Boolean));
  const rest = open.filter((c) => !doneCred.has(c.id) && !ambIds.has(c.id));
  const inScope = (c) => !listClasses.size || listClasses.has(normClass(c.className));
  const unmatched = rest.filter(inScope);
  const outOfScope = rest.length - unmatched.length;
  return { proposals, ambiguous: amb, unmatched, outOfScope, alreadyAssigned: credentials.length - open.length };
}
