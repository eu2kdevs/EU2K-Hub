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
    if (!overlayEl) return;
    // Always cover full viewport
    overlayEl.style.position = 'fixed';
    overlayEl.style.left = '0px';
    overlayEl.style.top = '0px';
    overlayEl.style.width = '100vw';
    overlayEl.style.height = '100vh';
    overlayEl.style.zIndex = '9999';
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
    inner.style.backgroundColor = '#0F1511';

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
          iframe.style.backgroundColor = '#0F1511';
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
            iframe.style.backgroundColor = '#0F1511';
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
    const base = window.location.pathname.includes('/EU2K-Hub/') ? '/EU2K-Hub/' : '/';
    if (!window.flutterHandler) {
      await loadScript(base + 'assets/js/flutter-handler.js');
    }
    if (!window.insertLoadingIndicator) {
      await loadScript(base + 'assets/js/flutter-loading-injector.js');
    }
  }

  // Boot
  // interceptLogs(); // no longer needed; we rely on window load event
  console.log('EU2K Page Overlay Loader initialized');
  // Start immediately: attach to bootstrap overlay mount if present
  (async function startEarly() {
    const bootstrapMount = document.getElementById('eu2k-overlay-mount');
    if (bootstrapMount) {
      mainContentEl = document.querySelector('.main-content') || document.body;
      overlayEl = document.getElementById('eu2k-page-overlay');
      mountEl = bootstrapMount;
      window.__eu2kOverlayMount = mountEl;
      // Ensure overlay is properly positioned and visible
      if (overlayEl && mainContentEl) {
        window.addEventListener('resize', positionOverlay);
        window.addEventListener('scroll', positionOverlay, { passive: true });
        positionOverlay();
        overlayEl.style.display = 'block';
        overlayEl.style.opacity = '1';
      }
      // Show MP4 indicator immediately
      showVideoIndicator();
      // Release any deferred scripts once the indicator is visible
      releaseDeferredScripts();
    } else {
      // Create overlay immediately, even before DOM is ready
      mainContentEl = document.body || document.documentElement;
      overlayEl = document.createElement('div');
      overlayEl.setAttribute('id', 'eu2k-page-overlay');
      overlayEl.style.zIndex = '9999';
      overlayEl.style.opacity = '1';
      overlayEl.style.transition = 'opacity 300ms ease-in-out';
      overlayEl.style.borderRadius = '32px';
      // Default visual style
      overlayEl.style.background = '#0F1511';
      overlayEl.style.backgroundColor = '#0F1511';

      const inner = document.createElement('div');
      inner.style.position = 'relative';
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.display = 'flex';
      inner.style.alignItems = 'center';
      inner.style.justifyContent = 'center';
      inner.style.backgroundColor = '#0F1511';

      mountEl = document.createElement('div');
      mountEl.setAttribute('id', 'eu2k-overlay-mount');
      window.__eu2kOverlayMount = mountEl;
      mountEl.style.position = 'relative';
      mountEl.style.width = '100%';
      mountEl.style.height = '100%';
      inner.appendChild(mountEl);

      overlayEl.appendChild(inner);
      (document.documentElement || document.body).appendChild(overlayEl);

      positionOverlay();
      window.addEventListener('resize', positionOverlay);
      window.addEventListener('scroll', positionOverlay, { passive: true });

      // Show MP4 indicator immediately
      showVideoIndicator();

      // After DOM is ready, copy main content visual style (if available)
      whenDomReady(() => {
        ensureMainContent((mc) => {
          mainContentEl = mc;
          copyVisualStyle(mainContentEl, overlayEl);
        });
      });
    }
    // Hide overlay when browser finishes loading (load event), wait 500ms, then fade out
    window.addEventListener('load', () => {
      setTimeout(() => {
        fadeOutAndRemove();
      }, 500);
    });
  })();
})();




function showVideoIndicator() {
  const mountElRef = window.__eu2kOverlayMount || document.getElementById('eu2k-overlay-mount');
  if (!mountElRef) return;
  mountElRef.style.display = 'flex';
  mountElRef.style.alignItems = 'center';
  mountElRef.style.justifyContent = 'center';
  mountElRef.style.width = '100%';
  mountElRef.style.height = '100%';
  const video = document.createElement('video');
  const base = window.location.pathname.includes('/EU2K-Hub/') ? '/EU2K-Hub/' : '/';
  video.src = base + 'assets/animation/m3elidga.mp4';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.style.maxHeight = '80vh';
  video.style.maxWidth = '80vw';
  video.style.width = 'auto';
  video.style.height = 'auto';
  video.style.objectFit = 'contain';
  video.style.display = 'block';
  video.style.borderRadius = '16px';
  if (mountElRef.parentElement) {
    mountElRef.parentElement.style.backgroundColor = '#0F1511';
  }
  mountElRef.innerHTML = '';
  mountElRef.appendChild(video);
}



