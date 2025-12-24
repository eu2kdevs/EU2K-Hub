/**
 * Developer Mode System
 * Provides password-protected developer mode with enhanced features
 */

(function() {
  'use strict';

  const DEV_MODE_KEY = 'eu2k-dev-mode';

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

      // Apply inline styles for developer mode popup
      applyDevModeStyles();

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
   * Apply inline styles for developer mode popup elements
   */
  function applyDevModeStyles() {
    // Dev mode input styles
    const input = document.getElementById('devModePassword');
    if (input && !input.dataset.styled) {
      input.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        background: #273617;
        border: 1px solid #4B6231;
        border-radius: 8px;
        color: #C1EE8D;
        font-size: 16px;
        margin-bottom: 16px;
        box-sizing: border-box;
      `;
      input.dataset.styled = 'true';
      
      // Focus state
      input.addEventListener('focus', function() {
        this.style.outline = 'none';
        this.style.borderColor = '#C1EE8D';
      });
      
      input.addEventListener('blur', function() {
        this.style.borderColor = '#4B6231';
      });
    }

    // Permission OK button styles (if not already styled)
    const okBtn = document.querySelector('#devModePopup .permission-ok-btn');
    if (okBtn && !okBtn.dataset.styled) {
      okBtn.style.cssText = `
        min-width: 140px;
        height: 52px;
        background: #84B3FF;
        border: 1px solid #282F3A;
        border-radius: 16px;
        color: #08152C;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: background .12s ease, color .12s ease, transform .12s ease;
        padding: 0 20px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: flex-start;
        position: relative;
        z-index: 1;
        box-sizing: border-box;
        overflow: visible;
        will-change: transform;
        backface-visibility: hidden;
        transform: translateZ(0);
        margin-bottom: 6px;
      `;
      okBtn.dataset.styled = 'true';
      
      // Hover state
      okBtn.addEventListener('mouseenter', function() {
        this.style.background = '#42587B';
        this.style.color = '#DBE8FF';
        this.style.transform = 'scaleY(1.12)';
        this.style.transformOrigin = 'center';
      });
      
      okBtn.addEventListener('mouseleave', function() {
        this.style.background = '#84B3FF';
        this.style.color = '#08152C';
        this.style.transform = 'scaleY(1)';
      });
      
      // Active state animation
      okBtn.addEventListener('mousedown', function() {
        this.style.animation = 'banner-btn-pop .16s cubic-bezier(.2,0,.2,1) forwards';
        setTimeout(() => {
          this.style.animation = '';
        }, 160);
      });
    }

    // Permission close button styles (if not already styled)
    const closeBtn = document.querySelector('#devModePopup .permission-close-btn');
    if (closeBtn && !closeBtn.dataset.styled) {
      closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 52px;
        height: 52px;
        border-radius: 999px;
        background: #D3FFA1;
        border: 1px solid #57703B;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: width .12s cubic-bezier(.2,.0,.2,1), border-radius .12s cubic-bezier(.2,.0,.2,1), background .12s ease;
        cursor: pointer;
        padding: 0;
      `;
      closeBtn.dataset.styled = 'true';
      
      // Close button image
      const closeImg = closeBtn.querySelector('img');
      if (closeImg) {
        closeImg.style.cssText = 'width: 18px; height: 18px; display: block;';
      }
      
      // Hover state
      closeBtn.addEventListener('mouseenter', function() {
        this.style.width = '68px';
        this.style.borderRadius = '16px';
        this.style.background = '#DEFFBA';
      });
      
      closeBtn.addEventListener('mouseleave', function() {
        this.style.width = '52px';
        this.style.borderRadius = '999px';
        this.style.background = '#D3FFA1';
      });
    }

    // Add keyframes animation if not already present
    if (!document.getElementById('dev-mode-keyframes')) {
      const style = document.createElement('style');
      style.id = 'dev-mode-keyframes';
      style.textContent = `
        @keyframes banner-btn-pop {
          0%   { transform: scaleY(1.00); }
          70%  { transform: scaleY(1.32); }
          100% { transform: scaleY(1.25); }
        }
      `;
      document.head.appendChild(style);
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
   * Check developer mode password using Firebase function
   */
  async function checkDevModePassword() {
    const input = document.getElementById('devModePassword');
    if (!input) return;
    
    const enteredPassword = input.value;
    console.log('[DevMode] Password entered:', enteredPassword ? '***' : '(empty)');
    
    try {
      // Import Firebase functions
      const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js');
      const app = window.firebaseApp || (await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js')).getApp();
      const functions = getFunctions(app, 'europe-west1');
      
      // Call verifyAdminConsolePassword function
      const verifyPassword = httpsCallable(functions, 'verifyAdminConsolePassword');
      console.log('[DevMode] Calling verifyAdminConsolePassword function...');
      
      const result = await verifyPassword({ password: enteredPassword });
      console.log('[DevMode] Function result:', result.data);
      
      if (result.data && result.data.success) {
        // Password verified successfully
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
        const errorMsg = result.data?.message || 'Hibás jelszó!';
        console.log('[DevMode] Password verification failed:', errorMsg);
        
        const msg = window.translationManager?.getTranslation('youhub.messages.wrong_password') || errorMsg;
        
        if (window.showNotification) {
          await window.showNotification(msg, 'Hibás adatok', 'danger');
        } else {
          alert(msg);
        }
        
        input.value = '';
      }
    } catch (error) {
      console.error('[DevMode] Error verifying password:', error);
      console.error('[DevMode] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Show error notification
      const errorMsg = error.message || 'Hiba történt a jelszó ellenőrzése során';
      const msg = window.translationManager?.getTranslation('youhub.messages.wrong_password') || errorMsg;
      
      if (window.showNotification) {
        await window.showNotification(msg, 'Hiba', 'danger');
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

