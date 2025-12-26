# Firebase Deploy Instrukciók - Staff Session Management

## Előkészítés

1. **Firebase CLI telepítése** (ha még nincs):
```bash
npm install -g firebase-tools
```

2. **Bejelentkezés**:
```bash
firebase login
```

3. **Projekt kiválasztása**:
```bash
cd EU2K-Hub
firebase use eu2k-hub
```

## Deploy lépések

### 1. Functions Deploy

Először telepítsd a függőségeket a functions mappában:

```bash
cd functions/default
npm install firebase-admin firebase-functions
cd ../..
```

Majd deployold a functions-öket:

```bash
firebase deploy --only functions
```

Ez deployloni fogja az alábbi functions-öket:
- `staffSessionStart`
- `staffSessionCheck`
- `staffSessionEnd`
- `checkClassWriteAccess`
- `verifyAdminConsolePassword`

### 2. Firestore Rules Deploy

```bash
firebase deploy --only firestore:rules
```

Ez frissíti a Firestore biztonsági szabályokat, hogy:
- A `classes` collection írásához aktív staff session szükséges
- Létrejönnek a `staffSessions`, `classWriteAttempts` és `classWriteAccessLogs` collectionök

### 3. Hosting Deploy

```bash
firebase deploy --only hosting
```

Ez fel fogja tölteni az összes új fájlt:
- HTML oldalak (dashboard.html, students.html)
- JavaScript fájlok (staff-access.js, staff-timer.js, staff-nav-items.js, global-staff-check.js)
- CSS fájlok (staff-access.css)
- Fordítások (TRANSLATIONS_STAFF.json - ezt manuálisan kell bemásolni a translation fájlokba!)

### 4. Teljes Deploy (mindent egyszerre)

```bash
firebase deploy
```

## Post-Deploy Ellenőrzés

1. **Functions tesztelése**:
   - Nyisd meg a Firebase Console-t
   - Menj a Functions oldalra
   - Ellenőrizd, hogy az új functions megjelentek-e

2. **Rules tesztelése**:
   - Nyisd meg a Firebase Console-t
   - Menj a Firestore Database oldalra
   - Ellenőrizd a Rules fület

3. **Hosting tesztelése**:
   - Látogasd meg: https://eu2k-hub.web.app vagy https://eu2k-hub.firebaseapp.com
   - Jelentkezz be admin/owner/teacher fiókkal
   - Menj a Beállításokba
   - Keresd meg a "Kollégáknak" kártyát
   - Próbáld ki a munkamenet indítását

## Fordítások másolása

A `TRANSLATIONS_STAFF.json` fájl tartalmazza az összes szükséges fordítást.
**FONTOS**: Manuálisan kell bemásolni ezeket a `assets/translations/*.json` fájlokba!

Minden nyelvhez (`hu.json`, `en.json`, `de.json`, `es.json`, `fr.json`, `ru.json`, `ja.json`, `zh.json`, `sv.json`):
1. Nyisd meg a `TRANSLATIONS_STAFF.json` fájlt
2. Másold ki az adott nyelvhez tartozó fordításokat
3. Illeszd be a megfelelő helyre a nyelvi fájlban

## Hibaelhárítás

### "Permission denied" hiba functions deploynál
```bash
firebase login --reauth
firebase use eu2k-hub
```

### Functions nem jelenik meg
Ellenőrizd a `functions/default/package.json` fájlt:
```json
{
  "name": "default",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "engines": {
    "node": "18"
  }
}
```

### Firestore rules syntax error
Ellenőrizd a `firestore.rules` fájlt a Firebase Console-ban a Rules Playground használatával.

## Fontos megjegyzések

1. **Jelszó beállítás**: Admin/Owner/Teacher felhasználóknak be kell állítani az `adminPassword` custom claimet!
2. **Session időtartam**: 15 perc, ezt a `SESSION_DURATION_MS` változóban lehet módosítani
3. **Lockout**: 5 sikertelen próbálkozás után 15 perc lockout
4. **Timer szinkronizáció**: Percenként szinkronizál a szerverrel, összesen 15-ször

## Admin jelszó beállítása (csak adminok számára)

Firebase Console > Authentication > Users > Válaszd ki a usert > Custom claims:
```json
{
  "admin": true,
  "adminPassword": "your-secure-password-here"
}
```

Vagy Firebase CLI-vel:
```bash
firebase auth:set-claims USER_UID --claims '{"admin":true,"adminPassword":"your-password"}'
```

## Kész!

Ha minden deploy sikeres volt, a rendszer készen áll a használatra.

