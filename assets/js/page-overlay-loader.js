(function () {
  const READY_LOG = 'Events loading completed successfully';
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
    try {
      // Prefer contained for background circle
      const handle = await window.insertLoadingIndicator('contained', { container: mountEl, fadeIn: true, fadeInDuration: 150 });
      console.log('EU2K Flutter indicator shown');
      // Style the iframe itself to the requested background and to be large
      if (window.flutterHandler && window.flutterHandler.iframes) {
        const iframe = window.flutterHandler.iframes.get('contained');
        if (iframe) {
          iframe.style.backgroundColor = '#0B0F0B';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      }
      cleanupHandler = handle;
    } catch (e) {
      // Fallback: try uncontained
      try {
        const handle = await window.insertLoadingIndicator('uncontained', { container: mountEl, fadeIn: true, fadeInDuration: 150 });
          console.log('EU2K Flutter indicator shown');
        if (window.flutterHandler && window.flutterHandler.iframes) {
          const iframe = window.flutterHandler.iframes.get('uncontained');
          if (iframe) {
            iframe.style.backgroundColor = '#0B0F0B';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
          }
        }
        cleanupHandler = handle;
      } catch (_) {}
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
          if (typeof a === 'string' && a.includes(READY_LOG)) {
            fadeOutAndRemove();
            break;
          }
        }
      } catch (_) {}
      return originalLog(...args);
    };
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
      s.src = ph.getAttribute('data-src');
      if (ph.type) s.type = ph.type;
      ph.replaceWith(s);
    }
  }

  // Boot
  interceptLogs();
  whenDomReady(() => {
    ensureMainContent(async (mc) => {
      createOverlay(mc);
      try {
        await showFlutterIndicator();
      } catch (e) {
        // ignore
      }
    });
  });
})();


