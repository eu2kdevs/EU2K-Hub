// Firestore Debug Module - Firebase v10 compatible
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

/**
 * Debug function to test Firestore read/write operations
 * Tests both public document reading and user-specific document writing
 */
async function debugFirestore() {
  const user = auth.currentUser;
  console.log("🔍 Bejelentkezett user:", user ? user.uid : "Nincs auth");

  // 1) Próbáld meg kiolvasni a publikus dokumentumot
  try {
    const newsRef = doc(db, "homePageData", "news");
    const snap = await getDoc(newsRef);
    console.log("📰 News read siker:", snap.exists(), snap.data());
  } catch (e) {
    console.error("❌ News read FAIL:", e.message);
  }

  // 2) Próbáld meg beírni a saját user/general_data/general dokumentumba
  if (user) {
    try {
      const myRef = doc(db, "users", user.uid, "general_data", "general");
      await setDoc(myRef, { 
        lastTest: new Date().toISOString(),
        debugTimestamp: Date.now(),
        testSource: "firestore-debug.js"
      }, { merge: true });
      console.log("✅ Users write siker");
    } catch (e) {
      console.error("❌ Users write FAIL:", e.message);
    }
  } else {
    console.warn("⚠️ Nincs bejelentkezett felhasználó, user write teszt kihagyva");
  }
}

// Export the debug function for global use
window.debugFirestore = debugFirestore;

// Auto-run debug on page load (optional)
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Firestore debug module loaded');
  
  // Uncomment the line below to auto-run debug on every page load
  // setTimeout(debugFirestore, 2000); // Wait 2 seconds for auth to initialize
});

export { debugFirestore };