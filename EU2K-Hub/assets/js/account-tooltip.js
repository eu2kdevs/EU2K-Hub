/**
 * Account Button Transform Handler
 * Transforms the account button itself on hover/click to show user info
 * Developer mode: keeps expanded on click until double-clicked
 */

(function() {
  'use strict';

  let userDataCache = null;
  let classDataCache = null;
  let isExpanded = false; // For developer mode
  let lastClickTime = 0; // For double-click detection

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
   * Initialize account button transformation for all account buttons
   */
  async function initAccountTooltip() {
    if (!document.body) {
      // Wait for body to be available
      setTimeout(initAccountTooltip, 100);
      return;
    }

    console.log('[AccountTooltip] Initializing...');

    // Pre-load user data before initializing buttons
    try {
      await loadUserData();
      console.log('[AccountTooltip] User data pre-loaded');
    } catch (error) {
      console.warn('[AccountTooltip] Error pre-loading user data:', error);
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

      // Store original button state
      const originalImg = btn.querySelector('img');
      if (!originalImg) return;

      // Store original button styles
      const originalStyles = {
        background: btn.style.background || getComputedStyle(btn).background,
        borderRadius: btn.style.borderRadius || getComputedStyle(btn).borderRadius,
        padding: btn.style.padding || getComputedStyle(btn).padding,
        minWidth: btn.style.minWidth || getComputedStyle(btn).minWidth,
        maxWidth: btn.style.maxWidth || getComputedStyle(btn).maxWidth,
        zIndex: btn.style.zIndex || getComputedStyle(btn).zIndex,
        pointerEvents: btn.style.pointerEvents || getComputedStyle(btn).pointerEvents
      };

      // Create expanded content structure (initially hidden)
      const expandedContent = document.createElement('div');
      expandedContent.className = 'account-expanded-content';
      expandedContent.style.cssText = `
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        width: 100%;
        height: 100%;
      `;

      expandedContent.innerHTML = `
        <img class="account-expanded-avatar" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" src="" alt="Profile">
        <div class="account-expanded-text" style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; text-align: left;">
          <span class="account-expanded-name" style="font-weight: 600; font-size: 14px; color: #182C0E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;"></span>
          <span class="account-expanded-class" style="font-size: 11px; color: #32451D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;"></span>
        </div>
      `;

      // Pre-populate expanded content with loaded data
      updateExpandedContent(expandedContent);

      // Insert expanded content after the original image
      originalImg.insertAdjacentElement('afterend', expandedContent);

      // Add CSS transition for smooth animation
      btn.style.transition = '0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      btn.style.overflow = 'hidden';

      // Store original styles in button dataset for later use
      btn.dataset.originalStyles = JSON.stringify(originalStyles);

      // Show/hide expanded state on hover
      let hoverTimeout;
      btn.addEventListener('mouseenter', () => {
        if (isExpanded && isDevModeEnabled()) return; // Don't show on hover if pinned
        clearTimeout(hoverTimeout);
        expandButton(btn, originalImg, expandedContent);
      });

      btn.addEventListener('mouseleave', () => {
        if (isExpanded && isDevModeEnabled()) return; // Don't hide if pinned
        hoverTimeout = setTimeout(() => {
          collapseButton(btn, originalImg, expandedContent);
        }, 100);
      });

      // Store references for use in expand/collapse functions
      btn.dataset.originalImg = 'true'; // Mark that we have originalImg
      btn._originalImg = originalImg;
      btn._expandedContent = expandedContent;

      // Developer mode: click to pin/unpin
      btn.addEventListener('click', (e) => {
        if (!isDevModeEnabled()) return;

        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickTime;
        lastClickTime = currentTime;

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300 && isExpanded) {
          // Double-click: unpin and collapse
          isExpanded = false;
          collapseButton(btn, btn._originalImg, btn._expandedContent);
          return;
        }

        // Single click: toggle pin
        if (isExpanded) {
          // Unpin: collapse
          isExpanded = false;
          collapseButton(btn, btn._originalImg, btn._expandedContent);
        } else {
          // Pin: expand
          isExpanded = true;
          loadUserData().then(() => {
            if (btn._expandedContent) {
              updateExpandedContent(btn._expandedContent);
            }
            expandButton(btn, btn._originalImg, btn._expandedContent);
          });
        }
      });
    });

    console.log('[AccountTooltip] Initialization complete');

    // Notify page loader that account tooltip is ready
    if (window.pageOverlayLoader && typeof window.pageOverlayLoader.accountTooltipReady === 'function') {
      window.pageOverlayLoader.accountTooltipReady();
    }
  }

  /**
   * Expand button to show user info
   */
  function expandButton(btn, originalImg, expandedContent) {
    // Use stored references if not provided
    if (!originalImg && btn._originalImg) {
      originalImg = btn._originalImg;
    }
    if (!expandedContent && btn._expandedContent) {
      expandedContent = btn._expandedContent;
    }
    
    loadUserData().then(() => {
      if (expandedContent) {
        updateExpandedContent(expandedContent);
      }
      
      // Hide original image
      if (originalImg) {
        originalImg.style.display = 'none';
      }
      
      // Show expanded content
      if (expandedContent) {
        expandedContent.style.display = 'flex';
      }
      
      // Transform button styles
      btn.style.background = 'rgb(211, 255, 161)';
      btn.style.borderRadius = '16px';
      btn.style.padding = '6px 12px';
      btn.style.minWidth = '160px';
      btn.style.maxWidth = '220px';
      btn.style.zIndex = '400';
      btn.style.pointerEvents = 'auto';
    });
  }

  /**
   * Collapse button back to original state
   */
  function collapseButton(btn, originalImg, expandedContent) {
    // Show original image
    if (originalImg) {
      originalImg.style.display = '';
    }
    
    // Hide expanded content
    if (expandedContent) {
      expandedContent.style.display = 'none';
    }
    
    // Reset button styles to original
    try {
      const originalStyles = JSON.parse(btn.dataset.originalStyles || '{}');
      btn.style.background = originalStyles.background || '';
      btn.style.borderRadius = originalStyles.borderRadius || '';
      btn.style.padding = originalStyles.padding || '';
      btn.style.minWidth = originalStyles.minWidth || '';
      btn.style.maxWidth = originalStyles.maxWidth || '';
      btn.style.zIndex = originalStyles.zIndex || '';
      btn.style.pointerEvents = originalStyles.pointerEvents || '';
    } catch (e) {
      // Fallback: remove inline styles
      btn.style.background = '';
      btn.style.borderRadius = '';
      btn.style.padding = '';
      btn.style.minWidth = '';
      btn.style.maxWidth = '';
      btn.style.zIndex = '';
      btn.style.pointerEvents = '';
    }
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
        // No profile picture and no avatar - leave as null (will be handled in updateExpandedContent)
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
   * Update expanded content with user data
   */
  function updateExpandedContent(expandedContent) {
    const avatarImg = expandedContent.querySelector('.account-expanded-avatar');
    const nameSpan = expandedContent.querySelector('.account-expanded-name');
    const classSpan = expandedContent.querySelector('.account-expanded-class');

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
