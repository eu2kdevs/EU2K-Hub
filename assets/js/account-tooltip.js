/**
 * Account Button Tooltip Handler
 * Displays user profile picture, name, and class name on hover/click
 * Developer mode: keeps tooltip open on click until clicked again
 */

(function() {
  'use strict';

  let userDataCache = null;
  let classDataCache = null;
  let tooltipPinned = false; // For developer mode

  /**
   * Check if developer mode is enabled
   */
  function isDevModeEnabled() {
    try {
      return localStorage.getItem('eu2k-dev-mode') === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Initialize account tooltip for all account buttons
   */
  function initAccountTooltip() {
    if (!document.body) {
      // Wait for body to be available
      setTimeout(initAccountTooltip, 100);
      return;
    }
    const accountButtons = document.querySelectorAll('#headerAccountBtn, .header-icon-btn[href*="account"]');
    
    accountButtons.forEach(btn => {
      // Skip if already initialized
      if (btn.dataset.tooltipInitialized) return;
      btn.dataset.tooltipInitialized = 'true';

      // Remove default link behavior
      if (btn.tagName === 'A') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
        });
      }

      // Create tooltip element - inheriting permission popup styling (border-radius, etc.)
      const tooltip = document.createElement('div');
      tooltip.className = 'account-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: var(--card-bg, #16210B);
        border-radius: 32px;
        padding: 16px 20px;
        min-width: 240px;
        max-width: 320px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;

      // Tooltip content structure
      tooltip.innerHTML = `
        <img class="account-tooltip-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" src="" alt="Profile">
        <div class="account-tooltip-content" style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          <span class="account-tooltip-name" style="font-weight: 600; font-size: 14px; color: var(--text-primary, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
          <span class="account-tooltip-class" style="font-size: 12px; color: var(--text-secondary, #aaa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></span>
        </div>
      `;

      // Append tooltip to button wrapper
      const wrapper = btn.closest('.header-icon-wrapper');
      if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.appendChild(tooltip);
      }

      // Show/hide tooltip on hover
      let hoverTimeout;
      btn.addEventListener('mouseenter', () => {
        if (tooltipPinned && isDevModeEnabled()) return; // Don't show on hover if pinned
        clearTimeout(hoverTimeout);
        loadUserData().then(() => {
          updateTooltipContent(tooltip);
          tooltip.style.display = 'flex';
        });
      });

      btn.addEventListener('mouseleave', () => {
        if (tooltipPinned && isDevModeEnabled()) return; // Don't hide if pinned
        hoverTimeout = setTimeout(() => {
          tooltip.style.display = 'none';
        }, 100);
      });

      tooltip.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
      });

      tooltip.addEventListener('mouseleave', () => {
        if (tooltipPinned && isDevModeEnabled()) return; // Don't hide if pinned
        tooltip.style.display = 'none';
      });

      // Developer mode: click to pin/unpin tooltip
      btn.addEventListener('click', () => {
        if (!isDevModeEnabled()) return;

        if (tooltipPinned) {
          // Unpin: hide tooltip
          tooltipPinned = false;
          tooltip.style.display = 'none';
        } else {
          // Pin: show tooltip and keep it open
          tooltipPinned = true;
          loadUserData().then(() => {
            updateTooltipContent(tooltip);
            tooltip.style.display = 'flex';
          });
        }
      });
    });
  }

  /**
   * Get current language
   */
  function getCurrentLanguage() {
    try {
      return window.translationManager?.getCurrentLanguage() || 
             localStorage.getItem('eu2k_language') || 
             'hu';
    } catch {
      return 'hu';
    }
  }

  /**
   * Load user data from Firestore
   */
  async function loadUserData() {
    if (userDataCache && classDataCache) return;

    try {
      // Wait for Firebase to be available
      if (!window.db || !window.firebaseApp) {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (window.db && window.firebaseApp) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5000);
        });
      }

      if (!window.db) {
        console.warn('[AccountTooltip] Firebase not available');
        return;
      }

      const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
      const { getStorage, ref, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js");
      const auth = getAuth(window.firebaseApp);
      
      if (!auth.currentUser) {
        console.warn('[AccountTooltip] No user logged in');
        return;
      }

      const uid = auth.currentUser.uid;
      const storage = getStorage(window.firebaseApp);

      // Load user document
      const userDocRef = doc(window.db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let userData = {};
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      }

      // Load user general data
      const userGeneralRef = doc(window.db, 'users', uid, 'general_data', 'general');
      const userGeneralSnap = await getDoc(userGeneralRef);
      
      if (userGeneralSnap.exists()) {
        userData = { ...userData, ...userGeneralSnap.data() };
      }

      // Load profile picture from Firebase Storage or avatars
      let profilePictureURL = null;
      
      // Try to load from Firebase Storage (school profile picture)
      // Try with .jpg extension first, then without
      const storagePaths = [
        `profilePhotos/${uid}.jpg`,
        `profilePhotos/${uid}`
      ];
      
      let storageError = null;
      for (const path of storagePaths) {
        try {
          const storageRef = ref(storage, path);
          profilePictureURL = await getDownloadURL(storageRef);
          console.log('[AccountTooltip] Loaded profile picture from Storage:', path);
          break; // Success, exit loop
        } catch (error) {
          storageError = error;
          // Check if it's a 404/not found error
          const isNotFound = error.code === 'storage/object-not-found' || 
                            error.code === '404' || 
                            (error.message && (error.message.includes('404') || error.message.includes('not found')));
          
          if (!isNotFound) {
            // Other error (permission, network, etc.) - log and break
            console.warn('[AccountTooltip] Error loading profile picture from Storage:', error.code || error.message);
            break;
          }
          // 404 error - try next path silently
        }
      }
      
      // If no profile picture found in Storage, use avatar fallback
      if (!profilePictureURL && userData.avatarColor) {
        profilePictureURL = `assets/avatars/${userData.avatarColor}.png`;
        console.log('[AccountTooltip] Using avatar from assets/avatars:', userData.avatarColor);
      } else if (!profilePictureURL) {
        // No profile picture and no avatar - leave as null (will be handled in updateTooltipContent)
        console.log('[AccountTooltip] No profile picture found, using placeholder');
      }

      userDataCache = {
        ...userData,
        profilePictureURL: profilePictureURL
      };

      // Load class data from custom claims or Firestore
      try {
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        const customClaims = idTokenResult.claims;
        
        let classId = null;
        
        if (customClaims.class) {
          // Custom claim has class ID
          classId = customClaims.class;
          console.log('[AccountTooltip] Found class in custom claim:', classId);
        } else {
          // Fallback: try to load from users/{uid}/groups/ownclass
          try {
            const ownClassRef = doc(window.db, 'users', uid, 'groups', 'ownclass');
            const ownClassSnap = await getDoc(ownClassRef);
            
            if (ownClassSnap.exists()) {
              const ownClassData = ownClassSnap.data();
              const classFinishes = ownClassData.classFinishes || '';
              const classType = ownClassData.classType || '';
              
              if (classFinishes && classType) {
                classId = classFinishes + classType; // e.g., "2030e"
                console.log('[AccountTooltip] Found class from ownclass document:', classId);
              }
            }
          } catch (ownClassError) {
            console.warn('[AccountTooltip] Error loading ownclass document:', ownClassError);
          }
        }
        
        if (classId) {
          // Load class document to get class name
          const classRef = doc(window.db, 'classes', classId);
          const classSnap = await getDoc(classRef);
          
          if (classSnap.exists()) {
            classDataCache = {
              ...classSnap.data(),
              classId: classId
            };
            console.log('[AccountTooltip] Loaded class data:', classId, classDataCache);
          } else {
            // Fallback: use classId as name
            classDataCache = { name: classId, classId: classId };
            console.log('[AccountTooltip] Class document not found, using classId as name:', classId);
          }
        } else {
          console.warn('[AccountTooltip] No class found in custom claim or ownclass document');
        }
      } catch (error) {
        console.error('[AccountTooltip] Error loading class data:', error);
      }
    } catch (error) {
      console.error('[AccountTooltip] Error loading user data:', error);
    }
  }

  /**
   * Update tooltip content with user data
   */
  function updateTooltipContent(tooltip) {
    const avatarImg = tooltip.querySelector('.account-tooltip-avatar');
    const nameSpan = tooltip.querySelector('.account-tooltip-name');
    const classSpan = tooltip.querySelector('.account-tooltip-class');

    // Get translations
    const getTranslation = (key, fallback) => {
      try {
        return window.translationManager?.getTranslation(key) || fallback;
      } catch {
        return fallback;
      }
    };

    // Set avatar
    if (userDataCache?.profilePictureURL) {
      avatarImg.src = userDataCache.profilePictureURL;
      avatarImg.style.display = 'block';
    } else if (userDataCache?.photoURL) {
      avatarImg.src = userDataCache.photoURL;
      avatarImg.style.display = 'block';
    } else if (userDataCache?.pfpUrl) {
      avatarImg.src = userDataCache.pfpUrl;
      avatarImg.style.display = 'block';
    } else {
      // Default avatar
      avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzMzMiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNFYxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2VjE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2NjYiLz4KPC9zdmc+';
      avatarImg.style.display = 'block';
    }

    // Set name
    const displayName = userDataCache?.displayName || 
                       userDataCache?.nickname || 
                       userDataCache?.firstName || 
                       'User';
    nameSpan.textContent = displayName;

    // Set class name with proper formatting based on language
    if (classDataCache?.name || classDataCache?.classId) {
      const currentLang = getCurrentLanguage();
      const classWord = getTranslation('account.tooltip.class', 'Osztály');
      
      // Class name in database is always in format "2030e" or "2029g" (year + letter)
      const className = classDataCache.name || classDataCache.classId;
      let displayClassName = null;
      
      // Extract year and letter from class name (e.g., "2030e" -> year: 2030, letter: "e")
      const classMatch = className.match(/^(\d{4})(.+)$/);
      
      if (classMatch) {
        const graduationYear = parseInt(classMatch[1], 10);
        const classLetter = classMatch[2]; // e.g., "e", "g"
        
        // Calculate current grade from graduation year
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        
        // Years remaining = graduationYear - currentYear
        // Grade = 12 - yearsRemaining
        // If we're in September-December (month >= 9), new school year started, so grade + 1
        const yearsRemaining = graduationYear - currentYear;
        let gradeNumber = 12 - yearsRemaining;
        
        if (currentMonth >= 9) {
          // New school year started (September-December), so we're one grade higher
          gradeNumber += 1;
        }
        
        // Format: {grade}.{letter uppercase} (e.g., "8.E")
        if (gradeNumber >= 7 && gradeNumber <= 12) {
          const letterUpper = classLetter.charAt(0).toUpperCase();
          displayClassName = `${gradeNumber}.${letterUpper}`;
        } else {
          // Invalid grade, use classId as fallback
          displayClassName = className;
        }
      } else {
        // No year pattern found, use classId as-is
        displayClassName = className;
      }
      
      // Format class name based on language
      // English: "Class 8.E", Hungarian: "8.E Osztály"
      if (currentLang === 'en') {
        // English: Class comes first
        classSpan.textContent = `${classWord} ${displayClassName}`;
      } else {
        // Hungarian and other languages: Class name comes first
        classSpan.textContent = `${displayClassName} ${classWord}`;
      }
    } else {
      classSpan.textContent = getTranslation('account.tooltip.no_class', 'Nincs osztály');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountTooltip);
  } else {
    initAccountTooltip();
  }

  // Re-initialize if account button appears later
  if (document.body) {
    const observer = new MutationObserver(() => {
      const accountButtons = document.querySelectorAll('#headerAccountBtn, .header-icon-btn[href*="account"]');
      accountButtons.forEach(btn => {
        if (!btn.dataset.tooltipInitialized) {
          // Re-run init for new buttons
          setTimeout(initAccountTooltip, 100);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
