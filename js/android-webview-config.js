// Android WebView Configuration
// Centralized configuration for Android WebView optimizations

export const AndroidWebViewConfig = {
    // Memory Management Settings
    memory: {
        // Memory thresholds (in MB)
        cleanupThreshold: 100,
        warningThreshold: 150,
        criticalThreshold: 200,
        
        // Monitoring intervals (in milliseconds)
        monitoringInterval: 60000, // 1 minute
        cleanupInterval: 120000,   // 2 minutes
        
        // Disable heavy features
        disablePerformanceMonitoring: true,
        disableDOMObserver: true,
        reducedCleanupFrequency: true
    },
    
    // Message Cache Settings
    messageCache: {
        maxCacheSize: 25,                    // Reduced cache size
        maxMemoryUsage: 10 * 1024 * 1024,   // 10MB limit
        compressionEnabled: false,           // Disable compression
        cleanupInterval: 2 * 60 * 1000       // 2 minutes
    },
    
    // Chat History Optimizer Settings
    chatOptimizer: {
        compressionThreshold: 25,            // Lower threshold
        maxMessagesInMemory: 20,             // Fewer messages
        maxActiveChatCount: 3,               // Fewer active chats
        compressionEnabled: false            // Disable compression
    },
    
    // Message Virtualization Settings
    virtualization: {
        overscan: 1,                         // Minimal overscan
        scrollDebounceTime: 100,             // Longer debounce
        enableResizeObserver: false          // Disable for performance
    },
    
    // Feature Toggles
    features: {
        enableMemoryMonitoring: true,
        enableMessageCache: true,
        enableChatOptimization: true,
        enableMessageVirtualization: true,
        enableCompressionFeatures: false,
        enableAdvancedCleanup: false
    },
    
    // Performance Settings
    performance: {
        reduceAnimations: true,
        simplifyUI: true,
        disableHeavyEffects: true,
        optimizeScrolling: true,
        disableTransforms: false,
        disableContextMenu: false
    },
    
    // Android 13+ Specific Settings
    android13: {
        disableActionMode: true,
        preventResourceNotFound: true,
        disableFloatingActionMode: true,
        forceCompatibilityMode: true
    }
};

/**
 * Apply Android WebView optimizations
 * @param {Object} customConfig - Custom configuration overrides
 */
export function applyAndroidWebViewOptimizations(customConfig = {}) {
    // Merge custom config with defaults
    const config = {
        ...AndroidWebViewConfig,
        ...customConfig
    };
    
    // Detect Android version for specific fixes
    const androidVersion = getAndroidVersion();
    const isAndroid13Plus = androidVersion >= 13;
    
    console.log(`Android version detected: ${androidVersion}, Android 13+: ${isAndroid13Plus}`);
    
    // Apply Android 13+ specific error prevention
    if (isAndroid13Plus) {
        try {
            // Prevent androidx.appcompat resource resolution errors
            preventAppCompatResourceErrors();
            
            // Disable problematic WebView features for Android 13
            disableProblematicFeatures();
            
        } catch (error) {
            console.error('Error applying Android 13+ specific fixes:', error);
        }
    }
    
    // Apply CSS optimizations for Android WebView
    if (config.performance.reduceAnimations) {
        const style = document.createElement('style');
        style.textContent = `
            /* Android WebView Performance Optimizations */
            * {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
            }
            
            /* Flexbox compatibility fixes */
            .flex, [class*="flex"], #chat-container, #messages, #active-character-display {
                display: -webkit-box !important;
                display: -webkit-flex !important;
                display: flex !important;
            }
            
            .flex-col, [class*="flex-col"] {
                -webkit-box-orient: vertical !important;
                -webkit-box-direction: normal !important;
                -webkit-flex-direction: column !important;
                flex-direction: column !important;
            }
            
            .items-center, [class*="items-center"] {
                -webkit-box-align: center !important;
                -webkit-align-items: center !important;
                align-items: center !important;
            }
            
            .justify-center, [class*="justify-center"] {
                -webkit-box-pack: center !important;
                -webkit-justify-content: center !important;
                justify-content: center !important;
            }
            
            .justify-between, [class*="justify-between"] {
                -webkit-box-pack: justify !important;
                -webkit-justify-content: space-between !important;
                justify-content: space-between !important;
            }
            
            .flex-1, [class*="flex-1"] {
                -webkit-box-flex: 1 !important;
                -webkit-flex: 1 !important;
                flex: 1 !important;
            }
            
            .message {
                will-change: auto !important;
                transform: none !important;
            }
            
            /* Reduce animations */
            * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
            
            /* Optimize scrolling */
            .messages-container {
                -webkit-overflow-scrolling: touch;
                overflow-scrolling: touch;
            }
            
            /* Android 13+ specific fixes */
            ${isAndroid13Plus ? `
                /* Prevent context menu crashes */
                * {
                    -webkit-user-select: none !important;
                    -webkit-touch-callout: none !important;
                }
                
                input, textarea, [contenteditable] {
                    -webkit-user-select: text !important;
                }
                
                /* Disable transforms that cause crashes */
                ${config.performance.disableTransforms ? `
                    .message, .chat-item, .settings-item {
                        transform: none !important;
                        will-change: auto !important;
                    }
                ` : ''}
            ` : ''}
        `;
        document.head.appendChild(style);
    }
    
    return config;
}

/**
 * Get Android version from user agent
 * @returns {number} Android version number
 */
export function getAndroidVersion() {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/Android\s([0-9\.]+)/);
    if (match && match[1]) {
        return parseFloat(match[1]);
    }
    return 0;
}

/**
 * Prevent androidx.appcompat resource resolution errors
 */
function preventAppCompatResourceErrors() {
    // Override problematic resource access methods
    if (window.WebView && window.WebView.prototype) {
        const originalAddJavascriptInterface = window.WebView.prototype.addJavascriptInterface;
        if (originalAddJavascriptInterface) {
            window.WebView.prototype.addJavascriptInterface = function(obj, name) {
                try {
                    return originalAddJavascriptInterface.call(this, obj, name);
                } catch (error) {
                    console.warn('Prevented WebView interface error:', error);
                    return null;
                }
            };
        }
    }
    
    // Add error event listeners to catch and handle crashes
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message && 
            (event.error.message.includes('androidx.appcompat') || 
             event.error.message.includes('Resource ID') ||
             event.error.message.includes('NotFoundException'))) {
            console.warn('Prevented androidx.appcompat related error:', event.error);
            event.preventDefault();
            return false;
        }
    }, true);
}

/**
 * Disable problematic WebView features for Android 13+
 */
function disableProblematicFeatures() {
    // Disable context menu to prevent action mode crashes
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, true);
    
    // Disable text selection that triggers action mode
    document.addEventListener('selectstart', function(e) {
        if (!e.target.matches('input, textarea, [contenteditable]')) {
            e.preventDefault();
            return false;
        }
    }, true);
    
    // Override problematic selection methods
    if (window.getSelection) {
        const originalGetSelection = window.getSelection;
        window.getSelection = function() {
            try {
                return originalGetSelection();
            } catch (error) {
                console.warn('Prevented selection error:', error);
                return {
                    removeAllRanges: function() {},
                    addRange: function() {},
                    toString: function() { return ''; }
                };
            }
        };
    }
}

/**
 * Check if current environment is Android WebView
 * @returns {boolean}
 */
export function isAndroidWebView() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('android') && 
           (userAgent.includes('wv') || userAgent.includes('webview'));
}

/**
 * Get recommended settings for current platform
 * @returns {Object}
 */
export function getRecommendedSettings() {
    if (isAndroidWebView()) {
        return AndroidWebViewConfig;
    }
    
    // Return default settings for other platforms
    return {
        memory: {
            cleanupThreshold: 250,
            warningThreshold: 400,
            criticalThreshold: 500,
            monitoringInterval: 30000,
            cleanupInterval: 300000,
            disablePerformanceMonitoring: false,
            disableDOMObserver: false,
            reducedCleanupFrequency: false
        },
        messageCache: {
            maxCacheSize: 100,
            maxMemoryUsage: 50 * 1024 * 1024,
            compressionEnabled: true,
            cleanupInterval: 5 * 60 * 1000
        },
        chatOptimizer: {
            compressionThreshold: 100,
            maxMessagesInMemory: 50,
            maxActiveChatCount: 10,
            compressionEnabled: true
        },
        virtualization: {
            overscan: 3,
            scrollDebounceTime: 16,
            enableResizeObserver: true
        },
        features: {
            enableMemoryMonitoring: true,
            enableMessageCache: true,
            enableChatOptimization: true,
            enableMessageVirtualization: true,
            enableCompressionFeatures: true,
            enableAdvancedCleanup: true
        },
        performance: {
            reduceAnimations: false,
            simplifyUI: false,
            disableHeavyEffects: false,
            optimizeScrolling: false
        }
    };
}