/**
 * Account Button Tooltip Handler
 * Displays user profile picture, name, and class name on hover
 */

(function() {
  'use strict';

  let userDataCache = null;
  let classDataCache = null;

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
      // Remove default link behavior
      if (btn.tagName === 'A') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // Optionally navigate on click if needed
          // window.location.href = btn.href;
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
        clearTimeout(hoverTimeout);
        loadUserData().then(() => {
          updateTooltipContent(tooltip);
          tooltip.style.display = 'flex';
        });
      });

      btn.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          tooltip.style.display = 'none';
        }, 100);
      });

      tooltip.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
      });

      tooltip.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
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
      const auth = getAuth(window.firebaseApp);
      
      if (!auth.currentUser) {
        console.warn('[AccountTooltip] No user logged in');
        return;
      }

      const uid = auth.currentUser.uid;

      // Load user general data
      const userGeneralRef = doc(window.db, 'users', uid, 'general_data', 'general');
      const userGeneralSnap = await getDoc(userGeneralRef);
      
      if (userGeneralSnap.exists()) {
        userDataCache = userGeneralSnap.data();
      }

      // Load ownClass data
      const ownClassRef = doc(window.db, 'users', uid, 'groups', 'ownclass');
      const ownClassSnap = await getDoc(ownClassRef);
      
      if (ownClassSnap.exists()) {
        const ownClassData = ownClassSnap.data();
        const classFinishes = (ownClassData.classFinishes || '').toString().trim();
        const classType = (ownClassData.classType || '').toString().trim().toLowerCase();
        
        if (classFinishes && classType) {
          const classId = `${classFinishes}${classType}`;
          
          // Load class document to get class name
          const classRef = doc(window.db, 'classes', classId);
          const classSnap = await getDoc(classRef);
          
          if (classSnap.exists()) {
            classDataCache = classSnap.data();
          } else {
            // Fallback: use calculated classId as name
            classDataCache = { name: classId, classId: classId };
          }
        }
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
    if (userDataCache?.photoURL) {
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

    // Set class name
    if (classDataCache?.name) {
      classSpan.textContent = classDataCache.name;
    } else if (classDataCache?.classId) {
      classSpan.textContent = classDataCache.classId;
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
          btn.dataset.tooltipInitialized = 'true';
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

