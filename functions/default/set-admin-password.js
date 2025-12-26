/**
 * One-time script to set admin password for a user
 * Run with: node set-admin-password.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'eu2k-hub'
});

const userId = 'CUvAu5ZLjQV4FJcd3JpzeqF8cJu2';
const password = '3741657387';

async function setAdminPassword() {
  try {
    // Get current custom claims
    const userRecord = await admin.auth().getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    
    console.log('Current claims:', currentClaims);
    
    // Add admin password to claims
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
    
    console.log('✅ Admin password set successfully!');
    console.log('New claims:', newClaims);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin password:', error);
    process.exit(1);
  }
}

setAdminPassword();

