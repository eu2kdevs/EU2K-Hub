// Közös mobil layout JavaScript - minden oldalra vonatkozik
// Hamburger menü és navbar scroll logika

window.addEventListener('load', () => {
  // Hamburger menü toggle
  const hamburgerMenuBtn = document.getElementById('hamburgerMenuBtn');
  const hamburgerMenuDropdown = document.getElementById('hamburgerMenuDropdown');
  const hamburgerMenuOverlay = document.getElementById('hamburgerMenuOverlay');
  
  if (hamburgerMenuBtn && hamburgerMenuDropdown && hamburgerMenuOverlay) {
    hamburgerMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isActive = hamburgerMenuDropdown.classList.toggle('active');
      hamburgerMenuOverlay.classList.toggle('active', isActive);
    });

    // Overlay kattintásra bezárás
    hamburgerMenuOverlay.addEventListener('click', function() {
      hamburgerMenuDropdown.classList.remove('active');
      hamburgerMenuOverlay.classList.remove('active');
    });

    // Menü bezárása kattintásra kívülre
    document.addEventListener('click', function(e) {
      if (!hamburgerMenuDropdown.contains(e.target) && !hamburgerMenuBtn.contains(e.target)) {
        hamburgerMenuDropdown.classList.remove('active');
        hamburgerMenuOverlay.classList.remove('active');
      }
    });
  }

  // Bejelentkezés gomb kattintás
  const loginBtnEl = document.getElementById('headerLoginBtn');
  if (loginBtnEl) {
    loginBtnEl.addEventListener('click', function () {
      window.location.href = 'onboarding.html';
    });
  }

  // Hamburger menü bejelentkezés gomb
  const hamburgerLoginEl = document.getElementById('hamburgerLogin');
  if (hamburgerLoginEl) {
    hamburgerLoginEl.addEventListener('click', function () {
      window.location.href = 'onboarding.html';
    });
  }

  // Navbar scroll logika mobilra
  const sidebar = document.querySelector('.sidebar');
  const mainScrollArea = document.querySelector('.main-scroll-area');
  const appBg = document.querySelector('.app-bg');
  if (!sidebar || !mainScrollArea || !appBg) return;

  let lastScrollTop = 0;
  let scrollTimeout = null;

  const handleScroll = () => {
    if (window.innerWidth > 700) return; // Csak mobilra

    const currentScrollTop = mainScrollArea.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
    
    // Clear timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Delay a scroll reagálásra
    scrollTimeout = setTimeout(() => {
      if (currentScrollTop > lastScrollTop && currentScrollTop > 50) {
        // Lefelé görgetés - elrejtés
        sidebar.classList.add('hidden');
        mainScrollArea.classList.add('navbar-hidden');
        appBg.classList.add('navbar-hidden');
      } else if (currentScrollTop < lastScrollTop) {
        // Felfelé görgetés - megjelenítés
        sidebar.classList.remove('hidden');
        mainScrollArea.classList.remove('navbar-hidden');
        appBg.classList.remove('navbar-hidden');
      }
      
      lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
    }, 10);
  };

  mainScrollArea.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Navbar szabály: ha >4 elem, akkor az aktívnak se látszódjon a szövege
  const updateNavbarForManyItems = () => {
    if (window.innerWidth > 700) return; // Csak mobilra
    
    const navRail = document.querySelector('.nav-rail');
    if (!navRail) return;
    
    const railItems = navRail.querySelectorAll('.rail-item');
    const hasMoreThan4Items = railItems.length > 4;
    
    railItems.forEach(item => {
      if (hasMoreThan4Items && item.classList.contains('is-active')) {
        // Ha >4 elem van, az aktív is ugyanolyan legyen
        item.style.width = '56px';
        item.style.flex = '0 0 56px';
        item.style.maxWidth = '56px';
        item.style.flexDirection = 'column';
        const label = item.querySelector('.rail-label');
        if (label) {
          label.style.display = 'none';
        }
      } else if (!hasMoreThan4Items && item.classList.contains('is-active')) {
        // Ha <=4 elem van, az aktív normálisan működjön
        item.style.width = '';
        item.style.flex = '';
        item.style.maxWidth = '';
        item.style.flexDirection = '';
        const label = item.querySelector('.rail-label');
        if (label) {
          label.style.display = '';
        }
      }
    });
  };
  
  // Kezdeti ellenőrzés
  updateNavbarForManyItems();
  
  // Observer a navbar elemek változására
  const navRail = document.querySelector('.nav-rail');
  if (navRail) {
    const observer = new MutationObserver(updateNavbarForManyItems);
    observer.observe(navRail, { childList: true, subtree: true });
    
    // Resize eseményre is ellenőrizzük
    window.addEventListener('resize', updateNavbarForManyItems);
  }
  
  // Account tooltip kezelése mobilra - mindig a tooltip-es verziót mutassa (név, osztály, profilkép)
  const headerAccountBtn = document.getElementById('headerAccountBtn');
  if (headerAccountBtn && window.innerWidth <= 700) {
    // Várjunk, amíg az account-tooltip.js inicializálja a gombot
    const checkAccountButton = () => {
      const expandedContent = headerAccountBtn.querySelector('.account-expanded-content');
      const originalImg = headerAccountBtn.querySelector('img:not(.account-expanded-avatar)');
      
      if (expandedContent) {
        // Az expanded content alapértelmezetten látható legyen mobilon
        expandedContent.style.display = 'flex';
        
        // Az eredeti ikon elrejtése
        if (originalImg) {
          originalImg.style.display = 'none';
        }
        
        // Button stílusok beállítása expanded állapotra
        headerAccountBtn.style.background = 'rgb(211, 255, 161)';
        headerAccountBtn.style.borderRadius = '16px';
        headerAccountBtn.style.padding = '6px 12px';
        headerAccountBtn.style.minWidth = '160px';
        headerAccountBtn.style.maxWidth = '220px';
      } else {
        // Ha még nincs expanded content, várjunk egy kicsit
        setTimeout(checkAccountButton, 100);
      }
    };
    
    // Próbáljuk meg azonnal, majd várjunk az account-tooltip.js inicializálására
    checkAccountButton();
    setTimeout(checkAccountButton, 500);
  }
});

