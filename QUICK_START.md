# 🚀 Gyors Beállítás - Microsoft Graph API Firebase Function

## 1. Firebase Secrets Beállítása (3 perc)

### Automatikus (ajánlott):
```powershell
# Windows PowerShell
.\setup-graph-api.ps1
```

```bash
# Linux/Mac
chmod +x setup-graph-api.sh
./setup-graph-api.sh
```

### Manuális:
```bash
# 1. MS_CLIENT_ID (az onboarding.html-ből: 8e22ad43-3f4d-4192-b368-b3e6a00777c8)
firebase functions:secrets:set MS_CLIENT_ID
# Add meg: 8e22ad43-3f4d-4192-b368-b3e6a00777c8

# 2. MS_TENANT_ID (az onboarding.html-ből: ecc426dd-3c83-44af-aad4-85099364fb9e)
firebase functions:secrets:set MS_TENANT_ID
# Add meg: ecc426dd-3c83-44af-aad4-85099364fb9e

# 3. MS_CLIENT_SECRET (Azure Portal > App registrations > Certificates & secrets)
firebase functions:secrets:set MS_CLIENT_SECRET
# Add meg a client secret értékét
```

## 2. Dependencies Telepítése (1 perc)

```bash
cd functions/graphapi
npm install
cd ../..
```

## 3. Function Deploy (2 perc)

```bash
firebase deploy --only functions:callGraphAPI
```

## ✅ Kész!

Most már működnie kellene. Teszteld az onboarding folyamatot:

1. Nyisd meg az `onboarding.html` oldalt
2. Jelentkezz be Microsoft fiókkal
3. Ellenőrizd a böngésző konzolt - nem kellene localStorage-ba menteni a Graph tokent
4. Ellenőrizd a Firestore-ban: `graphTokens/{uid}` dokumentum létrejött-e

## 🔍 Ellenőrzés

```bash
# Secrets ellenőrzése
firebase functions:secrets:access MS_CLIENT_ID
firebase functions:secrets:access MS_TENANT_ID

# Function listázása
firebase functions:list
```

## 📚 További információk

Lásd: `SETUP_GRAPH_API.md` részletes dokumentációért

