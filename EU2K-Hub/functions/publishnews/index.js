/**
 * EU2K Hub News Publishing Cloud Function
 * Region: europe-west3 (Frankfurt)
 * 
 * Features:
 * - Transaction-based ID generation
 * - Signed URL for image upload (5 min expiry)
 * - URL safety check with fallback
 * - HTML injection prevention
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// Region configuration
const region = 'europe-west3';

// HTML tag detection regex
const HTML_TAG_REGEX = /<[^>]*>/;

// Domain blacklist for URL safety (fallback when API unavailable)
const DOMAIN_BLACKLIST = [
  'malware.com', 'phishing.com', 'evil.com',
  // Add more known bad domains here
];

/**
 * Check if a URL is potentially unsafe
 * Fallback strategy: API -> Blacklist -> Allow with log
 */
async function checkUrlSafety(url) {
  if (!url) return { safe: true, checked: false };

  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.toLowerCase();

    // Check against blacklist
    if (DOMAIN_BLACKLIST.some(bad => domain.includes(bad))) {
      return { safe: false, reason: 'Domain blacklisted', checked: true };
    }

    // TODO: Integrate Google Safe Browsing API here
    // For now, return safe with log
    console.log(`[URL Safety] URL checked (blacklist only): ${url}`);
    return { safe: true, checked: true };

  } catch (error) {
    console.warn(`[URL Safety] Failed to check URL: ${url}`, error.message);
    // Fallback: allow but log
    return { safe: true, checked: false, warning: 'URL check failed, allowing' };
  }
}

/**
 * Validate inputs on server side
 */
function validateInputs(data) {
  const { title, author, desc, link } = data;
  const errors = [];

  // Title validation
  if (!title || typeof title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title too short (min 3 chars)' });
  } else if (title.trim().length > 120) {
    errors.push({ field: 'title', message: 'Title too long (max 120 chars)' });
  } else if (HTML_TAG_REGEX.test(title)) {
    errors.push({ field: 'title', message: 'Title cannot contain HTML' });
  }

  // Author validation
  if (!author || typeof author !== 'string' || !author.trim()) {
    errors.push({ field: 'author', message: 'Author is required' });
  } else if (HTML_TAG_REGEX.test(author)) {
    errors.push({ field: 'author', message: 'Author cannot contain HTML' });
  }

  // Description HTML check
  if (desc && HTML_TAG_REGEX.test(desc)) {
    errors.push({ field: 'desc', message: 'Description cannot contain HTML' });
  }

  // Link HTML check
  if (link && HTML_TAG_REGEX.test(link)) {
    errors.push({ field: 'link', message: 'Link cannot contain HTML' });
  }

  return errors;
}

/**
 * Get signed upload URL for image
 * 5-minute expiry, single use
 */
exports.getNewsUploadUrl = onCall({ region }, async (request) => {
  try {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Check staff privileges
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only staff can upload news images');
    }

    const { contentType, newsId } = request.data;

    if (!contentType || !contentType.startsWith('image/')) {
      throw new HttpsError('invalid-argument', 'Invalid content type, must be image');
    }

    const bucket = storage.bucket();
    const fileName = `newsPictures/${newsId}`;
    const file = bucket.file(fileName);

    // Generate signed URL for upload (5 minute expiry)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: contentType
    });

    console.log(`[News Upload] Generated signed URL for ${fileName}`);

    return {
      uploadUrl: signedUrl,
      fileName: fileName,
      expiresIn: 300 // seconds
    };

  } catch (error) {
    console.error('[News Upload] Error generating signed URL:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to generate upload URL');
  }
});

/**
 * Publish news article
 * - Validates inputs
 * - Checks URL safety
 * - Uses transaction for ID generation
 * - Creates Firestore document
 */
exports.publishNews = onCall({ region }, async (request) => {
  try {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Check staff privileges
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only staff can publish news');
    }

    const { title, author, desc, link, imageUrl, customDate } = request.data;

    // Validate inputs
    const validationErrors = validateInputs({ title, author, desc, link });
    if (validationErrors.length > 0) {
      throw new HttpsError('invalid-argument', 'Validation failed', { errors: validationErrors });
    }

    // Check URL safety (if provided)
    if (link) {
      const urlCheck = await checkUrlSafety(link);
      if (!urlCheck.safe) {
        throw new HttpsError('invalid-argument', 'Link failed safety check', {
          reason: urlCheck.reason
        });
      }
    }

    // Parse custom date or use current timestamp
    let dateValue;
    if (customDate && typeof customDate === 'string') {
      // Parse the date string (format: YYYY-MM-DD) and convert to Firestore Timestamp
      const parsedDate = new Date(customDate);
      if (!isNaN(parsedDate.getTime())) {
        dateValue = admin.firestore.Timestamp.fromDate(parsedDate);
      } else {
        dateValue = admin.firestore.FieldValue.serverTimestamp();
      }
    } else {
      dateValue = admin.firestore.FieldValue.serverTimestamp();
    }

    // Transaction-based ID generation
    let newId;
    let newsDocRef;

    await db.runTransaction(async (transaction) => {
      const metaRef = db.doc('homePageData/news');
      const metaDoc = await transaction.get(metaRef);

      if (!metaDoc.exists) {
        // Initialize meta doc if it doesn't exist
        newId = 1;
        transaction.set(metaRef, { latestId: 1 });
      } else {
        newId = (metaDoc.data().latestId || 0) + 1;
        transaction.update(metaRef, { latestId: newId });
      }

      // Create news document
      newsDocRef = db.doc(`homePageData/news/hirek/${newId}`);
      transaction.set(newsDocRef, {
        title: title.trim(),
        author: author.trim(),
        desc: desc ? desc.trim() : '',
        link: link ? link.trim() : '',
        image: imageUrl || '',
        date: dateValue,
        hubExclusive: false,
        createdBy: uid
      });
    });

    console.log(`[News Publish] Successfully created news #${newId} by user ${uid}`);

    return {
      success: true,
      newsId: newId,
      message: 'News published successfully'
    };

  } catch (error) {
    console.error('[News Publish] Error:', error);

    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to publish news', {
      message: error.message
    });
  }
});

/**
 * Cleanup orphan images (scheduled function)
 * Runs daily to remove images without corresponding Firestore documents
 */
// TODO: Implement scheduled cleanup function
// exports.cleanupOrphanNewsImages = onSchedule('every 24 hours', async (event) => { ... });

// ========== EVENT PUBLISH FUNCTIONS ==========

/**
 * Validate event inputs on server side
 */
function validateEventInputs(data) {
  const { title, place, dateFrom, dateTo, link } = data;
  const errors = [];

  // Title validation
  if (!title || typeof title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Title too short (min 3 chars)' });
  } else if (title.trim().length > 120) {
    errors.push({ field: 'title', message: 'Title too long (max 120 chars)' });
  } else if (HTML_TAG_REGEX.test(title)) {
    errors.push({ field: 'title', message: 'Title cannot contain HTML' });
  }

  // Place validation
  if (!place || typeof place !== 'string' || !place.trim()) {
    errors.push({ field: 'place', message: 'Place is required' });
  } else if (HTML_TAG_REGEX.test(place)) {
    errors.push({ field: 'place', message: 'Place cannot contain HTML' });
  }

  // Date validation
  if (!dateFrom) {
    errors.push({ field: 'dateFrom', message: 'Start date is required' });
  }
  if (!dateTo) {
    errors.push({ field: 'dateTo', message: 'End date is required' });
  }

  // Link HTML check
  if (link && HTML_TAG_REGEX.test(link)) {
    errors.push({ field: 'link', message: 'Link cannot contain HTML' });
  }

  return errors;
}

/**
 * Get signed upload URL for event image
 * 5-minute expiry, single use
 */
exports.getEventUploadUrl = onCall({ region }, async (request) => {
  try {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Check staff privileges
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only staff can upload event images');
    }

    const { contentType, eventId } = request.data;

    if (!contentType || !contentType.startsWith('image/')) {
      throw new HttpsError('invalid-argument', 'Invalid content type, must be image');
    }

    const bucket = storage.bucket();
    const fileName = `eventPictures/${eventId}`;
    const file = bucket.file(fileName);

    // Generate signed URL for upload (5 minute expiry)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: contentType
    });

    console.log(`[Event Upload] Generated signed URL for ${fileName}`);

    return {
      uploadUrl: signedUrl,
      fileName: fileName,
      expiresIn: 300 // seconds
    };

  } catch (error) {
    console.error('[Event Upload] Error generating signed URL:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to generate upload URL');
  }
});

/**
 * Publish event
 * - Validates inputs
 * - Checks URL safety
 * - Uses transaction for ID generation
 * - Creates Firestore document at homePageData/events/események/{id}
 */
exports.publishEvent = onCall({ region }, async (request) => {
  try {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = request.auth.uid;

    // Check staff privileges
    const userRecord = await admin.auth().getUser(uid);
    const claims = userRecord.customClaims || {};

    if (!claims.admin && !claims.owner && !claims.teacher) {
      throw new HttpsError('permission-denied', 'Only staff can publish events');
    }

    const { title, link, place, description, imageUrl, dateFrom, dateTo } = request.data;

    // Validate inputs
    const validationErrors = validateEventInputs({ title, place, dateFrom, dateTo, link });
    if (validationErrors.length > 0) {
      throw new HttpsError('invalid-argument', 'Validation failed', { errors: validationErrors });
    }

    // Check URL safety (if provided)
    if (link) {
      const urlCheck = await checkUrlSafety(link);
      if (!urlCheck.safe) {
        throw new HttpsError('invalid-argument', 'Link failed safety check', {
          reason: urlCheck.reason
        });
      }
    }

    // Parse dates
    const dateFromValue = admin.firestore.Timestamp.fromDate(new Date(dateFrom));
    const dateToValue = admin.firestore.Timestamp.fromDate(new Date(dateTo));

    // Transaction-based ID generation
    let newId;
    let eventDocRef;

    await db.runTransaction(async (transaction) => {
      const metaRef = db.doc('homePageData/events');
      const metaDoc = await transaction.get(metaRef);

      if (!metaDoc.exists) {
        // Initialize meta doc if it doesn't exist
        newId = 1;
        transaction.set(metaRef, { latestId: 1 });
      } else {
        newId = (metaDoc.data().latestId || 0) + 1;
        transaction.update(metaRef, { latestId: newId });
      }

      // Create event document
      eventDocRef = db.doc(`homePageData/events/esemenyek/${newId}`);
      transaction.set(eventDocRef, {
        title: title.trim(),
        link: link ? link.trim() : '',
        image: imageUrl || '',
        description: description ? description.trim() : '',
        place: place.trim(),
        'date-from': dateFromValue,
        'date-to': dateToValue,
        createdBy: uid
      });
    });

    console.log(`[Event Publish] Successfully created event #${newId} by user ${uid}`);

    return {
      success: true,
      eventId: newId,
      message: 'Event published successfully'
    };

  } catch (error) {
    console.error('[Event Publish] Error:', error);

    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to publish event', {
      message: error.message
    });
  }
});
