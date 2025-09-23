const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');

// Set global options
setGlobalOptions({ region: 'europe-west1' });

// Initialize Firebase Admin
initializeApp();

// Automatikus custom claims beállítása új felhasználó létrehozásakor
exports.setUserClaimsOnCreate = onDocumentCreated(
  'users/{userId}/general_data/{docId}',
  async (event) => {
    const userId = event.params.userId;
    const data = event.data?.data();
    
    if (!data || !data.accessLevel) {
      console.log('No accessLevel found in document');
      return;
    }
    
    try {
      const customClaims = {};
      
      // Role alapú claims beállítása
      switch (data.accessLevel) {
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
      
      // Account type hozzáadása
      if (data.accountType) {
        customClaims.accountType = data.accountType;
      }
      
      await getAuth().setCustomUserClaims(userId, customClaims);
      console.log(`Custom claims set for user ${userId}:`, customClaims);
      
    } catch (error) {
      console.error('Error setting custom claims:', error);
    }
  }
);

// Manuális custom claims beállítása (admin funkció)
exports.setCustomClaims = onCall(
  { cors: true },
  async (request) => {
    // Ellenőrizzük hogy a hívó admin-e
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const callerClaims = request.auth.token;
    if (!callerClaims.admin && !callerClaims.owner) {
      throw new HttpsError('permission-denied', 'Must be admin or owner');
    }
    
    const { userId, role } = request.data;
    
    if (!userId || !role) {
      throw new HttpsError('invalid-argument', 'userId and role are required');
    }
    
    try {
      const customClaims = {};
      
      // Role alapú claims beállítása
      switch (role) {
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
      
      await getAuth().setCustomUserClaims(userId, customClaims);
      
      return {
        success: true,
        message: `Custom claims set for user ${userId}`,
        claims: customClaims
      };
      
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw new HttpsError('internal', 'Failed to set custom claims');
    }
  }
);

// Custom claims lekérése
exports.getUserClaims = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const { userId } = request.data;
    const targetUserId = userId || request.auth.uid;
    
    // Ha nem saját adatokat kér le, admin jogosultság szükséges
    if (targetUserId !== request.auth.uid) {
      const callerClaims = request.auth.token;
      if (!callerClaims.admin && !callerClaims.owner) {
        throw new HttpsError('permission-denied', 'Must be admin or owner to view other users claims');
      }
    }
    
    try {
      const userRecord = await getAuth().getUser(targetUserId);
      return {
        success: true,
        claims: userRecord.customClaims || {},
        email: userRecord.email
      };
    } catch (error) {
      console.error('Error getting user claims:', error);
      throw new HttpsError('internal', 'Failed to get user claims');
    }
  }
);

// Felhasználók listázása (admin funkció)
exports.listUsers = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const callerClaims = request.auth.token;
    if (!callerClaims.admin && !callerClaims.owner) {
      throw new HttpsError('permission-denied', 'Must be admin or owner');
    }
    
    try {
      const { maxResults = 100 } = request.data;
      const listUsersResult = await getAuth().listUsers(maxResults);
      
      const users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        customClaims: user.customClaims || {},
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }));
      
      return {
        success: true,
        users: users,
        pageToken: listUsersResult.pageToken
      };
    } catch (error) {
      console.error('Error listing users:', error);
      throw new HttpsError('internal', 'Failed to list users');
    }
  }
);

// Custom claims törlése
exports.removeCustomClaims = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const callerClaims = request.auth.token;
    if (!callerClaims.admin && !callerClaims.owner) {
      throw new HttpsError('permission-denied', 'Must be admin or owner');
    }
    
    const { userId } = request.data;
    
    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }
    
    try {
      await getAuth().setCustomUserClaims(userId, null);
      
      return {
        success: true,
        message: `Custom claims removed for user ${userId}`
      };
    } catch (error) {
      console.error('Error removing custom claims:', error);
      throw new HttpsError('internal', 'Failed to remove custom claims');
    }
  }
);