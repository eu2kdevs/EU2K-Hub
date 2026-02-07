/**
 * GDPR Cookie Banner Script
 * Blokkolja a GDPR szerint beleegyezést igénylő scripteket, amíg a felhasználó nem fogadja el
 */

(function() {
  'use strict';

  const GDPR_CONSENT_KEY = 'eu2k-gdpr-consent-accepted';
  const GDPR_SCRIPTS_LOADED_KEY = 'eu2k-gdpr-scripts-loaded';

  // Ellenőrizzük, hogy már elfogadták-e
  function hasConsent() {
    try {
      const consent = localStorage.getItem(GDPR_CONSENT_KEY);
      console.log('[GDPR] Checking consent, value:', consent);
      return consent === 'true';
    } catch (e) {
      console.warn('[GDPR] Error checking consent:', e);
      return false;
    }
  }

  // Beállítjuk, hogy elfogadták
  function setConsent(accepted) {
    try {
      localStorage.setItem(GDPR_CONSENT_KEY, accepted ? 'true' : 'false');
    } catch (e) {
      console.warn('[GDPR] Failed to save consent:', e);
    }
  }

  // Ellenőrizzük, hogy már betöltöttük-e a scripteket
  function areScriptsLoaded() {
    try {
      return localStorage.getItem(GDPR_SCRIPTS_LOADED_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  // Megjelöljük, hogy betöltöttük a scripteket
  function markScriptsLoaded() {
    try {
      localStorage.setItem(GDPR_SCRIPTS_LOADED_KEY, 'true');
    } catch (e) {
      console.warn('[GDPR] Failed to mark scripts as loaded:', e);
    }
  }

  // GDPR scriptek betöltése
  function loadGDPRScripts() {
    if (areScriptsLoaded()) {
      console.log('[GDPR] Scripts already loaded, skipping...');
      return;
    }

    console.log('[GDPR] Loading GDPR-required scripts...');

    // Clarity tracking script
    try {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
        t = l.createElement(r); 
        t.async = 1; 
        t.src = "https://www.clarity.ms/tag/" + i;
        t.onerror = function() { 
          console.warn('[GDPR] Clarity script blocked by adblocker or browser settings');
        };
        t.onload = function() {
          console.log('[GDPR] Clarity tracking loaded successfully');
        };
        y = l.getElementsByTagName(r)[0]; 
        if (y && y.parentNode) {
          y.parentNode.insertBefore(t, y);
        } else {
          // Fallback: hozzáadjuk a head-hez
          if (document.head) {
            document.head.appendChild(t);
          }
        }
      })(window, document, "clarity", "script", "s6n7qpfkv4");
    } catch (e) {
      console.warn('[GDPR] Failed to load Clarity:', e);
    }

    // Firebase Analytics - ha van data-gdpr-analytics script, azt is betöltjük
    const analyticsScripts = document.querySelectorAll('script[data-gdpr-analytics]');
    analyticsScripts.forEach(script => {
      try {
        const src = script.getAttribute('data-src') || script.src;
        if (src) {
          const newScript = document.createElement('script');
          newScript.src = src;
          newScript.type = script.type || 'text/javascript';
          if (script.async) newScript.async = true;
          if (script.defer) newScript.defer = true;
          document.head.appendChild(newScript);
          console.log('[GDPR] Analytics script loaded:', src);
        }
      } catch (e) {
        console.warn('[GDPR] Failed to load analytics script:', e);
      }
    });

    // Egyéb GDPR scriptek betöltése
    const gdprScripts = document.querySelectorAll('script[data-gdpr-required]');
    gdprScripts.forEach(script => {
      try {
        const src = script.getAttribute('data-src') || script.src;
        if (src) {
          const newScript = document.createElement('script');
          newScript.src = src;
          newScript.type = script.type || 'text/javascript';
          if (script.async) newScript.async = true;
          if (script.defer) newScript.defer = true;
          document.head.appendChild(newScript);
          console.log('[GDPR] GDPR script loaded:', src);
        } else if (script.textContent) {
          // Inline script
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          newScript.type = script.type || 'text/javascript';
          document.head.appendChild(newScript);
          console.log('[GDPR] Inline GDPR script loaded');
        }
      } catch (e) {
        console.warn('[GDPR] Failed to load GDPR script:', e);
      }
    });

    // Esemény kiváltása, hogy a többi script tudja, hogy betöltődtek
    // MEGJEGYZÉS: Ha ERR_BLOCKED_BY_CLIENT hibát látsz, az az adblocker/böngésző beállítások miatt van
    // Ez normális viselkedés - az adblockerek célja pontosan az, hogy blokkolják a tracking scripteket
    // Ez független a cookie beleegyezéstől - az adblocker nem nézi, hogy van-e beleegyezés
    window.dispatchEvent(new CustomEvent('eu2k-gdpr-scripts-loaded'));

    markScriptsLoaded();
    console.log('[GDPR] GDPR scripts loading attempted');
    console.log('[GDPR] Note: ERR_BLOCKED_BY_CLIENT errors are normal if adblocker is active - this is expected behavior');
  }

  // Banner létrehozása
  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Süti beleegyezés');

    banner.innerHTML = `
        <div class="consent-banner-content">
        <div class="consent-banner-icon-container">
          <img class="consent-banner-icon" src="assets/general/banners/info.svg" alt="Info" />
        </div>
        <div class="consent-banner-texts">
          <span class="consent-banner-title">Sütik és adatvédelem</span>
          <span class="consent-banner-desc">Ez a weboldal sütiket és nyomkövetési technológiákat használ a felhasználói élmény javítása és az oldal használatának elemzése érdekében. A folytatással elfogadod a sütik használatát.</span>
        </div>
        <div class="consent-banner-actions-wrapper">
          <div class="consent-banner-actions">
            <button class="consent-banner-btn consent-btn-reject" type="button" id="consent-reject-btn">Elutasítás</button>
            <button class="consent-banner-btn consent-btn-accept" type="button" id="consent-accept-btn">Elfogadás</button>
          </div>
        </div>
      </div>
    `;

    return banner;
  }

  // Banner megjelenítése
  function showBanner(force = false) {
    if (!force && hasConsent()) {
      console.log('[GDPR] Consent already given, not showing banner');
      return; // Már elfogadták, nem kell megjeleníteni
    }

    // Várunk, amíg a body betöltődik
    if (!document.body) {
      console.log('[GDPR] Body not ready, waiting...');
      setTimeout(showBanner, 100);
      return;
    }

    console.log('[GDPR] Showing banner');
    const banner = createBanner();
    document.body.appendChild(banner);

    // Force reflow to ensure the element is in the DOM
    void banner.offsetHeight;

    // Animáció - banner az oldal alján jelenik meg
    requestAnimationFrame(() => {
      banner.classList.add('consent-banner-visible');
      console.log('[GDPR] Banner made visible');
    });

    // Gomb eseménykezelők
    const acceptBtn = document.getElementById('consent-accept-btn');
    const rejectBtn = document.getElementById('consent-reject-btn');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        setConsent(true);
        hideBanner();
        loadGDPRScripts();
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        setConsent(false);
        hideBanner();
        // Elutasítás esetén nem töltjük be a scripteket
      });
    }
  }

  // Banner elrejtése
  function hideBanner() {
    const banner = document.getElementById('consent-banner');
    if (banner) {
      banner.classList.remove('consent-banner-visible');
      setTimeout(() => {
        banner.remove();
      }, 300);
    }
  }

  // Blokkolja a GDPR scripteket, amíg nincs beleegyezés
  function blockGDPRScripts() {
    // Késleltetjük a GDPR scriptek betöltését
    const gdprScripts = document.querySelectorAll('script[data-gdpr-required], script[data-gdpr-analytics]');
    gdprScripts.forEach(script => {
      // Eltávolítjuk a src-t, hogy ne töltődjön be
      if (script.src) {
        script.setAttribute('data-src', script.src);
        script.removeAttribute('src');
      }
      // Inline scripteket is késleltetjük
      if (script.textContent && !script.hasAttribute('data-gdpr-processed')) {
        script.setAttribute('data-gdpr-content', script.textContent);
        script.textContent = '';
        script.setAttribute('data-gdpr-processed', 'true');
      }
    });

    // Clarity scripteket is blokkoljuk, ha vannak
    const clarityScripts = document.querySelectorAll('script');
    clarityScripts.forEach(script => {
      if (script.textContent && script.textContent.includes('clarity') && script.textContent.includes('s6n7qpfkv4')) {
        if (!script.hasAttribute('data-gdpr-processed')) {
          script.setAttribute('data-gdpr-content', script.textContent);
          script.textContent = '';
          script.setAttribute('data-gdpr-processed', 'true');
        }
      }
    });
  }

  // Inicializálás
  function init() {
    console.log('[GDPR] Initializing GDPR banner, consent:', hasConsent());
    
    // Először blokkoljuk a GDPR scripteket
    if (!hasConsent()) {
      blockGDPRScripts();
    }

    // Ha már elfogadták, betöltjük a scripteket
    if (hasConsent()) {
      loadGDPRScripts();
    } else {
      // Ha még nem fogadták el, megjelenítjük a bannert
      // Várunk a DOM betöltődésére
      if (document.readyState === 'loading') {
        console.log('[GDPR] DOM loading, waiting for DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', () => {
          console.log('[GDPR] DOMContentLoaded fired');
          setTimeout(showBanner, 100);
        });
      } else {
        console.log('[GDPR] DOM already loaded, showing banner');
        // Kis késleltetés, hogy biztosan betöltődött a body
        setTimeout(showBanner, 100);
      }
    }
  }

  // Exportáljuk a függvényeket globálisan (ha szükséges)
  window.eu2kGDPR = {
    hasConsent: hasConsent,
    setConsent: setConsent,
    loadScripts: loadGDPRScripts,
    showBanner: showBanner,
    hideBanner: hideBanner
  };

  // Globális parancs a banner megjelenítéséhez (konzolból hívható)
  window.showConsentBanner = function(force = false) {
    console.log('[GDPR] Manually showing consent banner', force ? '(forced)' : '');
    // Eltávolítjuk a meglévő bannert, ha van
    const existingBanner = document.getElementById('consent-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
    
    // Megjelenítjük a bannert (force paraméterrel)
    showBanner(force);
  };

  // Indítás
  init();
})();

