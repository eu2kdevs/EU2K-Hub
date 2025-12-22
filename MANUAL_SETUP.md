# 🔧 Manuális Beállítás - Firebase Secrets (Firebase CLI nélkül)

Ha a Firebase CLI nincs telepítve, vagy a script nem működik, használd ezt a manuális módszert.

## 1. Firebase CLI Telepítése

```powershell
# Node.js és npm szükséges!
npm install -g firebase-tools
```

Telepítés után jelentkezz be:
```powershell
firebase login
```

## 2. Secrets Beállítása Manuálisan

Nyisd meg a terminált a projekt gyökerében és futtasd le egyenként:

### MS_CLIENT_ID
```powershell
firebase functions:secrets:set MS_CLIENT_ID
```
Amikor kéri, add meg: `8e22ad43-3f4d-4192-b368-b3e6a00777c8`

### MS_TENANT_ID
```powershell
firebase functions:secrets:set MS_TENANT_ID
```
Amikor kéri, add meg: `ecc426dd-3c83-44af-aad4-85099364fb9e`

### MS_CLIENT_SECRET
```powershell
firebase functions:secrets:set MS_CLIENT_SECRET
```
Amikor kéri, add meg a **Client Secret** értékét az Azure Portal-ból:
1. Menj az [Azure Portal](https://portal.azure.com)-ra
2. Azure Active Directory > App registrations
3. Válaszd ki az alkalmazást
4. Certificates & secrets
5. Ha nincs secret, hozz létre egy újat
6. Másold ki az értéket (csak egyszer látható!)

## 3. Secrets Ellenőrzése

```powershell
firebase functions:secrets:access MS_CLIENT_ID
firebase functions:secrets:access MS_TENANT_ID
```

## 4. Dependencies Telepítése

```powershell
cd functions/graphapi
npm install
cd ../..
```

## 5. Function Deploy

```powershell
firebase deploy --only functions:callGraphAPI
```

## ✅ Kész!

Teszteld az onboarding folyamatot.

