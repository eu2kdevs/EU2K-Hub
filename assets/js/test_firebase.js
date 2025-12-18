// Firebase Test Functions for Browser Console
// Használat: window.testFirebase.testNews() vagy window.testFirebase.testEvents()

import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// Lazy initialization - csak akkor hívjuk meg, amikor szükséges
function getDbInstance() {
  if (window.db) {
    return window.db;
  }
  try {
    // Try to get the default app first
    const app = getApp();
    return getFirestore(app);
  } catch (e) {
    console.warn('[test_firebase] Firebase Firestore not initialized yet:', e.message);
    return null;
  }
}

function getAuthInstance() {
  if (window.auth) {
    return window.auth;
  }
  try {
    // Try to get the default app first
    const app = getApp();
    return getAuth(app);
  } catch (e) {
    console.warn('[test_firebase] Firebase Auth not initialized yet:', e.message);
    return null;
  }
}

// Globális tesztelő objektum
window.testFirebase = {};

// ---- Tesztelő függvények ----

// Kijelentkezés
window.testFirebase.signOutUser = async function() {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.error("❌ Firebase Auth nincs inicializálva!");
      return;
    }
    await signOut(auth);
    console.log("👉 Kijelentkeztél (vendég mód)");
  } catch (e) {
    console.error("❌ Kijelentkezési hiba:", e.message);
  }
};

// Fiók törlése (Firestore adatok + Auth fiók)
window.testFirebase.deleteMyAccount = async function() {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.error("❌ Firebase Auth nincs inicializálva!");
      return false;
    }
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ Nincs bejelentkezett felhasználó!");
      return false;
    }

    const uid = user.uid;
    console.log("🗑️ Fiók törlése megkezdve...");
    console.log("👤 UID:", uid);

    // 1. Firestore dokumentumok törlése
    console.log("\n📄 Firestore dokumentumok törlése:");
    
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return false;
    }
    
    try {
      // User general_data törlése
      const generalRef = doc(db, "users", uid, "general_data", "general");
      await deleteDoc(generalRef);
      console.log("✅ general_data/general törölve");
    } catch (e) {
      console.log("⚠️ general_data/general törlési hiba (lehet, hogy nem létezett):", e.message);
    }

    try {
      // User fő dokumentum törlése
      const userRef = doc(db, "users", uid);
      await deleteDoc(userRef);
      console.log("✅ User fő dokumentum törölve");
    } catch (e) {
      console.log("⚠️ User fő dokumentum törlési hiba (lehet, hogy nem létezett):", e.message);
    }

    // 2. Firebase Auth fiók törlése
    console.log("\n🔐 Firebase Auth fiók törlése:");
    await deleteUser(user);
    console.log("✅ Auth fiók törölve");

    console.log("\n🎉 Fiók teljesen törölve! Újra regisztrálhatsz.");
    return true;

  } catch (e) {
    console.error("❌ Fiók törlési hiba:", e.message);
    if (e.code === 'auth/requires-recent-login') {
      console.log("💡 Újra be kell jelentkezned a fiók törléséhez. Próbáld:");
      console.log("   1. testFirebase.signOutUser()");
      console.log("   2. testFirebase.signInUser('email', 'password')");
      console.log("   3. testFirebase.deleteMyAccount()");
    }
    return false;
  }
};

// Bejelentkezés email+jelszóval
window.testFirebase.signInUser = async function(email, password) {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.error("❌ Firebase Auth nincs inicializálva!");
      return null;
    }
    await signInWithEmailAndPassword(auth, email, password);
    console.log("👉 Beléptél userként:", auth.currentUser.uid);
    return auth.currentUser;
  } catch (e) {
    console.error("❌ Bejelentkezési hiba:", e.message);
  }
};

// Jelenlegi felhasználó információk
window.testFirebase.whoAmI = async function() {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.error("❌ Firebase Auth nincs inicializálva!");
      return null;
    }
    const user = auth.currentUser;
    if (!user) {
      console.log("👤 Nincs bejelentkezett felhasználó (vendég mód)");
      return null;
    }

    console.log("👤 Jelenlegi felhasználó információk:");
    console.log("  🆔 UID:", user.uid);
    console.log("  📧 Email:", user.email || 'Nincs email');
    console.log("  👤 Display Name:", user.displayName || 'Nincs név');
    console.log("  📱 Phone:", user.phoneNumber || 'Nincs telefon');
    console.log("  ✅ Email verified:", user.emailVerified);
    console.log("  🕐 Létrehozva:", user.metadata.creationTime);
    console.log("  🕐 Utolsó bejelentkezés:", user.metadata.lastSignInTime);
    
    // Custom claims lekérése (ha van)
    try {
      const idTokenResult = await user.getIdTokenResult();
      if (Object.keys(idTokenResult.claims).length > 0) {
        console.log("  🏷️ Custom claims:", idTokenResult.claims);
      } else {
        console.log("  🏷️ Custom claims: Nincsenek");
      }
    } catch (claimsError) {
      console.log("  🏷️ Custom claims: Nem sikerült lekérni");
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      metadata: user.metadata
    };
  } catch (e) {
    console.error("❌ Felhasználó információ lekérési hiba:", e.message);
  }
};

// Hírek tesztelése
window.testFirebase.testNews = async function() {
  try {
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const ref = collection(db, "homePageData", "news", "hirek");
    const snap = await getDocs(ref);
    console.log("✅ Lekérve news/hirek:", snap.docs.length, "dokumentum");
    snap.docs.forEach(doc => {
      console.log(`📄 ${doc.id}:`, doc.data());
    });
    return snap.docs.map(d => ({id: d.id, data: d.data()}));
  } catch (e) {
    console.error("❌ Hírek lekérési hiba:", e.message);
  }
};

// Events tesztelése
window.testFirebase.testEvents = async function() {
  try {
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const ref = doc(db, "homePageData", "events");
    const snap = await getDoc(ref);
    console.log("✅ Events doksi:", snap.exists() ? snap.data() : "nincs adat");
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("❌ Events lekérési hiba:", e.message);
  }
};

// Feedback tesztelése
window.testFirebase.testFeedback = async function() {
  try {
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const ref = collection(db, "homePageData", "feedback", "msgs");
    const snap = await getDocs(ref);
    console.log("✅ Feedback üzenetek:", snap.docs.length, "dokumentum");
    snap.docs.forEach(doc => {
      console.log(`📄 ${doc.id}:`, doc.data());
    });
    return snap.docs.map(d => ({id: d.id, data: d.data()}));
  } catch (e) {
    console.error("❌ Feedback lekérési hiba:", e.message);
  }
};

// User dokumentum tesztelése
window.testFirebase.testUser = async function(uid) {
  try {
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      console.log("✅ User dokumentum:", snap.data());
      return snap.data();
    } else {
      console.log("⚠️ User fő dokumentum nem létezik (ez normális, ha csak aldokumentumok vannak)");
      console.log("💡 Próbáld meg: testFirebase.testUserGeneral('" + uid + "')");
      return null;
    }
  } catch (e) {
    console.error("❌ User dokumentum lekérési hiba:", e.message);
  }
};

// User general_data tesztelése
window.testFirebase.testUserGeneral = async function(uid) {
  try {
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const ref = doc(db, "users", uid, "general_data", "general");
    const snap = await getDoc(ref);
    console.log("✅ general_data/general:", snap.exists() ? snap.data() : "nincs adat");
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("❌ User general_data lekérési hiba:", e.message);
  }
};

// Saját adatok tesztelése (ha be vagy jelentkezve)
window.testFirebase.testMyData = async function() {
  try {
    const auth = getAuthInstance();
    if (!auth) {
      console.error("❌ Firebase Auth nincs inicializálva!");
      return null;
    }
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ Nincs bejelentkezett felhasználó! Először jelentkezz be.");
      return null;
    }

    console.log("🔍 Saját adatok tesztelése...");
    console.log("👤 UID:", user.uid);
    
    // User fő dokumentum
    console.log("\n📄 User fő dokumentum:");
    const db = getDbInstance();
    if (!db) {
      console.error("❌ Firebase Firestore nincs inicializálva!");
      return null;
    }
    const userResult = await window.testFirebase.testUser(user.uid);
    
    // User general_data
    console.log("\n📄 User general_data:");
    const generalResult = await window.testFirebase.testUserGeneral(user.uid);
    
    return {
      uid: user.uid,
      userDoc: userResult,
      generalData: generalResult
    };
  } catch (e) {
    console.error("❌ Saját adatok tesztelési hiba:", e.message);
  }
};

// Help függvény - elérhető parancsok listája
window.testFirebase.help = function() {
  console.log("🔥 Firebase Tesztelő Függvények:");
  console.log("\n📝 Autentikáció:");
  console.log("  testFirebase.signOutUser() - Kijelentkezés");
  console.log("  testFirebase.signInUser('email', 'password') - Bejelentkezés");
  console.log("  testFirebase.whoAmI() - Jelenlegi felhasználó információk");
  console.log("  testFirebase.deleteMyAccount() - Fiók törlése (Firestore + Auth)");
  console.log("\n📊 Adatok tesztelése:");
  console.log("  testFirebase.testNews() - Hírek lekérése");
  console.log("  testFirebase.testEvents() - Események lekérése");
  console.log("  testFirebase.testFeedback() - Visszajelzések lekérése");
  console.log("  testFirebase.testUser('uid') - User dokumentum lekérése");
  console.log("  testFirebase.testUserGeneral('uid') - User general_data lekérése");
  console.log("  testFirebase.testMyData() - Saját adatok tesztelése (bejelentkezve)");
  console.log("\n💡 Példa használat:");
  console.log("  await testFirebase.whoAmI() - Ki vagyok?");
  console.log("  await testFirebase.testMyData() - Saját adataim");
  console.log("  await testFirebase.testNews() - Hírek tesztelése");
  console.log("  await testFirebase.signInUser('test@example.com', 'password123')");
  console.log("\n🗑️ Fiók törlés:");
  console.log("  await testFirebase.deleteMyAccount() - Teljes fiók törlése");
};

// Automatikus help megjelenítés betöltéskor
console.log("🔥 Firebase tesztelő modul betöltve! Használd: testFirebase.help()");