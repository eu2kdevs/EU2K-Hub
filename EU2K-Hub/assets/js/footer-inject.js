// Footer injector - inserts a consistent footer into pages that include this script.
// - Adds a responsive footer matching the requested design
// - Ensures .main-content has bottom spacing so footer doesn't overlap
// - Hooks the privacy link to index.html#privacy-policy (hash navigation)
//
// Usage: add <script src="/EU2K-Hub/assets/js/footer-inject.js"></script> before </body>
// Excluded pages: you should NOT add the script on onboarding_student.html pages (per request)

(function () {
  if (document.getElementById('injected-footer')) return;

  // Basic styles for the injected footer
  const style = document.createElement('style');
  style.textContent = `
  /* Injected Footer Styles */
  .injected-footer {
    box-sizing: border-box;
    width:100%;
    background: #0E1512; /* dark background similar to design */
    color: #C4C8C3; /* requested text color */
    padding: 18px 20px;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .injected-footer .footer-inner {
    width: 100%;
    max-width: 1180px;
    display:flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .injected-footer .footer-left,
  .injected-footer .footer-center,
  .injected-footer .footer-right {
    display:flex;
    align-items:center;
    gap:12px;
  }

  .injected-footer .footer-left img,
  .injected-footer .footer-right img {
    height: 28px;
    object-fit: contain;
  }

  .injected-footer .footer-center {
    justify-content:center;
    flex: 1 1 auto;
  }

  .injected-footer .privacy-link {
    color: #C4C8C3;
    text-decoration: underline;
    cursor: pointer;
    font-size: 14px;
  }

  @media (max-width:900px) {
    .injected-footer .footer-inner {
      flex-direction: column;
      gap: 10px;
      padding: 8px 0;
    }
    .injected-footer .footer-center { order: 2; }
    .injected-footer .footer-left, .injected-footer .footer-right { order: 1; }
  }
  `;

  document.head.appendChild(style);

  // Build footer element
  const footer = document.createElement('footer');
  footer.id = 'injected-footer';
  footer.className = 'injected-footer';
  footer.innerHTML = `
    <div class="footer-inner" role="contentinfo">
      <div class="footer-left">
        <img src="/EU2K-Hub/eu2k_hub_logo_hor_dark.png" alt="EU2K Hub logo" />
      </div>

      <div class="footer-center">
        <a class="privacy-link" id="injected-privacy-link" href="/EU2K-Hub/index.html#privacy-policy">Adatkezelési Tájékoztató</a>
      </div>

      <div class="footer-right">
        <img src="/EU2K-Hub/eu2k_devs_logo_hor_dark.png" alt="EU2K Devs logo" />
        <img src="/EU2K-Hub/eu2k_dok_logo_hor_dark.png" alt="EU2K DÖK logo" />
      </div>
    </div>
  `;

  // Append footer near the end of body
  document.body.appendChild(footer);

  // Ensure .main-content has bottom padding so footer doesn't overlap
  function ensureMainSpacing() {
    const mains = document.querySelectorAll('.main-content');
    mains.forEach(el => {
      // Only increase padding if it's smaller than desired value
      const computed = window.getComputedStyle(el);
      const currentPB = parseInt(computed.paddingBottom || '0', 10);
      const desired = 120; // pixels
      if (currentPB < desired) {
        el.style.paddingBottom = desired + 'px';
      }
    });
  }

  // Run once now and also on resize
  ensureMainSpacing();
  window.addEventListener('resize', ensureMainSpacing);

  // Privacy link behavior: always use hash navigation to index.html#privacy-policy
  const privacy = document.getElementById('injected-privacy-link');
  if (privacy) {
    privacy.addEventListener('click', function (e) {
      e.preventDefault();
      // If already on index.html, just set hash
      try {
        const currentPath = window.location.pathname.replace(/\/$/, '');
        // canonical index path may be '/EU2K-Hub/index.html' or '/EU2K-Hub/' — use explicit index.html route
        const target = '/EU2K-Hub/index.html#privacy-policy';
        // Navigate using location.href so SPA-less pages still jump
        window.location.href = target;
      } catch (err) {
        // Fallback: set location hash
        window.location.href = '/EU2K-Hub/index.html#privacy-policy';
      }
    });
  }

})();