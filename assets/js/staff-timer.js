/**
 * Staff Session Timer
 * Displays and synchronizes session countdown timer
 */

(function() {
  'use strict';

  let timerElement = null;
  let timerInterval = null;
  let sessionEndTime = null;
  let syncInterval = null;
  let syncCounter = 0;

  /**
   * Initialize timer
   */
  function initTimer() {
    console.log('[StaffTimer] 🚀 Initializing timer...');
    // Create timer element immediately (even if session is not active)
    if (!timerElement || !document.getElementById('staffSessionTimer')) {
      console.log('[StaffTimer] Creating timer element...');
      createTimerElement();
    } else {
      console.log('[StaffTimer] Timer element already exists');
    }
    // Check if session is active
    checkAndStartTimer();
  }

  /**
   * Check if session is active and start timer
   * Always runs and redirects if no active session
   */
  async function checkAndStartTimer() {
    try {
      // Wait for Firebase to be available
      let retries = 0;
      while (!window.firebaseApp && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!window.firebaseApp) {
        console.warn('[StaffTimer] Firebase app not available');
        return;
      }

      const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const auth = getAuth(window.firebaseApp);

      // Wait for auth state
      await new Promise((resolve) => {
        if (auth.currentUser) {
          resolve();
        } else {
          const unsubscribe = auth.onAuthStateChanged(() => {
            unsubscribe();
            resolve();
          });
        }
      });

      if (!auth.currentUser) {
        return;
      }

      const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
      const functions = getFunctions(window.firebaseApp, 'europe-west1');
      const checkSession = httpsCallable(functions, 'staffSessionCheck');

      const result = await checkSession();
      console.log('[StaffTimer] Session check result:', result.data);
      
      if (result.data.active) {
        console.log('[StaffTimer] ✅ Session is active, starting timer with endTime:', result.data.endTime);
        startTimer(result.data.endTime);
      } else {
        console.log('[StaffTimer] ❌ Session is not active');
        // No active session - check if we're on a protected page
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html' || currentPage === 'students.html') {
          handleSessionExpired();
        } else {
          // On other pages, just stop timer and hide nav items
          stopTimer();
          if (window.staffNavItems && window.staffNavItems.hide) {
            window.staffNavItems.hide();
          }
        }
      }
    } catch (error) {
      console.error('[StaffTimer] Error checking session:', error);
      // On error, also redirect if we're on a protected page
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === 'dashboard.html' || currentPage === 'students.html') {
        handleSessionExpired();
      }
    }
  }

  /**
   * Start timer with given end time
   */
  function startTimer(endTime) {
    sessionEndTime = endTime;
    
    // Create timer element if not exists
    if (!timerElement || !document.getElementById('staffSessionTimer')) {
      createTimerElement();
      
      // Wait for timer element to be created (with retry)
      let retries = 0;
      const maxRetries = 50; // 5 seconds
      const waitForElement = () => {
        timerElement = document.getElementById('staffSessionTimer');
        if (timerElement) {
          // Element created, show it
          timerElement.style.display = 'flex';
          console.log('[StaffTimer] Timer element found and displayed');
        } else {
          retries++;
          if (retries < maxRetries) {
            setTimeout(waitForElement, 100);
            return;
          }
          console.error('[StaffTimer] Timer element not created after', maxRetries, 'retries');
        }
      };
      waitForElement();
    } else {
      // Element already exists, just show it
      timerElement.style.display = 'flex';
      console.log('[StaffTimer] Timer element already exists, displaying');
    }

    // Start countdown
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial update

    // Start sync every minute
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    syncInterval = setInterval(syncWithServer, 60000); // Every minute
  }

  /**
   * Stop timer
   */
  function stopTimer() {
    sessionEndTime = null;
    
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }

    if (timerElement) {
      timerElement.style.display = 'none';
    }

    syncCounter = 0;
  }

  /**
   * Create timer element in the DOM
   */
  function createTimerElement() {
    // If already exists, return
    if (timerElement && document.getElementById('staffSessionTimer')) {
      return;
    }

    // Try to find header icon container with retry
    let retries = 0;
    const maxRetries = 50; // 5 seconds
    
    const tryCreate = () => {
      // Find the settings button wrapper (to insert timer before it)
      const settingsWrapper = document.querySelector('#headerSettingsWrapper') ||
                            document.querySelector('[id*="Settings"]') ||
                            document.querySelector('.header-icon-wrapper[id*="settings"]') ||
                            document.querySelector('.header-icon-wrapper');
      
      // Also try to find header-icon-gradient or header-icon-container
      const gradientContainer = document.querySelector('.header-icon-gradient') ||
                               document.querySelector('.header-icon-container');
      
      if (!settingsWrapper && !gradientContainer) {
        retries++;
        if (retries < maxRetries) {
          setTimeout(tryCreate, 100);
          return;
        }
        console.warn('[StaffTimer] Settings wrapper or gradient container not found after', maxRetries, 'retries');
        return;
      }

      // Create timer element
      timerElement = document.createElement('div');
      timerElement.id = 'staffSessionTimer';
      timerElement.style.cssText = `
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        background: #D3FFA1;
        border-radius: 16px;
        padding: 6px 12px;
        margin-right: 8px;
        color: #182C0E;
        font-size: 14px;
        font-weight: 600;
        z-index: 400;
        transition: all 0.3s ease;
      `;

      timerElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="#182C0E" stroke-width="2"/>
          <path d="M8 4V8L11 11" stroke="#182C0E" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span id="staffTimerText">15:00</span>
      `;

      // Insert before settings wrapper if found, otherwise at the beginning of gradient container
      if (settingsWrapper && settingsWrapper.parentElement) {
        settingsWrapper.parentElement.insertBefore(timerElement, settingsWrapper);
        console.log('[StaffTimer] ✅ Timer element created and inserted before settings button');
      } else if (gradientContainer) {
        gradientContainer.insertBefore(timerElement, gradientContainer.firstChild);
        console.log('[StaffTimer] ✅ Timer element created and inserted at beginning of gradient container');
      } else {
        console.error('[StaffTimer] ❌ Could not find insertion point for timer element');
        // Last resort: try to append to header-icon-container
        const iconContainer = document.querySelector('.header-icon-container');
        if (iconContainer) {
          const gradient = iconContainer.querySelector('.header-icon-gradient');
          if (gradient) {
            gradient.insertBefore(timerElement, gradient.firstChild);
            console.log('[StaffTimer] ✅ Timer element inserted as last resort');
          }
        }
      }
      
      // Make sure timer element is stored
      if (timerElement) {
        console.log('[StaffTimer] Timer element ID:', timerElement.id, 'Display:', timerElement.style.display);
      }
    };
    
    tryCreate();
  }

  /**
   * Update timer display
   */
  function updateTimer() {
    if (!sessionEndTime || !timerElement) {
      return;
    }

    const now = Date.now();
    const remaining = sessionEndTime - now;

    if (remaining <= 0) {
      // Session expired
      stopTimer();
      handleSessionExpired();
      return;
    }

    // Calculate minutes and seconds
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    // Update display
    const timerText = document.getElementById('staffTimerText');
    if (timerText) {
      timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Change color when < 5 minutes
    if (minutes < 5 && timerElement) {
      timerElement.style.background = '#FFD3A1';
      timerElement.style.color = '#4A2000';
    }

    // Change to red when < 2 minutes
    if (minutes < 2 && timerElement) {
      timerElement.style.background = '#FF9A9A';
      timerElement.style.color = '#4A0000';
    }
  }

  /**
   * Sync with server every minute
   */
  async function syncWithServer() {
    syncCounter++;
    
    // Sync 15 times (every minute for 15 minutes)
    if (syncCounter > 15) {
      return;
    }

    try {
      if (!window.firebaseApp) {
        return;
      }

      const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
      const functions = getFunctions(window.firebaseApp, 'europe-west1');
      const checkSession = httpsCallable(functions, 'staffSessionCheck');

      const result = await checkSession();
      
      if (!result.data.active) {
        // Session ended on server
        stopTimer();
        handleSessionExpired();
        return;
      }

      const serverEndTime = result.data.endTime;
      const clientEndTime = sessionEndTime;
      const diff = Math.abs(serverEndTime - clientEndTime);

      // If difference > 2 seconds, sync with server
      if (diff > 2000) {
        console.log('[StaffTimer] Syncing with server. Diff:', diff, 'ms');
        sessionEndTime = serverEndTime;
        updateTimer();
      }
    } catch (error) {
      console.error('[StaffTimer] Error syncing with server:', error);
    }
  }

  /**
   * Handle session expired - hide nav items, show notification, redirect
   */
  function handleSessionExpired() {
    // Hide staff nav items
    if (window.staffNavItems && window.staffNavItems.hide) {
      window.staffNavItems.hide();
    }

    // Get translations
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    const title = getTranslation('staff_timer.expired_title', 'Munkamenet lejárt');
    const message = getTranslation('staff_timer.expired_description', 'A munkamenet lejárt. Kérlek jelentkezz be újra a beállításokban.');
    const buttonLabel = getTranslation('pages.settings.staff.button_login', 'Belépés');

    // Get current page once
    const currentPage = window.location.pathname.split('/').pop();
    
    // Show danger notification with button ONLY on index.html
    if (currentPage === 'index.html' || currentPage === '' || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      if (window.showToastDirectly) {
        window.showToastDirectly(
          title,
          message,
          'danger',
          'info',
          buttonLabel,
          () => {
            // Navigate to settings.html#general and scroll to staff card
            window.location.href = 'settings.html#general';
            
            // Wait for page load, then scroll to staff card
            const checkAndScroll = () => {
              const staffCard = document.getElementById('staffAccessCard');
              if (staffCard) {
                const scrollArea = document.querySelector('.main-scroll-area') || document.body;
                const cardTop = staffCard.getBoundingClientRect().top + scrollArea.scrollTop;
                const scrollPosition = cardTop - (window.innerHeight / 2) + (staffCard.offsetHeight / 2);
                scrollArea.scrollTo({
                  top: Math.max(0, scrollPosition),
                  behavior: 'smooth'
                });
              } else {
                // Retry if card not found yet
                setTimeout(checkAndScroll, 100);
              }
            };
            setTimeout(checkAndScroll, 500);
          }
        );
      }
    } else {
      // On other pages, just hide nav items (no notification)
      console.log('[StaffTimer] Session expired on', currentPage, '- hiding nav items only');
    }

    // Redirect to index ONLY if we're on dashboard.html or students.html
    if (currentPage === 'dashboard.html' || currentPage === 'students.html') {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimer);
  } else {
    initTimer();
  }

  // Check session periodically even if timer is not active
  // This ensures we always check the server-side session status
  setInterval(() => {
    checkAndStartTimer();
  }, 30000); // Check every 30 seconds

  // Export for global access
  window.staffTimer = {
    startTimer,
    stopTimer,
    isActive: () => sessionEndTime !== null
  };
})();

