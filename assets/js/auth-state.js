// Minimal shared auth state helper
// - Reads localStorage flags written by onboarding
// - Shows a large hover indicator near the account icon with the user's name
(function () {
  function getDisplayName() {
    return localStorage.getItem('eu2k-auth-display-name') || '';
  }

  function isLoggedIn() {
    return localStorage.getItem('eu2k-auth-logged-in') === 'true';
  }

  function ensureIndicator() {
    if (document.getElementById('auth-hover-indicator')) return null;

    const indicator = document.createElement('div');
    indicator.id = 'auth-hover-indicator';
    indicator.style.cssText = [
      'position: absolute',
      'top: 56px',
      'right: 0',
      'z-index: 1000',
      'display: none',
      'padding: 16px 20px',
      'background: #272B26',
      'border-radius: 20px',
      'box-shadow: 0 8px 24px rgba(0,0,0,0.35)',
      'color: #e3e3e3',
      'max-width: 360px',
      'border: 1px solid rgba(255,255,255,0.05)'
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 18px; font-weight: 600; margin-bottom: 6px; color:#fff;';
    title.textContent = 'Bejelentkezve';

    const text = document.createElement('div');
    text.id = 'auth-hover-indicator-text';
    text.style.cssText = 'font-size: 16px; color:#C2C3C2;';
    text.textContent = '';

    indicator.appendChild(title);
    indicator.appendChild(text);

    // Insert into header if possible, else body
    const header = document.querySelector('.header');
    (header || document.body).appendChild(indicator);
    return indicator;
  }

  function wireHover(target) {
    const indicator = ensureIndicator();
    if (!indicator) return;

    function show() {
      if (!isLoggedIn()) return;
      const name = getDisplayName();
      const text = document.getElementById('auth-hover-indicator-text');
      if (text) text.textContent = name ? `mint: ${name}` : 'mint: Ismeretlen felhasználó';
      indicator.style.display = 'block';
    }

    function hide() {
      indicator.style.display = 'none';
    }

    target.addEventListener('mouseenter', show);
    target.addEventListener('mouseleave', hide);
    // Touch fallback
    target.addEventListener('click', function () {
      if (!isLoggedIn()) return;
      const visible = indicator.style.display === 'block';
      indicator.style.display = visible ? 'none' : 'block';
      setTimeout(() => { indicator.style.display = 'none'; }, 2000);
    });
  }

  function init() {
    // Prefer account icon in header
    const accountLink = document.querySelector('.header .header-icons a[href*="account"], .header .header-icons a');
    if (accountLink) {
      wireHover(accountLink);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


