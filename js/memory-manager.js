// Memory Manager
// Implements cleanup routines and memory monitoring to optimize RAM usage

import { debugLog, debugError } from './utils.js';
import { getAndroidVersion } from './android-webview-config.js';

class MemoryManager {
    constructor() {
        // Detect Android WebView
        this.isAndroidWebView = this.detectAndroidWebView();
        this.isMobile = this.detectMobile();
        
        // Adjust settings based on platform
        if (this.isAndroidWebView) {
            // Get Android version for specific optimizations
            const androidVersion = getAndroidVersion();
            const isAndroid13Plus = androidVersion >= 13;
            
            if (isAndroid13Plus) {
                // More aggressive settings for Android 13+ to prevent crashes
                this.cleanupInterval = 5 * 60 * 1000; // 5 minutes for Android 13+
                this.memoryThreshold = 80 * 1024 * 1024; // 80MB threshold for Android 13+
                this.memoryCheckInterval = 30000; // 30 seconds for Android 13+
                this.enableForceGarbageCollection = true;
                this.preventMemoryLeaks = true;
                console.log('Android 13+ detected, using aggressive memory management');
            } else {
                this.cleanupInterval = 10 * 60 * 1000; // 10 minutes for older Android
                this.memoryThreshold = 100 * 1024 * 1024; // 100MB threshold for older Android
                this.memoryCheckInterval = 60000; // 1 minute for older Android
            }
        } else if (this.isMobile) {
            this.cleanupInterval = 7 * 60 * 1000; // 7 minutes for mobile
            this.memoryThreshold = 150 * 1024 * 1024; // 150MB threshold for mobile
            this.memoryCheckInterval = 45000; // 45 seconds for mobile
        } else {
            this.cleanupInterval = 5 * 60 * 1000; // 5 minutes for desktop
            this.memoryThreshold = 200 * 1024 * 1024; // 200MB threshold for desktop
            this.memoryCheckInterval = 30000; // 30 seconds for desktop
        }
        
        this.cleanupTimer = null;
        this.memoryObserver = null;
        this.cleanupCallbacks = new Set();
        this.fileReferences = new Map(); // Track file references for cleanup
        this.domObserver = null;
        this.lastMemoryCheck = 0;
        this.enableForceGarbageCollection = false;
        this.preventMemoryLeaks = false;
        
        // Android 13+ specific memory leak prevention
        if (this.isAndroidWebView && getAndroidVersion() >= 13) {
            this.initializeAndroid13MemoryFixes();
        }
        
        this.startMemoryMonitoring();
    }
    
    /**
     * Detect Android WebView
     * @returns {boolean} - True if running in Android WebView
     */
    detectAndroidWebView() {
        const userAgent = navigator.userAgent;
        return /Android.*wv\)|; wv/.test(userAgent) || 
               (userAgent.includes('Android') && userAgent.includes('Version/') && !userAgent.includes('Chrome/'));
    }
    
    /**
     * Detect mobile device
     * @returns {boolean} - True if running on mobile
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Start memory monitoring and cleanup
     */
    startMemoryMonitoring() {
        // Start periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.cleanupInterval);
        
        // Monitor memory usage if available and not on Android WebView
        if ('memory' in performance && !this.isAndroidWebView) {
            this.startPerformanceMonitoring();
        }
        
        // Monitor DOM mutations for cleanup opportunities (lighter on Android)
        if (!this.isAndroidWebView) {
            this.startDOMObserver();
        }
        
        debugLog(`Memory manager started (Platform: ${this.isAndroidWebView ? 'Android WebView' : this.isMobile ? 'Mobile' : 'Desktop'})`);
    }
    
    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        const checkMemory = () => {
            const now = Date.now();
            if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
                return;
            }
            
            this.lastMemoryCheck = now;
            
            try {
                const memInfo = performance.memory;
                const usedMemory = memInfo.usedJSHeapSize;
                const totalMemory = memInfo.totalJSHeapSize;
                const memoryLimit = memInfo.jsHeapSizeLimit;
                
                debugLog(`Memory usage: ${Math.round(usedMemory / 1024 / 1024)}MB / ${Math.round(totalMemory / 1024 / 1024)}MB (limit: ${Math.round(memoryLimit / 1024 / 1024)}MB)`);
                
                // Trigger cleanup if memory usage is high
                if (usedMemory > this.memoryThreshold) {
                    debugLog('High memory usage detected, triggering cleanup');
                    this.performCleanup();
                }
                
                // Force garbage collection if memory is critically high
                if (usedMemory > memoryLimit * 0.8) {
                    this.forceGarbageCollection();
                }
            } catch (error) {
                debugError('Error checking memory:', error);
            }
        };
        
        // Check memory periodically
        setInterval(checkMemory, this.memoryCheckInterval);
        
        // Check memory on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(checkMemory, 1000);
            }
        });
    }
    
    /**
     * Start DOM observer for cleanup opportunities
     */
    startDOMObserver() {
        if (!window.MutationObserver) return;
        
        // Use throttled observer for better performance
        let observerTimeout = null;
        
        this.domObserver = new MutationObserver((mutations) => {
            // Throttle mutations processing
            if (observerTimeout) return;
            
            observerTimeout = setTimeout(() => {
                let shouldCleanup = false;
                
                mutations.forEach((mutation) => {
                    // Check for removed nodes that might need cleanup
                    if (mutation.removedNodes.length > 0) {
                        mutation.removedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                this.cleanupRemovedElement(node);
                                shouldCleanup = true;
                            }
                        });
                    }
                });
                
                if (shouldCleanup) {
                    // Debounce cleanup with longer delay for mobile
                    clearTimeout(this.domCleanupTimeout);
                    const delay = this.isMobile ? 3000 : 1000;
                    this.domCleanupTimeout = setTimeout(() => {
                        this.performCleanup();
                    }, delay);
                }
                
                observerTimeout = null;
            }, this.isMobile ? 500 : 100);
        });
        
        this.domObserver.observe(document.body, {
            childList: true,
            subtree: !this.isMobile // Reduce scope on mobile
        });
    }
    
    /**
     * Initialize Android 13+ specific memory fixes
     */
    initializeAndroid13MemoryFixes() {
        console.log('Initializing Android 13+ memory leak prevention...');
        
        // Prevent common memory leaks in Android 13 WebView
        this.preventEventListenerLeaks();
        this.preventDOMLeaks();
        this.preventTimerLeaks();
        
        // Force garbage collection more frequently
        if (this.enableForceGarbageCollection) {
            setInterval(() => {
                this.forceGC();
            }, 2 * 60 * 1000); // Every 2 minutes
        }
    }
    
    /**
     * Prevent event listener memory leaks
     */
    preventEventListenerLeaks() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        const eventListeners = new WeakMap();
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (!eventListeners.has(this)) {
                eventListeners.set(this, new Map());
            }
            const listeners = eventListeners.get(this);
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(listener);
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            if (eventListeners.has(this)) {
                const listeners = eventListeners.get(this);
                if (listeners.has(type)) {
                    listeners.get(type).delete(listener);
                }
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };
    }
    
    /**
     * Prevent DOM-related memory leaks
     */
    preventDOMLeaks() {
        // Clean up orphaned DOM references
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Clear any data attributes that might hold references
                            if (node.dataset) {
                                Object.keys(node.dataset).forEach(key => {
                                    delete node.dataset[key];
                                });
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Prevent timer-related memory leaks
     */
    preventTimerLeaks() {
        const activeTimers = new Set();
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        const originalClearTimeout = window.clearTimeout;
        const originalClearInterval = window.clearInterval;
        
        window.setTimeout = function(callback, delay, ...args) {
            const id = originalSetTimeout.call(this, (...args) => {
                activeTimers.delete(id);
                return callback(...args);
            }, delay, ...args);
            activeTimers.add(id);
            return id;
        };
        
        window.setInterval = function(callback, delay, ...args) {
            const id = originalSetInterval.call(this, callback, delay, ...args);
            activeTimers.add(id);
            return id;
        };
        
        window.clearTimeout = function(id) {
            activeTimers.delete(id);
            return originalClearTimeout.call(this, id);
        };
        
        window.clearInterval = function(id) {
            activeTimers.delete(id);
            return originalClearInterval.call(this, id);
        };
        
        // Clean up all timers periodically
        setInterval(() => {
            if (activeTimers.size > 50) { // If too many timers
                console.warn(`High number of active timers detected: ${activeTimers.size}`);
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    
    /**
     * Force garbage collection (if available)
     */
    forceGC() {
        try {
            if (window.gc) {
                window.gc();
                debugLog('Forced garbage collection');
            } else if (window.CollectGarbage) {
                window.CollectGarbage();
                debugLog('Forced garbage collection (IE)');
            }
        } catch (error) {
            // Ignore errors - GC might not be available
        }
    }
    
    /**
     * Perform comprehensive memory cleanup
     */
    performCleanup() {
        debugLog('Starting memory cleanup...');
        
        const startTime = Date.now();
        let cleanupCount = 0;
        
        // Run all registered cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
                cleanupCount++;
            } catch (error) {
                debugError('Error in cleanup callback:', error);
            }
        });
        
        // Clean up file references
        this.cleanupFileReferences();
        
        // Clean up DOM event listeners
        this.cleanupEventListeners();
        
        // Clean up unused CSS
        this.cleanupUnusedCSS();
        
        // Clean up local storage if needed
        this.cleanupLocalStorage();
        
        // Force garbage collection if available
        this.forceGarbageCollection();
        
        const endTime = Date.now();
        debugLog(`Memory cleanup completed in ${endTime - startTime}ms, ran ${cleanupCount} cleanup routines`);
    }
    
    /**
     * Clean up file references that are no longer needed
     */
    cleanupFileReferences() {
        const keysToDelete = [];
        
        for (const [key, ref] of this.fileReferences) {
            // Check if reference is still valid
            if (ref.element && !document.contains(ref.element)) {
                keysToDelete.push(key);
                
                // Revoke object URLs if present
                if (ref.objectUrl) {
                    URL.revokeObjectURL(ref.objectUrl);
                }
                
                // Clean up blob references
                if (ref.blob) {
                    ref.blob = null;
                }
            }
        }
        
        keysToDelete.forEach(key => {
            this.fileReferences.delete(key);
        });
        
        if (keysToDelete.length > 0) {
            debugLog(`Cleaned up ${keysToDelete.length} file references`);
        }
    }
    
    /**
     * Clean up event listeners from removed elements
     */
    cleanupEventListeners() {
        // This is handled by the DOM observer and cleanup callbacks
        // Individual components should register cleanup callbacks
    }
    
    /**
     * Clean up unused CSS rules
     */
    cleanupUnusedCSS() {
        try {
            // Remove unused font faces
            if (document.fonts && document.fonts.clear) {
                // Only clear if we have a way to reload fonts
                const unusedFonts = [];
                document.fonts.forEach(font => {
                    if (font.status === 'loaded' && !this.isFontUsed(font)) {
                        unusedFonts.push(font);
                    }
                });
                
                unusedFonts.forEach(font => {
                    document.fonts.delete(font);
                });
                
                if (unusedFonts.length > 0) {
                    debugLog(`Cleaned up ${unusedFonts.length} unused fonts`);
                }
            }
        } catch (error) {
            debugError('Error cleaning up CSS:', error);
        }
    }
    
    /**
     * Check if a font is being used
     * @param {FontFace} font - Font to check
     * @returns {boolean} - True if font is used
     */
    isFontUsed(font) {
        // Simple heuristic - check if font family is used in computed styles
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.fontFamily.includes(font.family)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Clean up local storage if it's getting too large
     */
    cleanupLocalStorage() {
        try {
            let totalSize = 0;
            const items = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = key.length + (value ? value.length : 0);
                totalSize += size;
                items.push({ key, size, value });
            }
            
            // If localStorage is over 5MB, clean up old items
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (totalSize > maxSize) {
                // Sort by size and remove largest non-essential items
                items.sort((a, b) => b.size - a.size);
                
                const nonEssentialKeys = items.filter(item => 
                    !item.key.includes('chatHistory') && 
                    !item.key.includes('settings') &&
                    !item.key.includes('charactersData')
                );
                
                let removedSize = 0;
                for (const item of nonEssentialKeys) {
                    if (totalSize - removedSize < maxSize * 0.8) break;
                    
                    localStorage.removeItem(item.key);
                    removedSize += item.size;
                }
                
                if (removedSize > 0) {
                    debugLog(`Cleaned up ${removedSize} bytes from localStorage`);
                }
            }
        } catch (error) {
            debugError('Error cleaning up localStorage:', error);
        }
    }
    
    /**
     * Force garbage collection if available
     */
    forceGarbageCollection() {
        try {
            // Try different methods to trigger garbage collection
            if (window.gc) {
                window.gc();
                debugLog('Forced garbage collection (window.gc)');
            } else if (window.CollectGarbage) {
                window.CollectGarbage();
                debugLog('Forced garbage collection (CollectGarbage)');
            } else {
                // Fallback: create and release large objects to trigger GC
                const largeArray = new Array(1000000).fill(0);
                largeArray.length = 0;
            }
        } catch (error) {
            debugError('Error forcing garbage collection:', error);
        }
    }
    
    /**
     * Clean up removed DOM element
     * @param {Element} element - Removed element
     */
    cleanupRemovedElement(element) {
        // Clean up any associated data
        if (element.dataset && element.dataset.memoryRef) {
            const ref = element.dataset.memoryRef;
            this.fileReferences.delete(ref);
        }
        
        // Clean up any blob URLs
        const images = element.querySelectorAll('img[src^="blob:"]');
        images.forEach(img => {
            URL.revokeObjectURL(img.src);
        });
        
        // Clean up any object URLs in other elements
        const elements = element.querySelectorAll('[href^="blob:"], [src^="blob:"]');
        elements.forEach(el => {
            const url = el.href || el.src;
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
    
    /**
     * Register a cleanup callback
     * @param {Function} callback - Cleanup function
     */
    registerCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
    }
    
    /**
     * Unregister a cleanup callback
     * @param {Function} callback - Cleanup function
     */
    unregisterCleanupCallback(callback) {
        this.cleanupCallbacks.delete(callback);
    }
    
    /**
     * Track a file reference for cleanup
     * @param {string} key - Reference key
     * @param {Object} reference - Reference object
     */
    trackFileReference(key, reference) {
        this.fileReferences.set(key, reference);
    }
    
    /**
     * Get memory usage statistics
     * @returns {Object} - Memory stats
     */
    getMemoryStats() {
        const stats = {
            cleanupCallbacks: this.cleanupCallbacks.size,
            fileReferences: this.fileReferences.size,
            localStorageSize: 0
        };
        
        // Calculate localStorage size
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                stats.localStorageSize += key.length + (value ? value.length : 0);
            }
        } catch (error) {
            debugError('Error calculating localStorage size:', error);
        }
        
        // Add performance memory if available
        if ('memory' in performance) {
            const memInfo = performance.memory;
            stats.jsHeapSize = memInfo.usedJSHeapSize;
            stats.totalJSHeapSize = memInfo.totalJSHeapSize;
            stats.jsHeapSizeLimit = memInfo.jsHeapSizeLimit;
        }
        
        return stats;
    }
    
    /**
     * Stop memory monitoring
     */
    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        if (this.domObserver) {
            this.domObserver.disconnect();
            this.domObserver = null;
        }
        
        if (this.domCleanupTimeout) {
            clearTimeout(this.domCleanupTimeout);
            this.domCleanupTimeout = null;
        }
        
        debugLog('Memory manager stopped');
    }
}

// Export singleton instance
export const memoryManager = new MemoryManager();

// Export class for testing
export { MemoryManager };