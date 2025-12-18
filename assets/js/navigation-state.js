// Navigation State Manager
// Elmenti és visszaállítja, honnan jöttünk egy oldalra, hogy nyelvváltoztatás után is működjön

(function() {
  'use strict';
  
  // Teljes script try-catch blokkal védve, hogy ne állítsa meg a többi script futását
  try {
    // Konstansok
    const STORAGE_KEY = 'eu2k_navigation_from';
    const STORAGE_TIMESTAMP_KEY = 'eu2k_navigation_timestamp';
    const STORAGE_TIMEOUT = 5 * 60 * 1000; // 5 perc
  
  // Elmenti, honnan jöttünk
  function saveNavigationState() {
    try {
      console.log('[NavigationState] saveNavigationState called');
      console.log('[NavigationState] Current URL:', window.location.href);
      console.log('[NavigationState] Document referrer:', document.referrer);
      
      // Próbáljuk meg az URL paraméterből
      const urlParams = new URLSearchParams(window.location.search);
      let fromPath = urlParams.get('from');
      console.log('[NavigationState] From URL param:', fromPath);
      
      // Ha nincs URL paraméter, próbáljuk a referrer-t
      if (!fromPath && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          fromPath = referrerUrl.pathname;
          console.log('[NavigationState] From referrer pathname:', fromPath);
        } catch (e) {
          // Ha nem valid URL, próbáljuk meg úgy használni
          fromPath = document.referrer;
          console.log('[NavigationState] From referrer (raw):', fromPath);
        }
      }
      
      // Ha még mindig nincs, akkor a főoldalról jöttünk
      if (!fromPath || fromPath === '' || fromPath === '/' || fromPath === '/index' || fromPath === '/index.html') {
        fromPath = '/index.html';
        console.log('[NavigationState] Defaulting to index.html');
      }
      
      // Normalizáljuk a path-ot
      fromPath = fromPath.replace(/^\/+/, '/').replace(/\/+$/, '');
      if (fromPath === '/' || fromPath === '') {
        fromPath = '/index.html';
      }
      
      console.log('[NavigationState] Final normalized path:', fromPath);
      
      // Elmentjük sessionStorage-ba (try-catch a biztonságért)
      try {
        sessionStorage.setItem(STORAGE_KEY, fromPath);
        sessionStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        console.log('[NavigationState] ✅ Saved navigation state to sessionStorage:', fromPath);
      } catch (e) {
        console.warn('[NavigationState] Could not save to sessionStorage:', e);
      }
    } catch (e) {
      console.error('[NavigationState] Error in saveNavigationState:', e);
    }
  }

  // Visszaolvassa, honnan jöttünk
  function getNavigationState() {
    try {
      console.log('[NavigationState] getNavigationState called');
      let timestamp = null;
      try {
        timestamp = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
        console.log('[NavigationState] Timestamp from storage:', timestamp);
      } catch (e) {
        console.warn('[NavigationState] Could not read from sessionStorage:', e);
        return null;
      }
      
      // Ellenőrizzük, hogy nem régi-e az adat (timeout)
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        console.log('[NavigationState] Navigation state age:', age, 'ms');
        if (age > STORAGE_TIMEOUT) {
          // Túl régi, töröljük
          try {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
          } catch (e) {
            // Ignore
          }
          console.log('[NavigationState] ⚠️ Navigation state expired');
          return null;
        }
      }
      
      const fromPath = sessionStorage.getItem(STORAGE_KEY);
      if (fromPath) {
        console.log('[NavigationState] ✅ Retrieved navigation state:', fromPath);
        return fromPath;
      }
      
      console.log('[NavigationState] ⚠️ No navigation state found in storage');
      return null;
    } catch (e) {
      console.error('[NavigationState] Error in getNavigationState:', e);
      return null;
    }
  }

  // Törli a navigation state-et
  function clearNavigationState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      console.log('[NavigationState] Cleared navigation state');
    } catch (e) {
      console.warn('[NavigationState] Could not clear from sessionStorage:', e);
    }
  }

  // Publikus API létrehozása
  try {
    window.NavigationState = {
      save: saveNavigationState,
      get: getNavigationState,
      clear: clearNavigationState
    };

    // Automatikusan elmentjük, amikor az oldal betöltődik (ha még nincs mentve)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        try {
          // Csak akkor mentjük el, ha még nincs mentve
          if (!getNavigationState()) {
            // Ha a referrer a settings.html-re mutat, akkor valószínűleg nyelvváltoztatás után vagyunk
            // Ilyenkor ne mentjük el újra, hanem használjuk a meglévőt
            const referrer = document.referrer;
            if (referrer && !referrer.includes('settings.html')) {
              saveNavigationState();
            }
          }
        } catch (e) {
          console.error('[NavigationState] Error in DOMContentLoaded handler:', e);
        }
      });
    } else {
      // Ha már betöltődött, azonnal
      try {
        if (!getNavigationState()) {
          // Ha a referrer a settings.html-re mutat, akkor valószínűleg nyelvváltoztatás után vagyunk
          // Ilyenkor ne mentjük el újra, hanem használjuk a meglévőt
          const referrer = document.referrer;
          if (referrer && !referrer.includes('settings.html')) {
            saveNavigationState();
          }
        }
      } catch (e) {
        console.error('[NavigationState] Error in immediate save:', e);
      }
    }
  } catch (e) {
    // Ha bármi kritikus hiba van, legalább létrehozzuk az API-t, hogy ne legyen undefined
    console.error('[NavigationState] Fatal error, creating fallback API:', e);
    try {
      window.NavigationState = {
        save: function() {},
        get: function() { return null; },
        clear: function() {}
      };
    } catch (e2) {
      // Ha még ez sem megy, akkor semmi
      console.error('[NavigationState] Could not create fallback API:', e2);
    }
  }
})();
