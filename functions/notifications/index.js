// functions/notifications/index.js
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Trigger: új dokumentum a hirek kollekcióban
exports.sendNewsNotification = onDocumentCreated(
  'homePageData/news/hirek/{docId}',
  async (event) => {
    try {
      const snap = event.data;
      const data = snap.data() || {};
      const title = data.title || 'Új hír!';
      let desc = data.desc || '';
      if (desc.length > 100) desc = desc.substring(0, 100).trim() + '...';

      const icon = "/EU2K-Hub/assets/notifications_page/news.svg";

      // Lekérdezzük a userTokens kollekciót — ahol categories.Hírek == true
      const tokensSnapshot = await db.collection('userTokens')
        .where('categories.Hírek', '==', true)
        .get();

      if (tokensSnapshot.empty) {
        console.log('No subscribers for Hírek.');
        return null;
      }

      const tokens = [];
      tokensSnapshot.forEach(doc => {
        const rec = doc.data();
        if (rec && rec.token) tokens.push(rec.token);
      });

      if (!tokens.length) {
        console.log('No tokens found.');
        return null;
      }

      // messaging: maximum 500 token per batch
      const BATCH_SIZE = 500;
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batchTokens = tokens.slice(i, i + BATCH_SIZE);

        const message = {
          notification: { title, body: desc, icon },
          tokens: batchTokens,
          webpush: {
            fcmOptions: {
              link: "/EU2K-Hub/test-channel/"
            }
          }
        };

        const response = await messaging.sendMulticast(message);
        console.log(`Sent batch ${i/BATCH_SIZE + 1}: success ${response.successCount}, failure ${response.failureCount}`);
      }

      return null;
    } catch (err) {
      console.error('Error in sendNewsNotification:', err);
      return null;
    }
  }
);