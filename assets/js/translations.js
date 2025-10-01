// EU2K Hub Translation System
// Lightweight JSON-based translation manager with localStorage persistence

class TranslationManager {
    constructor() {
        this.currentLanguage = 'hu';
        this.translations = {};
        this.brandNames = [
            'EU2K Hub', 'Hub', 'DÖK', 'Devs', 'YouHub', 'Hive', 'EU2K',
            'Európa 2000', 'Európa 2000 Gimnázium', 'Microsoft', 'OkosDoboz'
        ];
        this.storageKey = 'eu2k_language';
        this.isInitialized = false;
    }

    // Initialize translation system
    async init() {
        try {
            // Load saved language preference
            const savedLanguage = localStorage.getItem(this.storageKey);
            if (savedLanguage && (savedLanguage === 'hu' || savedLanguage === 'en')) {
                this.currentLanguage = savedLanguage;
            }

            // Load translations
            await this.loadTranslations(this.currentLanguage);
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.applyTranslations();
                    this.setupLanguageSwitchers();
                });
            } else {
                this.applyTranslations();
                this.setupLanguageSwitchers();
            }

            this.isInitialized = true;
            
            // Wait for Flutter iframes to be ready before logging success
            this.waitForFlutterReady().then(() => {
                console.log('Translation system initialized successfully');
            }).catch(() => {
                // Fallback: log after timeout if Flutter doesn't load
                setTimeout(() => {
                    console.log('Translation system initialized successfully');
                }, 1000);
            });
        } catch (error) {
            console.error('Error initializing translation system:', error);
        }
    }

    // Wait for Flutter iframes to be ready
    async waitForFlutterReady() {
        return new Promise((resolve, reject) => {
            // Check if Flutter handler is available
            const checkFlutterHandler = () => {
                if (window.flutterHandler) {
                    // Check if both contained and uncontained iframes are ready
                    const containedReady = window.flutterHandler.isReady('contained');
                    const uncontainedReady = window.flutterHandler.isReady('uncontained');
                    
                    if (containedReady && uncontainedReady) {
                        console.log('Flutter iframes are ready, translation system can proceed');
                        resolve();
                    } else {
                        // Keep checking every 100ms
                        setTimeout(checkFlutterHandler, 100);
                    }
                } else {
                    // Keep checking for Flutter handler every 100ms
                    setTimeout(checkFlutterHandler, 100);
                }
            };
            
            // Start checking
            checkFlutterHandler();
            
            // Timeout after 5 seconds
            setTimeout(() => {
                reject(new Error('Flutter iframes not ready within timeout'));
            }, 5000);
        });
    }

    // Load translation file
    async loadTranslations(language) {
        try {
            // Simple approach: always try from root
            const response = await fetch(`/EU2K-Hub/assets/translations/${language}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${language}`);
            }
            
            this.translations = await response.json();
            console.log(`Loaded translations for ${language}:`, this.translations);
        } catch (error) {
            console.error(`Error loading translations for ${language}:`, error);
            if (language !== 'hu') {
                // Fallback to Hungarian
                console.warn('Falling back to Hungarian translations');
                await this.loadTranslations('hu');
            } else {
                // If even Hungarian fails, create empty translations
                this.translations = {};
            }
        }
    }

    applyTranslations() {
        // Plain text elemek
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const fallback = element.getAttribute('data-translate-fallback') || element.textContent;
            const translation = this.getTranslation(key);

            if (translation) {
                element.textContent = translation; // ✅ csak sima szöveg
            } else if (fallback) {
                element.textContent = fallback;
            }
        });

        // HTML-t tartalmazó elemek
        document.querySelectorAll('[data-translate-html]').forEach(element => {
            const key = element.getAttribute('data-translate-html');
            const fallback = element.getAttribute('data-translate-fallback') || element.innerHTML;
            const translation = this.getTranslation(key);

            if (translation) {
                element.innerHTML = translation; // ✅ itt a link is kattintható lesz
            } else if (fallback) {
                element.innerHTML = fallback;
            }
        });

        // Placeholder-ek
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const fallback = element.placeholder;
            const translation = this.getTranslation(key);

            if (translation) {
                element.placeholder = translation;
            } else if (fallback) {
                element.placeholder = fallback;
            }
        });
    }


    // Get translation for a specific key
    getTranslation(key) {
        if (!this.translations) return null;
        
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        return typeof value === 'string' ? value : null;
    }

    // Switch language
    async switchLanguage(language) {
        if (language === this.currentLanguage) return;
        
        try {
            this.currentLanguage = language;
            localStorage.setItem(this.storageKey, language);
            
            await this.loadTranslations(language);
            this.applyTranslations();
            
            // If the new things popup is open, update its content
            if (typeof updatePopupContent === 'function' && window.newThingsData) {
                updatePopupContent(window.newThingsData);
            }
            
            console.log(`Language switched to: ${language}`);
        } catch (error) {
            console.error('Error switching language:', error);
        }
    }

    // Setup language switchers
    setupLanguageSwitchers() {
        // Radio buttons for language switching
        const languageRadios = document.querySelectorAll('input[name="language"]');
        languageRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const language = e.target.value;
                    this.switchLanguage(language);
                }
            });
            
            // Set current language
            if (radio.value === this.currentLanguage) {
                radio.checked = true;
            }
        });

        // Material Design radio buttons for language switching
        const mdLanguageRadios = document.querySelectorAll('md-radio[name="language"]');
        mdLanguageRadios.forEach(radio => {
            // Set current language
            if (radio.value === this.currentLanguage) {
                radio.checked = true;
            }
        });

        // Language buttons
        const languageButtons = document.querySelectorAll('[data-language]');
        languageButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const language = e.target.getAttribute('data-language');
                this.switchLanguage(language);
            });
        });
    }

    // Preserve brand names in translations
    preserveBrandNames(text) {
        if (!text) return text;
        
        let result = text;
        this.brandNames.forEach(brand => {
            const regex = new RegExp(brand, 'gi');
            result = result.replace(regex, brand);
        });
        
        return result;
    }
}

// Initialize translation system when script loads
const translationManager = new TranslationManager();

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        translationManager.init();
    });
} else {
    translationManager.init();
}

// Export for global access
window.translationManager = translationManager;

function setLanguage(lang) {
  if (window.translationManager) {
    window.translationManager.switchLanguage(lang);
  }
}

// Gemini AI API configuration
const GEMINI_API_KEY = 'no peeking bruh';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// AI Translation function
async function translateWithAI(text, targetLanguage) {
    if (!text) return '';
    
    try {
        const prompt = `Translate the following text to ${targetLanguage}: "${text}", only answer with the translated text, no other text or explanation.`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.candidates[0].content.parts[0].text.trim();

        console.log(`AI Translation: "${text}" → "${translatedText}"`);

        return translatedText;
    } catch (error) {
        console.error('Xelp API error:', error);
        return text; // Return original text on error
    }
}
