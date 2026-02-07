/**
 * Flutter Widget Manager
 * Handles Flutter widget loading, hiding, and display management
 * with Material Design 3 color integration
 */

class FlutterWidgetManager {
    constructor() {
        this.isFlutterLoaded = false;
        this.loadingIndicators = new Set();
        this.flutterApp = null;
        this.initializeColorSystem();
    }

    /**
     * Initialize Material Design 3 color system from CSS variables
     */
    initializeColorSystem() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        this.colors = {
            primary: computedStyle.getPropertyValue('--md-sys-color-primary').trim(),
            primaryContainer: computedStyle.getPropertyValue('--md-sys-color-primary-container').trim(),
            onPrimary: computedStyle.getPropertyValue('--md-sys-color-on-primary').trim(),
            onPrimaryContainer: computedStyle.getPropertyValue('--md-sys-color-on-primary-container').trim(),
            secondary: computedStyle.getPropertyValue('--md-sys-color-secondary').trim(),
            secondaryContainer: computedStyle.getPropertyValue('--md-sys-color-secondary-container').trim(),
            onSecondary: computedStyle.getPropertyValue('--md-sys-color-on-secondary').trim(),
            onSecondaryContainer: computedStyle.getPropertyValue('--md-sys-color-on-secondary-container').trim(),
            tertiary: computedStyle.getPropertyValue('--md-sys-color-tertiary').trim(),
            tertiaryContainer: computedStyle.getPropertyValue('--md-sys-color-tertiary-container').trim(),
            onTertiary: computedStyle.getPropertyValue('--md-sys-color-on-tertiary').trim(),
            onTertiaryContainer: computedStyle.getPropertyValue('--md-sys-color-on-tertiary-container').trim(),
            error: computedStyle.getPropertyValue('--md-sys-color-error').trim(),
            errorContainer: computedStyle.getPropertyValue('--md-sys-color-error-container').trim(),
            onError: computedStyle.getPropertyValue('--md-sys-color-on-error').trim(),
            onErrorContainer: computedStyle.getPropertyValue('--md-sys-color-on-error-container').trim(),
            background: computedStyle.getPropertyValue('--md-sys-color-background').trim(),
            onBackground: computedStyle.getPropertyValue('--md-sys-color-on-background').trim(),
            surface: computedStyle.getPropertyValue('--md-sys-color-surface').trim(),
            onSurface: computedStyle.getPropertyValue('--md-sys-color-on-surface').trim(),
            surfaceVariant: computedStyle.getPropertyValue('--md-sys-color-surface-variant').trim(),
            onSurfaceVariant: computedStyle.getPropertyValue('--md-sys-color-on-surface-variant').trim(),
            outline: computedStyle.getPropertyValue('--md-sys-color-outline').trim(),
            outlineVariant: computedStyle.getPropertyValue('--md-sys-color-outline-variant').trim(),
            shadow: computedStyle.getPropertyValue('--md-sys-color-shadow').trim(),
            scrim: computedStyle.getPropertyValue('--md-sys-color-scrim').trim(),
            inverseSurface: computedStyle.getPropertyValue('--md-sys-color-inverse-surface').trim(),
            inverseOnSurface: computedStyle.getPropertyValue('--md-sys-color-inverse-on-surface').trim(),
            inversePrimary: computedStyle.getPropertyValue('--md-sys-color-inverse-primary').trim(),
            surfaceDim: computedStyle.getPropertyValue('--md-sys-color-surface-dim').trim(),
            surfaceBright: computedStyle.getPropertyValue('--md-sys-color-surface-bright').trim(),
            surfaceContainerLowest: computedStyle.getPropertyValue('--md-sys-color-surface-container-lowest').trim(),
            surfaceContainerLow: computedStyle.getPropertyValue('--md-sys-color-surface-container-low').trim(),
            surfaceContainer: computedStyle.getPropertyValue('--md-sys-color-surface-container').trim(),
            surfaceContainerHigh: computedStyle.getPropertyValue('--md-sys-color-surface-container-high').trim()
        };

        console.log('🎨 Material Design 3 colors initialized:', this.colors);
    }

    /**
     * Show loading indicator with background
     * @param {string} containerId - ID of the container element
     * @param {string} message - Loading message to display
     */
    showLoadingWithBackground(containerId = 'flutter-loading-container', message = 'Betöltés...') {
        this.hideAllLoadingIndicators();
        
        const container = document.getElementById(containerId) || document.body;
        const loadingId = `loading-${Date.now()}`;
        
        const loadingElement = document.createElement('div');
        loadingElement.id = loadingId;
        loadingElement.className = 'flutter-loading-overlay with-background';
        loadingElement.innerHTML = `
            <div class="loading-backdrop"></div>
            <div class="loading-content">
                <expressive-loader></expressive-loader>
                <div class="loading-message">${message}</div>
            </div>
        `;

        // Apply Material Design 3 styles
        this.applyLoadingStyles(loadingElement, true);
        
        container.appendChild(loadingElement);
        this.loadingIndicators.add(loadingId);
        
        console.log(`🔄 Loading indicator with background shown: ${loadingId}`);
        return loadingId;
    }

    /**
     * Show loading indicator without background
     * @param {string} containerId - ID of the container element
     * @param {string} message - Loading message to display
     */
    showLoadingWithoutBackground(containerId = 'flutter-loading-container', message = 'Betöltés...') {
        this.hideAllLoadingIndicators();
        
        const container = document.getElementById(containerId) || document.body;
        const loadingId = `loading-${Date.now()}`;
        
        const loadingElement = document.createElement('div');
        loadingElement.id = loadingId;
        loadingElement.className = 'flutter-loading-overlay without-background';
        loadingElement.innerHTML = `
            <div class="loading-content">
                <expressive-loader></expressive-loader>
                <div class="loading-message">${message}</div>
            </div>
        `;

        // Apply Material Design 3 styles
        this.applyLoadingStyles(loadingElement, false);
        
        container.appendChild(loadingElement);
        this.loadingIndicators.add(loadingId);
        
        console.log(`🔄 Loading indicator without background shown: ${loadingId}`);
        return loadingId;
    }

    /**
     * Apply Material Design 3 styles to loading element
     * @param {HTMLElement} element - Loading element
     * @param {boolean} withBackground - Whether to include background
     */
    applyLoadingStyles(element, withBackground) {
        const baseStyles = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.3s ease;
        `;

        const backgroundStyles = withBackground ? `
            .loading-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: ${this.colors.scrim};
                opacity: 0.6;
            }
        ` : '';

        const contentStyles = `
            .loading-content {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                padding: 24px;
                ${withBackground ? `
                    background-color: ${this.colors.surfaceContainer};
                    border-radius: 16px;
                    box-shadow: 0 4px 12px ${this.colors.shadow};
                ` : ''}
            }
            
            .loading-message {
                color: ${this.colors.onSurface};
                font-family: 'Roboto', sans-serif;
                font-size: 16px;
                font-weight: 400;
                text-align: center;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = `
            #${element.id} {
                ${baseStyles}
            }
            #${element.id} ${backgroundStyles}
            #${element.id} ${contentStyles}
        `;
        
        document.head.appendChild(styleElement);
        element.style.cssText = baseStyles;
    }

    /**
     * Hide specific loading indicator
     * @param {string} loadingId - ID of the loading indicator to hide
     */
    hideLoadingIndicator(loadingId) {
        const element = document.getElementById(loadingId);
        if (element) {
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
                this.loadingIndicators.delete(loadingId);
                console.log(`✅ Loading indicator hidden: ${loadingId}`);
            }, 300);
        }
    }

    /**
     * Hide all loading indicators
     */
    hideAllLoadingIndicators() {
        this.loadingIndicators.forEach(loadingId => {
            this.hideLoadingIndicator(loadingId);
        });
    }

    /**
     * Load Flutter widget
     * @param {Object} options - Loading options
     */
    async loadFlutterWidget(options = {}) {
        const {
            containerId = 'flutter-container',
            loadingMessage = 'Flutter alkalmazás betöltése...',
            withBackground = true,
            onProgress = null,
            onComplete = null,
            onError = null
        } = options;

        try {
            // Show loading indicator
            const loadingId = withBackground 
                ? this.showLoadingWithBackground(containerId, loadingMessage)
                : this.showLoadingWithoutBackground(containerId, loadingMessage);

            console.log('🚀 Starting Flutter widget loading...');

            // Simulate Flutter loading process
            if (onProgress) {
                onProgress(0, 'Inicializálás...');
            }

            // Wait for Flutter to be available
            await this.waitForFlutter();
            
            if (onProgress) {
                onProgress(50, 'Flutter engine betöltése...');
            }

            // Initialize Flutter app
            await this.initializeFlutterApp();
            
            if (onProgress) {
                onProgress(100, 'Befejezés...');
            }

            // Hide loading indicator
            setTimeout(() => {
                this.hideLoadingIndicator(loadingId);
                this.isFlutterLoaded = true;
                
                if (onComplete) {
                    onComplete(this.flutterApp);
                }
                
                console.log('✅ Flutter widget loaded successfully');
            }, 500);

        } catch (error) {
            console.error('❌ Error loading Flutter widget:', error);
            this.hideAllLoadingIndicators();
            
            if (onError) {
                onError(error);
            }
        }
    }

    /**
     * Wait for Flutter to be available
     */
    async waitForFlutter() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkFlutter = () => {
                attempts++;
                
                if (window._flutter) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Flutter not available after maximum attempts'));
                } else {
                    setTimeout(checkFlutter, 100);
                }
            };
            
            checkFlutter();
        });
    }

    /**
     * Initialize Flutter app
     */
    async initializeFlutterApp() {
        if (window._flutter && window._flutter.loader) {
            this.flutterApp = await window._flutter.loader.loadEntrypoint({
                serviceWorker: {
                    serviceWorkerVersion: null,
                },
            });
            
            return this.flutterApp;
        }
        
        throw new Error('Flutter loader not available');
    }

    /**
     * Get current color scheme
     */
    getColorScheme() {
        return this.colors;
    }

    /**
     * Update color scheme (useful for theme switching)
     */
    updateColorScheme() {
        this.initializeColorSystem();
        console.log('🎨 Color scheme updated');
    }

    /**
     * Check if Flutter is loaded
     */
    isLoaded() {
        return this.isFlutterLoaded;
    }

    /**
     * Get Flutter app instance
     */
    getFlutterApp() {
        return this.flutterApp;
    }
}

// Create global instance
window.flutterWidgetManager = new FlutterWidgetManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlutterWidgetManager;
}

console.log('🔧 Flutter Widget Manager initialized');