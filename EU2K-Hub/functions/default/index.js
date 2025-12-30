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
 * If there's an existing active session, it will be marked as replaced
 */
exports.staffSessionStart = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { password, deviceId } = request.data;

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

    // Check for existing active session on different device
    const existingSessionDoc = await db.collection('staffSessions').doc(uid).get();
    let hasExistingSession = false;
    let existingDeviceId = null;
    let existingEndTime = null;

    if (existingSessionDoc.exists) {
      const existingData = existingSessionDoc.data();
      const now = Date.now();
      const existingEndTimeMs = existingData.endTime ? existingData.endTime.toMillis() : 0;
      const existingDeviceIdFromSession = existingData.deviceId || null;

      if (existingData.active && existingEndTimeMs > now) {
        // Check if it's a different device
        if (existingDeviceIdFromSession && existingDeviceIdFromSession !== deviceId) {
          hasExistingSession = true;
          existingDeviceId = existingDeviceIdFromSession;
          existingEndTime = existingEndTimeMs;

          // Mark that a new device tried to start a session
          await db.collection('staffSessions').doc(uid).update({
            transferRequested: true,
            transferRequestedByDeviceId: deviceId || 'unknown',
            transferRequestedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Don't create new session, return error
          throw new HttpsError('failed-precondition', 'Active session exists on another device', {
            existingDeviceId: existingDeviceId,
            existingEndTime: existingEndTime
          });
        }
      }
    }

    // Calculate session end time
    const now = Date.now();
    const endTime = now + SESSION_DURATION_MS;

    // Create new session document in Firestore
    await db.collection('staffSessions').doc(uid).set({
      userId: uid,
      deviceId: deviceId || 'unknown',
      startTime: admin.firestore.Timestamp.fromMillis(now),
      endTime: admin.firestore.Timestamp.fromMillis(endTime),
      active: true,
      replaced: false,
      transferRequested: false,
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
 * Also checks if session was replaced by another device
 */
exports.staffSessionCheck = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      return { active: false };
    }

    const uid = request.auth.uid;
    const { deviceId } = request.data || {};

    // Get session document
    const sessionDoc = await db.collection('staffSessions').doc(uid).get();

    if (!sessionDoc.exists) {
      return { active: false };
    }

    const sessionData = sessionDoc.data();
    const now = Date.now();
    const endTime = sessionData.endTime ? sessionData.endTime.toMillis() : 0;

    // Check if transfer was requested
    if (sessionData.transferRequested && sessionData.active && endTime > now) {
      const transferRequestedBy = sessionData.transferRequestedByDeviceId || null;
      const sessionDeviceId = sessionData.deviceId || null;

      // If current device is the one that requested transfer, notify it
      if (deviceId && deviceId === transferRequestedBy) {
        return {
          active: false,
          transferRequested: true,
          existingDeviceId: sessionDeviceId,
          existingEndTime: endTime,
          message: 'Session transfer requested'
        };
      }

      // If current device is the one with active session, notify it about transfer request
      if (deviceId && deviceId === sessionDeviceId) {
        return {
          active: true,
          endTime: endTime,
          remainingTime: endTime - now,
          transferRequested: true,
          transferRequestedByDeviceId: transferRequestedBy,
          message: 'Another device requested session transfer'
        };
      }
    }

    // Check if current device matches session device
    const sessionDeviceId = sessionData.deviceId || null;
    if (deviceId && sessionDeviceId && deviceId !== sessionDeviceId && sessionData.active && endTime > now) {
      // Different device trying to use session - notify client
      return {
        active: false,
        transferAvailable: true,
        existingDeviceId: sessionDeviceId,
        existingEndTime: endTime,
        message: 'Session is active on another device'
      };
    }

    // Check if session is still active
    if (sessionData.active && endTime > now) {
      return {
        active: true,
        endTime: endTime,
        remainingTime: endTime - now,
        replaced: false
      };
    } else {
      // Session expired, update document
      await db.collection('staffSessions').doc(uid).update({
        active: false
      });

      // Log session expiration
      console.log('[staffSessionCheck] Session expired for user:', uid, 'Device:', deviceId || 'unknown');

      return {
        active: false,
        expired: true,
        message: 'Session has expired'
      };
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
 * End all staff sessions for a user
 * This is called when user wants to end all sessions on all devices
 */
exports.staffSessionEndAll = onCall({ region }, async (request) => {
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

    // End all sessions by setting active to false
    await db.collection('staffSessions').doc(uid).update({
      active: false,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      endedAll: true,
      deviceId: null, // Clear device ID
      transferRequested: false
    });

    console.log('[staffSessionEndAll] All sessions ended for user:', uid);

    return { success: true };
  } catch (error) {
    console.error('[staffSessionEndAll] Error:', error);
    throw error;
  }
});

/**
 * Transfer session to another device
 * This is called when user wants to transfer their session from old device to new device
 */
exports.staffSessionTransfer = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { password, newDeviceId } = request.data;

    if (!password) {
      throw new HttpsError('invalid-argument', 'Password is required');
    }

    if (!newDeviceId) {
      throw new HttpsError('invalid-argument', 'New device ID is required');
    }

    // Verify password
    const verifyResult = await verifyAdminConsolePasswordInternal({ password }, { auth: request.auth });

    if (!verifyResult.success) {
      throw new HttpsError('permission-denied', 'Invalid password');
    }

    // Get current session
    const sessionDoc = await db.collection('staffSessions').doc(uid).get();

    if (!sessionDoc.exists) {
      throw new HttpsError('failed-precondition', 'No active session found');
    }

    const sessionData = sessionDoc.data();
    const now = Date.now();
    const endTime = sessionData.endTime ? sessionData.endTime.toMillis() : 0;

    if (!sessionData.active || endTime <= now) {
      throw new HttpsError('failed-precondition', 'Session is not active');
    }

    // Transfer session to new device (keep same endTime)
    await db.collection('staffSessions').doc(uid).update({
      deviceId: newDeviceId,
      replaced: false,
      transferRequested: false,
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredFromDeviceId: sessionData.deviceId || null
    });

    console.log('[staffSessionTransfer] Session transferred from', sessionData.deviceId, 'to', newDeviceId);

    return {
      success: true,
      endTime: endTime,
      remainingTime: endTime - now
    };
  } catch (error) {
    console.error('[staffSessionTransfer] Error:', error);
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

/**
 * Sync user names from users collection to usrLookup/names
 * Reads all documents from users collection, extracts fullName, simplifies it,
 * and creates usrLookup/names/{simplifiedName}/{userId} documents
 */
exports.syncUserNames = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Get user's custom claims to check if admin/owner/teacher
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    // Allow admins/owners/teachers to sync
    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only admins, owners, and teachers can sync user names');
    }

    console.log('[syncUserNames] Starting sync...');

    // Helper function to simplify name
    function simplifyName(fullName) {
      if (!fullName) return '';

      // Remove accents/diacritics
      const normalized = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Convert to lowercase
      const lowercased = normalized.toLowerCase();

      // Replace spaces with underscores
      const simplified = lowercased.replace(/\s+/g, '_');

      return simplified;
    }

    // Get all users from users collection
    const usersSnapshot = await db.collection('users').get();

    let syncedCount = 0;
    let batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const fullName = userData.fullName || userData.name || userData.displayName;
      const email = userData.email || '';

      if (!fullName) {
        console.log(`[syncUserNames] Skipping user ${userId} - no fullName`);
        continue;
      }

      const simplifiedName = simplifyName(fullName);
      if (!simplifiedName) {
        console.log(`[syncUserNames] Skipping user ${userId} - simplified name is empty`);
        continue;
      }

      // Create document in usrlookup/names/{simplifiedName}/{userId}
      const lookupRef = db.doc(`usrlookup/names/${simplifiedName}/${userId}`);
      batch.set(lookupRef, {
        fullName: fullName,
        email: email
      }, { merge: true });

      batchCount++;
      syncedCount++;

      // Commit batch if it reaches max size
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`[syncUserNames] Committed batch, synced ${syncedCount} users so far...`);
        // Create new batch for remaining users
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`[syncUserNames] Sync completed. Synced ${syncedCount} users.`);

    return {
      success: true,
      syncedCount: syncedCount
    };
  } catch (error) {
    console.error('[syncUserNames] Error:', error);
    throw new HttpsError('internal', 'Error syncing user names: ' + error.message);
  }
});

/**
 * Add a fullName to usrLookup/names/toBeAdded collection
 * Used when a name is not found during class registration
 */
exports.addToBeAddedName = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { fullName, classId } = request.data;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      throw new HttpsError('invalid-argument', 'fullName is required and must be a non-empty string');
    }

    // Add to usrlookup/names/toBeAdded collection
    const toBeAddedRef = db.collection('usrlookup').doc('names').collection('toBeAdded').doc();
    const docData = {
      fullName: fullName.trim(),
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: request.auth.uid
    };

    // Add classId if provided
    if (classId && typeof classId === 'string' && classId.trim()) {
      docData.class = classId.trim();
    }

    await toBeAddedRef.set(docData);

    console.log(`[addToBeAddedName] Added name to toBeAdded: ${fullName.trim()}${classId ? ` (class: ${classId})` : ''}`);

    return {
      success: true,
      docId: toBeAddedRef.id
    };
  } catch (error) {
    console.error('[addToBeAddedName] Error:', error);
    throw new HttpsError('internal', 'Error adding name to toBeAdded: ' + error.message);
  }
});

/**
 * Create a class with users
 * Creates classes/{classId} document and classes/{classId}/users/{userId} documents
 */
exports.createClass = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { classId, userIds } = request.data;

    if (!classId || typeof classId !== 'string' || !classId.trim()) {
      throw new HttpsError('invalid-argument', 'classId is required and must be a non-empty string');
    }

    if (!userIds || !Array.isArray(userIds)) {
      throw new HttpsError('invalid-argument', 'userIds must be an array');
    }

    // Get user's custom claims to check if admin/owner/teacher
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    // Allow admins/owners/teachers to create classes
    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only admins, owners, and teachers can create classes');
    }

    console.log(`[createClass] Creating class ${classId} with ${userIds.length} users...`);

    // Check if class already exists
    const classRef = db.doc(`classes/${classId}`);
    const classSnap = await classRef.get();

    if (classSnap.exists) {
      throw new HttpsError('already-exists', `Class ${classId} already exists`);
    }

    // Create class document
    await classRef.set({
      createdBy: uid,
      leaderUid: uid, // Standardized field as requested
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      classId: classId.trim()
    });

    // Only create user documents if userIds is not empty
    if (userIds.length > 0) {
      // ... (rest of code)
      // (Wait, I can't use 'rest of code' in replacement if I'm not matching exact lines. I should only replace the set block or use separate chunks)
    }
    // Actually, I'll use multi_replace or carefully targeted replace.
    // Let's replace createClass set block first.
    // And then replace approveJoinRequest entirely.

  } catch (error) {
    console.error('[createClass] Error:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Error creating class: ' + error.message);
  }
});

/**
 * Approve (or Reject) a Class Join Request
 * Securely handles the approval process using a Transaction.
 * Ensures atomicity between updating the request and adding the user to the class.
 */
exports.approveJoinRequest = onCall({ region }, async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { requestId, decision } = request.data;
    const uid = request.auth.uid;

    if (!requestId || !decision || !['approved', 'rejected'].includes(decision)) {
      throw new HttpsError('invalid-argument', 'Invalid request parameters');
    }

    const requestRef = db.collection('joinRequests').doc(requestId);

    await db.runTransaction(async (transaction) => {
      // 1. Read the request
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists) {
        throw new HttpsError('not-found', 'Join request not found');
      }

      const requestData = requestDoc.data();

      // Verify ownership
      // Check for leaderUid, teacherUid, or ownerUid in the request
      // The request should have the target teacher's UID.
      const targetTeacherUid = requestData.teacherUid || requestData.leaderUid || requestData.ownerUid;

      if (targetTeacherUid !== uid) {
        // Double check admin privileges if needed, but for now strict check on target
        // We'll rely on the caller being the intended recipient
        throw new HttpsError('permission-denied', 'Only the target teacher can approve this request');
      }

      // Allow updating only if pending
      if (requestData.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Request is already processed');
      }

      // 2. Update Join Request Status
      transaction.update(requestRef, {
        status: decision,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        respondedBy: uid
      });

      // 3. If Approved, add user to class
      if (decision === 'approved') {
        const classId = requestData.classId;
        const studentUid = requestData.requesterUid;

        if (classId && studentUid) {
          const classUserRef = db.doc(`classes/${classId}/users/${studentUid}`);
          transaction.set(classUserRef, {
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            addedBy: uid,
            viaJoinRequest: true,
            requestId: requestId
          });
        }
      }
    });

    console.log(`[approveJoinRequest] Request ${requestId} ${decision} by ${uid} (Transaction)`);

    return { success: true };

  } catch (error) {
    console.error('[approveJoinRequest] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Sync user name to usrlookup/names
 * Called at the end of onboarding to sync user's fullName
 * Creates: usrlookup/names/{simplifiedName}/{uid} with { fullName }
 */
exports.syncUserName = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Get user's fullName from users/{uid}
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User document not found');
    }

    const userData = userDoc.data();
    const fullName = userData.fullName || userData.name || userData.displayName;

    if (!fullName) {
      throw new HttpsError('failed-precondition', 'No fullName found in user document');
    }

    // Simplify the name: remove accents, lowercase, replace spaces with underscores
    const simplifyName = (name) => {
      return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_');
    };

    const simplifiedName = simplifyName(fullName);

    // Write to usrlookup/names/{simplifiedName}/{uid}
    await db.collection('usrlookup').doc('names').collection(simplifiedName).doc(uid).set({
      fullName: fullName
    });

    console.log(`[syncUserName] Synced user ${uid} with name: ${fullName} -> ${simplifiedName}`);

    return { success: true, simplifiedName };

  } catch (error) {
    console.error('[syncUserName] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Check if user has a password set
 * Returns hasPassword: true/false
 */
exports.checkUserHasPassword = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Get user's custom claims
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};
    const hasPassword = !!customClaims.adminPassword;

    return { hasPassword };

  } catch (error) {
    console.error('[checkUserHasPassword] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Create/set password for user
 * Password must be at least 8 characters
 */
exports.createUserPassword = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;
    const { password } = request.data;

    if (!password || password.length < 8) {
      throw new HttpsError('invalid-argument', 'Password must be at least 8 characters');
    }

    // Get current custom claims
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    // Set password in custom claims
    await admin.auth().setCustomUserClaims(uid, {
      ...customClaims,
      adminPassword: password
    });

    console.log(`[createUserPassword] Password created for user ${uid}`);

    return { success: true };

  } catch (error) {
    console.error('[createUserPassword] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Delete password for user
 * Removes adminPassword from custom claims
 */
exports.deleteUserPassword = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Get current custom claims
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    // Remove password from custom claims
    const { adminPassword, ...remainingClaims } = customClaims;

    await admin.auth().setCustomUserClaims(uid, remainingClaims);

    console.log(`[deleteUserPassword] Password deleted for user ${uid}`);

    return { success: true };

  } catch (error) {
    console.error('[deleteUserPassword] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Set admin password for a specific user (admin function)
 * Sets password and all role claims (owner, admin, teacher, student)
 * Based on set-admin-password.js script
 */
exports.setAdminPassword = onCall({ region }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Only allow owners to call this function
    const callerRecord = await admin.auth().getUser(request.auth.uid);
    const callerClaims = callerRecord.customClaims || {};
    if (!callerClaims.owner) {
      throw new HttpsError('permission-denied', 'Only owners can set admin passwords');
    }

    const { userId, password } = request.data;

    if (!userId || !password) {
      throw new HttpsError('invalid-argument', 'userId and password are required');
    }

    // Get current custom claims for target user
    const userRecord = await admin.auth().getUser(userId);
    const currentClaims = userRecord.customClaims || {};

    // Add admin password and all role claims
    const newClaims = {
      ...currentClaims,
      adminPassword: password,
      owner: true,
      admin: true,
      teacher: true,
      student: true
    };

    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, newClaims);

    console.log(`[setAdminPassword] Password and claims set for user ${userId}`);

    return {
      success: true,
      message: `Password and claims set for user ${userId}`,
      claims: newClaims
    };

  } catch (error) {
    console.error('[setAdminPassword] Error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message);
  }
});
