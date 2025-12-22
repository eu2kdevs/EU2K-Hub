# Microsoft Graph API Firebase Function Setup Script (PowerShell)
# Ez a script segít beállítani a Firebase secrets-eket és deployolni a function-t

Write-Host "🔐 Microsoft Graph API Firebase Function Beállítása" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Firebase CLI ellenőrzése
Write-Host "0️⃣ Firebase CLI ellenőrzése" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "❌ Firebase CLI nem található!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Telepítsd a Firebase CLI-t:" -ForegroundColor Yellow
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Vagy használd a manuális módszert (lásd: QUICK_START.md)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ Firebase CLI telepítve: $($firebaseCmd.Source)" -ForegroundColor Green
    Write-Host ""
}

# 1. Secrets beállítása
Write-Host "1️⃣ Firebase Secrets beállítása" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Write-Host ""
Write-Host "Szükséged lesz a következő értékekre az Azure Portal-ból:" -ForegroundColor White
Write-Host "  - Application (client) ID" -ForegroundColor Gray
Write-Host "  - Directory (tenant) ID" -ForegroundColor Gray
Write-Host "  - Client secret" -ForegroundColor Gray
Write-Host ""

$hasRegistration = Read-Host "Van már Azure App Registration? (y/n)"
if ($hasRegistration -ne "y" -and $hasRegistration -ne "Y") {
    Write-Host "⚠️  Hozz létre egy Azure App Registration-t az Azure Portal-ban:" -ForegroundColor Yellow
    Write-Host "   https://portal.azure.com > Azure Active Directory > App registrations" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Szükséges beállítások:" -ForegroundColor White
    Write-Host "  - Redirect URI: https://eu2k-hub.firebaseapp.com" -ForegroundColor Gray
    Write-Host "  - API permissions: Microsoft Graph > User.Read" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Nyomj Enter-t, amikor kész vagy..."
}

Write-Host ""
Write-Host "Most add meg a secrets értékeit:" -ForegroundColor White
Write-Host ""

# MS_CLIENT_ID
$msClientId = Read-Host "MS_CLIENT_ID (Application Client ID)"
if ($msClientId) {
    try {
        $msClientId | & firebase functions:secrets:set MS_CLIENT_ID
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MS_CLIENT_ID beállítva" -ForegroundColor Green
        } else {
            Write-Host "❌ Hiba történt a MS_CLIENT_ID beállítása során" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Hiba: $_" -ForegroundColor Red
        Write-Host "Próbáld meg manuálisan: firebase functions:secrets:set MS_CLIENT_ID" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  MS_CLIENT_ID üres, kihagyva" -ForegroundColor Yellow
}

# MS_TENANT_ID
$msTenantId = Read-Host "MS_TENANT_ID (Directory Tenant ID)"
if ($msTenantId) {
    try {
        $msTenantId | & firebase functions:secrets:set MS_TENANT_ID
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MS_TENANT_ID beállítva" -ForegroundColor Green
        } else {
            Write-Host "❌ Hiba történt a MS_TENANT_ID beállítása során" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Hiba: $_" -ForegroundColor Red
        Write-Host "Próbáld meg manuálisan: firebase functions:secrets:set MS_TENANT_ID" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  MS_TENANT_ID üres, kihagyva" -ForegroundColor Yellow
}

# MS_CLIENT_SECRET
$secureSecret = Read-Host "MS_CLIENT_SECRET (Client Secret - nem jelenik meg)" -AsSecureString
$msClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret))
if ($msClientSecret) {
    try {
        $msClientSecret | & firebase functions:secrets:set MS_CLIENT_SECRET
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MS_CLIENT_SECRET beállítva" -ForegroundColor Green
        } else {
            Write-Host "❌ Hiba történt a MS_CLIENT_SECRET beállítása során" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Hiba: $_" -ForegroundColor Red
        Write-Host "Próbáld meg manuálisan: firebase functions:secrets:set MS_CLIENT_SECRET" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  MS_CLIENT_SECRET üres, kihagyva" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2️⃣ Dependencies telepítése" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Set-Location functions/graphapi
if (Test-Path "package.json") {
    npm install
    Write-Host "✅ Dependencies telepítve" -ForegroundColor Green
} else {
    Write-Host "⚠️  package.json nem található" -ForegroundColor Yellow
}
Set-Location ../..

Write-Host ""
Write-Host "3️⃣ Function deploy" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
$deploy = Read-Host "Szeretnéd most deployolni a function-t? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    try {
        & firebase deploy --only functions:callGraphAPI
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Function deployolva!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Hiba történt a deploy során" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Hiba: $_" -ForegroundColor Red
        Write-Host "Próbáld meg manuálisan: firebase deploy --only functions:callGraphAPI" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Deploy kihagyva. Később futtasd: firebase deploy --only functions:callGraphAPI" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Beállítás kész!" -ForegroundColor Green
Write-Host ""
Write-Host "Következő lépések:" -ForegroundColor White
Write-Host "  1. Teszteld az onboarding folyamatot" -ForegroundColor Gray
Write-Host "  2. Ellenőrizd a Firestore-ban, hogy létrejött-e a graphTokens collection" -ForegroundColor Gray
Write-Host "  3. Nézd meg a böngésző konzolt a hibák ellenőrzéséhez" -ForegroundColor Gray
Write-Host ""

