/**
 * EU2K Hub Firebase Cloud Functions
 * Staff Session Management and Access Control
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Session duration: 15 minutes
const SESSION_DURATION_MS = 15 * 60 * 1000;

// Maximum failed attempts before lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// Region configuration
const region = 'europe-west1';

/**
 * Start a staff session
 * Verifies password and creates a 15-minute session
 */
exports.staffSessionStart = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { password } = request.data;

    if (!password) {
      throw new HttpsError('invalid-argument', 'Password is required');
    }

    // Get user's custom claims
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    // Check if user is staff (admin, owner, or teacher)
    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'User does not have staff privileges');
    }

    // Verify password using the existing verifyAdminConsolePassword function
    const verifyResult = await verifyAdminConsolePasswordInternal({ password }, { auth: request.auth });
    
    if (!verifyResult.success) {
      throw new HttpsError('permission-denied', 'Invalid password');
    }

    // Calculate session end time
    const now = Date.now();
    const endTime = now + SESSION_DURATION_MS;

    // Create session document in Firestore
    await db.collection('staffSessions').doc(uid).set({
      userId: uid,
      startTime: admin.firestore.Timestamp.fromMillis(now),
      endTime: admin.firestore.Timestamp.fromMillis(endTime),
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      endTime: endTime,
      duration: SESSION_DURATION_MS
    };
  } catch (error) {
    console.error('[staffSessionStart] Error:', error);
    throw error;
  }
});

/**
 * Check if a staff session is active
 */
exports.staffSessionCheck = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      return { active: false };
    }

    const uid = request.auth.uid;

    // Get session document
    const sessionDoc = await db.collection('staffSessions').doc(uid).get();

    if (!sessionDoc.exists) {
      return { active: false };
    }

    const sessionData = sessionDoc.data();
    const now = Date.now();
    const endTime = sessionData.endTime.toMillis();

    // Check if session is still active
    if (sessionData.active && endTime > now) {
      return {
        active: true,
        endTime: endTime,
        remainingTime: endTime - now
      };
    } else {
      // Session expired, update document
      await db.collection('staffSessions').doc(uid).update({
        active: false
      });
      return { active: false };
    }
  } catch (error) {
    console.error('[staffSessionCheck] Error:', error);
    return { active: false };
  }
});

/**
 * End a staff session
 */
exports.staffSessionEnd = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { password } = request.data;

    if (!password) {
      throw new HttpsError('invalid-argument', 'Password is required');
    }

    // Verify password
    const verifyResult = await verifyAdminConsolePasswordInternal({ password }, { auth: request.auth });
    
    if (!verifyResult.success) {
      throw new HttpsError('permission-denied', 'Invalid password');
    }

    // End session
    await db.collection('staffSessions').doc(uid).update({
      active: false,
      endedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('[staffSessionEnd] Error:', error);
    throw error;
  }
});

/**
 * Check write access to classes collection
 * This is called before any write operation to classes
 */
exports.checkClassWriteAccess = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      // Log unauthorized attempt
      await logAccessAttempt(null, false, 'Not authenticated');
      return { allowed: false, reason: 'Not authenticated' };
    }

    const uid = request.auth.uid;

    // Get user's custom claims
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    // Check if user is staff
    if (!claims.admin && !claims.owner && !claims.teacher) {
      await logAccessAttempt(uid, false, 'Not a staff member');
      return { allowed: false, reason: 'Not a staff member' };
    }

    // Check if session is active
    const sessionDoc = await db.collection('staffSessions').doc(uid).get();

    if (!sessionDoc.exists) {
      await logAccessAttempt(uid, false, 'No active session');
      return { allowed: false, reason: 'No active session' };
    }

    const sessionData = sessionDoc.data();
    const now = Date.now();
    const endTime = sessionData.endTime.toMillis();

    if (!sessionData.active || endTime <= now) {
      await logAccessAttempt(uid, false, 'Session expired');
      
      // Update session to inactive
      await db.collection('staffSessions').doc(uid).update({
        active: false
      });
      
      return { allowed: false, reason: 'Session expired' };
    }

    // Check failed attempts
    const attemptsDoc = await db.collection('classWriteAttempts').doc(uid).get();
    
    if (attemptsDoc.exists) {
      const attemptsData = attemptsDoc.data();
      const failedAttempts = attemptsData.failedAttempts || 0;
      const lockoutUntil = attemptsData.lockoutUntil ? attemptsData.lockoutUntil.toMillis() : 0;

      // Check if locked out
      if (lockoutUntil > now) {
        await logAccessAttempt(uid, false, 'Locked out');
        return { 
          allowed: false, 
          reason: 'Too many failed attempts. Locked until ' + new Date(lockoutUntil).toISOString() 
        };
      }

      // Reset if lockout expired
      if (lockoutUntil > 0 && lockoutUntil <= now) {
        await db.collection('classWriteAttempts').doc(uid).update({
          failedAttempts: 0,
          lockoutUntil: null
        });
      }
    }

    // Access allowed
    await logAccessAttempt(uid, true, 'Access granted');
    return { allowed: true };
  } catch (error) {
    console.error('[checkClassWriteAccess] Error:', error);
    await logAccessAttempt(request.auth?.uid || null, false, 'Error: ' + error.message);
    return { allowed: false, reason: 'Internal error' };
  }
});

/**
 * Log access attempt
 */
async function logAccessAttempt(uid, success, reason) {
  try {
    if (!uid) return;

    const attemptsRef = db.collection('classWriteAttempts').doc(uid);
    const attemptsDoc = await attemptsRef.get();

    if (!attemptsDoc.exists) {
      // Create new document
      await attemptsRef.set({
        userId: uid,
        failedAttempts: success ? 0 : 1,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        lastReason: reason
      });
    } else {
      const data = attemptsDoc.data();
      const failedAttempts = data.failedAttempts || 0;

      if (success) {
        // Reset failed attempts on success
        await attemptsRef.update({
          failedAttempts: 0,
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          lastReason: reason
        });
      } else {
        const newFailedAttempts = failedAttempts + 1;
        const updateData = {
          failedAttempts: newFailedAttempts,
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          lastReason: reason
        };

        // Lockout after MAX_FAILED_ATTEMPTS
        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockoutUntil = admin.firestore.Timestamp.fromMillis(
            Date.now() + LOCKOUT_DURATION_MS
          );
        }

        await attemptsRef.update(updateData);
      }
    }

    // Log to a separate collection for auditing
    await db.collection('classWriteAccessLogs').add({
      userId: uid,
      success: success,
      reason: reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('[logAccessAttempt] Error:', error);
  }
}

/**
 * Internal function to verify admin console password
 */
async function verifyAdminConsolePasswordInternal(data, context) {
  // Check authentication
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const { password } = data;

  if (!password) {
    throw new HttpsError('invalid-argument', 'Password is required');
  }

  try {
    // Get user document
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    // Check if user has stored password in custom claims
    const storedPassword = customClaims.adminPassword;

    if (!storedPassword) {
      throw new HttpsError('permission-denied', 'No password set for this user');
    }

    // Simple comparison (in production, use proper hashing)
    if (password === storedPassword) {
      return {
        success: true,
        role: customClaims.admin ? 'admin' : (customClaims.owner ? 'owner' : (customClaims.teacher ? 'teacher' : 'none'))
      };
    } else {
      throw new HttpsError('permission-denied', 'Invalid password');
    }
  } catch (error) {
    console.error('[verifyAdminConsolePasswordInternal] Error:', error);
    throw error;
  }
}

/**
 * Verify admin console password (from existing code)
 * This function is reused from the existing admin console
 */
exports.verifyAdminConsolePassword = onCall({ region }, async (request) => {
  return await verifyAdminConsolePasswordInternal(request.data, { auth: request.auth });
});

/**
 * TEMPORARY: Set admin password for a user (REMOVE AFTER USE!)
 * Call this once to set the admin password
 */
exports.setAdminPasswordForUser = onCall({ region }, async (request) => {
  try {
    const { userId, password } = request.data;
    
    if (!userId || !password) {
      throw new HttpsError('invalid-argument', 'userId and password are required');
    }
    
    // Get current claims
    const userRecord = await admin.auth().getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    
    // Add admin password
    const newClaims = {
      ...currentClaims,
      adminPassword: password,
      owner: true,
      admin: true,
      teacher: true,
      student: true
    };
    
    await admin.auth().setCustomUserClaims(userId, newClaims);
    
    return {
      success: true,
      message: 'Admin password set successfully',
      claims: newClaims
    };
  } catch (error) {
    console.error('[setAdminPasswordForUser] Error:', error);
    throw error;
  }
});

/**
 * Refresh user custom claims based on Firestore accessLevel
 * This function checks Firestore and updates custom claims if needed
 */
exports.refreshUserClaims = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    
    // Get current claims
    const userRecord = await admin.auth().getUser(uid);
    const currentClaims = userRecord.customClaims || {};
    
    // If claims already exist, return them
    if (currentClaims.admin || currentClaims.owner || currentClaims.teacher) {
      return {
        success: true,
        claims: currentClaims,
        refreshed: false
      };
    }

    // Get accessLevel from Firestore
    let accessLevel = null;
    
    // Try users/{uid} document
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      accessLevel = userDoc.data().accessLevel;
    }
    
    // Try users/{uid}/general_data collection
    if (!accessLevel) {
      const generalDataRef = db.collection(`users/${uid}/general_data`);
      const generalDataDocs = await generalDataRef.get();
      
      generalDataDocs.forEach((doc) => {
        const data = doc.data();
        if (data.accessLevel) {
          accessLevel = data.accessLevel;
        }
      });
    }

    if (!accessLevel) {
      return {
        success: false,
        message: 'No accessLevel found in Firestore'
      };
    }

    // Build custom claims based on accessLevel
    const customClaims = { ...currentClaims };
    
    switch (accessLevel) {
      case 'owner':
        customClaims.owner = true;
        customClaims.admin = true;
        customClaims.teacher = true;
        customClaims.student = true;
        break;
      case 'admin':
        customClaims.admin = true;
        customClaims.teacher = true;
        customClaims.student = true;
        break;
      case 'teacher':
        customClaims.teacher = true;
        customClaims.student = true;
        break;
      case 'parent':
        customClaims.parent = true;
        break;
      case 'student':
      default:
        customClaims.student = true;
        break;
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, customClaims);
    
    console.log(`[refreshUserClaims] Claims updated for user ${uid}:`, customClaims);

    return {
      success: true,
      claims: customClaims,
      refreshed: true,
      accessLevel: accessLevel
    };
  } catch (error) {
    console.error('[refreshUserClaims] Error:', error);
    throw new HttpsError('internal', 'Error refreshing claims: ' + error.message);
  }
});
