// Navigation State Manager
// Elmenti és visszaállítja, honnan jöttünk egy oldalra - localStorage-ban tárolja, frissítéskor is megmarad

(function() {
  'use strict';
  
  try {
    const STORAGE_KEY = 'eu2k_navigation_from';
    const STORAGE_TIMESTAMP_KEY = 'eu2k_navigation_timestamp';
    const STORAGE_TIMEOUT = 30 * 60 * 1000; // 30 perc (hosszabb, mert localStorage)
  
    // Aktuális oldal neve
    function getCurrentPage() {
      return window.location.pathname.split('/').pop() || 'index.html';
    }

    // Elmenti, honnan jöttünk
    function saveNavigationState(forcePath) {
      try {
        const currentPage = getCurrentPage();
        
        // Settings.html-en NE frissítsd - ott maradjon a régi state
        if (currentPage === 'settings.html') {
          console.log('[NavigationState] On settings.html, keeping existing state');
          return;
        }
        
        let fromPath = forcePath;
        
        if (!fromPath) {
          // Próbáljuk meg az URL paraméterből
          const urlParams = new URLSearchParams(window.location.search);
          fromPath = urlParams.get('from');
          
          // Ha nincs URL paraméter, próbáljuk a referrer-t
          if (!fromPath && document.referrer) {
            try {
              const referrerUrl = new URL(document.referrer);
              fromPath = referrerUrl.pathname.split('/').pop() || 'index.html';
            } catch (e) {
              fromPath = null;
            }
          }
        }
        
        // Normalizáljuk
        if (!fromPath || fromPath === '' || fromPath === '/') {
          fromPath = 'index.html';
        }
        fromPath = fromPath.replace(/^\/+/, '').replace(/\/+$/, '');
        if (!fromPath.endsWith('.html')) {
          fromPath = fromPath + '.html';
        }
        
        // Ne mentse el önmagát
        if (fromPath === currentPage) {
          return;
        }
        
        localStorage.setItem(STORAGE_KEY, fromPath);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        console.log('[NavigationState] ✅ Saved to localStorage:', fromPath);
      } catch (e) {
        console.error('[NavigationState] Error saving:', e);
      }
    }

    // Visszaolvassa, honnan jöttünk
    function getNavigationState() {
      try {
        const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        
        // Ellenőrizzük a timeout-ot
        if (timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          if (age > STORAGE_TIMEOUT) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
            console.log('[NavigationState] State expired');
            return null;
          }
        }
        
        const fromPath = localStorage.getItem(STORAGE_KEY);
        if (fromPath) {
          console.log('[NavigationState] ✅ Retrieved:', fromPath);
          return '/' + fromPath;
        }
        
        return null;
      } catch (e) {
        console.error('[NavigationState] Error reading:', e);
        return null;
      }
    }

    // Törli a navigation state-et
    function clearNavigationState() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
        console.log('[NavigationState] Cleared');
      } catch (e) {
        console.warn('[NavigationState] Could not clear:', e);
      }
    }

    // Publikus API
    window.NavigationState = {
      save: saveNavigationState,
      get: getNavigationState,
      clear: clearNavigationState
    };

    // Automatikusan elmentjük minden oldalváltáskor (kivéve settings.html)
    const currentPage = getCurrentPage();
    if (currentPage !== 'settings.html') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => saveNavigationState());
      } else {
        saveNavigationState();
      }
    }
    
  } catch (e) {
    console.error('[NavigationState] Fatal error:', e);
    window.NavigationState = {
      save: function() {},
      get: function() { return null; },
      clear: function() {}
    };
  }
})();
