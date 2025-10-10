// firebase-messaging-sw.js
// importScripts a compat verziók miatt (service worker nem használ modules)
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

/* --------------------------
   🔧 CONFIG
   -------------------------- */
firebase.initializeApp({
    apiKey: "AIzaSyBRRVx6BtQtCDKjFYA8yh9qYrcUONmkkwI",
    authDomain: "eu2k-hub.firebaseapp.com",
    projectId: "eu2k-hub",
    storageBucket: "eu2k-hub.firebasestorage.app",
    messagingSenderId: "560244867055",
    appId: "1:560244867055:web:3cd51b85baead94989001a",
    measurementId: "G-2JDPR089WD"
});

const messaging = firebase.messaging();

// Háttérben érkező push üzenet kezelése
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notification = payload.notification || {};
  const title = notification.title || 'Értesítés';
  const options = {
    body: notification.body || '',
    icon: notification.icon || '/EU2K-Hub/assets/notifications_page/news.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

// notification click (opcionális - pl. megnyit egy oldal)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const target = event.notification.data?.url || '/EU2K-Hub/';
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if (client.url === target && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});