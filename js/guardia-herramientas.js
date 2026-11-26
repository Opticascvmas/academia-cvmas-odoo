/* ═══════════════════════════════════════════════════════════════════════
   GUARDIA DE SESIÓN · Herramientas de la Academia CV+
   ───────────────────────────────────────────────────────────────────────
   Cada herramienta (herramientas/*.html) carga este archivo en su <head>:

     <script src="../js/guardia-herramientas.js"
             data-herramienta="simulador" data-modulo="sumas"></script>

   • Si la herramienta se abrió DENTRO de la Academia (modal con sesión
     iniciada), no hace nada.
   • Si se abrió sola (por ejemplo desde un botón de Odoo con el link
     directo), manda a la persona al login de la Academia y, al entrar,
     la Academia abre el módulo y la herramienta correcta. Así toda nota
     queda a nombre de quien inició sesión y llega a Firebase.
   • Simulador SUMÁS: si en este dispositivo hay misiones que se hicieron
     sin sesión, primero las muestra (para que la persona tome captura y
     la envíe a Capacitación) y luego ofrece entrar a la Academia.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s) return;
  var herr = s.getAttribute('data-herramienta') || '';
  var mod = s.getAttribute('data-modulo') || '';

  // ¿La abrió la Academia? (misma página, con Firebase cargado)
  function esAcademia(w) {
    try { return !!(w && w !== window && w.document && (w.auth || w.CVP_UID)); }
    catch (e) { return false; }            // ventana de otro sitio (Odoo, etc.)
  }
  var opener = null; try { opener = window.opener; } catch (e) {}
  if (esAcademia(window.parent) || esAcademia(opener)) return;

  // Dirección de entrada: ../index.html?modulo=…&herramienta=…&ancla=…
  var q; try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
  if (mod.indexOf('{nivel}') !== -1) {
    var n = q && q.get('nivel'); if (!/^[0-4]$/.test(n || '')) n = '1';
    mod = mod.replace('{nivel}', n);
  }
  var dest;
  try {
    dest = new URL('../index.html', location.href);
    if (mod) dest.searchParams.set('modulo', mod);
    if (herr) dest.searchParams.set('herramienta', herr);
    var ancla = (location.hash || '').replace(/^#/, '');
    if (ancla) dest.searchParams.set('ancla', ancla);
    // parámetros propios de la herramienta (ej. ?nivel=2, ?o=precio&modo=practica)
    if (q) q.forEach(function (v, k) { dest.searchParams.set('h_' + k, v); });
    dest = dest.href;
  } catch (e) { dest = '../index.html'; }

  // Simulador SUMÁS: ¿hay misiones hechas sin sesión en este dispositivo?
  var locales = null;
  if (herr === 'simulador') {
    try { locales = JSON.parse(localStorage.getItem('sumas-sim-res') || 'null'); } catch (e) {}
    if (locales && !Object.keys(locales).some(function (k) { return locales[k] && locales[k].mejor > 0; })) locales = null;
  }
  if (!locales) { location.replace(dest); return; }

  // ── Pantalla con las notas guardadas en este dispositivo ──
  document.documentElement.className += ' cvp-guardia';
  var css = document.createElement('style');
  css.textContent =
    'html.cvp-guardia body>*:not(#cvp-guardia){display:none!important}' +
    '#cvp-guardia{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f7f8;font-family:Poppins,"Segoe UI",Arial,sans-serif;color:#373a36}' +
    '#cvp-guardia .c{background:#fff;max-width:560px;width:100%;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.10);border-top:6px solid #00abc8;padding:24px}' +
    '#cvp-guardia h1{font-size:19px;margin:0 0 6px}#cvp-guardia p{font-size:14px;line-height:1.5;margin:0 0 12px;color:#535651}' +
    '#cvp-guardia table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:14px}' +
    '#cvp-guardia th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b6e6a!important;background:#f0f4f6!important;padding:6px 8px;border-bottom:2px solid #e3e9eb}' +
    '#cvp-guardia td{padding:8px;border-bottom:1px solid #eef2f3}#cvp-guardia td.n{font-weight:700;color:#00abc8;font-size:16px}' +
    '#cvp-guardia .av{background:#fff6dd;border-left:4px solid #ffc629;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:14px}' +
    '#cvp-guardia .meta{font-size:11.5px;color:#6b6e6a;margin-bottom:14px}' +
    '#cvp-guardia a.b{display:inline-block;background:#00abc8;color:#fff;text-decoration:none;font-weight:600;border-radius:12px;padding:12px 20px;font-size:14px}';
  document.head.appendChild(css);

  var NOM = { afi: 'Afiliación', eti: 'Etiquetas 1 y 2', tra: 'Puntos y tramos', tyc: 'Términos y condiciones' };
  function f(d) { try { return new Date(d).toLocaleString('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var filas = ['afi', 'eti', 'tra', 'tyc'].filter(function (k) { return locales[k] && locales[k].mejor > 0; }).map(function (k) {
    var r = locales[k];
    return '<tr><td>' + NOM[k] + '</td><td class="n">' + esc(r.mejor) + ' %</td><td>' + esc(r.intentos || 1) + '</td><td>' + esc(f(r.fecha)) + '</td></tr>';
  }).join('');

  function pintar() {
    if (document.getElementById('cvp-guardia')) return;
    var d = document.createElement('div'); d.id = 'cvp-guardia';
    d.innerHTML = '<div class="c">' +
      '<h1>🔒 Para que tu nota cuente, entra con tu usuario</h1>' +
      '<p>Abriste el Simulador SUMÁS sin iniciar sesión. Estas misiones quedaron guardadas <b>solo en este dispositivo</b> y no le llegaron a Capacitación:</p>' +
      '<table><thead><tr><th>Misión</th><th>Mejor nota</th><th>Intentos</th><th>Fecha</th></tr></thead><tbody>' + filas + '</tbody></table>' +
      '<div class="av">📸 <b>Toma captura de esta pantalla</b> y envíala a Capacitación con tu nombre completo y sucursal. Así se te reconoce la nota sin repetir el simulador.</div>' +
      '<div class="meta">Pantalla generada el ' + esc(f(new Date())) + '</div>' +
      '<a class="b" href="' + esc(dest) + '">Entrar a la Academia →</a></div>';
    document.body.insertBefore(d, document.body.firstChild);
  }
  if (document.body) pintar(); else document.addEventListener('DOMContentLoaded', pintar);
})();
