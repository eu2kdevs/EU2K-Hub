/**
 * Terms and Redirect Handler
 * Globális függvény a feltételek elfogadásához és átirányításhoz
 */

// Firebase imports (ezeket a fő HTML fájlban kell importálni)
let auth = null;

/**
 * Inicializálja a terms redirect handlert
 * @param {Object} firebaseAuth - Firebase Auth instance
 */
function initializeTermsRedirect(firebaseAuth) {
  auth = firebaseAuth;
  console.log('🎯 Terms redirect handler initialized');
}

/**
 * Globális checkTermsAndRedirect függvény
 * - Ha be van jelentkezve: feltételek oldalra irányít
 * - Ha nincs bejelentkezve: onboarding elejére irányít
 */
function checkTermsAndRedirect() {
  console.log('🎯 Checking terms and redirecting...');
  
  // Ellenőrizzük, hogy van-e bejelentkezett felhasználó
  const currentUser = auth ? auth.currentUser : null;
  
  if (currentUser) {
    console.log('✅ User is logged in, checking terms...');
    
    // Ha van terms checkbox, ellenőrizzük
    const termsCheckbox = document.getElementById('terms-checkbox');
    if (termsCheckbox && !termsCheckbox.checked) {
      console.warn('⚠️ Terms not accepted, cannot proceed');
      // Scroll to terms section or show message
      if (termsCheckbox.scrollIntoView) {
        termsCheckbox.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    // Ha minden rendben, irányítsunk a főoldalra
    console.log('✅ Terms accepted or no terms required, redirecting to Hub...');
    window.location.href = '/EU2K-Hub/';
    
  } else {
    console.log('❌ No user logged in, redirecting to onboarding start...');
    // Átirányítás az onboarding elejére
    window.location.href = '/EU2K-Hub/welcome/onboarding_student.html';
  }
}

/**
 * Globális showOnboardingFailed függvény
 * Megjeleníti az onboarding failed oldalt
 */
function showOnboardingFailed() {
  console.log('❌ Showing onboarding failed page');
  if (window.showPage) {
    window.showPage('onboarding-failed-page');
  } else {
    // Fallback: keresés az oldalon
    const failedPage = document.getElementById('onboarding-failed-page');
    if (failedPage) {
      // Elrejtjük az összes többi oldalt
      const allPages = document.querySelectorAll('.welcome-page');
      allPages.forEach(page => page.style.display = 'none');
      
      // Megjelenítjük a failed oldalt
      failedPage.style.display = 'block';
    } else {
      console.error('❌ Onboarding failed page not found');
      // Fallback: átirányítás az onboarding elejére
      window.location.href = '/EU2K-Hub/welcome/onboarding_student.html';
    }
  }
}

/**
 * Globális retryOnboarding függvény
 * Újrakezdi az onboarding folyamatot
 */
function retryOnboarding() {
  console.log('🔄 Retrying onboarding...');
  window.location.href = '/EU2K-Hub/welcome/onboarding_student.html';
}

// Globálisan elérhetővé tesszük a függvényeket
if (typeof window !== 'undefined') {
  window.checkTermsAndRedirect = checkTermsAndRedirect;
  window.showOnboardingFailed = showOnboardingFailed;
  window.retryOnboarding = retryOnboarding;
  window.initializeTermsRedirect = initializeTermsRedirect;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkTermsAndRedirect,
    showOnboardingFailed,
    retryOnboarding,
    initializeTermsRedirect
  };
}