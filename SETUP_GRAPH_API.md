# Microsoft Graph API Firebase Function Beállítási Útmutató

## 1. Firebase Secrets Beállítása

A Microsoft Graph API használatához szükséged van három secret értékre, amit a Firebase Functions-ben kell beállítani.

### 1.1. Microsoft Azure App Registration információk lekérése

1. Menj az [Azure Portal](https://portal.azure.com)-ra
2. Navigálj az **Azure Active Directory** > **App registrations** menüpontra
3. Válaszd ki az alkalmazásodat (vagy hozz létre egy újat)
4. Másold ki a következő értékeket:
   - **Application (client) ID** → Ez lesz a `MS_CLIENT_ID`
   - **Directory (tenant) ID** → Ez lesz a `MS_TENANT_ID`
   - **Client secret** → Ez lesz a `MS_CLIENT_SECRET` (ha nincs, hozz létre egyet a "Certificates & secrets" menüpontban)

### 1.2. Secrets beállítása Firebase-ben

**Automatikus beállítás (ajánlott):**

**Windows PowerShell:**
```powershell
.\setup-graph-api.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-graph-api.sh
./setup-graph-api.sh
```

**Manuális beállítás:**

Nyisd meg a terminált a projekt gyökerében és futtasd le a következő parancsokat:

```bash
# MS_CLIENT_ID beállítása
firebase functions:secrets:set MS_CLIENT_ID

# MS_CLIENT_SECRET beállítása
firebase functions:secrets:set MS_CLIENT_SECRET

# MS_TENANT_ID beállítása
firebase functions:secrets:set MS_TENANT_ID
```

Minden parancs után a rendszer kérni fogja, hogy add meg az értéket. Add meg a megfelelő értékeket.

### 1.3. Secrets ellenőrzése

Ellenőrizd, hogy a secrets helyesen vannak-e beállítva:

```bash
firebase functions:secrets:access MS_CLIENT_ID
firebase functions:secrets:access MS_CLIENT_SECRET
firebase functions:secrets:access MS_TENANT_ID
```

## 2. Firebase Function Deploy

### 2.1. GraphAPI Function hozzáadása a firebase.json-hoz

✅ **A `firebase.json` fájl már frissítve van** a `graphapi` codebase-szel. Nincs szükség további módosításra.

### 2.2. Dependencies telepítése

Telepítsd a szükséges npm csomagokat:

```bash
cd functions/graphapi
npm install
cd ../..
```

### 2.3. Function deploy

Deployold a function-t:

```bash
firebase deploy --only functions:callGraphAPI
```

Vagy ha minden function-t szeretnél deployolni:

```bash
firebase deploy --only functions
```

## 3. Frontend Módosítások

### 3.1. initializeOnboarding hívások frissítése

✅ **Az `initializeOnboarding` függvény már frissítve van** az `app` paraméterrel. Ha van olyan hely a kódban, ahol ezt a függvényt hívod, győződj meg róla, hogy az `app` paramétert is átadod:

```javascript
// Helyes hívás:
initializeOnboarding(auth, db, app);
```

**Megjegyzés:** Jelenleg az `initializeOnboarding` függvény nincs használva az `onboarding.html`-ben, mert az onboarding folyamat közvetlenül van implementálva az oldalon. Ha később használnád ezt a függvényt, ne felejtsd el az `app` paramétert átadni.

### 3.2. App inicializálás ellenőrzése

✅ **Az `onboarding.html`-ben már helyesen van inicializálva:**

```javascript
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');
```

A `callGraphAPI` függvény már használja ezt az `app` példányt, így nincs szükség további módosításra.

## 4. Tesztelés

### 4.1. Local tesztelés (emulator)

Ha local emulator-t használsz:

```bash
firebase emulators:start --only functions
```

### 4.2. Production tesztelés

1. Nyisd meg az onboarding oldalt
2. Jelentkezz be Microsoft fiókkal
3. Ellenőrizd a böngésző konzolt - nem kellene localStorage-ba menteni a Graph tokent
4. Ellenőrizd a Firestore-ban, hogy létrejött-e a `graphTokens/{uid}` dokumentum

## 5. Hibaelhárítás

### 5.1. "Secret not found" hiba

Ha a function deploy után "Secret not found" hibát kapsz:

1. Ellenőrizd, hogy a secrets helyesen vannak-e beállítva:
   ```bash
   firebase functions:secrets:access MS_CLIENT_ID
   ```

2. Győződj meg róla, hogy a function-ben helyesen vannak definiálva:
   ```javascript
   const msClientId = defineSecret("MS_CLIENT_ID");
   ```

### 5.2. "Graph API error" hiba

Ha Graph API hívás során hibát kapsz:

1. Ellenőrizd, hogy a Microsoft App Registration-ban helyesen vannak-e beállítva a redirect URI-k
2. Ellenőrizd, hogy a `User.Read` scope engedélyezve van-e
3. Ellenőrizd a Firestore-ban, hogy a token létrejött-e és nem járt-e le

### 5.3. Function nem található

Ha a frontend nem találja a function-t:

1. Ellenőrizd, hogy a function deployolva van-e:
   ```bash
   firebase functions:list
   ```

2. Ellenőrizd, hogy a region helyes-e (`europe-west1`)

## 6. Biztonsági Megjegyzések

✅ **JÓ:**
- Graph token Firestore-ban tárolva (rövid TTL < 1 óra)
- Frontend soha nem kap Graph tokent
- Firebase Function végzi a Graph API hívásokat

❌ **ROSSZ:**
- Graph token localStorage-ban
- Graph token frontend-en tárolva
- Hosszú életű tokenek tárolása

## További információk

- [Firebase Functions Secrets dokumentáció](https://firebase.google.com/docs/functions/config-env)
- [Microsoft Graph API dokumentáció](https://learn.microsoft.com/en-us/graph/overview)
- [OBO Flow dokumentáció](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow)

