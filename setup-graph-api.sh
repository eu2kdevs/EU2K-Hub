#!/bin/bash

# Microsoft Graph API Firebase Function Setup Script
# Ez a script segít beállítani a Firebase secrets-eket és deployolni a function-t

echo "🔐 Microsoft Graph API Firebase Function Beállítása"
echo "=================================================="
echo ""

# 1. Secrets beállítása
echo "1️⃣ Firebase Secrets beállítása"
echo "--------------------------------"
echo ""
echo "Szükséged lesz a következő értékekre az Azure Portal-ból:"
echo "  - Application (client) ID"
echo "  - Directory (tenant) ID"
echo "  - Client secret"
echo ""

read -p "Van már Azure App Registration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Hozz létre egy Azure App Registration-t az Azure Portal-ban:"
    echo "   https://portal.azure.com > Azure Active Directory > App registrations"
    echo ""
    echo "Szükséges beállítások:"
    echo "  - Redirect URI: https://eu2k-hub.firebaseapp.com"
    echo "  - API permissions: Microsoft Graph > User.Read"
    echo ""
    read -p "Nyomj Enter-t, amikor kész vagy..."
fi

echo ""
echo "Most add meg a secrets értékeit:"
echo ""

# MS_CLIENT_ID
read -p "MS_CLIENT_ID (Application Client ID): " MS_CLIENT_ID
if [ ! -z "$MS_CLIENT_ID" ]; then
    echo "$MS_CLIENT_ID" | firebase functions:secrets:set MS_CLIENT_ID
    echo "✅ MS_CLIENT_ID beállítva"
else
    echo "⚠️  MS_CLIENT_ID üres, kihagyva"
fi

# MS_TENANT_ID
read -p "MS_TENANT_ID (Directory Tenant ID): " MS_TENANT_ID
if [ ! -z "$MS_TENANT_ID" ]; then
    echo "$MS_TENANT_ID" | firebase functions:secrets:set MS_TENANT_ID
    echo "✅ MS_TENANT_ID beállítva"
else
    echo "⚠️  MS_TENANT_ID üres, kihagyva"
fi

# MS_CLIENT_SECRET
read -sp "MS_CLIENT_SECRET (Client Secret - nem jelenik meg): " MS_CLIENT_SECRET
echo ""
if [ ! -z "$MS_CLIENT_SECRET" ]; then
    echo "$MS_CLIENT_SECRET" | firebase functions:secrets:set MS_CLIENT_SECRET
    echo "✅ MS_CLIENT_SECRET beállítva"
else
    echo "⚠️  MS_CLIENT_SECRET üres, kihagyva"
fi

echo ""
echo "2️⃣ Dependencies telepítése"
echo "--------------------------------"
cd functions/graphapi
if [ -f "package.json" ]; then
    npm install
    echo "✅ Dependencies telepítve"
else
    echo "⚠️  package.json nem található"
fi
cd ../..

echo ""
echo "3️⃣ Function deploy"
echo "--------------------------------"
read -p "Szeretnéd most deployolni a function-t? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase deploy --only functions:callGraphAPI
    echo ""
    echo "✅ Function deployolva!"
else
    echo "⚠️  Deploy kihagyva. Később futtasd: firebase deploy --only functions:callGraphAPI"
fi

echo ""
echo "✅ Beállítás kész!"
echo ""
echo "Következő lépések:"
echo "  1. Teszteld az onboarding folyamatot"
echo "  2. Ellenőrizd a Firestore-ban, hogy létrejött-e a graphTokens collection"
echo "  3. Nézd meg a böngésző konzolt a hibák ellenőrzéséhez"
echo ""

