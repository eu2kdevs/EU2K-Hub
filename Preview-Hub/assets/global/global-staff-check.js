/**
 * Global Staff Session Check
 * Protects dashboard.html and students.html from unauthorized access
 * Uses the same retry mechanism as staff-access.js
 */

(function() {
  'use strict';

  // Only run on dashboard.html and students.html
  const currentPage = window.location.pathname.split('/').pop();
  const protectedPages = ['dashboard.html', 'students.html'];

  if (!protectedPages.includes(currentPage)) {
    return; // Not a protected page
  }

  console.log('[GlobalStaffCheck] Checking access for:', currentPage);

  let retryCount = 0;
  const MAX_RETRIES = 10; // Maximum 5 seconds (10 * 500ms)

  async function checkAccess() {
    console.log('[GlobalStaffCheck] ===== INIT START ===== (retry:', retryCount, ')');
    
    // Wait for Firebase to be initialized (same as staff-access.js)
    if (!window.firebaseApp || !window.functions) {
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        console.error('[GlobalStaffCheck] ❌ Firebase app or functions not initialized after', MAX_RETRIES, 'retries.');
        console.error('[GlobalStaffCheck] ❌ Reason: window.firebaseApp =', !!window.firebaseApp, ', window.functions =', !!window.functions);
        return; // Don't redirect, just log
      }
      console.warn('[GlobalStaffCheck] Firebase app or functions not initialized, retrying... (', retryCount, '/', MAX_RETRIES, ')');
      setTimeout(checkAccess, 500);
      return;
    }
    
    retryCount = 0; // Reset on success

    console.log('[GlobalStaffCheck] Firebase app found:', !!window.firebaseApp);
    console.log('[GlobalStaffCheck] Firebase functions found:', !!window.functions);

    try {
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const auth = getAuth(window.firebaseApp);

      // Wait for auth to be ready (same as staff-access.js)
      await new Promise((resolve) => {
        if (auth.currentUser) {
          resolve();
        } else {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
          });
          // Timeout after 3 seconds
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 3000);
        }
      });

      if (!auth.currentUser) {
        console.warn('[GlobalStaffCheck] ❌ No user logged in');
        console.warn('[GlobalStaffCheck] ❌ Reason: auth.currentUser is null');
        return; // Don't redirect, just log
      }

      // Get custom claims (force refresh to get latest)
      let idTokenResult = await auth.currentUser.getIdTokenResult(true);
      let claims = idTokenResult.claims;

      console.log('[GlobalStaffCheck] User claims:', { admin: claims.admin, owner: claims.owner, teacher: claims.teacher });

      // Check if user has staff privileges from token claims
      let hasStaffPrivileges = claims.admin || claims.owner || claims.teacher;
      
      // If no staff claims in token, try to refresh them from Firestore (same as staff-access.js)
      if (!hasStaffPrivileges) {
        console.log('[GlobalStaffCheck] No staff claims in token, attempting to refresh from Firestore...');
        try {
          const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
          
          // Use window.functions (already initialized with europe-west1)
          if (!window.functions) {
            throw new Error('Firebase functions not initialized');
          }
          
          const refreshClaims = httpsCallable(window.functions, 'refreshUserClaims');

          const refreshResult = await refreshClaims();
          
          if (refreshResult.data.success && refreshResult.data.refreshed) {
            console.log('[GlobalStaffCheck] Claims refreshed');
            
            // Force token refresh to get new claims
            idTokenResult = await auth.currentUser.getIdTokenResult(true);
            claims = idTokenResult.claims;
            
            hasStaffPrivileges = claims.admin || claims.owner || claims.teacher;
          }
        } catch (refreshError) {
          console.error('[GlobalStaffCheck] Error refreshing claims:', refreshError);
        }
      }

      // Check if user is staff
      if (!hasStaffPrivileges) {
        console.warn('[GlobalStaffCheck] ❌ User is not staff');
        console.warn('[GlobalStaffCheck] ❌ Reason: No admin, owner, or teacher claims found');
        console.warn('[GlobalStaffCheck] ❌ Claims:', { admin: claims.admin, owner: claims.owner, teacher: claims.teacher });
        return; // Don't redirect, just log
      }

      // Check if session is active (use window.functions like staff-access.js)
      const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
      const checkSession = httpsCallable(window.functions, 'staffSessionCheck');

      // Get device ID for session check
      let deviceId = localStorage.getItem('eu2k_device_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('eu2k_device_id', deviceId);
        console.log('[GlobalStaffCheck] Generated new device ID:', deviceId);
      }

      const result = await checkSession({ deviceId: deviceId });
      console.log('[GlobalStaffCheck] Session check result:', result.data);

      if (!result.data.active) {
        console.warn('[GlobalStaffCheck] ❌ No active session');
        console.warn('[GlobalStaffCheck] ❌ Reason: staffSessionCheck returned active = false');
        console.warn('[GlobalStaffCheck] ❌ Session result:', result.data);
        
        // If session expired, notify client and redirect
        if (result.data.expired) {
          console.log('[GlobalStaffCheck] 🔔 Session expired, notifying client and redirecting...');
          
          // Notify client that session expired (this will trigger notification on index.html)
          sessionStorage.setItem('eu2k_staff_session_expired', 'true');
          
          // Redirect to index.html
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 500);
        }
        return;
      }

      console.log('[GlobalStaffCheck] ✅ Access granted');
      console.log('[GlobalStaffCheck] ✅ Session active, endTime:', result.data.endTime);
      console.log('[GlobalStaffCheck] ===== INIT END =====');
      // Access granted, page will load normally
    } catch (error) {
      console.error('[GlobalStaffCheck] ❌ ERROR checking access:', error);
      console.error('[GlobalStaffCheck] ❌ Error message:', error.message);
      console.error('[GlobalStaffCheck] ❌ Error code:', error.code);
      console.error('[GlobalStaffCheck] Error stack:', error.stack);
      // Don't redirect, just log
    }
  }

  // Start checking
  checkAccess();
})();

