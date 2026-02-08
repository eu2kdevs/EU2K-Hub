Frissítési popup megjelenítéséhez:
    resetNewThingsPopup()

Értesítések tesztelése (konzol parancsok):
    testNotification(priority, buttonLabel) - Teszt értesítés megjelenítése
        priority: "green", "blue", "positive", "warning", "danger" (IDÉZŐJELEK KÖZÉ!)
        buttonLabel: A gomb szövege (pl. "Megnyitás", "Bezárás") (IDÉZŐJELEK KÖZÉ!)
        Példa: testNotification("warning", "Rendben")
        Példa: testNotification("blue", "Teszteld")
        Példa: testNotification("positive", "Oké")
    
    testAllNotifications() - Összes értesítés típus tesztelése (2 másodperces késleltetéssel)

Scan QR popup:
    setScanAuthSuccess() - Sikeres igazolás állapot
    setScanAuthFailed() - Sikertelen igazolás állapot
Show QR popup:
    setShowQrAuthSuccess() - Sikeres igazolás állapot
    setShowQrAuthFailed() - Sikertelen igazolás állapot
Code Entry popup:
    setCodeEntryAuthSuccess() - Sikeres igazolás állapot
 setCodeEntryAuthFailed() - Sikertelen igazolás állapot
Reset:
 resetAuthStates() - Visszaállítja az alapértelmezett állapotokat (scanner/QR kód/kód megjelenítése)