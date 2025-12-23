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
   * Track button click and save navigation state
   */
  function trackNavigation(fromStep, toStep) {
    if (isIgnoredStep(window.location.hash || '')) {
      return; // Don't track ignored steps
    }

    const previous = fromStep > 0 ? fromStep : null;
    const now = toStep;
    const next = toStep > 0 ? toStep + 1 : null;

    saveNavState(previous, now, next);
  }

  /**
   * Check for navigation inconsistencies
   */
  function checkNavigationConsistency() {
    const currentHash = window.location.hash || '';
    const currentStep = getCurrentStep();
    const navState = getNavState();

    // If we're on an ignored step, don't check
    if (isIgnoredStep(currentHash)) {
      return true;
    }

    // If no nav state, this is the first step or after refresh
    if (!navState) {
      // If we're not on step 1, check localStorage for last step
      if (currentStep > 1) {
        try {
          const lastStep = parseInt(localStorage.getItem('eu2k_onboarding_last_step') || '1');
          if (lastStep > 0 && lastStep < currentStep) {
            // We might have refreshed, restore to last valid step
            const lastHash = Object.keys(STEP_MAP).find(key => STEP_MAP[key] === lastStep);
            if (lastHash !== undefined) {
              console.log('[OnboardingSafeCheck] Restoring to last step:', lastStep, lastHash);
              window.location.hash = lastHash;
              return false;
            }
          }
        } catch (e) {
          console.warn('[OnboardingSafeCheck] Error checking localStorage:', e);
        }
      }
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

      // Redirect to expected step (for testing, redirect to step 3 if next was 3)
      const expectedHash = Object.keys(STEP_MAP).find(key => STEP_MAP[key] === navState.next);
      if (expectedHash !== undefined) {
        console.log('[OnboardingSafeCheck] Redirecting to expected step:', navState.next, expectedHash);
        window.location.hash = expectedHash;
        return false;
      }
    }

    return true;
  }

  /**
   * Handle page refresh
   */
  function handleRefresh() {
    const currentHash = window.location.hash || '';
    const currentStep = getCurrentStep();

    // If we're on an ignored step, check localStorage for previous step
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

    // Check navigation consistency
    checkNavigationConsistency();
  }

  /**
   * Initialize safe check
   */
  function initSafeCheck() {
    // Handle initial load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(handleRefresh, 100);
      });
    } else {
      setTimeout(handleRefresh, 100);
    }

    // Track hash changes
    let lastHash = window.location.hash || '';
    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash || '';
      const fromStep = getStepIndex(lastHash);
      const toStep = getStepIndex(currentHash);

      // Track navigation
      if (fromStep > 0 && toStep > 0 && !isIgnoredStep(currentHash)) {
        trackNavigation(fromStep, toStep);
      }

      // Check consistency after a short delay
      setTimeout(() => {
        checkNavigationConsistency();
      }, 50);

      lastHash = currentHash;
    });

    // Track button clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if it's a navigation button
      const isNextButton = target.closest('[id*="Next"], [id*="next"], .onboarding-start-btn, .button-group-item');
      const isLoginButton = target.closest('.button-group-item[data-login-type]');
      
      if (isNextButton || isLoginButton) {
        const currentHash = window.location.hash || '';
        const currentStep = getCurrentStep();
        
        // Determine next step based on button
        let nextStep = currentStep + 1;
        
        // Special cases
        if (currentHash === '' || currentHash === '#') {
          // From start screen, next is login
          nextStep = 2;
        } else if (currentHash === '#login') {
          // From login, next depends on which button was clicked
          if (isLoginButton) {
            nextStep = 3; // login-progress
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

        if (nextStep > 0 && currentStep > 0) {
          trackNavigation(currentStep, nextStep);
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

