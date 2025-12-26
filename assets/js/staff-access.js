/**
 * Staff Access Management
 * Handles staff session authentication and management
 */

(function() {
  'use strict';

  // Only run on settings.html
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage !== 'settings.html') {
    console.log('[StaffAccess] Not on settings.html, skipping initialization');
    return;
  }

  let isSessionActive = false;
  let sessionEndTime = null;

  /**
   * Initialize staff access card
   */
  let retryCount = 0;
  const MAX_RETRIES = 10; // Maximum 5 seconds (10 * 500ms)
  
  async function initStaffAccess() {
    console.log('[StaffAccess] ===== INIT START ===== (retry:', retryCount, ')');
    
    // Wait for Firebase to be initialized
    if (!window.firebaseApp || !window.functions) {
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        console.error('[StaffAccess] ❌ Firebase app or functions not initialized after', MAX_RETRIES, 'retries. Giving up.');
        return;
      }
      console.warn('[StaffAccess] Firebase app or functions not initialized, retrying... (', retryCount, '/', MAX_RETRIES, ')');
      setTimeout(initStaffAccess, 500);
      return;
    }
    
    retryCount = 0; // Reset on success

    console.log('[StaffAccess] Firebase app found:', !!window.firebaseApp);
    console.log('[StaffAccess] Firebase functions found:', !!window.functions);

    try {
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const auth = getAuth(window.firebaseApp);

      // Wait for auth to be ready
      await new Promise((resolve) => {
        if (auth.currentUser) {
          resolve();
        } else {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
          });
          // Timeout after 3 seconds
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 3000);
        }
      });

      if (!auth.currentUser) {
        console.log('[StaffAccess] ❌ No user logged in');
        return;
      }

      console.log('[StaffAccess] ✅ User logged in:', auth.currentUser.uid, auth.currentUser.email);

      // Get the full token
      const fullToken = await auth.currentUser.getIdToken(true);
      console.log('[StaffAccess] 🔑 FULL TOKEN (decoded):', fullToken);
      
      // Decode token manually to see all claims
      try {
        const tokenParts = fullToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('[StaffAccess] 🔓 DECODED TOKEN PAYLOAD:', JSON.stringify(payload, null, 2));
        }
      } catch (e) {
        console.error('[StaffAccess] Error decoding token:', e);
      }

      // Get custom claims (force refresh to get latest)
      let idTokenResult = await auth.currentUser.getIdTokenResult(true);
      let claims = idTokenResult.claims;

      console.log('[StaffAccess] 📋 User claims (first check):', JSON.stringify(claims, null, 2));
      console.log('[StaffAccess] 🔍 Checking claims:');
      console.log('[StaffAccess]   - admin:', claims.admin);
      console.log('[StaffAccess]   - owner:', claims.owner);
      console.log('[StaffAccess]   - teacher:', claims.teacher);

      // Check if user has staff privileges from token claims
      let hasStaffPrivileges = claims.admin || claims.owner || claims.teacher;
      
      // If no staff claims in token, try to refresh them from Firestore
      if (!hasStaffPrivileges) {
        console.log('[StaffAccess] 🔄 No staff claims in token, attempting to refresh from Firestore...');
        try {
          const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
          
          // Use window.functions (already initialized with europe-west1 in settings.html)
          if (!window.functions) {
            throw new Error('Firebase functions not initialized');
          }
          
          const refreshClaims = httpsCallable(window.functions, 'refreshUserClaims');

          const refreshResult = await refreshClaims();
          
          if (refreshResult.data.success && refreshResult.data.refreshed) {
            console.log('[StaffAccess] ✅ Claims refreshed:', refreshResult.data.claims);
            
            // Force token refresh to get new claims
            idTokenResult = await auth.currentUser.getIdTokenResult(true);
            claims = idTokenResult.claims;
            
            console.log('[StaffAccess] 📋 User claims (after refresh):', JSON.stringify(claims, null, 2));
            
            hasStaffPrivileges = claims.admin || claims.owner || claims.teacher;
            console.log('[StaffAccess] 👤 Has staff privileges (after refresh):', hasStaffPrivileges);
          } else {
            console.log('[StaffAccess] ⚠️ Could not refresh claims:', refreshResult.data.message || 'Unknown error');
          }
        } catch (refreshError) {
          console.error('[StaffAccess] ❌ Error refreshing claims:', refreshError);
        }
      }

      // Check if card exists in DOM
      const staffCard = document.getElementById('staffAccessCard');
      console.log('[StaffAccess] 🎴 Card element found:', !!staffCard);
      if (staffCard) {
        console.log('[StaffAccess] 🎴 Card current display:', window.getComputedStyle(staffCard).display);
        console.log('[StaffAccess] 🎴 Card current style.display:', staffCard.style.display);
      }

      console.log('[StaffAccess] 👤 Has staff privileges (final):', hasStaffPrivileges);

      if (hasStaffPrivileges) {
        console.log('[StaffAccess] ✅ User has staff privileges, attempting to show card');
        
        if (staffCard) {
          staffCard.style.display = '';
          console.log('[StaffAccess] ✅ Card display set to empty string');
          console.log('[StaffAccess] 🎴 Card new display:', window.getComputedStyle(staffCard).display);
          console.log('[StaffAccess] 🎴 Card new style.display:', staffCard.style.display);
        } else {
          console.error('[StaffAccess] ❌ Card element NOT FOUND in DOM!');
          console.log('[StaffAccess] 🔍 Searching for card with different methods...');
          const allCards = document.querySelectorAll('[id*="staff"], [class*="staff"]');
          console.log('[StaffAccess] Found elements with staff in id/class:', allCards.length);
          allCards.forEach((el, i) => {
            console.log(`[StaffAccess]   [${i}]`, el.id, el.className, el);
          });
        }

        // Check if session is active
        await checkActiveSession();

        // Setup button click handler
        setupStaffButton();
        console.log('[StaffAccess] ✅ Button handler setup complete');
      } else {
        console.log('[StaffAccess] ❌ User does NOT have staff privileges');
        console.log('[StaffAccess] ❌ Card will NOT be shown');
      }
      
      console.log('[StaffAccess] ===== INIT END =====');
    } catch (error) {
      console.error('[StaffAccess] ❌ ERROR checking staff privileges:', error);
      console.error('[StaffAccess] Error stack:', error.stack);
    }
  }

  /**
   * Check if there's an active staff session
   */
  async function checkActiveSession() {
    try {
      const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
      const checkSession = httpsCallable(window.functions, 'staffSessionCheck');

      const result = await checkSession();
      
      if (result.data.active) {
        isSessionActive = true;
        sessionEndTime = result.data.endTime;
        updateButtonState(true);
        
        // Start timer if session is active
        if (window.staffTimer) {
          window.staffTimer.startTimer(sessionEndTime);
        }
      }
    } catch (error) {
      console.error('[StaffAccess] Error checking session:', error);
    }
  }

  /**
   * Setup staff button click handler
   */
  function setupStaffButton() {
    const btn = document.getElementById('staffAccessBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (isSessionActive) {
        // End session
        showEndSessionPopup();
      } else {
        // Start session
        showStartSessionPopup();
      }
    });
  }

  /**
   * Show start session popup
   */
  function showStartSessionPopup() {
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    const openPopup = () => {
      const scrollArea = document.querySelector('.main-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({ top: 0, behavior: 'instant' });
        scrollArea.classList.add('no-scroll');
        scrollArea.classList.add('popup-active');
      }

      // Create popup HTML
      const popupHTML = `
        <div id="staffSessionPopup" class="permission-overlay-scroll-area" style="display: none;">
          <div class="permission-container">
            <button class="permission-close-btn" id="staffSessionCloseBtn">
              <img src="assets/general/close.svg" alt="Bezárás">
            </button>
            <div class="permission-content">
              <img src="assets/qr-code/hand.svg" class="permission-hand-icon" alt="Belépés">
              <h2 class="permission-title" data-translate="pages.settings.staff.popup.start_title" data-translate-fallback="Munkamenet indítása">Munkamenet indítása</h2>
              <p class="permission-text" data-translate="pages.settings.staff.popup.start_message" data-translate-fallback="Add meg az admin jelszót a munkamenet indításához. A munkamenet 15 percig lesz aktív.">Add meg az admin jelszót a munkamenet indításához. A munkamenet 15 percig lesz aktív.</p>
              <input type="password" id="staffSessionPassword" class="dev-mode-input" data-translate-placeholder="pages.settings.staff.popup.password_placeholder" placeholder="Jelszó">
              <button class="permission-ok-btn" id="staffSessionConfirmBtn" data-translate="pages.settings.staff.popup.confirm" data-translate-fallback="Belépés">Belépés</button>
            </div>
          </div>
        </div>
      `;

      // Add popup to body
      if (scrollArea) {
        scrollArea.insertAdjacentHTML('beforeend', popupHTML);
      }

      setTimeout(() => {
        const popup = document.getElementById('staffSessionPopup');
        if (popup) {
          popup.style.display = 'flex';
        }

        const input = document.getElementById('staffSessionPassword');
        const closeBtn = document.getElementById('staffSessionCloseBtn');
        const confirmBtn = document.getElementById('staffSessionConfirmBtn');

        // Focus input
        if (input) {
          setTimeout(() => input.focus(), 100);
        }

        // Close handler
        const closePopup = () => {
          if (scrollArea) {
            scrollArea.classList.remove('no-scroll');
            scrollArea.classList.remove('popup-active');
          }
          if (popup) {
            popup.remove();
          }
        };

        if (closeBtn) {
          closeBtn.addEventListener('click', closePopup);
        }

        // Confirm handler
        if (confirmBtn) {
          confirmBtn.addEventListener('click', async () => {
            if (!input) return;
            const password = input.value;
            if (!password) return;
            
            try {
              const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
              const startSession = httpsCallable(window.functions, 'staffSessionStart');

              console.log('[StaffAccess] Calling staffSessionStart with password...');
              const result = await startSession({ password });
              console.log('[StaffAccess] staffSessionStart result:', result);
              
              if (result.data.success) {
                isSessionActive = true;
                sessionEndTime = result.data.endTime;
                updateButtonState(true);
                
                // Start timer
                if (window.staffTimer) {
                  window.staffTimer.startTimer(sessionEndTime);
                }
                
                closePopup();
                
                // Check if we need to redirect to a specific page after login
                const redirectPath = sessionStorage.getItem('eu2k_staff_redirect_after_login');
                if (redirectPath) {
                  sessionStorage.removeItem('eu2k_staff_redirect_after_login');
                  // Redirect to target page - ensure path starts with /
                  const targetPath = redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath;
                  setTimeout(() => {
                    window.location.href = targetPath;
                  }, 500);
                } else {
                  // Refresh page to show new nav items
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }
              } else {
                alert(getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.'));
              }
            } catch (error) {
              console.error('[StaffAccess] Error starting session:', error);
              console.error('[StaffAccess] Error code:', error.code);
              console.error('[StaffAccess] Error message:', error.message);
              console.error('[StaffAccess] Error details:', error.details);
              
              let errorMessage = getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.');
              
              if (error.code === 'unauthenticated') {
                errorMessage = 'Nincs bejelentkezve. Jelentkezz be újra!';
              } else if (error.code === 'permission-denied') {
                if (error.message.includes('staff privileges')) {
                  errorMessage = 'Nincs staff jogosultságod!';
                } else {
                  errorMessage = 'Hibás jelszó!';
                }
              }
              
              alert(errorMessage);
            }
          });
        }

        // Enter key handler
        if (input) {
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && confirmBtn) {
              confirmBtn.click();
            }
          });
        }
      }, 50);
    };

    if (window.tryOpenPopup) {
      window.tryOpenPopup(openPopup);
    } else {
      openPopup();
    }
  }

  /**
   * Show end session popup
   */
  function showEndSessionPopup() {
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    const openPopup = () => {
      const scrollArea = document.querySelector('.main-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({ top: 0, behavior: 'instant' });
        scrollArea.classList.add('no-scroll');
        scrollArea.classList.add('popup-active');
      }

      // Create popup HTML
      const popupHTML = `
        <div id="staffSessionPopup" class="permission-overlay-scroll-area" style="display: none;">
          <div class="permission-container">
            <button class="permission-close-btn" id="staffSessionCloseBtn">
              <img src="assets/general/close.svg" alt="Bezárás">
            </button>
            <div class="permission-content">
              <img src="assets/qr-code/hand.svg" class="permission-hand-icon" alt="Figyelmeztetés">
              <h2 class="permission-title" data-translate="pages.settings.staff.popup.end_title" data-translate-fallback="Munkamenet megszakítása">Munkamenet megszakítása</h2>
              <p class="permission-text" data-translate="pages.settings.staff.popup.end_message" data-translate-fallback="Biztosan megszakítod a munkamenetet? Vissza kell jelentkezned, ha ismét módosítani szeretnél.">Biztosan megszakítod a munkamenetet? Vissza kell jelentkezned, ha ismét módosítani szeretnél.</p>
              <input type="password" id="staffSessionPassword" class="dev-mode-input" data-translate-placeholder="pages.settings.staff.popup.password_placeholder" placeholder="Jelszó">
              <button class="permission-ok-btn" id="staffSessionConfirmBtn" data-translate="pages.settings.staff.popup.end_confirm" data-translate-fallback="Megszakítás">Megszakítás</button>
            </div>
          </div>
        </div>
      `;

      // Add popup to body
      if (scrollArea) {
        scrollArea.insertAdjacentHTML('beforeend', popupHTML);
      }

      setTimeout(() => {
        const popup = document.getElementById('staffSessionPopup');
        if (popup) {
          popup.style.display = 'flex';
        }

        const input = document.getElementById('staffSessionPassword');
        const closeBtn = document.getElementById('staffSessionCloseBtn');
        const confirmBtn = document.getElementById('staffSessionConfirmBtn');

        // Focus input
        if (input) {
          setTimeout(() => input.focus(), 100);
        }

        // Close handler
        const closePopup = () => {
          if (scrollArea) {
            scrollArea.classList.remove('no-scroll');
            scrollArea.classList.remove('popup-active');
          }
          if (popup) {
            popup.remove();
          }
        };

        if (closeBtn) {
          closeBtn.addEventListener('click', closePopup);
        }

        // Confirm handler
        if (confirmBtn) {
          confirmBtn.addEventListener('click', async () => {
            if (!input) return;
            const password = input.value;
            if (!password) return;
            
            try {
              const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
              const endSession = httpsCallable(window.functions, 'staffSessionEnd');

              const result = await endSession({ password });
              
              if (result.data.success) {
                isSessionActive = false;
                sessionEndTime = null;
                updateButtonState(false);
                
                // Stop timer
                if (window.staffTimer) {
                  window.staffTimer.stopTimer();
                }
                
                closePopup();
                
                // Refresh page to hide nav items
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              } else {
                alert(getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.'));
              }
            } catch (error) {
              console.error('[StaffAccess] Error ending session:', error);
              alert(getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.'));
            }
          });
        }

        // Enter key handler
        if (input) {
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && confirmBtn) {
              confirmBtn.click();
            }
          });
        }
      }, 50);
    };

    if (window.tryOpenPopup) {
      window.tryOpenPopup(openPopup);
    } else {
      openPopup();
    }
  }

  /**
   * Update button state
   */
  function updateButtonState(active) {
    const btn = document.getElementById('staffAccessBtn');
    if (!btn) return;

    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    // Find the text span
    const textSpan = btn.querySelector('.youhub-revert-text');
    
    if (active) {
      btn.classList.add('session-active');
      if (textSpan) {
        textSpan.textContent = getTranslation('pages.settings.staff.button_end', 'Munkamenet megszakítása');
        textSpan.setAttribute('data-translate', 'pages.settings.staff.button_end');
        textSpan.setAttribute('data-translate-fallback', 'Munkamenet megszakítása');
      }
    } else {
      btn.classList.remove('session-active');
      if (textSpan) {
        textSpan.textContent = getTranslation('pages.settings.staff.button_login', 'Belépés');
        textSpan.setAttribute('data-translate', 'pages.settings.staff.button_login');
        textSpan.setAttribute('data-translate-fallback', 'Belépés');
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStaffAccess);
  } else {
    initStaffAccess();
  }

  // Export for global access
  window.staffAccess = {
    checkActiveSession,
    isSessionActive: () => isSessionActive
  };
})();
