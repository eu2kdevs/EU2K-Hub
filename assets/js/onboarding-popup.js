// Onboarding Popup System - Figyelmeztetések és hibakezelés
// Ez a modul kezeli a popup üzeneteket az onboarding folyamat során

/**
 * Popup injection az onboarding oldalakhoz
 */
export function injectOnboardingPopup() {
  // Ellenőrizzük, hogy már létezik-e a popup
  if (document.getElementById('onboarding-popup-overlay')) {
    return;
  }

  // Popup HTML létrehozása
  const popupHTML = `
    <div id="onboarding-popup-overlay" class="popup-overlay" style="display: none;">
      <div class="popup-container">
        <div class="popup-header">
          <img src="/EU2K-Hub/assets/warning.svg" class="popup-icon" alt="Figyelmeztetés">
          <h3 class="popup-title" id="popup-title">Figyelmeztetés</h3>
        </div>
        <div class="popup-content">
          <p class="popup-message" id="popup-message">Üzenet szövege</p>
        </div>
        <div class="popup-actions">
          <button class="popup-button popup-button-secondary" id="popup-alt-action">
            <img src="/EU2K-Hub/assets/arrow_back.svg" class="popup-button-icon" alt="Vissza">
            <span>Bejelentkezés másként</span>
          </button>
          <button class="popup-button popup-button-primary" id="popup-continue">
            <img src="/EU2K-Hub/assets/arrow_forward.svg" class="popup-button-icon" alt="Tovább">
            <span>Tovább</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // CSS stílusok hozzáadása
  const popupCSS = `
    <style>
      .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .popup-overlay.show {
        opacity: 1;
      }
      
      .popup-container {
        background: #1a1a1a;
        border-radius: 16px;
        padding: 24px;
        max-width: 480px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid #333;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .popup-overlay.show .popup-container {
        transform: scale(1);
      }
      
      .popup-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .popup-icon {
        width: 24px;
        height: 24px;
        filter: invert(1) sepia(1) saturate(5) hue-rotate(25deg);
      }
      
      .popup-title {
        color: #fff;
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }
      
      .popup-content {
        margin-bottom: 24px;
      }
      
      .popup-message {
        color: #ccc;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
      }
      
      .popup-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .popup-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .popup-button-icon {
        width: 16px;
        height: 16px;
      }
      
      .popup-button-primary {
        background: #4CAF50;
        color: white;
      }
      
      .popup-button-primary:hover {
        background: #45a049;
        transform: translateY(-1px);
      }
      
      .popup-button-secondary {
        background: #333;
        color: #ccc;
        border: 1px solid #555;
      }
      
      .popup-button-secondary:hover {
        background: #444;
        color: #fff;
        transform: translateY(-1px);
      }
      
      .popup-button-secondary .popup-button-icon {
        filter: invert(0.8);
      }
      
      .popup-button-primary .popup-button-icon {
        filter: invert(1);
      }
    </style>
  `;

  // CSS és HTML hozzáadása a dokumentumhoz
  document.head.insertAdjacentHTML('beforeend', popupCSS);
  document.body.insertAdjacentHTML('beforeend', popupHTML);

  // Event listenerek hozzáadása
  setupPopupEventListeners();
}

/**
 * Event listenerek beállítása a popup gombokhoz
 */
function setupPopupEventListeners() {
  const overlay = document.getElementById('onboarding-popup-overlay');
  const continueBtn = document.getElementById('popup-continue');
  const altActionBtn = document.getElementById('popup-alt-action');

  // Tovább gomb
  continueBtn.addEventListener('click', () => {
    hideOnboardingPopup();
  });

  // Bejelentkezés másként gomb
  altActionBtn.addEventListener('click', () => {
    // LocalStorage teljes törlése
    localStorage.clear();
    
    // Kijelentkezés Firebase-ből
    if (window.auth && window.auth.currentUser) {
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
        .then(({ signOut }) => {
          return signOut(window.auth);
        })
        .then(() => {
          console.log('✅ Kijelentkezés sikeres');
        })
        .catch((error) => {
          console.error('❌ Kijelentkezési hiba:', error);
        })
        .finally(() => {
          // Átirányítás az onboarding_student.html step2-jére
          window.location.href = '/EU2K-Hub/welcome/onboarding_student.html#step2';
        });
    } else {
      // Ha nincs Firebase auth, egyszerűen átirányítunk
      window.location.href = '/EU2K-Hub/welcome/onboarding_student.html#step2';
    }
  });

  // Overlay kattintásra bezárás
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideOnboardingPopup();
    }
  });
}

/**
 * Onboarding popup megjelenítése
 * @param {string} title - Popup címe
 * @param {string} message - Popup üzenete
 */
export function showOnboardingPopup(title, message) {
  const overlay = document.getElementById('onboarding-popup-overlay');
  const titleElement = document.getElementById('popup-title');
  const messageElement = document.getElementById('popup-message');

  if (!overlay) {
    console.error('❌ Onboarding popup nincs inicializálva!');
    return;
  }

  // Tartalom beállítása
  titleElement.textContent = title;
  messageElement.textContent = message;

  // Popup megjelenítése
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
}

/**
 * Onboarding popup elrejtése
 */
export function hideOnboardingPopup() {
  const overlay = document.getElementById('onboarding-popup-overlay');
  
  if (!overlay) {
    return;
  }

  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

/**
 * BirthDate ellenőrzés és popup megjelenítése szükség esetén
 * @param {Object} userData - Felhasználói adatok
 * @returns {boolean} - Van-e birthDate adat
 */
export function checkBirthDateAndShowPopup(userData) {
  const hasBirthDate = userData && userData.birthDate && userData.birthDate.trim() !== '';
  
  if (!hasBirthDate) {
    console.warn('⚠️ BirthDate nem érhető el a felhasználói adatokból');
    
    showOnboardingPopup(
      'Születési dátum nem érhető el',
      'A születési dátum nem érhető el a fiókodból. Ez nem akadályozza a regisztrációt, de később manuálisan hozzáadhatod a beállításokban.'
    );
    
    return false;
  }
  
  console.log('✅ BirthDate elérhető:', userData.birthDate);
  return true;
}

/**
 * Automatikus popup injection az onboarding oldalakra
 */
function autoInjectOnCurrentPage() {
  // Ellenőrizzük, hogy onboarding oldalon vagyunk-e
  const currentPath = window.location.pathname;
  const isOnboardingPage = currentPath.includes('onboarding_') && currentPath.includes('.html');
  
  if (isOnboardingPage) {
    console.log('🚀 Onboarding popup injection...');
    injectOnboardingPopup();
  }
}

// Automatikus inicializálás
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInjectOnCurrentPage);
} else {
  autoInjectOnCurrentPage();
}