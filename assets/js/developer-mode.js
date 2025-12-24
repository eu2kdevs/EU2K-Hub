/**
 * Developer Mode System
 * Provides password-protected developer mode with enhanced features
 */

(function() {
  'use strict';

  const DEV_MODE_KEY = 'eu2k-dev-mode';
  const DEV_MODE_PASSWORD = '01122011';

  /**
   * Check if developer mode is enabled
   */
  function isDevModeEnabled() {
    try {
      return localStorage.getItem(DEV_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Set developer mode state
   */
  function setDevMode(enabled) {
    try {
      localStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false');
      console.log(`[DevMode] Developer mode ${enabled ? 'enabled' : 'disabled'}`);
      
      // Dispatch custom event for other scripts to listen to
      window.dispatchEvent(new CustomEvent('devModeChanged', { detail: { enabled } }));
    } catch (e) {
      console.error('[DevMode] Failed to save dev mode state:', e);
    }
  }

  /**
   * Show developer mode popup
   */
  function showDevModePopup() {
    const openPopup = () => {
      const popup = document.getElementById('devModePopup');
      
      if (!popup) {
        console.warn('[DevMode] Popup element not found');
        return;
      }

      // Try to find scroll area (main-scroll-area or body)
      const scrollArea = document.querySelector('.main-scroll-area') || document.body;
      
      if (scrollArea) {
        scrollArea.scrollTop = 0;
        scrollArea.classList.add('no-scroll');
        scrollArea.classList.add('popup-active');
      }
      
      popup.style.display = 'flex';
      
      const input = document.getElementById('devModePassword');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    };
    
    if (window.tryOpenPopup) {
      window.tryOpenPopup(openPopup);
    } else {
      openPopup();
    }
  }

  /**
   * Close developer mode popup
   */
  function closeDevModePopup() {
    const popup = document.getElementById('devModePopup');
    const scrollArea = document.querySelector('.main-scroll-area') || document.body;
    
    if (popup) {
      popup.style.display = 'none';
    }
    
    if (scrollArea) {
      scrollArea.classList.remove('no-scroll');
      scrollArea.classList.remove('popup-active');
    }
  }

  /**
   * Check developer mode password
   */
  async function checkDevModePassword() {
    const input = document.getElementById('devModePassword');
    if (!input) return;
    
    if (input.value === DEV_MODE_PASSWORD) {
      setDevMode(true);
      closeDevModePopup();
      
      // Trigger YouHub notifications view update if available
      if (typeof window.updateNotificationsView === 'function') {
        window.updateNotificationsView();
      }
      
      // Show success notification if available
      if (window.showNotification) {
        const msg = window.translationManager?.getTranslation('youhub.messages.dev_mode_enabled') || 'Developer mód bekapcsolva!';
        await window.showNotification(msg, 'Developer Mód', 'success');
      }
      
      console.log('[DevMode] Developer mode enabled');
    } else {
      // Wrong password
      const msg = window.translationManager?.getTranslation('youhub.messages.wrong_password') || 'Hibás jelszó!';
      
      if (window.showNotification) {
        await window.showNotification(msg, 'Hibás adatok', 'danger');
      } else {
        alert(msg);
      }
      
      input.value = '';
    }
  }

  /**
   * Add Enter key support for password input
   */
  function initPasswordInput() {
    const input = document.getElementById('devModePassword');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkDevModePassword();
        }
      });
    }
  }

  /**
   * Initialize keyboard shortcut (Alt+H)
   */
  function initKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      // Alt+H to open developer mode popup
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        showDevModePopup();
      }
      
      // ESC to close popup
      if (e.key === 'Escape') {
        const popup = document.getElementById('devModePopup');
        if (popup && popup.style.display !== 'none') {
          closeDevModePopup();
        }
      }
    });
  }

  /**
   * Prevent header navigation when popup is open
   */
  function preventHeaderNavigation() {
    // Use event delegation to catch all header button clicks
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('devModePopup');
      // If popup is open, prevent navigation from header buttons
      if (popup && popup.style.display !== 'none') {
        const target = e.target.closest('.header-icon-btn, .header-login-btn');
        if (target && (target.tagName === 'A' || target.closest('a'))) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    }, true); // Use capture phase to catch early
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initPasswordInput();
      initKeyboardShortcut();
      preventHeaderNavigation();
    });
  } else {
    initPasswordInput();
    initKeyboardShortcut();
    preventHeaderNavigation();
  }

  // Make functions globally available for onclick handlers and other scripts
  window.isDevModeEnabled = isDevModeEnabled;
  window.setDevMode = setDevMode;
  window.showDevModePopup = showDevModePopup;
  window.closeDevModePopup = closeDevModePopup;
  window.checkDevModePassword = checkDevModePassword;

  console.log('[DevMode] Developer mode system initialized');
  console.log('[DevMode] Press Alt+H to open developer mode');
})();

