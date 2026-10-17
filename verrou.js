/* verrou.js — interrupteur à distance (OMJ Web Développement)
   Menus  : <script src="verrou.js" data-site="ombap"></script>            (ou kstay / kdreams)
   Caisses: <script src="verrou.js" data-site="caisses_ombap" data-all="caisses"></script>
            (caisses_ombap / caisses_kstay / caisses_kdreams)
   Lit Firestore : system/site_status
     verrou  : <site>:bool et le verrou global (all, ou le nom donné dans data-all)
     message : message_<site>, sinon message global (message, ou message_<data-all>)
     code    : code_<site>,    sinon code global    (code,    ou code_<data-all>)   — 404 par défaut */
(function () {
  var S = document.currentScript;
  var SITE = S ? S.getAttribute('data-site') : '';
  var ALL = (S && S.getAttribute('data-all')) || 'all';
  var PROJECT = 'omba-p-lounge';
  var API_KEY = 'AIzaSyAMbijp8xA3BLbaulDxZRzSh_jBNI8cqK8';
  var URL = 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
            '/databases/(default)/documents/system/site_status?key=' + API_KEY;
  var CK = 'omj_lock_' + SITE;
  var DEFAULT_MSG = 'Ce service est temporairement indisponible.';
  var TITLES = { '402': 'Service suspendu', '403': 'Accès refusé', '404': 'Page introuvable', '503': 'Service indisponible' };
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

  function showLock(msg, code) {
    locked = true;
    code = /^\d{3}$/.test(code || '') ? code : '404';
    whenBody(function () {
      document.title = code;
      document.body.className = '';
      document.body.removeAttribute('style');
      document.body.innerHTML =
        '<div style="position:fixed;inset:0;background:#0D0D0D;color:#F1EFE8;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;text-align:center;' +
        'padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;z-index:2147483647">' +
        '<div style="font-size:84px;font-weight:700;color:#D4AF37;line-height:1">' + esc(code) + '</div>' +
        '<div style="font-size:20px;margin:10px 0 18px">' + esc(TITLES[code] || 'Erreur') + '</div>' +
        '<div style="max-width:340px;font-size:15px;line-height:1.5;color:#b8b6ae">' + esc(msg || DEFAULT_MSG) + '</div>' +
        '</div>';
    });
  }

  function save(l, m, c) {
    try { localStorage.setItem(CK, JSON.stringify({ l: l, m: m || '', c: c || '' })); } catch (e) {}
  }

  // Dernier état connu « verrouillé » : on bloque tout de suite (même hors ligne)
  try {
    var cached = JSON.parse(localStorage.getItem(CK) || 'null');
    if (cached && cached.l) showLock(cached.m, cached.c);
  } catch (e) {}

  function bool(f) { return !!(f && f.booleanValue === true); }
  function str(f, k) { return (f[k] && f[k].stringValue) || ''; }

  function check() {
    fetch(URL, { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return { fields: {} };   // document absent = déverrouillé
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var f = j.fields || {};
        var isLocked = bool(f[ALL]) || bool(f[SITE]);
        var gMsg = ALL === 'all' ? 'message' : 'message_' + ALL;
        var gCode = ALL === 'all' ? 'code' : 'code_' + ALL;
        var m = str(f, 'message_' + SITE) || str(f, gMsg);
        var c = str(f, 'code_' + SITE) || str(f, gCode);
        if (isLocked) { save(true, m, c); if (!locked) showLock(m, c); }
        else { save(false, '', ''); if (locked) location.reload(); }
      })
      .catch(function () { /* réseau coupé : on garde l'état actuel */ });
  }

  check();
  setInterval(check, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  window.addEventListener('online', check);
})();
