// Ermittelt die aktuelle Wettbewerbsphase (Zeitzone Europe/Berlin).

export const PHASES = {
  vorbereitung: {
    label: 'Bald',
    title: 'Schnupper-Biber. Bald.',
    text: 'Deine Daten sind schon da. Der Probelauf startet in Kürze.',
    target: 'login',
    cta: 'Anmelden',
  },
  schnupper: {
    label: 'Schnupper-Biber läuft',
    title: 'Üben. Jetzt.',
    text: 'Wie der echte Wettbewerb. Nach dem Login unter „Wettbewerbe“.',
    target: 'schnupper',
    cta: 'Zum Schnupper-Biber',
  },
  pause: {
    label: 'Gleich geht’s los',
    title: 'Kurz durchatmen.',
    text: 'Die Biberwochen starten bald. Im Unterricht.',
    target: 'login',
    cta: 'Anmelden',
  },
  wettbewerb: {
    label: 'Biberwochen',
    title: 'Jetzt zählt’s.',
    text: 'Anmelden. Starten erst, wenn deine Lehrkraft es sagt.',
    target: 'login',
    cta: 'Zum Wettbewerb',
  },
  beendet: {
    label: 'Beendet',
    title: 'Geschafft.',
    text: 'Ergebnisse im Dezember. Gleicher Login.',
    target: 'login',
    cta: 'Anmelden',
  },
};

export function todayBerlin(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now); // YYYY-MM-DD
}

export function currentPhase(settings, now = new Date()) {
  if (settings.phaseMode && settings.phaseMode !== 'auto' && PHASES[settings.phaseMode]) {
    return settings.phaseMode;
  }
  const d = todayBerlin(now);
  if (d < settings.schnupperStart) return 'vorbereitung';
  if (d <= settings.schnupperEnd) return 'schnupper';
  if (d < settings.contestStart) return 'pause';
  if (d <= settings.contestEnd) return 'wettbewerb';
  return 'beendet';
}

export function daysUntil(dateStr, now = new Date()) {
  const [y, m, d] = todayBerlin(now).split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y, m - 1, d)) / 86400000);
}

export function formatDateDe(dateStr, style = 'long') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const opts = style === 'short' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('de-DE', { ...opts, timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** Wettbewerbsjahr aus den Einstellungen (Start der Biberwochen), z. B. 2026. */
export function contestYear(settings) {
  const y = String(settings?.contestStart || '').slice(0, 4);
  return /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
}
