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
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.addCsehonapGroupClaim = onDocumentCreated(
  "/groups/events/csehonap2025/{groupId}",
  async (event) => {
    const groupId = event.params.groupId;
    const data = event.data?.data();

    console.log(`🚀 Processing group claim for groupId: ${groupId}`);

    if (!data) {
      console.log("❌ No data in document", groupId);
      return;
    }

    try {
      const db = getFirestore();
      
      // Read the students document from calendar/classes/{groupId}/students
      const studentsDocRef = db.collection('calendar').doc('classes').collection(groupId).doc('students');
      const studentsDoc = await studentsDocRef.get();
      
      if (!studentsDoc.exists) {
        console.log(`❌ Students document not found for groupId: ${groupId}`);
        return;
      }
      
      const studentsData = studentsDoc.data();
      const studentsString = studentsData.students || '';
      
      if (!studentsString) {
        console.log(`❌ No students string found for groupId: ${groupId}`);
        return;
      }
      
      console.log(`📋 Students string for ${groupId}: ${studentsString}`);
      
      // Parse the students string (comma + space separated UIDs)
      const studentUIDs = studentsString
        .split(', ')
        .map(uid => uid.trim())
        .filter(uid => uid.length > 0);
      
      console.log(`👥 Found ${studentUIDs.length} student UIDs:`, studentUIDs);
      
      // Add custom claims to each student UID
      let successCount = 0;
      let errorCount = 0;
      
      for (const uid of studentUIDs) {
        try {
          // Get current user's custom claims
          const userRecord = await getAuth().getUser(uid);
          const claims = userRecord.customClaims || {};
          
          // Add the groupId claim
          claims[groupId] = true;
          
          // Set the updated claims
          await getAuth().setCustomUserClaims(uid, claims);
          
          console.log(`✅ Added ${groupId} claim to user UID: ${uid}`);
          successCount++;
          
        } catch (userError) {
          console.error(`❌ Error setting claim for UID ${uid}:`, userError);
          errorCount++;
        }
      }
      
      console.log(`🎉 Claim assignment completed for ${groupId}: ${successCount} successful, ${errorCount} errors`);
      
    } catch (error) {
      console.error(`❌ Error processing group claims for ${groupId}:`, error);
    }
  }
);
