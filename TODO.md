# TODO Feladatok

## Onboarding és Profil Törlés

- [x] Javítani a firebase hibát a checkLoginStatus függvényben
- [x] Létrehozni az "Újrakezdés" oldalt az onboarding_student.html-ben
- [x] Létrehozni a "Profil törlés" oldalt az onboarding_student.html-ben
- [ ] Hozzáadni a fordításokat a translations.js fájlhoz az új szövegekhez
- [x] Microsoft Graph API integráció: displayName, photoURL, email, jobTitle lekérése
- [x] Google API integráció: profilkép, email, teljes név lekérése
- [x] Felhasználó típus felismerés: JobTitle alapú eldöntés (szám=diák, nincs szám=tanár), Google=szülő
- [x] Átirányítási logika: meglévő user → bejelentkezés, új user → onboarding profilválasztó
- [x] Adatok törlése gomb hozzáadása account.html-hez
- [x] Onboarding.html frissítés: user típus felismerés, custom claims, Firestore dokumentum létrehozás
- [x] Firestore dokumentum létrehozás: general_data/general kollekció megfelelő mezőkkel
- [ ] Settings kollekció létrehozása a userid dokumentumokban (TODO komment hozzáadva az onboardinghoz)
  - "Biztos újra szeretnéd kezdeni?"
  - "Ezzel el fogja a Hub felejteni a mostani fiókod ezen a gépen, elvesznek a preferenciáid, és az üzeneteid, ha mást állítasz be újra, mint amit alapból beállítottál. Biztos folytatod?"
  - "Biztos ki szeretnéd törölni a profilod?"
  - "Ezt nem vonhatod vissza, minden adatod amit a Hubban tartottál elveszik örökre. Biztos vagy ebben?"
  - "Biztos"
  - "Bejelentkeztetés folyamatban"
  - "Kérlek várj..."
- [ ] Létrehozni a "Profil törlése" gombot az account.html oldalon
- [ ] Összekapcsolni a "Profil törlése" gombot az onboarding_student.html delete-profile-page oldalával

## Fordítások

A következő fordítási kulcsokat kell hozzáadni:

```javascript
// Magyar
"pages.onboarding_student.auth_in_progress_title": "Bejelentkeztetés folyamatban",
"pages.onboarding_student.auth_in_progress_description": "Kérlek várj...",
"pages.onboarding_student.restart_title": "Biztos újra szeretnéd kezdeni?",
"pages.onboarding_student.restart_description": "Ezzel el fogja a Hub felejteni a mostani fiókod ezen a gépen, elvesznek a preferenciáid, és az üzeneteid, ha mást állítasz be újra, mint amit alapból beállítottál. Biztos folytatod?",
"pages.onboarding_student.delete_profile_title": "Biztos ki szeretnéd törölni a profilod?",
"pages.onboarding_student.delete_profile_description": "Ezt nem vonhatod vissza, minden adatod amit a Hubban tartottál elveszik örökre. Biztos vagy ebben?",
"onboarding.confirm": "Biztos",

// Angol
"pages.onboarding_student.auth_in_progress_title": "Authentication in progress",
"pages.onboarding_student.auth_in_progress_description": "Please wait...",
"pages.onboarding_student.restart_title": "Are you sure you want to restart?",
"pages.onboarding_student.restart_description": "This will make the Hub forget your current account on this device, you will lose your preferences and messages if you set up something different than what you originally set up. Are you sure you want to continue?",
"pages.onboarding_student.delete_profile_title": "Are you sure you want to delete your profile?",
"pages.onboarding_student.delete_profile_description": "This cannot be undone, all your data stored in the Hub will be lost forever. Are you sure about this?",
"onboarding.confirm": "Confirm",
```