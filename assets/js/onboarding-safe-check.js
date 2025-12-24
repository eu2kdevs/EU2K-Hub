/**
 * Onboarding Safe Check Script
 * Tracks navigation steps and ensures consistent flow
 */

(function() {
  'use strict';

  // Step mapping: hash -> step index
  const STEP_MAP = {
    '': 1,                    // /onboarding or /onboarding#
    '#': 1,                   // /onboarding#
    '#login': 2,
    '#login-progress': 3,
    '#looks': 4,
    '#name': 5,
    '#preferences1': 6,
    '#preferences2': 7,
    '#legal-terms': 8,
    '#last-things': 9,
    '#language': -1,          // Ignored steps
    '#login-failed': -1,
    '#restart': -1,
    '#finished': -1,
    '#login#language': -1
  };

  // Ignored steps (don't count in flow)
  const IGNORED_STEPS = ['#language', '#login-failed', '#restart', '#finished', '#login#language'];

  /**
   * Get step index from hash
   */
  function getStepIndex(hash) {
    return STEP_MAP[hash] !== undefined ? STEP_MAP[hash] : -1;
  }

  /**
   * Get current step index
   */
  function getCurrentStep() {
    const hash = window.location.hash || '';
    return getStepIndex(hash);
  }

  /**
   * Check if step is ignored
   */
  function isIgnoredStep(hash) {
    return IGNORED_STEPS.includes(hash) || getStepIndex(hash) <= 0;
  }

  /**
   * Get navigation state from sessionStorage
   */
  function getNavState() {
    try {
      const state = sessionStorage.getItem('eu2k_onboarding_nav');
      return state ? JSON.parse(state) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save navigation state to sessionStorage
   */
  function saveNavState(previous, now, next) {
    try {
      const state = {
        previous: previous || null,
        now: now,
        next: next || null,
        timestamp: Date.now()
      };
      sessionStorage.setItem('eu2k_onboarding_nav', JSON.stringify(state));
      
      // Also save to localStorage as backup for refresh scenarios
      if (now > 0) {
        localStorage.setItem('eu2k_onboarding_last_step', now.toString());
      }
    } catch (e) {
      console.warn('[OnboardingSafeCheck] Failed to save nav state:', e);
    }
  }

  /**
   * Save current step before page unload (refresh/close)
   */
  function saveCurrentStepBeforeUnload() {
    try {
      const currentHash = window.location.hash || '';
      const currentStep = getCurrentStep();
      
      // Only save if it's a valid step (not ignored)
      if (currentStep > 0 && !isIgnoredStep(currentHash)) {
        localStorage.setItem('eu2k_onboarding_last_step', currentStep.toString());
        console.log('[OnboardingSafeCheck] Saved current step before unload:', currentStep, currentHash);
      }
    } catch (e) {
      console.warn('[OnboardingSafeCheck] Failed to save step before unload:', e);
    }
  }

  /**
   * Track button click and save navigation state
   * @param {number} fromStep - The step we're coming from
   * @param {number} toStep - The step we're going to
   * @param {number|null} explicitNext - Optional explicit next step (if null, calculates as toStep + 1)
   */
  function trackNavigation(fromStep, toStep, explicitNext = null) {
    if (isIgnoredStep(window.location.hash || '')) {
      return; // Don't track ignored steps
    }

    const previous = fromStep > 0 ? fromStep : null;
    const now = toStep;
    // If explicitNext is provided, use it; otherwise calculate as toStep + 1
    // Special case: if we're going to login (step 2) from start (step 1), don't set next yet
    const next = explicitNext !== null ? explicitNext : (toStep > 0 && !(fromStep === 1 && toStep === 2) ? toStep + 1 : null);

    saveNavState(previous, now, next);
  }

  // Flag to prevent infinite redirect loops
  let isRedirecting = false;
  
  // Flag to track if login is complete (Firebase sign-in successful)
  let isLoginComplete = false;
  
  // Listen for login completion message in console
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    // Check if login is complete
    if (args.some(arg => typeof arg === 'string' && arg.includes('Firebase sign-in with Microsoft successful'))) {
      isLoginComplete = true;
      console.log('[OnboardingSafeCheck] Login complete flag set');
    }
  };

  /**
   * Check for navigation inconsistencies
   * DISABLED: No longer redirects automatically - allows free navigation (including back button)
   * This function is kept for debugging purposes only
   */
  function checkNavigationConsistency() {
    // DISABLED: Don't redirect automatically - allow free navigation
    // The next step is still tracked for reference, but we don't enforce it
    return true;
  }

  /**
   * Handle page refresh - only restore if we're on an ignored step
   */
  function handleRefresh() {
    const currentHash = window.location.hash || '';
    const currentStep = getCurrentStep();

    // Only restore if we're on an ignored step
    if (isIgnoredStep(currentHash)) {
      try {
        const lastStep = parseInt(localStorage.getItem('eu2k_onboarding_last_step') || '1');
        if (lastStep > 0) {
          const lastHash = Object.keys(STEP_MAP).find(key => STEP_MAP[key] === lastStep);
          if (lastHash !== undefined && lastHash !== currentHash) {
            console.log('[OnboardingSafeCheck] Refresh on ignored step, restoring to:', lastStep, lastHash);
            window.location.hash = lastHash;
            return;
          }
        }
      } catch (e) {
        console.warn('[OnboardingSafeCheck] Error handling refresh:', e);
      }
    }

    // Don't check consistency on refresh - only on button clicks
  }

  /**
   * Initialize safe check
   */
  function initSafeCheck() {
    // Handle initial load - only restore if on ignored step
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(handleRefresh, 100);
      });
    } else {
      setTimeout(handleRefresh, 100);
    }

    // Save current step before page unload (refresh/close)
    window.addEventListener('beforeunload', () => {
      saveCurrentStepBeforeUnload();
    });

    // Track hash changes - DON'T check consistency, just track the change
    let lastHash = window.location.hash || '';
    let isButtonClick = false; // Flag to track if hash change was caused by button click
    
    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash || '';
      const fromStep = getStepIndex(lastHash);
      const toStep = getStepIndex(currentHash);

      // Only track navigation if it's a valid step transition and not caused by button click
      if (fromStep > 0 && toStep > 0 && !isIgnoredStep(currentHash) && !isRedirecting && !isButtonClick) {
        // Track navigation without setting explicit next
        trackNavigation(fromStep, toStep, null);
      }

      // DON'T check consistency on hash change - only on button clicks
      // This prevents auto-redirecting when user manually navigates

      // Reset button click flag
      isButtonClick = false;
      lastHash = currentHash;
    });

    // Track button clicks - track navigation but DON'T enforce consistency
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if it's a navigation button
      const isNextButton = target.closest('[id*="Next"], [id*="next"], .onboarding-start-btn, .button-group-item, [data-action="next"], [data-action="continue"]');
      const isBackButton = target.closest('#backBtn, [id*="Back"], [id*="back"]');
      const isLoginButton = target.closest('.button-group-item[data-login-type]');
      
      if (isNextButton || isLoginButton || isBackButton) {
        // Set flag to indicate this hash change was caused by a button click
        isButtonClick = true;
        const currentHash = window.location.hash || '';
        const currentStep = getCurrentStep();
        
        // For back button, DON'T track navigation (allow free backward navigation)
        if (isBackButton) {
          console.log('[OnboardingSafeCheck] Back button clicked, allowing free navigation');
          return;
        }
        
        // For forward navigation, track with next step calculation
        if (currentStep > 0 && !isIgnoredStep(currentHash)) {
          // Special case: Reset login complete flag when starting new login
          if (currentHash === '#login' && isLoginButton) {
            isLoginComplete = false;
            console.log('[OnboardingSafeCheck] Starting login, reset isLoginComplete flag');
          }
          
          // Determine next step based on current step
          let nextStep = currentStep + 1;
          
          // Special cases for step transitions
          if (currentHash === '' || currentHash === '#') {
            // From start screen, next is login
            trackNavigation(1, 2, null); // explicitNext = null means no next step yet
            return;
          } else if (currentHash === '#login') {
            // From login, next depends on which button was clicked
            if (isLoginButton) {
              nextStep = 3; // login-progress
            } else {
              return; // Don't track if not login button
            }
          } else if (currentHash === '#login-progress') {
            // Don't track on login-progress until login is complete
            if (!isLoginComplete) {
              return;
            }
            // After login is complete, next step is looks (4)
            nextStep = 4;
          } else if (currentHash === '#name') {
            nextStep = 6; // preferences1
          } else if (currentHash === '#preferences1') {
            nextStep = 7; // preferences2
          } else if (currentHash === '#preferences2') {
            nextStep = 8; // legal-terms
          } else if (currentHash === '#legal-terms') {
            nextStep = 9; // last-things
          } else if (currentHash === '#last-things') {
            nextStep = -1; // finished (ignored)
          }
          
          // Track navigation with calculated next step (but don't enforce it)
          if (nextStep > 0 && currentStep > 0) {
            trackNavigation(currentStep, nextStep);
          }
        }
      }
    }, true); // Use capture phase to catch events early
  }

  // Initialize
  initSafeCheck();

  // Function to set login complete flag
  function setLoginComplete() {
    isLoginComplete = true;
    console.log('[OnboardingSafeCheck] Login complete flag set via API');
  }

  // Export for debugging
  window.onboardingSafeCheck = {
    getCurrentStep,
    getNavState,
    checkNavigationConsistency,
    setLoginComplete,
    STEP_MAP
  };
})();

