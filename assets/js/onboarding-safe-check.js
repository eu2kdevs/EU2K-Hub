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

  /**
   * Check for navigation inconsistencies
   * Only call this on button clicks, not on hash changes!
   */
  function checkNavigationConsistency() {
    // Prevent infinite loops
    if (isRedirecting) {
      return true;
    }

    const currentHash = window.location.hash || '';
    const currentStep = getCurrentStep();
    const navState = getNavState();

    // If we're on an ignored step, don't check
    if (isIgnoredStep(currentHash)) {
      return true;
    }

    // If no nav state, this is the first step or after refresh - allow it
    if (!navState) {
      return true;
    }

    // Check if we're on the expected step
    if (navState.next && currentStep !== navState.next && currentStep > 0) {
      // Inconsistency detected
      console.warn('[OnboardingSafeCheck] Navigation inconsistency detected:', {
        expected: navState.next,
        actual: currentStep,
        currentHash
      });

      // If we're on an ignored step, allow it
      if (isIgnoredStep(currentHash)) {
        return true;
      }

      // If we're on finished, allow it
      if (currentHash === '#finished') {
        return true;
      }

      // Redirect to expected step
      const expectedHash = Object.keys(STEP_MAP).find(key => STEP_MAP[key] === navState.next);
      if (expectedHash !== undefined) {
        console.log('[OnboardingSafeCheck] Redirecting to expected step:', navState.next, expectedHash);
        isRedirecting = true;
        window.location.hash = expectedHash;
        // Reset flag after a short delay to allow the redirect to complete
        setTimeout(() => {
          isRedirecting = false;
        }, 500);
        return false;
      }
    }

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

    // Track hash changes - track navigation and check consistency for manual URL changes
    let lastHash = window.location.hash || '';
    let isButtonClick = false; // Flag to track if hash change was caused by button click
    
    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash || '';
      const fromStep = getStepIndex(lastHash);
      const toStep = getStepIndex(currentHash);

      // Only track navigation if it's a valid step transition
      // Special case: don't track navigation from start (step 1) to login (step 2) here
      // This is handled by the button click handler to prevent setting next: 3
      if (fromStep > 0 && toStep > 0 && !isIgnoredStep(currentHash) && !isRedirecting) {
        // Don't track if we're going from start to login - that's handled by button click
        if (fromStep === 1 && toStep === 2) {
          // Skip tracking here - button click handler will handle it
          lastHash = currentHash;
          // Reset button click flag
          isButtonClick = false;
          return;
        }
        // Only track navigation if it wasn't caused by a button click
        // (button clicks handle their own tracking)
        if (!isButtonClick) {
          trackNavigation(fromStep, toStep);
        }
      }

      // Check consistency for manual URL changes (not caused by button clicks)
      // But only if we're not redirecting and not in the login flow
      if (!isRedirecting && !isButtonClick) {
        // Don't check consistency if we're on login screen without a nav state
        // (this means we just arrived at login from start screen)
        const navState = getNavState();
        if (navState && navState.next && currentHash !== '#login') {
          // Small delay to ensure hash change has completed
          setTimeout(() => {
            checkNavigationConsistency();
          }, 100);
        }
      }

      // Reset button click flag
      isButtonClick = false;
      lastHash = currentHash;
    });

    // Track button clicks - ONLY check consistency on button clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if it's a navigation button
      const isNextButton = target.closest('[id*="Next"], [id*="next"], .onboarding-start-btn, .button-group-item, [data-action="next"], [data-action="continue"]');
      const isLoginButton = target.closest('.button-group-item[data-login-type]');
      
      if (isNextButton || isLoginButton) {
        // Set flag to indicate this hash change was caused by a button click
        isButtonClick = true;
        const currentHash = window.location.hash || '';
        const currentStep = getCurrentStep();
        
        // Determine next step based on button
        let nextStep = currentStep + 1;
        
        // Special cases
        if (currentHash === '' || currentHash === '#') {
          // From start screen, next is login
          // Track navigation but don't set next - we'll only set it when login button is clicked
          trackNavigation(1, 2, null); // explicitNext = null means no next step yet
          // Don't check consistency here - we just arrived at login, wait for user to click login button
          return;
        } else if (currentHash === '#login') {
          // From login, next depends on which button was clicked
          // ONLY set nextStep to 3 if login button was clicked
          if (isLoginButton) {
            nextStep = 3; // login-progress
          } else {
            // If we're on login but didn't click login button, don't track navigation
            // This prevents the consistency check from expecting step 3
            return;
          }
        } else if (currentHash === '#preferences1') {
          nextStep = 7; // preferences2
        } else if (currentHash === '#preferences2') {
          nextStep = 8; // legal-terms
        } else if (currentHash === '#legal-terms') {
          nextStep = 9; // last-things
        } else if (currentHash === '#last-things') {
          nextStep = -1; // finished (ignored)
        }

        // Only check consistency if:
        // 1. It's a valid step transition (nextStep > 0 && currentStep > 0)
        // 2. If we're on login screen, only check if login button was clicked
        if (nextStep > 0 && currentStep > 0) {
          // Save navigation state BEFORE the hash changes
          trackNavigation(currentStep, nextStep);
          
          // Check consistency ONLY when button is clicked, AFTER hash has changed
          // Wait a bit longer to ensure hash change has completed
          setTimeout(() => {
            checkNavigationConsistency();
          }, 200);
        }
      }
    }, true); // Use capture phase to catch events early
  }

  // Initialize
  initSafeCheck();

  // Export for debugging
  window.onboardingSafeCheck = {
    getCurrentStep,
    getNavState,
    checkNavigationConsistency,
    STEP_MAP
  };
})();

