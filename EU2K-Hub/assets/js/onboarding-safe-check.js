/**
 * Onboarding Safe Check Script
 * Tracks navigation steps and ensures consistent flow
 */

(function () {
  'use strict';

  // Helper to get user type
  function getUserType() {
    const type = (localStorage.getItem('eu2k-user-type') || '').trim();
    // Debug log to trace teacher detection issues
    if (type) console.log('[OnboardingSafeCheck] UserType resolved as:', type);
    return type;
  }

  // Dynamic step map based on user type
  function getStepMap() {
    const userType = getUserType();
    const isTeacher = userType === 'teacher';

    const map = {
      '': 1,
      '#': 1,
      '#login': 2,
      '#login-progress': 3,
      '#looks': 4,
      '#name': 5
    };

    if (isTeacher) {
      // Teacher flow: skip personal-info, contacts, assign-class
      // New flow: name -> teacher-actions -> register/join/add-students -> preferences
      // register-class and add-students are same index (register flow)
      // join-class is also same index (join flow)
      map['#teacher-actions'] = 6;
      map['#register-class'] = 7;  // Step 7 (register flow)
      map['#add-students'] = 7;    // Step 7 (register flow continuation)
      map['#join-class'] = 7;      // Step 7 (join flow)
      map['#preferences1'] = 8;
      map['#preferences2'] = 9;
      map['#legal-terms'] = 10;
      map['#last-things'] = 11;

      // Ignored checks for skipped steps (mapped to -1 or treated as invalid)
      map['#personal-info'] = -1;
      map['#contacts'] = -1;
      map['#assign-class'] = -1;
    } else {
      // Student flow (default)
      map['#personal-info'] = 6;
      map['#contacts'] = 7;
      map['#assign-class'] = 8;
      map['#preferences1'] = 9;
      map['#preferences2'] = 10;
      map['#legal-terms'] = 11;
      map['#last-things'] = 12;
    }

    // Ignored steps
    map['#language'] = -1;
    map['#login-failed'] = -1;
    map['#restart'] = -1;
    map['#finished'] = -1;
    map['#login#language'] = -1;

    return map;
  }

  // Ignored steps (don't count in flow)
  const IGNORED_STEPS = ['#language', '#login-failed', '#restart', '#finished', '#login#language'];

  /**
   * Get step index from hash
   */
  function getStepIndex(hash) {
    const map = getStepMap();
    return map[hash] !== undefined ? map[hash] : -1;
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
  function saveNavState(previous, now, next, previousHash = null, currentHash = null) {
    try {
      const state = {
        previous: previous || null,
        now: now,
        next: next || null,
        previousHash: previousHash || null,  // Track actual previous hash for same-index steps
        currentHash: currentHash || null,   // Track current hash
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
   * @param {string|null} fromHash - The hash we're coming from
   * @param {string|null} toHash - The hash we're going to
   */
  function trackNavigation(fromStep, toStep, explicitNext = null, fromHash = null, toHash = null) {
    if (isIgnoredStep(window.location.hash || '')) {
      return; // Don't track ignored steps
    }

    const previous = fromStep > 0 ? fromStep : null;
    const now = toStep;
    // If explicitNext is provided, use it; otherwise calculate as toStep + 1
    // Special case: if we're going to login (step 2) from start (step 1), don't set next yet
    const next = explicitNext !== null ? explicitNext : (toStep > 0 && !(fromStep === 1 && toStep === 2) ? toStep + 1 : null);

    saveNavState(previous, now, next, fromHash, toHash);
  }

  // Flag to prevent infinite redirect loops
  let isRedirecting = false;

  // Flag to track if login is complete (Firebase sign-in successful)
  let isLoginComplete = false;

  // Listen for login completion message in console
  const originalLog = console.log;
  console.log = function (...args) {
    originalLog.apply(console, args);
    // Check if login is complete
    if (args.some(arg => typeof arg === 'string' && arg.includes('Firebase sign-in with Microsoft successful'))) {
      isLoginComplete = true;
      console.log('[OnboardingSafeCheck] Login complete flag set');
    }
  };

  /**
   * Check for navigation inconsistencies
   * Only redirects if user skipped steps (e.g., going from 4 to 6 when next was 5)
   * Allows backward navigation and normal forward navigation
   */
  function checkNavigationConsistency() {
    // Prevent infinite loops
    if (isRedirecting) {
      return true;
    }

    const currentHash = window.location.hash || '';
    const currentStep = getCurrentStep();
    const navState = getNavState();

    // Use dynamic map
    const map = getStepMap();

    // If we're on an ignored step, don't check
    if (isIgnoredStep(currentHash)) {
      return true;
    }

    // If no nav state, this is the first step or after refresh - allow it
    if (!navState) {
      return true;
    }

    // Only check if we skipped steps forward (not backward)
    // If currentStep is greater than expected next, we skipped steps
    if (navState.next && currentStep > navState.next && currentStep > 0) {
      // Special case: if we're on login-progress, don't redirect until login is complete
      if (currentHash === '#login-progress' && !isLoginComplete) {
        console.log('[OnboardingSafeCheck] On login-progress, waiting for login to complete...');
        return true; // Allow staying on login-progress
      }

      // Special case: Teacher flow - allow specific transitions for parallel steps
      const userType = getUserType();
      if (userType === 'teacher') {
        // Step 6 (teacher-actions) can go to step 7 (register/join/add-students)
        // Step 7 can go to step 8 (preferences1)
        // Only allow skip to preferences1 if user explicitly clicked skip button (flag set)
        const skipClassRegistration = sessionStorage.getItem('skipClassRegistration') === 'true';
        if ((navState.next === 6 && currentStep === 7) ||
          (navState.next === 7 && currentStep === 8) ||
          (navState.next === 6 && currentStep === 8 && skipClassRegistration) || // Only if skip flag set
          (navState.next === 8 && currentStep === 9)) {
          console.log('[OnboardingSafeCheck] Teacher flow: allowing navigation from', navState.next, 'to', currentStep);
          return true;
        }
      }

      // Inconsistency detected - user skipped steps
      console.warn('[OnboardingSafeCheck] Navigation inconsistency detected - skipped steps:', {
        expected: navState.next,
        actual: currentStep,
        currentHash,
        userType: userType
      });

      // If we're on an ignored step, allow it
      if (isIgnoredStep(currentHash)) {
        return true;
      }

      // If we're on finished, allow it
      if (currentHash === '#finished') {
        return true;
      }

      // Redirect to expected step (the next valid step)
      // Use dynamic map keys
      const expectedHash = Object.keys(map).find(key => map[key] === navState.next);
      if (expectedHash !== undefined) {
        console.log('[OnboardingSafeCheck] Redirecting to expected step (prevented step skipping):', navState.next, expectedHash);
        isRedirecting = true;
        window.location.hash = expectedHash;
        // Reset flag after a short delay to allow the redirect to complete
        setTimeout(() => {
          isRedirecting = false;
        }, 500);
        return false;
      }
    }

    // Allow backward navigation (currentStep < navState.next) and normal forward navigation (currentStep === navState.next)
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
          const map = getStepMap();
          const lastHash = Object.keys(map).find(key => map[key] === lastStep);
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

    // Track hash changes - track navigation properly
    let lastHash = window.location.hash || '';
    let isButtonClick = false; // Flag to track if hash change was caused by button click

    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash || '';
      const fromStep = getStepIndex(lastHash);
      const toStep = getStepIndex(currentHash);

      // FIRST: Check consistency BEFORE tracking (so navState isn't overwritten)
      // But only if we're not redirecting and not in the login flow
      if (!isRedirecting && !isButtonClick) {
        const navState = getNavState();
        if (navState && navState.next && currentHash !== '#login') {
          // Special case: if we're on login-progress, don't check until login is complete
          if (currentHash === '#login-progress' && !isLoginComplete) {
            // Wait for login to complete before checking
            lastHash = currentHash;
            isButtonClick = false;
            return;
          }

          // Check consistency IMMEDIATELY to prevent step skipping
          checkNavigationConsistency();

          if (isRedirecting) {
            isButtonClick = false;
            lastHash = currentHash;
            return;
          }
        }
      }

      // SECOND: Track navigation AFTER consistency check
      if (fromStep > 0 && toStep > 0 && !isIgnoredStep(currentHash) && !isRedirecting && !isButtonClick) {
        // Calculate next step for tracking
        let nextStep = toStep + 1;

        // Handle last step logic
        if (currentHash === '#last-things') {
          nextStep = -1; // finished (ignored)
        }

        // Track navigation with calculated next step and hashes
        trackNavigation(fromStep, toStep, nextStep > 0 ? nextStep : null, lastHash, currentHash);
      }

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

        // For back button, go to previous step from nav state
        if (isBackButton) {
          e.preventDefault(); // Prevent default behavior
          e.stopPropagation(); // Stop event propagation

          console.log('[OnboardingSafeCheck] Back button clicked, current step:', currentStep);
          const navState = getNavState();

          // First try: Use previousHash if available (for same-index steps like register-class -> add-students)
          if (navState && navState.previousHash) {
            console.log('[OnboardingSafeCheck] Using previousHash for navigation:', navState.previousHash);
            const previousStep = getStepIndex(navState.previousHash);
            const currentStepFromNav = navState.now;
            trackNavigation(currentStepFromNav, previousStep, currentStepFromNav, currentHash, navState.previousHash);
            isButtonClick = true;
            window.location.hash = navState.previousHash;
            return;
          }

          // Second try: Use previous step index
          if (navState && navState.previous && navState.previous > 0) {
            // Go to previous step
            const map = getStepMap();
            const previousHash = Object.keys(map).find(key => map[key] === navState.previous);
            if (previousHash !== undefined) {
              console.log('[OnboardingSafeCheck] Going back to previous step:', navState.previous, previousHash);
              // Track backward navigation: from current to previous
              const previousStep = navState.previous;
              const currentStepFromNav = navState.now;
              // Update nav state: previous becomes now, now becomes previous
              // Set next to current step (where we came from) so we can go back again
              trackNavigation(currentStepFromNav, previousStep, currentStepFromNav, currentHash, previousHash);
              isButtonClick = true; // Prevent double tracking
              window.location.hash = previousHash;
              return;
            }
          }

          // Fallback: go to start if no previous step
          console.log('[OnboardingSafeCheck] No previous step, going to start');
          if (currentStep > 0) {
            trackNavigation(currentStep, 1, currentStep, currentHash, ''); // Track going back to start
          }
          isButtonClick = true;
          window.location.hash = '';
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

          if (currentHash === '#last-things') {
            nextStep = -1;
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
    getStepMap
  };
})();
