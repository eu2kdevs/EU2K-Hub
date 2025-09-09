/**
 * Üdvözlő Képernyő Kezelő
 * Ez a script kezeli az üdvözlő képernyő megjelenítését a beállítások alapján
 */

class WelcomeScreenManager {
    constructor() {
        this.storageKey = 'eu2k-hub-welcome-screen';
        this.settingsKey = 'eu2k-hub-settings';
        this.welcomeScreenUrl = './welcome/onboarding_student.html';

        // Ne futtassuk az init-et automatikusan, hanem várjuk meg a DOM betöltését
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // Ha a DOM már betöltődött, akkor futtatjuk azonnal
            setTimeout(() => this.init(), 100);
        }
    }

    init() {
        // Ne futtassuk a welcome screen-t, ha már az üdvözlő oldalon vagyunk
        if (window.location.pathname.includes('/welcome/onboarding_student.html')) {
            console.log('Already on welcome screen, skipping init');
            return;
        }

        // Debug információk
        console.log('WelcomeScreenManager init - Welcome screen enabled:', this.isWelcomeScreenEnabled());
        console.log('WelcomeScreenManager init - Is first visit:', this.isFirstVisit());
        console.log('WelcomeScreenManager init - Settings:', localStorage.getItem(this.settingsKey));
        console.log('WelcomeScreenManager init - Visit data:', localStorage.getItem(this.storageKey));

        // Ellenőrizzük, hogy be van-e kapcsolva az üdvözlő képernyő
        if (this.isWelcomeScreenEnabled()) {
            // Ellenőrizzük, hogy első látogatás-e
            if (this.isFirstVisit()) {
                this.redirectToWelcomeScreen();
            }
        }
    }

    /**
     * Ellenőrzi, hogy be van-e kapcsolva az üdvözlő képernyő a beállításokban
     */
    isWelcomeScreenEnabled() {
        // Először próbáljuk meg közvetlenül a switch-ből olvasni
        const welcomeSwitch = document.getElementById('welcome-screen-switch');
        if (welcomeSwitch) {
            console.log('Reading welcome screen state from switch:', welcomeSwitch.selected);
            return welcomeSwitch.selected;
        }

        // Ha nincs switch (nem a settings oldalon vagyunk), akkor localStorage-ból
        try {
            const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
            console.log('Reading welcome screen state from localStorage:', settings.welcomeScreen);

            // Ha nincs beállítás, akkor alapértelmezetten be van kapcsolva
            return settings.welcomeScreen !== false;
        } catch (error) {
            console.error('Error reading welcome screen settings:', error);
            return true; // Alapértelmezetten be van kapcsolva
        }
    }

    /**
     * Ellenőrzi, hogy első látogatás-e
     */
    isFirstVisit() {
        try {
            const visitData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            return !visitData.hasVisited;
        } catch (error) {
            console.error('Error reading visit data:', error);
            return true; // Ha hiba van, akkor első látogatásnak tekintjük
        }
    }

    /**
     * Átirányít az üdvözlő képernyőre
     */
    redirectToWelcomeScreen() {
        // Mentjük el az aktuális oldal URL-jét, hogy vissza tudjunk térni
        const currentUrl = window.location.href;
        sessionStorage.setItem('eu2k-hub-return-url', currentUrl);

        console.log('Redirecting to welcome screen...');
        window.location.href = this.welcomeScreenUrl;
    }

    /**
     * Megjelöli, hogy a felhasználó már látogatta az oldalt
     */
    markAsVisited() {
        try {
            const visitData = {
                hasVisited: true,
                firstVisitDate: new Date().toISOString(),
                lastVisitDate: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(visitData));
            console.log('User marked as visited');
        } catch (error) {
            console.error('Error saving visit data:', error);
        }
    }

    /**
     * Frissíti az utolsó látogatás dátumát
     */
    updateLastVisit() {
        try {
            const visitData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            visitData.lastVisitDate = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(visitData));
        } catch (error) {
            console.error('Error updating last visit:', error);
        }
    }

    /**
     * Visszaállítja az első látogatás állapotát (teszteléshez)
     */
    resetFirstVisit() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('First visit status reset');
        } catch (error) {
            console.error('Error resetting first visit:', error);
        }
    }

    /**
     * Beállítja az üdvözlő képernyő engedélyezését/letiltását
     */
    setWelcomeScreenEnabled(enabled) {
        try {
            const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
            settings.welcomeScreen = enabled;
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            console.log('Welcome screen setting updated:', enabled);
        } catch (error) {
            console.error('Error updating welcome screen setting:', error);
        }
    }

    /**
     * Visszatérés az eredeti oldalra az üdvözlő képernyő után
     */
    returnFromWelcomeScreen() {
        const returnUrl = sessionStorage.getItem('eu2k-hub-return-url');
        if (returnUrl) {
            sessionStorage.removeItem('eu2k-hub-return-url');
            window.location.href = returnUrl;
        } else {
            // Ha nincs visszatérési URL, akkor az index oldalra
            window.location.href = './index.html';
        }
    }

    /**
     * Debug információk megjelenítése
     */
    debugInfo() {
        console.log('=== WelcomeScreenManager Debug Info ===');
        console.log('Welcome screen enabled:', this.isWelcomeScreenEnabled());
        console.log('Is first visit:', this.isFirstVisit());
        console.log('Settings storage:', localStorage.getItem(this.settingsKey));
        console.log('Visit data storage:', localStorage.getItem(this.storageKey));
        console.log('Current URL:', window.location.href);
        console.log('=====================================');
    }

    /**
     * Törli az összes kapcsolódó localStorage adatot (teljes reset)
     */
    clearAllData() {
        localStorage.removeItem(this.settingsKey);
        localStorage.removeItem(this.storageKey);
        console.log('All welcome screen data cleared');
    }
}

// Globális példány létrehozása
window.welcomeScreenManager = new WelcomeScreenManager();

// Export a modulok számára
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WelcomeScreenManager;
}