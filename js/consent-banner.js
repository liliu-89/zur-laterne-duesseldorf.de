(() => {
  'use strict';

  /* ===== Keys ===== */
  const CONSENT_KEY = 'gp_consent_prefs';
  const CONSENT_SET = 'gp_consent_set';
  const COOKIE_DAYS = 180;

  /* ===== Cookie Helpers ===== */
  function setCookie(name, value, days = COOKIE_DAYS) {
    try {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      const expires = 'expires=' + date.toUTCString();
      // Secure nur auf https; falls lokal ohne https getestet wird, kannst du 'Secure' temporär entfernen.
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax; Secure`;
    } catch (_) {}
  }
  function deleteCookie(name) {
    try {
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
    } catch (_) {}
  }

  /* ===== Consent Mode Mapping ===== */
  function consentModeFromPrefs(p) {
    const stats = !!p.statistics, mkt = !!p.marketing;
    return {
      ad_storage:           mkt ? 'granted' : 'denied',
      ad_user_data:         mkt ? 'granted' : 'denied',
      ad_personalization:   mkt ? 'granted' : 'denied',
      analytics_storage:    stats ? 'granted' : 'denied'
    };
  }

  /* ===== Persist + DataLayer + Cookies ===== */
  function persistConsent(prefs) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
      localStorage.setItem(CONSENT_SET, 'true');
    } catch (_) {}

    // Cookies für GTM-Variablen
    setCookie('consent_marketing',  prefs.marketing  ? 'granted' : 'denied');
    setCookie('consent_statistics', prefs.statistics ? 'granted' : 'denied');
  }

  function clearConsentCookies() {
    deleteCookie('consent_marketing');
    deleteCookie('consent_statistics');
  }

  function applyConsent(prefs, source) {
    const cm = consentModeFromPrefs(prefs);

    // Google Consent Mode (optional)
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', cm);
    }

    // GTM DataLayer Events (optional)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_update',
      consent_categories: {
        essential: true,
        statistics: !!prefs.statistics,
        marketing:  !!prefs.marketing
      },
      consent_mode: cm,
      consent_source: source || 'unknown'
    });

    persistConsent(prefs);
  }

  /* ===== Externe Ressourcen nur nach Consent laden ===== */
  function loadExternalByConsent(prefs) {
    // MARKETING → Elfsight, Material (esm.run), Google Fonts extern
    if (prefs.marketing) {
      // Elfsight (Platzhalter/Widget umschalten)
      const ph = document.getElementById('reviews-placeholder');
      const w  = document.getElementById('reviews-widget');
      if (ph) ph.style.display = 'none';
      if (w)  w.style.display  = 'block';
      addScript('https://elfsightcdn.com/platform.js', { async: true });

      // Material Web (nur falls md-* genutzt; sonst auskommentieren/entfernen)
      addModule('https://esm.run/@material/web/button/filled-button.js');
      addModule('https://esm.run/@material/web/icon/icon.js');
      addModule('https://esm.run/@material/web/iconbutton/icon-button.js');

      // Google Fonts extern (falls NICHT lokal gehostet)
      addLink('preconnect', 'https://fonts.googleapis.com');
      const pg = document.createElement('link');
      pg.rel = 'preconnect'; pg.href = 'https://fonts.gstatic.com'; pg.crossOrigin = 'anonymous';
      document.head.appendChild(pg);
      addStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Merriweather:wght@400;700&display=swap');
    }

    // STATISTICS → z. B. GA4/GTM zusätzliche Libs erst nach Zustimmung
    if (prefs.statistics) {
      // Beispiel:
      // addScript('https://www.googletagmanager.com/gtag/js?id=G-XXXX', { async: true });
      // addInline(`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-XXXX');`);
    }
  }

  /* ===== Init nach DOM ready ===== */
  function initConsent() {
    const banner   = document.getElementById('consent-banner');
    if (!banner) return;

    const tStats   = document.getElementById('toggle-statistics');
    const tMkt     = document.getElementById('toggle-marketing');
    const btnAll   = document.getElementById('btn-accept-all');
    const btnSel   = document.getElementById('btn-accept-selection');
    const btnDecl  = document.getElementById('btn-decline-all');

    // Bereits gesetzte Präferenzen wiederherstellen
    try {
      const hasSet = localStorage.getItem(CONSENT_SET) === 'true';
      if (hasSet) {
        const prefs = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}');
        if (tStats) tStats.checked = !!prefs.statistics;
        if (tMkt)   tMkt.checked   = !!prefs.marketing;

        // Google Consent Mode & Cookies erneut anwenden (robust gegen manuelles Cookie-Löschen)
        applyConsent(prefs, 'restore');
        loadExternalByConsent(prefs);

        // Banner geschlossen lassen
        banner.hidden = true;
      } else {
        banner.hidden = false;
      }
    } catch (_) {
      banner.hidden = false;
    }

    // Buttons verdrahten
    btnAll && btnAll.addEventListener('click', () => {
      const prefs = { statistics: true, marketing: true };
      applyConsent(prefs, 'accept_all');
      loadExternalByConsent(prefs);
      banner.hidden = true;
    });

    btnSel && btnSel.addEventListener('click', () => {
      const prefs = {
        statistics: !!(tStats && tStats.checked),
        marketing:  !!(tMkt   && tMkt.checked)
      };
      applyConsent(prefs, 'accept_selection');
      loadExternalByConsent(prefs);
      banner.hidden = true;
    });

    btnDecl && btnDecl.addEventListener('click', () => {
      const prefs = { statistics: false, marketing: false };
      applyConsent(prefs, 'decline_all');
      // Cookies explizit auf denied gesetzt (persistConsent erledigt das bereits),
      // externe Ressourcen werden nicht geladen.
      banner.hidden = true;
    });

    // Expose Reopen (für „Cookie-Einstellungen ändern“)
    window.openConsentBanner = function openConsentBanner() {
      try {
        const prefs = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}');
        if (tStats) tStats.checked = !!prefs.statistics;
        if (tMkt)   tMkt.checked   = !!prefs.marketing;
      } catch (_) {}
      banner.hidden = false;
    };
  }

  /* ===== Loader-Utilities ===== */
  function addScript(src, attrs = {}) {
    const s = document.createElement('script');
    s.src = src;
    Object.assign(s, attrs);
    document.body.appendChild(s);
  }
  function addModule(src) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    document.body.appendChild(s);
  }
  function addStylesheet(href) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function addLink(rel, href) {
    const l = document.createElement('link');
    l.rel = rel;
    l.href = href;
    document.head.appendChild(l);
  }
  function addInline(js) {
    const s = document.createElement('script');
    s.text = js;
    document.body.appendChild(s);
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsent, { once: true });
  } else {
    initConsent();
  }
})();
