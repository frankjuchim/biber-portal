// Läuft synchron im <head>: Theme vor dem ersten Zeichnen setzen, JS-Klasse markieren.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var t = localStorage.getItem('biber-theme');
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  } catch (e) { /* Speicher gesperrt – Systemeinstellung gilt */ }
})();
