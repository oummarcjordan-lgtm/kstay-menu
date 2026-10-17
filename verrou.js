/* verrou.js — interrupteur à distance (OMJ Web Développement)
   Usage : <script src="verrou.js" data-site="ombap"></script>  (ou kstay / kdreams)
   Lit Firestore : system/site_status  { all:bool, ombap:bool, kstay:bool, kdreams:bool, message:string } */
(function () {
  var S = document.currentScript;
  var SITE = S ? S.getAttribute('data-site') : '';
  var PROJECT = 'omba-p-lounge';
  var API_KEY = 'AIzaSyAMbijp8xA3BLbaulDxZRzSh_jBNI8cqK8';
  var URL = 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
            '/databases/(default)/documents/system/site_status?key=' + API_KEY;
  var CK = 'omj_lock_' + SITE;
  var DEFAULT_MSG = 'Ce service est temporairement indisponible.';
  var locked = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function whenBody(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function showLock(msg) {
    locked = true;
    whenBody(function () {
      document.title = '404';
      document.body.className = '';
      document.body.removeAttribute('style');
      document.body.innerHTML =
        '<div style="position:fixed;inset:0;background:#0D0D0D;color:#F1EFE8;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;text-align:center;' +
        'padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;z-index:2147483647">' +
        '<div style="font-size:84px;font-weight:700;color:#D4AF37;line-height:1">404</div>' +
        '<div style="font-size:20px;margin:10px 0 18px">Page introuvable</div>' +
        '<div style="max-width:340px;font-size:15px;line-height:1.5;color:#b8b6ae">' + esc(msg || DEFAULT_MSG) + '</div>' +
        '</div>';
    });
  }

  function save(l, m) {
    try { localStorage.setItem(CK, JSON.stringify({ l: l, m: m || '' })); } catch (e) {}
  }

  // Si le dernier état connu est « verrouillé », on bloque immédiatement (même hors ligne)
  try {
    var c = JSON.parse(localStorage.getItem(CK) || 'null');
    if (c && c.l) showLock(c.m);
  } catch (e) {}

  function bool(f) { return !!(f && f.booleanValue === true); }

  function check() {
    fetch(URL, { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return { fields: {} };   // document absent = déverrouillé
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var f = j.fields || {};
        var isLocked = bool(f.all) || bool(f[SITE]);
        var m = (f['message_' + SITE] && f['message_' + SITE].stringValue) ||
                (f.message && f.message.stringValue) || '';
        if (isLocked) { save(true, m); if (!locked) showLock(m); }
        else { save(false, ''); if (locked) location.reload(); }
      })
      .catch(function () { /* réseau coupé : on garde l'état actuel */ });
  }

  check();
  setInterval(check, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  window.addEventListener('online', check);
})();
