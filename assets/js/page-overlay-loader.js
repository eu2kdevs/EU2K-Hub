(function () {
  if (window.__eu2kOverlayBooted) return; // prevent double init across multiple includes
  window.__eu2kOverlayBooted = true;
  // Detect if we're on index.html or another page
  const isIndexPage = window.location.pathname.endsWith('/index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname === '/EU2K-Hub/' ||
                      window.location.pathname.endsWith('/EU2K-Hub');
  
  const READY_LOG = isIndexPage ? 'Events loading completed successfully' : 'Translation system initialized successfully';
  // Also tolerate variant phrasing
  const READY_ALIASES = [READY_LOG, 'Translation system initialized', 'Translations initialized successfully'];
  let overlayEl = null;
  let mountEl = null;
  let mainContentEl = null;
  let cleanupHandler = null;

  function whenDomReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  }

  function ensureMainContent(cb) {
    const el = document.querySelector('.main-content');
    if (el) {
      cb(el);
      return;
    }
    const mo = new MutationObserver(() => {
      const target = document.querySelector('.main-content');
      if (target) {
        mo.disconnect();
        cb(target);
      }
    });
    mo.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  function copyVisualStyle(fromEl, toEl) {
    const cs = getComputedStyle(fromEl);
    toEl.style.background = cs.background;
    toEl.style.backgroundColor = cs.backgroundColor;
    toEl.style.borderRadius = cs.borderRadius;
    toEl.style.boxShadow = cs.boxShadow;
  }

  function positionOverlay() {
    if (!overlayEl || !mainContentEl) return;
    
    // For bootstrap overlay, use full viewport
    if (overlayEl.id === 'eu2k-page-overlay' && document.getElementById('eu2k-overlay-mount')) {
      overlayEl.style.position = 'fixed';
      overlayEl.style.left = '0px';
      overlayEl.style.top = '0px';
      overlayEl.style.width = '100vw';
      overlayEl.style.height = '100vh';
      overlayEl.style.zIndex = '9999';
      return;
    }
    
    // For dynamically created overlay, position over main content
    const rect = mainContentEl.getBoundingClientRect();
    const extraBottom = 24; // a little larger downward
    overlayEl.style.position = 'fixed';
    overlayEl.style.left = rect.left + 'px';
    overlayEl.style.top = rect.top + 'px';
    overlayEl.style.width = rect.width + 'px';
    overlayEl.style.height = (rect.height + extraBottom) + 'px';
  }

  function createOverlay(mainContent) {
    mainContentEl = mainContent;

    overlayEl = document.createElement('div');
    overlayEl.setAttribute('id', 'eu2k-page-overlay');
    overlayEl.style.zIndex = '9999';
    overlayEl.style.opacity = '1';
    overlayEl.style.transition = 'opacity 300ms ease-in-out';
    overlayEl.style.borderRadius = '32px';
    copyVisualStyle(mainContentEl, overlayEl);

    const inner = document.createElement('div');
    inner.style.position = 'relative';
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
    inner.style.backgroundColor = '#0B0F0B';

    // Mount for the flutter iframe
    mountEl = document.createElement('div');
    mountEl.style.position = 'relative';
    mountEl.style.width = '100%';
    mountEl.style.height = '100%';
    inner.appendChild(mountEl);

    overlayEl.appendChild(inner);
    document.body.appendChild(overlayEl);

    positionOverlay();
    window.addEventListener('resize', positionOverlay);
    window.addEventListener('scroll', positionOverlay, { passive: true });

    return overlayEl;
  }

  async function showFlutterIndicator() {
    console.log('showFlutterIndicator called');
    try {
      // Ensure dependencies loaded
      console.log('Ensuring dependencies...');
      await ensureDependencies();
      console.log('Dependencies loaded, attempting to show contained indicator...');
      // Prefer contained for background circle
      const handle = await window.insertLoadingIndicator('contained', { container: mountEl, fadeIn: true, fadeInDuration: 150 });
      console.log('EU2K Flutter indicator shown');
      // Protect against early hides from other scripts until READY_LOG
      installHideGuard();
      // Style the iframe itself to the requested background and to be large
      if (window.flutterHandler && window.flutterHandler.iframes) {
        const iframe = window.flutterHandler.iframes.get('contained');
        if (iframe) {
          iframe.style.backgroundColor = '#0B0F0B';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.opacity = '1';
          iframe.style.display = 'block';
          iframe.style.zIndex = '10000';
        }
      }
      cleanupHandler = handle;
    } catch (e) {
      console.log('Contained indicator failed, trying uncontained fallback:', e);
      // Fallback: try uncontained
      try {
          await ensureDependencies();
        const handle = await window.insertLoadingIndicator('uncontained', { container: mountEl, fadeIn: true, fadeInDuration: 150 });
          console.log('EU2K Flutter indicator shown');
        installHideGuard();
        if (window.flutterHandler && window.flutterHandler.iframes) {
          const iframe = window.flutterHandler.iframes.get('uncontained');
          if (iframe) {
            iframe.style.backgroundColor = '#0B0F0B';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.opacity = '1';
            iframe.style.display = 'block';
            iframe.style.zIndex = '10000';
          }
        }
        cleanupHandler = handle;
      } catch (fallbackError) {
        console.error('Both contained and uncontained indicators failed:', fallbackError);
      }
    }
  }

  function fadeOutAndRemove() {
    if (!overlayEl) return;
    overlayEl.style.opacity = '0';
    setTimeout(() => {
      if (cleanupHandler && cleanupHandler.hide) {
        try { cleanupHandler.hide({ fadeOut: true, fadeOutDuration: 150 }); } catch (_) {}
      }
      overlayEl.remove();
      overlayEl = null;
      mountEl = null;
    }, 320);
  }

  // Intercept console.log early
  const originalLog = window.console && window.console.log ? window.console.log.bind(console) : null;
  function interceptLogs() {
    if (!originalLog) return;
    console.log = function (...args) {
      try {
        // When indicator appears -> release deferred scripts
        for (const a of args) {
          if (typeof a === 'string' && a.includes('EU2K Flutter indicator shown')) {
            releaseDeferredScripts();
            break;
          }
        }
        for (const a of args) {
          if (typeof a === 'string' && READY_ALIASES.some(sig => a.includes(sig))) {
            removeHideGuard();
            fadeOutAndRemove();
            break;
          }
        }
      } catch (_) {}
      return originalLog(...args);
    };
  }

  // Guard against premature hides from other parts of the site
  let originalHideFn = null;
  function installHideGuard() {
    if (!window.flutterHandler) return;
    if (originalHideFn) return; // already installed
    originalHideFn = window.flutterHandler.hideLoadingIndicator?.bind(window.flutterHandler);
    if (!originalHideFn) return;
    window.__eu2kOverlayActive = true;
    window.__eu2kQueuedHides = [];
    window.flutterHandler.hideLoadingIndicator = function(type, opts) {
      if (window.__eu2kOverlayActive) {
        // queue and ignore until we allow
        window.__eu2kQueuedHides.push([type, opts]);
        return true;
      }
      return originalHideFn(type, opts);
    };
  }

  function removeHideGuard() {
    if (!originalHideFn || !window.flutterHandler) return;
    window.__eu2kOverlayActive = false;
    const queued = Array.isArray(window.__eu2kQueuedHides) ? window.__eu2kQueuedHides : [];
    window.__eu2kQueuedHides = [];
    window.flutterHandler.hideLoadingIndicator = originalHideFn;
    originalHideFn = null;
    // Now flush any queued hides (optional)
    queued.forEach(([t, o]) => {
      try { window.flutterHandler.hideLoadingIndicator(t, o); } catch (_) {}
    });
  }

  // Defer scripts below overlay until indicator is shown
  function collectDeferredScripts() {
    const placeholders = Array.from(document.querySelectorAll('script[data-wait-for-overlay="true"][data-src]'));
    return placeholders;
  }

  function releaseDeferredScripts() {
    const placeholders = collectDeferredScripts();
    for (const ph of placeholders) {
      const s = document.createElement('script');
      const src = ph.getAttribute('data-src');
      const dtype = ph.getAttribute('data-type');
      if (src) {
        s.src = src;
      }
      s.type = dtype || ph.type || 'text/javascript';
      if (!src) {
        s.textContent = ph.textContent || '';
      }
      // Copy non-data attributes
      for (const { name, value } of Array.from(ph.attributes)) {
        if (!name.startsWith('data-') && name !== 'type') {
          s.setAttribute(name, value);
        }
      }
      ph.replaceWith(s);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureDependencies() {
    if (window.insertLoadingIndicator && window.flutterHandler) return;
    // Load handler first, then injector
    if (!window.flutterHandler) {
      await loadScript('/EU2K-Hub/assets/js/flutter-handler.js');
    }
    if (!window.insertLoadingIndicator) {
      await loadScript('/EU2K-Hub/assets/js/flutter-loading-injector.js');
    }
  }

  // Boot
  interceptLogs();
  console.log('EU2K Page Overlay Loader initialized');
  // Start immediately: attach to bootstrap overlay mount if present
  (async function startEarly(){
    console.log('Starting early overlay initialization...');
    const bootstrapMount = document.getElementById('eu2k-overlay-mount');
    if (bootstrapMount) {
      console.log('Bootstrap mount found, setting up overlay...');
      mainContentEl = document.querySelector('.main-content') || document.body;
      overlayEl = document.getElementById('eu2k-page-overlay');
      mountEl = bootstrapMount;
      
      // Ensure overlay is properly positioned and visible
      if (overlayEl && mainContentEl) {
        window.addEventListener('resize', positionOverlay);
        window.addEventListener('scroll', positionOverlay, { passive: true });
        positionOverlay();
        
        // Make sure overlay is visible
        overlayEl.style.display = 'block';
        overlayEl.style.opacity = '1';
        console.log('Overlay positioned and made visible');
      }
      
      try { 
        console.log('Attempting to show Flutter indicator...');
        await showFlutterIndicator(); 
      } catch(e) {
        console.error('Error showing Flutter indicator:', e);
      }
    } else {
      console.log('No bootstrap mount found, waiting for DOM ready...');
      whenDomReady(() => {
        ensureMainContent(async (mc) => {
          createOverlay(mc);
          try { 
            console.log('Attempting to show Flutter indicator after DOM ready...');
            await showFlutterIndicator(); 
          } catch(e) {
            console.error('Error showing Flutter indicator after DOM ready:', e);
          }
        });
      });
    }
  })();
})();


