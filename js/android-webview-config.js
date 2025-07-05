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
        optimizeScrolling: true
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
    
    // Apply CSS optimizations for Android WebView
    if (config.performance.reduceAnimations) {
        const style = document.createElement('style');
        style.textContent = `
            /* Android WebView Performance Optimizations */
            * {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
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
        `;
        document.head.appendChild(style);
    }
    
    return config;
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