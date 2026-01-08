const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const region = 'europe-west1';
const runtimeOpts = {
  region,
  maxInstances: 4,
  memory: '512MiB',
  timeoutSeconds: 60
};

function simplifyName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();
}

async function getCurrentUserNormalized(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return { normalizedName: null, fullName: null };
  }
  const data = userDoc.data() || {};
  const fullName = data.fullName || data.name || data.displayName || null;
  return {
    normalizedName: fullName ? simplifyName(fullName) : null,
    fullName
  };
}

async function resolveOwnerProfile(normalizedName) {
  if (!normalizedName) return { normalizedName: null, fullName: null, userId: null };

  try {
    const colRef = db.collection('usrlookup').doc('names').collection(normalizedName);
    const snap = await colRef.limit(1).get();
    if (snap.empty) {
      return { normalizedName, fullName: null, userId: null };
    }
    const doc = snap.docs[0];
    const data = doc.data() || {};
    return {
      normalizedName,
      fullName: data.fullName || null,
      userId: doc.id || null
    };
  } catch (err) {
    console.warn('[Suggestions] resolveOwnerProfile failed', err);
    return { normalizedName, fullName: null, userId: null };
  }
}

async function isUserInGroup(uid, groupId) {
  if (!groupId) return false;

  try {
    const classRef = db.collection('classes').doc(groupId);
    const classSnap = await classRef.get();
    if (classSnap.exists) {
      const classUserSnap = await classRef.collection('users').doc(uid).get();
      if (classUserSnap.exists) return true;
    }
  } catch (err) {
    console.warn('[Suggestions] isUserInGroup classes check failed', err);
  }

  try {
    const groupUserSnap = await db.collection('groups').doc(groupId).collection('users').doc(uid).get();
    if (groupUserSnap.exists) return true;
  } catch (err) {
    console.warn('[Suggestions] isUserInGroup groups check failed', err);
  }

  return false;
}

function normalizeList(value) {
  return (value || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

exports.suggestionsFetch = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Be kell jelentkezni a javaslatok megtekintéséhez.');
  }

  const uid = request.auth.uid;
  let { deviceId } = request.data || {};
  if (!deviceId) {
    deviceId = `youhub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const { normalizedName: currentNormalizedName } = await getCurrentUserNormalized(uid);

  const snap = await db
    .collection('suggestions')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const suggestions = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};

    // restrictToUsers: comma-separated normalized names
    const restrictedUsers = normalizeList(data.restrictToUsers).map((n) => n.toLowerCase());
    if (restrictedUsers.length > 0) {
      if (!currentNormalizedName || !restrictedUsers.includes(currentNormalizedName.toLowerCase())) {
        continue;
      }
    }

    // restrictToGroups: comma-separated group ids
    const restrictedGroups = normalizeList(data.restrictToGroups);
    if (restrictedGroups.length > 0) {
      let allowed = false;
      for (const groupId of restrictedGroups) {
        if (await isUserInGroup(uid, groupId)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) continue;
    }

    const ownerNormalized = data.ownerId || data.owner || null;
    const ownerProfile = await resolveOwnerProfile(ownerNormalized);

    const createdAt = data.createdAt && typeof data.createdAt.toMillis === 'function'
      ? data.createdAt.toMillis()
      : null;

    suggestions.push({
      id: docSnap.id,
      title: data.title || '',
      content: data.content || '',
      hive: !!data.hive,
      owner: ownerProfile,
      createdAt,
      restrictToUsers: restrictedUsers,
      restrictToGroups: restrictedGroups
    });

    if (suggestions.length >= 4) break;
  }

  return { deviceId, suggestions };
});

exports.suggestionsFetchNames = onCall(runtimeOpts, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Be kell jelentkezni.');
  }

  const names = [];

  try {
    // usrlookup/names/{normalizedName}/{uid}
    const namesDocRef = db.collection('usrlookup').doc('names');
    const collections = await namesDocRef.listCollections();
    for (const col of collections) {
      if (col.id === 'toBeAdded') continue;
      const normalizedName = col.id;
      const docsSnap = await col.get();
      docsSnap.forEach((doc) => {
        const data = doc.data() || {};
        names.push({
          userId: doc.id,
          normalizedName,
          fullName: data.fullName || null
        });
      });
    }
  } catch (err) {
    console.warn('[Suggestions] Failed to load usrlookup/names', err);
  }

  try {
    // usrlookup/teachers/{normalizedName}/{uid}
    const teachersDocRef = db.collection('usrlookup').doc('teachers');
    const teacherGroups = await teachersDocRef.listCollections();
    for (const col of teacherGroups) {
      const normalizedName = col.id;
      const docsSnap = await col.get();
      docsSnap.forEach((doc) => {
        const data = doc.data() || {};
        names.push({
          userId: doc.id,
          normalizedName,
          fullName: data.fullName || null
        });
      });
    }
  } catch (err) {
    console.warn('[Suggestions] Failed to load usrlookup/teachers', err);
  }

  return { names };
});

