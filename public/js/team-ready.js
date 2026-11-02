// Läuft im kleinen Abmelde-Fenster nach der IServ-Abmeldung (Rücksprung von IServ):
// dem Portal-Fenster Bescheid geben und schließen. Das Portal-Fenster wechselt dann zur Team-Anmeldung.
(function () {
  try {
    if (window.opener && !window.opener.closed) window.opener.postMessage('biber-team-ready', window.location.origin);
  } catch (e) { /* Portal-Fenster wartet sonst einige Sekunden und macht selbst weiter */ }
  window.close();
})();
