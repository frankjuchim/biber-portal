// Verwaltung: Dateiauswahl/Drag & Drop, Tabellenfilter, Sicherheitsabfragen.
(function () {
  'use strict';

  // Dropzone
  var zone = document.querySelector('[data-dropzone]');
  if (zone) {
    var input = zone.querySelector('[data-file]');
    var nameEl = zone.querySelector('[data-file-name]');
    var submit = zone.querySelector('[data-upload]');
    var show = function () {
      var f = input.files && input.files[0];
      nameEl.textContent = f ? f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)' : '';
      submit.disabled = !f;
    };
    input.addEventListener('change', show);
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; show(); }
    });
  }

  // Tabellenfilter
  var text = document.querySelector('[data-filter-text]');
  var cls = document.querySelector('[data-filter-class]');
  var state = document.querySelector('[data-filter-state]');
  var countEl = document.querySelector('[data-filter-count]');
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-row]'));
  function applyFilter() {
    var q = (text && text.value || '').trim().toLowerCase();
    var c = cls ? cls.value : '';
    var s = state ? state.value : '';
    var shown = 0;
    rows.forEach(function (r) {
      var ok = (!q || r.getAttribute('data-search').indexOf(q) !== -1) &&
        (!c || r.getAttribute('data-class') === c) &&
        (!s || r.getAttribute('data-state') === s);
      r.hidden = !ok;
      if (ok) shown++;
    });
    if (countEl) countEl.textContent = rows.length ? shown + ' von ' + rows.length + ' Einträgen angezeigt' : '';
  }
  [text, cls, state].forEach(function (el) { if (el) el.addEventListener('input', applyFilter); });
  applyFilter();

  // Rückfrage vor dem Löschen einzelner Einträge
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault();
    });
  });
})();
