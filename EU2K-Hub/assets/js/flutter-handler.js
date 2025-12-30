/**
 * Flutter Handler - Efficient iframe management for loading indicators
 * Manages preloading and display of Flutter loading indicator iframes
 */

class FlutterHandler {
    constructor() {
        this.iframes = new Map();
        this.loadingStates = new Map();
        this.callbacks = new Map();
        this.init();
    }

    init() {
        console.log('FlutterHandler initialized');
    }

    /**
     * Preload a Flutter iframe for later use
     * @param {string} id - Unique identifier for the iframe
     * @param {string} src - Source URL for the iframe
     * @param {Object} options - Configuration options
     */
    preloadIframe(id, src, options = {}) {
        if (this.iframes.has(id)) {
            console.log(`Iframe ${id} already preloaded`);
            return Promise.resolve(this.iframes.get(id));
        }

        console.log(`Preloading iframe ${id} from ${src}`);

        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.id = `flutter-iframe-${id}`;
            iframe.src = src;
            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                background-color: transparent;
                display: none;
                position: absolute;
                top: 0;
                left: 0;
            `;

            // Add any additional options
            if (options.title) iframe.title = options.title;
            if (options.className) iframe.className = options.className;

            // Store loading state
            this.loadingStates.set(id, 'loading');

            // Handle load event
            iframe.addEventListener('load', () => {
                console.log(`Iframe ${id} loaded successfully`);
                this.loadingStates.set(id, 'loaded');
                this.iframes.set(id, iframe);
                resolve(iframe);
            });

            // Handle error event
            iframe.addEventListener('error', (error) => {
                console.error(`Error loading iframe ${id}:`, error);
                this.loadingStates.set(id, 'error');
                reject(error);
            });

            // Add to DOM but keep hidden
            document.body.appendChild(iframe);
        });
    }

    /**
     * Show a preloaded iframe
     * @param {string} id - Unique identifier for the iframe
     * @param {HTMLElement} container - Container element to show the iframe in
     */
    showIframe(id, container) {
        const iframe = this.iframes.get(id);
        if (!iframe) {
            console.error(`Iframe ${id} not found. Make sure to preload it first.`);
            return false;
        }

        const loadingState = this.loadingStates.get(id);
        if (loadingState !== 'loaded') {
            console.warn(`Iframe ${id} is not ready yet. State: ${loadingState}`);
            return false;
        }

        // Move iframe to container
        container.appendChild(iframe);
        iframe.style.display = 'block';
        iframe.style.position = 'relative';

        console.log(`Showing iframe ${id}`);
        return true;
    }

    /**
     * Hide an iframe
     * @param {string} id - Unique identifier for the iframe
     */
    hideIframe(id) {
        const iframe = this.iframes.get(id);
        if (!iframe) {
            console.warn(`Iframe ${id} not found`);
            return false;
        }

        iframe.style.display = 'none';
        // Move back to body to keep it preloaded
        document.body.appendChild(iframe);
        iframe.style.position = 'absolute';

        console.log(`Hiding iframe ${id}`);
        return true;
    }

    /**
     * Get iframe loading state
     * @param {string} id - Unique identifier for the iframe
     */
    getLoadingState(id) {
        return this.loadingStates.get(id) || 'not_loaded';
    }

    /**
     * Check if iframe is ready to show
     * @param {string} id - Unique identifier for the iframe
     */
    isReady(id) {
        return this.getLoadingState(id) === 'loaded';
    }

    /**
     * Remove an iframe completely
     * @param {string} id - Unique identifier for the iframe
     */
    removeIframe(id) {
        const iframe = this.iframes.get(id);
        if (iframe) {
            iframe.remove();
            this.iframes.delete(id);
            this.loadingStates.delete(id);
            console.log(`Removed iframe ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Preload both contained and uncontained versions
     */
    preloadAll() {
        const baseUrl = '/EU2K-Hub/flutter-project/build/web/';
        
        return Promise.all([
            this.preloadIframe('contained', `${baseUrl}contained.html`, {
                title: 'Flutter Loading Indicator - Contained'
            }),
            this.preloadIframe('uncontained', `${baseUrl}uncontained.html`, {
                title: 'Flutter Loading Indicator - Uncontained'
            })
        ]);
    }

    /**
     * Show loading indicator with smooth transition
     * @param {string} type - 'contained' or 'uncontained'
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Display options
     */
    showLoadingIndicator(type, container, options = {}) {
        const { fadeIn = true, fadeInDuration = 300 } = options;
        
        if (!this.isReady(type)) {
            console.error(`Loading indicator ${type} is not ready yet`);
            return false;
        }

        const iframe = this.iframes.get(type);
        if (!iframe) {
            console.error(`Iframe ${type} not found`);
            return false;
        }

        // Move iframe to container
        container.appendChild(iframe);
        iframe.style.display = 'block';
        iframe.style.position = 'relative';

        if (fadeIn) {
            iframe.style.opacity = '0';
            iframe.style.transition = `opacity ${fadeInDuration}ms ease-in-out`;
            
            // Trigger fade in
            requestAnimationFrame(() => {
                iframe.style.opacity = '1';
            });
        }

        console.log(`Showing ${type} loading indicator`);
        return true;
    }

    /**
     * Hide loading indicator with smooth transition
     * @param {string} type - 'contained' or 'uncontained'
     * @param {Object} options - Hide options
     */
    hideLoadingIndicator(type, options = {}) {
        const { fadeOut = true, fadeOutDuration = 300 } = options;
        
        const iframe = this.iframes.get(type);
        if (!iframe) {
            console.warn(`Iframe ${type} not found`);
            return false;
        }

        if (fadeOut) {
            iframe.style.transition = `opacity ${fadeOutDuration}ms ease-in-out`;
            iframe.style.opacity = '0';
            
            setTimeout(() => {
                iframe.style.display = 'none';
                // Move back to body to keep it preloaded
                document.body.appendChild(iframe);
                iframe.style.position = 'absolute';
                iframe.style.opacity = '1'; // Reset for next time
            }, fadeOutDuration);
        } else {
            iframe.style.display = 'none';
            // Move back to body to keep it preloaded
            document.body.appendChild(iframe);
            iframe.style.position = 'absolute';
        }

        console.log(`Hiding ${type} loading indicator`);
        return true;
    }
}

// Create global instance
window.flutterHandler = new FlutterHandler();

// Auto-preload when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, preloading Flutter iframes...');
    window.flutterHandler.preloadAll().then(() => {
        console.log('All Flutter iframes preloaded successfully');
    }).catch((error) => {
        console.error('Error preloading Flutter iframes:', error);
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlutterHandler;
}
