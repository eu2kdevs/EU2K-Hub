// Hub Maintenance Overlay Script
// Törli a navbart + headert, és a QR-kód oldal "kamera blokkolva" nézetének
// stílusára épülő üzenetet jelenít meg.
// Csak akkor fut le, ha a localStorage-ban a kulcs NINCS true-ra állítva.

(function () {
  const BYPASS_KEY = 'eu2k-hub-maintenance-bypass';

  function isLoggedIn() {
    try {
      if (window.auth && window.auth.currentUser) return true;
      return window.localStorage.getItem('eu2k-auth-logged-in') === 'true';
    } catch {
      return false;
    }
  }

  function getTargetRoot() {
    const scrollArea =
      document.querySelector('.main-scroll-area') ||
      document.querySelector('.main-content');

    const mainRoot =
      document.querySelector('main') ||
      document.querySelector('.main-content') ||
      document.body;

    return scrollArea || mainRoot;
  }

  function wipeChrome() {
    const navbar = document.querySelector('.navbar, .app-navbar, .rail-nav, header.navbar, nav');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    if (navbar && navbar.parentElement) {
      navbar.parentElement.removeChild(navbar);
    }
    if (header && header !== navbar && header.parentElement) {
      header.parentElement.removeChild(header);
    }
    if (footer && footer.parentElement) {
      footer.parentElement.removeChild(footer);
    }
  }

  function attachChromeObserver() {
    try {
      const observer = new MutationObserver(() => {
        const lateFooter = document.querySelector('footer');
        if (lateFooter && lateFooter.parentElement) {
          lateFooter.parentElement.removeChild(lateFooter);
        }
        const lateNavbar = document.querySelector('.navbar, .app-navbar, .rail-nav, header.navbar, nav');
        if (lateNavbar && lateNavbar.parentElement) {
          lateNavbar.parentElement.removeChild(lateNavbar);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      console.warn('[HubMaintenance] MutationObserver not available:', e);
    }
  }

  function buildOverlay(options) {
    const target = getTargetRoot();
    if (!target) return;

    wipeChrome();

    while (target.firstChild) {
      target.removeChild(target.firstChild);
    }

    const container = document.createElement('div');
    container.className = 'camera-blocked-container hub-maintenance-container';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';

    const content = document.createElement('div');
    content.className = 'camera-blocked-content hub-maintenance-content';
    content.style.textAlign = 'center';

    const icon = document.createElement('img');
    icon.className = 'camera-blocked-icon hub-maintenance-icon';
    icon.src = options.iconSrc;
    icon.alt = options.iconAlt || '';
    icon.style.width = options.iconSize || '160px';
    icon.style.height = options.iconSize || '160px';
    icon.style.marginBottom = '20px';
    if (options.iconFilter) {
      icon.style.filter = options.iconFilter;
    }

    const title = document.createElement('h2');
    title.className = 'camera-blocked-title hub-maintenance-title';
    title.setAttribute('data-translate', options.titleKey);
    title.setAttribute('data-translate-fallback', options.titleFallback);
    title.textContent = options.titleFallback;
    title.style.fontWeight = '700';
    title.style.fontSize = options.titleSize || '2.4rem';
    title.style.color = options.titleColor || '#CEFF97';
    title.style.marginBottom = '12px';

    const text = document.createElement('p');
    text.className = 'camera-blocked-text hub-maintenance-text';
    text.setAttribute('data-translate', options.descKey);
    text.setAttribute('data-translate-fallback', options.descFallback);
    text.textContent = options.descFallback;
    text.style.fontSize = options.descSize || '1.3rem';
    text.style.color = options.descColor || '#E5FDCB';
    text.style.fontWeight = '400';

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(text);

    if (options.showLoginButton) {
      const btn = document.createElement('button');
      btn.className = 'header-login-btn hub-maintenance-login-btn';
      btn.setAttribute('data-translate', 'pages.general.login');
      btn.textContent = 'Bejelentkezés';
      btn.style.marginTop = '20px';
      btn.style.padding = '10px 20px';
      btn.style.borderRadius = '12px';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.marginLeft = 'auto';
      btn.style.marginRight = 'auto';
      btn.addEventListener('click', () => {
        window.location.href = 'onboarding.html';
      });
      content.appendChild(btn);
    }

    container.appendChild(content);
    target.appendChild(container);

    attachChromeObserver();
  }

  function createMaintenanceOverlay() {
    buildOverlay({
      iconSrc: 'assets/qr-code/block.svg',
      iconAlt: 'Blokkolva',
      iconSize: '160px',
      titleKey: 'maintenance.title',
      titleFallback: 'A Hub mindjárt érkezik!',
      descKey: 'maintenance.description',
      descFallback: 'Nem kell sokat várnod ;).'
    });
  }

  function createYouhubGuestOverlay() {
    buildOverlay({
      iconSrc: 'assets/navbar/youhub.svg',
      iconAlt: 'YouHub',
      iconSize: '160px',
      titleKey: 'guest.youhub_title',
      titleFallback: 'A YouHub vendégek számára nem használható.',
      descKey: 'guest.youhub_description',
      descFallback: 'Jelentkezz be hogy elérhess végtelen lehetőségeket a YouHubbal.',
      showLoginButton: true
    });
  }

  function createSettingsGuestOverlay() {
    // CSS filter, hogy a settings ikon színe közelítsen a YouHub ikon zöldjéhez
    const youhubTintFilter = 'invert(76%) sepia(64%) saturate(454%) hue-rotate(61deg) brightness(98%) contrast(95%)';

    buildOverlay({
      iconSrc: 'assets/general/settings.svg',
      iconAlt: 'Beállítások',
      iconSize: '140px',
      titleKey: 'guest.settings_title',
      titleFallback: 'Ezt a részt vendégként nem érheted el.',
      descKey: 'guest.settings_description',
      descFallback: 'Jelentkezz be a további testreszabásért, és kényelemért!.',
      showLoginButton: true,
      iconFilter: youhubTintFilter
    });
  }

  function handleSettingsGuest() {
    const hash = window.location.hash || '';
    if (hash === '#functions' || hash === '#notifications') {
      // Ne hozzunk létre több overlayt, ha már van
      if (!document.querySelector('.hub-maintenance-container')) {
        createSettingsGuestOverlay();
      }
    }
  }

  function init() {
    const path = window.location.pathname || '';
    const guest = !isLoggedIn();

    const isYouhubRoot =
      path.endsWith('/youhub') ||
      path.endsWith('/youhub.html');

    const isSettingsRoot =
      path.endsWith('/settings') ||
      path.endsWith('/settings.html');

    // YouHub vendég-blokk
    if (isYouhubRoot && guest) {
      createYouhubGuestOverlay();
      return;
    }

    // Settings vendég-blokk (#functions vagy #notifications)
    if (isSettingsRoot && guest) {
      handleSettingsGuest();
      window.addEventListener('hashchange', handleSettingsGuest);
      return;
    }

    // Általános maintenance overlay – csak ha nincs bypass
    try {
      const bypass = window.localStorage.getItem(BYPASS_KEY);
      if (bypass && bypass.toLowerCase() === 'true') {
        return;
      }
    } catch (e) {
      console.warn('[HubMaintenance] localStorage nem elérhető, overlay ennek ellenére megjelenhet.', e);
    }

    createMaintenanceOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


