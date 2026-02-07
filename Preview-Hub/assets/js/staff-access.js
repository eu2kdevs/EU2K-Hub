/**
 * Staff Access Management
 * Handles staff session authentication and management
 */

(function () {
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
   * Get or create device ID
   */
  function getDeviceId() {
    let deviceId = localStorage.getItem('eu2k_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eu2k_device_id', deviceId);
      console.log('[StaffAccess] Generated new device ID:', deviceId);
    }
    return deviceId;
  }

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

        // Show "End All Sessions" card
        const endAllCard = document.getElementById('staffEndAllCard');
        if (endAllCard) {
          endAllCard.style.display = '';
        }

        // Check if session is active
        await checkActiveSession();

        // Start periodic session check (every 5 seconds)
        startPeriodicSessionCheck();

        // Setup button click handlers
        setupStaffButton();
        setupEndAllButton();
        console.log('[StaffAccess] ✅ Button handler setup complete');

        // Check if we need to open transfer popup (from toast notification)
        if (sessionStorage.getItem('eu2k_open_transfer_popup_on_load') === 'true') {
          console.log('[StaffAccess] 🔔 Opening transfer popup from sessionStorage flag...');
          sessionStorage.removeItem('eu2k_open_transfer_popup_on_load');
          // Wait a bit for everything to be ready
          setTimeout(() => {
            showSessionTransferPopup();
          }, 500);
        }
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

      const result = await checkSession({ deviceId: getDeviceId() });
      console.log('[StaffAccess] 🔄 Session check result:', result.data);

      if (result.data.active) {
        isSessionActive = true;
        sessionEndTime = result.data.endTime;
        updateButtonState(true);

        // Start timer if session is active
        if (window.staffTimer) {
          window.staffTimer.startTimer(sessionEndTime);
        }
      } else {
        // Session not active
        isSessionActive = false;
        sessionEndTime = null;
        updateButtonState(false);
      }

      // Check if transfer was requested (host device) - show popup automatically
      if (result.data.transferRequested && result.data.active) {
        // Store transfer request data
        window.eu2k_transferRequestedByDeviceId = result.data.transferRequestedByDeviceId;

        // Check if popup is already shown
        if (!document.getElementById('staffSessionTransferPopup')) {
          console.log('[StaffAccess] 🔔 Transfer requested, showing popup automatically on host device');
          console.log('[StaffAccess] 📱 Transfer requested by device:', result.data.transferRequestedByDeviceId);
          // Show popup automatically on host device
          showSessionTransferPopup();
        }
      }
    } catch (error) {
      console.error('[StaffAccess] Error checking session:', error);
    }
  }

  /**
   * Start periodic session check (every 5 seconds)
   */
  let sessionCheckInterval = null;
  function startPeriodicSessionCheck() {
    // Clear existing interval if any
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
    }

    // Check every 5 seconds
    sessionCheckInterval = setInterval(() => {
      console.log('[StaffAccess] 🔄 Periodic session check...');
      checkActiveSession();
    }, 5000);

    console.log('[StaffAccess] ✅ Periodic session check started (every 5 seconds)');
  }

  /**
   * Handle start session click
   * Checks if user has password set, if not shows create password popup
   */
  async function handleStartSessionClick() {
    const btn = document.getElementById('staffAccessBtn');
    if (btn) btn.disabled = true;

    try {
      console.log('[StaffAccess] 🔍 Checking if user has password...');
      const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");

      // Use window.functions (already initialized)
      if (!window.functions) {
        throw new Error('Firebase functions not initialized');
      }

      const checkHasPassword = httpsCallable(window.functions, 'checkUserHasPassword');
      const result = await checkHasPassword();
      console.log('[StaffAccess] 🔍 Has password result:', result.data);

      if (result.data.hasPassword) {
        showStartSessionPopup();
      } else {
        console.log('[StaffAccess] 🆕 No password set, showing create password popup');
        showCreatePasswordPopup();
      }
    } catch (e) {
      console.error('[StaffAccess] ❌ Error checking password:', e);
      // Fallback to start session popup (might handle error there or user has old claim)
      showStartSessionPopup();
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Show create password popup
   */
  function showCreatePasswordPopup() {
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
        <div id="staffCreatePasswordPopup" class="permission-overlay-scroll-area" style="display: none;">
          <div class="permission-container">
            <button class="permission-close-btn" id="staffCreatePasswordCloseBtn">
              <img src="assets/general/close.svg" alt="Bezárás">
            </button>
            <div class="permission-content">
              <img src="assets/qr-code/hand.svg" class="permission-hand-icon" alt="Jelszó">
              <h2 class="permission-title" data-translate="pages.settings.staff.popup.create_password_title" data-translate-fallback="Hozz létre egy jelszót">Hozz létre egy jelszót</h2>
              <p class="permission-text" data-translate="pages.settings.staff.popup.create_password_message" data-translate-fallback="Hozd létre a jelszavad a munkameneted elindításához. A jelszó nem lehet rövidebb 8 karakternél, és olyan jelszót adj meg amit máshol nem használsz még.">Hozd létre a jelszavad a munkameneted elindításához. A jelszó nem lehet rövidebb 8 karakternél, és olyan jelszót adj meg amit máshol nem használsz még.</p>
              <input type="password" id="staffCreatePasswordInput" class="dev-mode-input" data-translate-placeholder="pages.settings.staff.popup.create_password_placeholder" placeholder="Jelszó (min. 8 karakter)">
              <button class="permission-ok-btn" id="staffCreatePasswordConfirmBtn" data-translate="pages.settings.staff.popup.create_password_confirm" data-translate-fallback="Jelszó létrehozása">Jelszó létrehozása</button>
            </div>
          </div>
        </div>
      `;

      // Add popup to body
      if (scrollArea) {
        scrollArea.insertAdjacentHTML('beforeend', popupHTML);
      }

      setTimeout(() => {
        const popup = document.getElementById('staffCreatePasswordPopup');
        if (popup) {
          popup.style.display = 'flex';

          // Apply translations
          if (window.translationManager && window.translationManager.applyTranslationsToElement) {
            window.translationManager.applyTranslationsToElement(popup);
          }
        }

        const input = document.getElementById('staffCreatePasswordInput');
        const closeBtn = document.getElementById('staffCreatePasswordCloseBtn');
        const confirmBtn = document.getElementById('staffCreatePasswordConfirmBtn');

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

            if (!password || password.length < 8) {
              alert(getTranslation('pages.settings.staff.popup.password_too_short', 'A jelszónak legalább 8 karakter hosszúnak kell lennie!'));
              return;
            }

            try {
              confirmBtn.disabled = true;
              confirmBtn.textContent = '...';

              const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
              const createPassword = httpsCallable(window.functions, 'createUserPassword');

              console.log('[StaffAccess] 🆕 Creating password...');
              const result = await createPassword({ password });
              console.log('[StaffAccess] ✅ Password created:', result);

              if (result.data.success) {
                // Force token refresh to update claims
                const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
                const auth = getAuth(window.firebaseApp);
                if (auth.currentUser) {
                  await auth.currentUser.getIdToken(true);
                }

                closePopup();

                // Show notification
                if (window.showToastDirectly) {
                  window.showToastDirectly(
                    getTranslation('staff.password_created_title', 'Jelszó létrehozva'),
                    getTranslation('staff.password_created_message', 'Most már bejelentkezhetsz az új jelszavaddal.'),
                    'positive',
                    'check_circle'
                  );
                }

                // Show start session popup
                setTimeout(() => {
                  showStartSessionPopup();
                  // Pre-fill password if helpful? Maybe not for security.
                }, 500);
              } else {
                alert(getTranslation('pages.settings.staff.popup.create_error', 'Hiba történt a jelszó létrehozása során.'));
                confirmBtn.disabled = false;
                confirmBtn.textContent = getTranslation('pages.settings.staff.popup.create_password_confirm', 'Jelszó létrehozása');
              }
            } catch (error) {
              console.error('[StaffAccess] Error creating password:', error);
              alert(getTranslation('pages.settings.staff.popup.create_error', 'Hiba történt a jelszó létrehozása során.'));
              confirmBtn.disabled = false;
              confirmBtn.textContent = getTranslation('pages.settings.staff.popup.create_password_confirm', 'Jelszó létrehozása');
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
        // Start session check
        await handleStartSessionClick();
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

          // Apply translations to dynamically created popup
          if (window.translationManager && window.translationManager.applyTranslationsToElement) {
            window.translationManager.applyTranslationsToElement(popup);
          }
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

              console.log('[StaffAccess] 🔐 Calling staffSessionStart with password...');
              console.log('[StaffAccess] 📱 Device ID:', getDeviceId());
              const result = await startSession({ password, deviceId: getDeviceId() });
              console.log('[StaffAccess] ✅ staffSessionStart result:', result);
              console.log('[StaffAccess] 📊 Session endTime:', result.data.endTime ? new Date(result.data.endTime).toISOString() : 'N/A');

              if (result.data.success) {
                isSessionActive = true;
                sessionEndTime = result.data.endTime;
                updateButtonState(true);

                // Check if we replaced an existing session
                if (result.data.replacedExisting) {
                  console.log('[StaffAccess] ⚠️ Replaced existing session from device:', result.data.existingDeviceId);
                  // Show notification that old device session will expire
                  showSessionReplacedOnOtherDeviceNotification();
                }

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

              // Check if error is about existing session on another device
              if (error.code === 'functions/failed-precondition' && error.details && error.details.existingDeviceId) {
                // Close start popup and show loading indicator
                closePopup();
                showTransferWaitingIndicator();
                return;
              }

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

          // Apply translations to dynamically created popup
          if (window.translationManager && window.translationManager.applyTranslationsToElement) {
            window.translationManager.applyTranslationsToElement(popup);
          }
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

  /**
   * Setup end all sessions button click handler
   */
  function setupEndAllButton() {
    const btn = document.getElementById('staffEndAllBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      showEndAllSessionsPopup();
    });
  }

  /**
   * Show end all sessions popup
   */
  function showEndAllSessionsPopup() {
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
        <div id="staffEndAllSessionsPopup" class="permission-overlay-scroll-area" style="display: none;">
          <div class="permission-container">
            <button class="permission-close-btn" id="staffEndAllCloseBtn">
              <img src="assets/general/close.svg" alt="Bezárás">
            </button>
            <div class="permission-content">
              <img src="assets/qr-code/hand.svg" class="permission-hand-icon" alt="Figyelmeztetés">
              <h2 class="permission-title" data-translate="pages.settings.staff.popup.end_all_title" data-translate-fallback="Minden munkamenet megszakítása">Minden munkamenet megszakítása</h2>
              <p class="permission-text" data-translate="pages.settings.staff.popup.end_all_message" data-translate-fallback="Biztosan megszakítasz MINDEN munkamenetet minden eszközön? Ez minden aktív staff sessiont le fog állítani.">Biztosan megszakítasz MINDEN munkamenetet minden eszközön? Ez minden aktív staff sessiont le fog állítani.</p>
              <input type="password" id="staffEndAllPassword" class="dev-mode-input" data-translate-placeholder="pages.settings.staff.popup.password_placeholder" placeholder="Jelszó">
              <button class="permission-ok-btn" id="staffEndAllConfirmBtn" data-translate="pages.settings.staff.popup.end_all_confirm" data-translate-fallback="Minden megszakítása">Minden megszakítása</button>
            </div>
          </div>
        </div>
      `;

      // Add popup to body
      if (scrollArea) {
        scrollArea.insertAdjacentHTML('beforeend', popupHTML);
      }

      setTimeout(() => {
        const popup = document.getElementById('staffEndAllSessionsPopup');
        if (popup) {
          popup.style.display = 'flex';

          // Apply translations to dynamically created popup
          if (window.translationManager && window.translationManager.applyTranslationsToElement) {
            window.translationManager.applyTranslationsToElement(popup);
          }
        }

        const input = document.getElementById('staffEndAllPassword');
        const closeBtn = document.getElementById('staffEndAllCloseBtn');
        const confirmBtn = document.getElementById('staffEndAllConfirmBtn');

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
              const endAllSessions = httpsCallable(window.functions, 'staffSessionEndAll');

              console.log('[StaffAccess] 🔴 Calling staffSessionEndAll...');
              const result = await endAllSessions({ password });
              console.log('[StaffAccess] ✅ staffSessionEndAll result:', result);

              if (result.data.success) {
                isSessionActive = false;
                sessionEndTime = null;
                updateButtonState(false);

                // Stop timer
                if (window.staffTimer) {
                  window.staffTimer.stopTimer();
                }

                // Hide nav items
                if (window.staffNavItems && window.staffNavItems.hide) {
                  window.staffNavItems.hide();
                }

                closePopup();

                // Show success message
                if (window.showToastDirectly) {
                  window.showToastDirectly(
                    getTranslation('staff.end_all_success_title', 'Minden munkamenet megszakítva'),
                    getTranslation('staff.end_all_success_message', 'Minden aktív munkamenet sikeresen megszakításra került minden eszközön.'),
                    'positive',
                    'info'
                  );
                }

                // Refresh page to hide nav items
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                alert(getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.'));
              }
            } catch (error) {
              console.error('[StaffAccess] Error ending all sessions:', error);

              let errorMessage = getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.');

              if (error.code === 'unauthenticated') {
                errorMessage = 'Nincs bejelentkezve. Jelentkezz be újra!';
              } else if (error.code === 'permission-denied') {
                errorMessage = 'Hibás jelszó!';
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

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStaffAccess);
  } else {
    initStaffAccess();
  }

  /**
   * Show notification that session was replaced on other device
   */
  function showSessionReplacedOnOtherDeviceNotification() {
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    const title = getTranslation('staff_timer.replaced_other_title', 'Munkamenet átvitele');
    const message = getTranslation('staff_timer.replaced_other_message', 'Valaki megpróbált egy munkafolyamatot indítani a neved alatt egy másik eszközön. A régi munkameneted továbbra is aktív, de le fog járni.');

    // Show warning notification
    if (window.showToastDirectly) {
      window.showToastDirectly(
        title,
        message,
        'warning',
        'info',
        null,
        null
      );
    }
  }

  /**
   * Show transfer waiting indicator (new device waiting for host device response)
   */
  let transferWaitingInterval = null;
  let transferWaitingIndicator = null;

  function showTransferWaitingIndicator() {
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    const scrollArea = document.querySelector('.main-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'instant' });
      scrollArea.classList.add('no-scroll');
      scrollArea.classList.add('popup-active');
    }

    // Create loading indicator HTML
    const indicatorHTML = `
      <div id="staffTransferWaitingIndicator" class="permission-overlay-scroll-area" style="display: flex;">
        <div class="permission-container">
          <div class="permission-content">
            <div class="eu2k-loader" style="margin: 0 auto 24px;"></div>
            <h2 class="permission-title" data-translate="pages.settings.staff.popup.waiting_title" data-translate-fallback="Várunk a gazdagép válaszára">Várunk a gazdagép válaszára</h2>
            <p class="permission-text" data-translate="pages.settings.staff.popup.waiting_message" data-translate-fallback="A munkamenet átviteléhez várjuk, hogy a másik eszközön megerősítsék az átvitelt.">A munkamenet átviteléhez várjuk, hogy a másik eszközön megerősítsék az átvitelt.</p>
          </div>
        </div>
      </div>
    `;

    // Add loader CSS if not exists
    if (!document.getElementById('staff-transfer-loader-styles')) {
      const style = document.createElement('style');
      style.id = 'staff-transfer-loader-styles';
      style.textContent = `
        .eu2k-loader {
          width: 80px;
          aspect-ratio: 1;
          border: 10px solid #0000;
          padding: 5px;
          box-sizing: border-box;
          background: 
            radial-gradient(farthest-side,#fff 98%,#0000 ) 0 0/20px 20px no-repeat,
            conic-gradient(from 90deg at 10px 10px,#0000 90deg,#fff 0) content-box,
            conic-gradient(from -90deg at 40px 40px,#0000 90deg,#fff 0) content-box,
            #000;
          filter: blur(4px) contrast(10);
          animation: eu2k-l11 2s infinite;
          position: relative;
          z-index: 1;
        }
        @keyframes eu2k-l11 {
          0%   {background-position:0 0}
          25%  {background-position:100% 0}
          50%  {background-position:100% 100%}
          75%  {background-position:0% 100%}
          100% {background-position:0% 0}
        }
      `;
      document.head.appendChild(style);
    }

    // Add indicator to body
    if (scrollArea) {
      scrollArea.insertAdjacentHTML('beforeend', indicatorHTML);
      transferWaitingIndicator = document.getElementById('staffTransferWaitingIndicator');
    }

    // Start polling for transfer completion
    transferWaitingInterval = setInterval(async () => {
      try {
        const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
        const checkSession = httpsCallable(window.functions, 'staffSessionCheck');
        const result = await checkSession({ deviceId: getDeviceId() });

        console.log('[StaffAccess] 🔄 Polling result:', result.data);
        console.log('[StaffAccess] 📊 Current time:', Date.now());
        console.log('[StaffAccess] 📊 Server endTime:', result.data.endTime);

        // Check if transfer completed (session is now active on this device)
        if (result.data.active && result.data.endTime) {
          console.log('[StaffAccess] ✅ Transfer completed! Session active on this device');
          console.log('[StaffAccess] ⏰ Session will end at:', new Date(result.data.endTime).toISOString());
          console.log('[StaffAccess] ⏰ Remaining time:', Math.floor((result.data.endTime - Date.now()) / 1000), 'seconds');

          // Stop polling
          if (transferWaitingInterval) {
            clearInterval(transferWaitingInterval);
            transferWaitingInterval = null;
          }

          // Hide indicator
          if (transferWaitingIndicator) {
            if (scrollArea) {
              scrollArea.classList.remove('no-scroll');
              scrollArea.classList.remove('popup-active');
            }
            transferWaitingIndicator.remove();
            transferWaitingIndicator = null;
          }

          // Start session on this device with EXACT endTime from server
          isSessionActive = true;
          sessionEndTime = result.data.endTime;
          updateButtonState(true);

          // Start timer with server's exact endTime
          if (window.staffTimer) {
            console.log('[StaffAccess] 🚀 Starting timer with endTime:', result.data.endTime);
            window.staffTimer.startTimer(result.data.endTime);
          }

          // Check if we need to redirect
          const redirectPath = sessionStorage.getItem('eu2k_staff_redirect_after_login');
          if (redirectPath) {
            sessionStorage.removeItem('eu2k_staff_redirect_after_login');
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
        }
      } catch (error) {
        console.error('[StaffAccess] Error checking transfer status:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Show session transfer popup
   * This is called when user wants to transfer session from old device to new device
   */
  function showSessionTransferPopup() {
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

      // Create popup HTML (same as start session popup but with different text)
      const popupHTML = `
        <div id="staffSessionTransferPopup" class="permission-overlay-scroll-area" style="display: none;">
          <div class="permission-container">
            <button class="permission-close-btn" id="staffSessionTransferCloseBtn">
              <img src="assets/general/close.svg" alt="Bezárás">
            </button>
            <div class="permission-content">
              <img src="assets/qr-code/hand.svg" class="permission-hand-icon" alt="Munkafolyamat átvitele">
              <h2 class="permission-title" data-translate="pages.settings.staff.popup.transfer_title" data-translate-fallback="Munkafolyamat átvitele a másik eszközre">Munkafolyamat átvitele a másik eszközre</h2>
              <p class="permission-text" data-translate="pages.settings.staff.popup.transfer_message" data-translate-fallback="Add meg a jelszavad a munkamenet átviteléhez. A régi gépen megszakad a munkameneted, és ugyanonnan folytatódik a másik gépen.">Add meg a jelszavad a munkamenet átviteléhez. A régi gépen megszakad a munkameneted, és ugyanonnan folytatódik a másik gépen.</p>
              <input type="password" id="staffSessionTransferPassword" class="dev-mode-input" data-translate-placeholder="pages.settings.staff.popup.password_placeholder" placeholder="Jelszó">
              <button class="permission-ok-btn" id="staffSessionTransferConfirmBtn" data-translate="pages.settings.staff.popup.transfer_confirm" data-translate-fallback="Átvitel">Átvitel</button>
            </div>
          </div>
        </div>
      `;

      // Add popup to body
      if (scrollArea) {
        scrollArea.insertAdjacentHTML('beforeend', popupHTML);
      }

      setTimeout(() => {
        const popup = document.getElementById('staffSessionTransferPopup');
        if (popup) {
          popup.style.display = 'flex';

          // Apply translations to dynamically created popup
          if (window.translationManager && window.translationManager.applyTranslationsToElement) {
            window.translationManager.applyTranslationsToElement(popup);
          }
        }

        const input = document.getElementById('staffSessionTransferPassword');
        const closeBtn = document.getElementById('staffSessionTransferCloseBtn');
        const confirmBtn = document.getElementById('staffSessionTransferConfirmBtn');

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
              const transferSession = httpsCallable(window.functions, 'staffSessionTransfer');

              // Get the device ID that requested the transfer (new device)
              const newDeviceId = window.eu2k_transferRequestedByDeviceId || getDeviceId();

              console.log('[StaffAccess] 🔄 Calling staffSessionTransfer with password...');
              console.log('[StaffAccess] 📱 Current Device ID (host):', getDeviceId());
              console.log('[StaffAccess] 📱 New Device ID (target):', newDeviceId);
              const result = await transferSession({ password, newDeviceId: newDeviceId });
              console.log('[StaffAccess] ✅ staffSessionTransfer result:', result);

              if (result.data.success) {
                // On host device: end session, hide nav items, redirect to index
                console.log('[StaffAccess] ✅ Transfer successful on host device, ending session...');

                isSessionActive = false;
                sessionEndTime = null;
                updateButtonState(false);

                // Stop timer
                if (window.staffTimer) {
                  window.staffTimer.stopTimer();
                }

                // Hide nav items
                if (window.staffNavItems && window.staffNavItems.hide) {
                  window.staffNavItems.hide();
                }

                closePopup();

                // Redirect to index.html
                setTimeout(() => {
                  window.location.href = '/index.html';
                }, 500);
              } else {
                alert(getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.'));
              }
            } catch (error) {
              console.error('[StaffAccess] Error transferring session:', error);
              console.error('[StaffAccess] Error code:', error.code);
              console.error('[StaffAccess] Error message:', error.message);
              console.error('[StaffAccess] Error details:', error.details);

              let errorMessage = getTranslation('pages.settings.staff.popup.error', 'Hibás jelszó vagy hozzáférés megtagadva.');

              if (error.code === 'unauthenticated') {
                errorMessage = 'Nincs bejelentkezve. Jelentkezz be újra!';
              } else if (error.code === 'permission-denied') {
                errorMessage = 'Hibás jelszó!';
              } else if (error.code === 'failed-precondition') {
                errorMessage = error.message || 'Nincs aktív munkamenet az átvitelhez.';
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

  // Export for global access
  window.staffAccess = {
    checkActiveSession,
    isSessionActive: () => isSessionActive,
    showSessionTransferPopup,
    showEndAllSessionsPopup
  };

  // Console commands for testing
  if (typeof window !== 'undefined') {
    window.testStaffSessionTransfer = () => {
      console.log('[StaffAccess] Testing session transfer popup...');
      showSessionTransferPopup();
    };

    window.testStaffSessionReplaced = () => {
      console.log('[StaffAccess] Testing session replaced notification...');
      showSessionReplacedOnOtherDeviceNotification();
    };

    window.testStaffEndAllSessions = () => {
      console.log('[StaffAccess] Testing end all sessions...');
      const endAllBtn = document.getElementById('staffEndAllBtn');
      if (endAllBtn) {
        endAllBtn.click();
      } else {
        showEndAllSessionsPopup();
      }
    };

    // Console command to end all sessions directly (with password prompt)
    window.endAllStaffSessions = async (password) => {
      if (!password) {
        password = prompt('Add meg az admin jelszót:');
        if (!password) {
          console.log('[StaffAccess] ❌ No password provided');
          return;
        }
      }

      console.log('[StaffAccess] Ending all sessions with password...');
      try {
        const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
        const endAllSessions = httpsCallable(window.functions, 'staffSessionEndAll');
        const result = await endAllSessions({ password });
        console.log('[StaffAccess] ✅ All sessions ended:', result.data);

        // Stop timer and hide nav items
        if (window.staffTimer) {
          window.staffTimer.stopTimer();
        }
        if (window.staffNavItems && window.staffNavItems.hide) {
          window.staffNavItems.hide();
        }

        // Reload page
        window.location.reload();
      } catch (error) {
        console.error('[StaffAccess] Error ending all sessions:', error);
        alert('Hiba: ' + (error.message || 'Hibás jelszó vagy hozzáférés megtagadva.'));
      }
    };
  }
})();
