const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
initializeApp();

// Automatikus custom claims beállítása új felhasználó létrehozásakor
exports.setUserClaimsOnCreate = onDocumentCreated(
  { document: 'users/{userId}/general_data/{docId}', region: 'europe-west1' },
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

// AccessLevel védelme és érvényesítése minden users/{userId} módosításnál
exports.enforceAccessLevel = onDocumentWritten(
  { document: 'users/{userId}', region: 'europe-west1' },
  async (event) => {
    const before = event.data.before;
    const after = event.data.after;

    // Ha a dokumentum törölve lett, nincs teendő
    if (!after || !after.exists) {
      return;
    }

    const beforeData = before && before.exists ? before.data() : null;
    const afterData = after.data() || {};

    const newEmail = (afterData.email || '').toLowerCase();
    const newJobTitle = (afterData.jobTitle || '').trim();
    const newAccessLevel = afterData.accessLevel || 'basic';

    // Heurisztika az elvárt accessLevel meghatározásához
    let expectedAccessLevel = 'basic';
    if (newJobTitle && !/^\d{4}/.test(newJobTitle)) {
      // Ha a munkakör nem 4 számmal kezdődik -> teacher
      expectedAccessLevel = 'teacher';
    }

    const ownerEmails = [
      'turoczi.adam@europa2000.hu',
      'papp.andras@europa2000.hu'
    ];
    const adminEmails = [
      'administrator@europa2000.hu',
      'remetei.zoltan@europa2000.hu',
      'laczo.sylvia@europa2000.hu',
      'hegyi.marianna@europa2000.hu'
    ];

    if (ownerEmails.includes(newEmail)) {
      // Owner mindig owner (és implicit admin/teacher/student a custom claimben)
      expectedAccessLevel = 'owner';
    } else if (adminEmails.includes(newEmail)) {
      // Admin mindig admin (és implicit teacher/student)
      expectedAccessLevel = 'admin';
    }

    // Ha az új érték már megfelel az elvártnak, nincs teendő
    if (newAccessLevel === expectedAccessLevel) {
      return;
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(event.params.userId);

    // Ha van korábbi érték, és az eltér az új (illegitim) értéktől, akkor visszaállítjuk vagy beállítjuk az elvárt szintet
    try {
      const previousAccessLevel = beforeData && beforeData.accessLevel
        ? beforeData.accessLevel
        : null;

      const targetAccessLevel = expectedAccessLevel || previousAccessLevel || 'basic';

      await userRef.update({
        accessLevel: targetAccessLevel,
        accessLevelLastEnforcedAt: new Date().toISOString()
      });

      console.warn(
        `AccessLevel change detected for user ${event.params.userId}. ` +
        `Requested: "${newAccessLevel}", enforced: "${targetAccessLevel}".`
      );
    } catch (error) {
      console.error('Error enforcing accessLevel policy:', error);
    }
  }
);

// Manuális custom claims beállítása (admin funkció)
exports.setCustomClaims = onCall(
  { cors: true, region: 'europe-west1' },
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
  { cors: true, region: 'europe-west1' },
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
  { cors: true, region: 'europe-west1' },
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
  { cors: true, region: 'europe-west1' },
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

// Admin Console jelszó generálása és tárolása
exports.generateAdminConsolePassword = onCall(
  { cors: true, region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const userId = request.auth.uid;
    const callerClaims = request.auth.token;
    
    // Csak owner/admin/teacher hozhat létre jelszót
    if (!callerClaims.owner && !callerClaims.admin && !callerClaims.teacher) {
      throw new HttpsError('permission-denied', 'Must be owner, admin or teacher');
    }
    
    try {
      const userRecord = await getAuth().getUser(userId);
      const existingClaims = userRecord.customClaims || {};
      
      // Ha már van jelszó, azt használjuk
      if (existingClaims.adminConsolePassword) {
        return {
          success: true,
          password: existingClaims.adminConsolePassword,
          message: 'Existing password retrieved'
        };
      }
      
      // Speciális eset: CUvAu5ZLjQV4FJcd3JpzeqF8cJu2 maradjon 3741657387
      let password;
      if (userId === 'CUvAu5ZLjQV4FJcd3JpzeqF8cJu2') {
        password = '3741657387';
      } else {
        // Random 10 számjegyű jelszó generálása
        password = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      }
      
      // Custom claimben tárolás
      const updatedClaims = {
        ...existingClaims,
        adminConsolePassword: password
      };
      
      await getAuth().setCustomUserClaims(userId, updatedClaims);
      
      return {
        success: true,
        password: password,
        message: 'Password generated and stored'
      };
    } catch (error) {
      console.error('Error generating admin console password:', error);
      throw new HttpsError('internal', 'Failed to generate password');
    }
  }
);

// Admin Console jelszó ellenőrzése és session kezdése
exports.verifyAdminConsolePassword = onCall(
  { cors: true, region: 'europe-west1' },
  async (request) => {
    console.log('[verifyAdminConsolePassword] Function called');
    console.log('[verifyAdminConsolePassword] Auth:', request.auth?.uid);
    console.log('[verifyAdminConsolePassword] Data:', request.data);

    try {
      if (!request.auth) {
        console.log('[verifyAdminConsolePassword] No auth');
        throw new HttpsError('unauthenticated', 'Must be authenticated');
      }

      const userId = request.auth.uid;
      const password = request.data?.password;

      if (!password || typeof password !== 'string') {
        console.log('[verifyAdminConsolePassword] Invalid password');
        throw new HttpsError('invalid-argument', 'Password is required and must be a string');
      }

      console.log('[verifyAdminConsolePassword] Getting auth instance');
      const auth = getAuth();
      console.log('[verifyAdminConsolePassword] Auth instance obtained');
      
      console.log('[verifyAdminConsolePassword] Getting user record for:', userId);
      const userRecord = await auth.getUser(userId);
      console.log('[verifyAdminConsolePassword] User record obtained');
      
      const claims = userRecord.customClaims || {};
      let storedPassword = claims?.adminConsolePassword;

      console.log('[verifyAdminConsolePassword] Stored password:', storedPassword);

      // Ha nincs jelszó, csak a specifikus felhasználónak állítsuk be automatikusan
      if (!storedPassword) {
        if (userId === 'CUvAu5ZLjQV4FJcd3JpzeqF8cJu2') {
          // Speciális eset: automatikusan beállítjuk a 3741657387 jelszót
          storedPassword = '3741657387';
          const updatedClaims = {
            ...claims,
            adminConsolePassword: storedPassword
          };
          try {
            await getAuth().setCustomUserClaims(userId, updatedClaims);
            console.log('Auto-set password for specific user:', userId);
          } catch (setError) {
            console.error('Error setting password in claims:', setError);
            throw new HttpsError('internal', `Failed to set password: ${setError.message}`);
          }
        } else {
          // Más felhasználóknak először generálni kell jelszót
          throw new HttpsError('not-found', 'No password set for this user. Please generate one first using generateAdminConsolePassword.');
        }
      }

      if (password !== storedPassword) {
        return { success: false, message: 'Invalid password' };
      }

      // Session kezdése (15 perc)
      const sessionExpiry = Date.now() + 15 * 60 * 1000;
      const updatedClaims = { 
        ...claims, 
        adminConsolePassword: storedPassword, // Biztosítjuk, hogy a jelszó is benne legyen
        adminConsoleSessionExpiry: sessionExpiry 
      };

      try {
        await getAuth().setCustomUserClaims(userId, updatedClaims);
      } catch (setError) {
        console.error('Error setting session in claims:', setError);
        throw new HttpsError('internal', `Failed to set session: ${setError.message}`);
      }

      console.log('Session started for user:', userId);

      return {
        success: true,
        message: 'Password verified, session started',
        expiresAt: sessionExpiry
      };
    } catch (error) {
      console.error('Error verifying admin console password:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      if (error instanceof HttpsError) throw error; // ha már HttpError, dobjuk tovább
      throw new HttpsError('internal', `Failed to verify password: ${error.message || 'Unknown error'}`);
    }
  }
);

// Admin Console session ellenőrzése
exports.checkAdminConsoleSession = onCall(
  { cors: true, region: 'europe-west1' },
  async (request) => {
    console.log('[checkAdminConsoleSession] Function called');
    
    try {
      if (!request.auth) {
        console.log('[checkAdminConsoleSession] No auth');
        throw new HttpsError('unauthenticated', 'Must be authenticated');
      }
      
      const userId = request.auth.uid;
      console.log('[checkAdminConsoleSession] User ID:', userId);
      
      const auth = getAuth();
      console.log('[checkAdminConsoleSession] Auth instance obtained');
      
      const userRecord = await auth.getUser(userId);
      console.log('[checkAdminConsoleSession] User record obtained');
      
      const claims = userRecord.customClaims || {};
      console.log('[checkAdminConsoleSession] Claims:', JSON.stringify(claims));
      
      const sessionExpiry = claims.adminConsoleSessionExpiry;
      
      if (!sessionExpiry) {
        console.log('[checkAdminConsoleSession] No session expiry found');
        return {
          valid: false,
          message: 'No active session'
        };
      }
      
      const now = Date.now();
      console.log('[checkAdminConsoleSession] Now:', now, 'Expiry:', sessionExpiry);
      
      if (now > sessionExpiry) {
        // Session lejárt, töröljük
        console.log('[checkAdminConsoleSession] Session expired, removing');
        const updatedClaims = { ...claims };
        delete updatedClaims.adminConsoleSessionExpiry;
        await auth.setCustomUserClaims(userId, updatedClaims);
        
        return {
          valid: false,
          message: 'Session expired'
        };
      }
      
      console.log('[checkAdminConsoleSession] Session valid');
      return {
        valid: true,
        expiresAt: sessionExpiry,
        remainingTime: sessionExpiry - now
      };
    } catch (error) {
      console.error('[checkAdminConsoleSession] Error:', error);
      console.error('[checkAdminConsoleSession] Error stack:', error.stack);
      console.error('[checkAdminConsoleSession] Error message:', error.message);
      console.error('[checkAdminConsoleSession] Error name:', error.name);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to check session: ${error.message || 'Unknown error'}`);
    }
  }
);