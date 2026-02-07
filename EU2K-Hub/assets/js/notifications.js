// notifications.js
// Ezt importáld a frontendre (pl. <script type="module" src="/path/notifications.js"></script>)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

/* --------------------------
   🔧 CONFIG
   -------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyBRRVx6BtQtCDKjFYA8yh9qYrcUONmkkwI",
    authDomain: "eu2k-hub.firebaseapp.com",
    projectId: "eu2k-hub",
    storageBucket: "eu2k-hub.firebasestorage.app",
    messagingSenderId: "560244867055",
    appId: "1:560244867055:web:3cd51b85baead94989001a",
    measurementId: "G-2JDPR089WD"
};

// VAPID key (Web push)
const VAPID_KEY = "BMKJ8fsJJwBNs0bddsubE4-sdP0rV3abVnkTmcDSDu4CnxQQoLaZhZk5zTbmyikPIoLll__aKggffXNou3lTMFM";

/* --------------------------
   Inicializálás
   -------------------------- */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

/* --------------------------
   HELPERS
   -------------------------- */

// visszaadja a beállításokban bekapcsolt kategóriákat pl. { "Hírek": true, "Kurzusok": false, ... }
function getEnabledCategoriesFromDOM() {
  const categories = {};
  const notificationPage = document.getElementById("notifications-page");
  if (!notificationPage) return categories;

  const items = notificationPage.querySelectorAll(".category-item");
  items.forEach(item => {
    const iconEl = item.querySelector(".category-icon");
    const alt = iconEl?.getAttribute("alt") || null; // "Hírek", "Kurzusok", ...
    const switchEl = item.querySelector("md-switch");
    if (!alt || !switchEl) return;

    const attrs = Array.from(switchEl.attributes).map(a => a.name).sort().join(" ");
    const valid = attrs === "icons selected" || attrs === "selected icons";
    categories[alt] = !!valid;
  });

  return categories;
}

// elmenti a token-t és a jelenlegi kategória-beállításokat a Firestore-ba
async function saveTokenDoc(token) {
  if (!token) return;
  const categories = getEnabledCategoriesFromDOM();
  const docRef = doc(db, "userTokens", token);
  await setDoc(docRef, {
    token,
    categories,
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log("✅ token doc saved/updated");
}

// ha a beállítások változnak, frissítjük a Firestore-docot a tokennel
async function refreshTokenCategories(token) {
  if (!token) return;
  await saveTokenDoc(token);
}

/* --------------------------
   Service Worker reg + token lekérés
   -------------------------- */
async function registerSWAndGetToken() {
  if (!('serviceWorker' in navigator)) {
    console.warn("No service worker support");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log("🪄 Service Worker registered:", registration);

    // kéri az FCM tokent
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log("✨ FCM token:", currentToken);
      await saveTokenDoc(currentToken);

      // figyeljük a DOM változásokat, hogy frissítsük a categories mezőt
      startSettingsObserver(currentToken);
    } else {
      console.warn("⚠️ Nincs token (kérd újra az engedélyt)");
    }

    return currentToken;
  } catch (err) {
    console.error("❌ SW reg / getToken error:", err);
    return null;
  }
}

/* --------------------------
   DOM Observer - ha a settings változik -> frissít token doc
   -------------------------- */
function startSettingsObserver(currentToken) {
  const notificationPage = document.getElementById("notifications-page");
  if (!notificationPage) return;

  const observer = new MutationObserver(() => {
    // ha változás van, frissítjük a firestore docot (categories)
    refreshTokenCategories(currentToken).catch(console.error);
  });

  // figyeljük a subtree-t (a switch attribútumai megváltozhatnak)
  observer.observe(notificationPage, { attributes: true, subtree: true, childList: true });
  console.log("🔁 Settings observer active");
}

/* --------------------------
   foreground handler (opcionális): mikor aktív a tab
   -------------------------- */
onMessage(messaging, (payload) => {
  console.log('🔔 foreground message:', payload);
  // opcionálisan: megjeleníthetsz egy in-app banner-t itt
});

/* --------------------------
   Init: engedélykérés, regisztráció, token mentés
   -------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Engedély kérése
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    const token = await registerSWAndGetToken();
    if (!token) return;

    // Ha a user később új token kap (nem ritka), érdemes lekérni újból időnként
    // (opcionális: beállíthatsz egy időzítőt vagy refresh logikát)
  } catch (err) {
    console.error("Init error:", err);
  }
});