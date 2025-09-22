/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

exports.addCsehonapGroupClaim = onDocumentCreated(
  "/groups/events/csehonap2025/{groupId}",
  async (event) => {
    const groupId = event.params.groupId;
    const data = event.data?.data(); // pl. { users: ["Anna", "Béla"] }

    if (!data || !data.users) {
      console.log("No users in document", groupId);
      return;
    }

    try {
      const listUsersResult = await getAuth().listUsers();
      for (const userRecord of listUsersResult.users) {
        const displayName = userRecord.displayName;
        if (data.users.includes(displayName)) {
          const claims = userRecord.customClaims || {};
          claims[groupId] = true;
          await getAuth().setCustomUserClaims(userRecord.uid, claims);
          console.log(`Added groupId ${groupId} claim to user ${displayName}`);
        }
      }
    } catch (error) {
      console.error("Error adding groupId claims:", error);
    }
  }
);
