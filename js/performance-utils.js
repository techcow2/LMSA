// Performance utilities for optimizing app performance
// This file contains utilities for batching DOM operations, debouncing, throttling, etc.

// Device performance detection
let devicePerformanceLevel = null;
let memoryInfo = null;
let isAdMobEnvironment = null;

// Use WeakMap/WeakSet for better memory management
const elementObservers = new WeakMap(); // Map DOM elements to their observers
const cachedElements = new WeakSet(); // Track cached elements for cleanup
const processedElements = new WeakSet(); // Track processed elements

/**
 * Detects if the app is running in an AdMob WebView environment
 * @returns {boolean} - True if running in AdMob WebView
 */
export function detectAdMobEnvironment() {
    if (isAdMobEnvironment !== null) {
        return isAdMobEnvironment;
    }
    
    const userAgent = navigator.userAgent;
    
    // Check for AdMob WebView indicators
    const isAndroidWebView = /Android.*wv/i.test(userAgent);
    const hasWebViewIndicators = /Version\/[\d.]+.*Chrome\/[\d.]+.*Mobile.*Safari/i.test(userAgent);
    
    // Additional checks for AdMob environment
    const hasAdMobIndicators = (
        // Check for common AdMob app packages or identifiers
        window.location.href.includes('webview') ||
        window.location.href.includes('app://') ||
        // Check for Android WebView with specific Chrome versions that AdMob uses
        (isAndroidWebView && /Chrome\/([0-9]+)/.test(userAgent)) ||
        // Check for missing features that are typically disabled in AdMob WebViews
        (!window.openDatabase && !window.indexedDB) ||
        // Check for reduced navigator features
        navigator.plugins.length === 0
    );
    
    isAdMobEnvironment = isAndroidWebView && (hasWebViewIndicators || hasAdMobIndicators);
    
    if (isAdMobEnvironment) {
        console.log('AdMob WebView environment detected, applying aggressive optimizations');
    }
    
    return isAdMobEnvironment;
}

/**
 * Detects device performance level for adaptive optimizations
 * @returns {string} - 'high', 'medium', or 'low'
 */
export function getDevicePerformanceLevel() {
    if (devicePerformanceLevel !== null) {
        return devicePerformanceLevel;
    }

    // Get device memory info if available
    if ('deviceMemory' in navigator) {
        memoryInfo = navigator.deviceMemory;
    }

    // Get hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 2;

    // Check if running in Android WebView
    const isAndroidWebView = /Android.*wv/i.test(navigator.userAgent);
    const isLowEndAndroid = /Android [4-6]\./i.test(navigator.userAgent);
    const isAdMobEnv = detectAdMobEnvironment();

    // Performance scoring based on available metrics
    let score = 0;

    // Memory scoring (if available)
    if (memoryInfo) {
        if (memoryInfo >= 8) score += 3;
        else if (memoryInfo >= 4) score += 2;
        else if (memoryInfo >= 2) score += 1;
    } else {
        // Fallback: assume medium memory for unknown devices
        score += 1;
    }

    // CPU cores scoring
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else if (cores >= 2) score += 1;

    // Android WebView penalty (typically slower)
    if (isAndroidWebView) score -= 1;
    if (isLowEndAndroid) score -= 2;
    
    // AdMob environment penalty (additional performance constraints)
    if (isAdMobEnv) {
        score -= 2; // More aggressive penalty for AdMob
        console.log('AdMob environment detected - applying additional performance penalties');
    }

    // Screen size consideration (smaller screens often indicate lower-end devices)
    const screenArea = window.screen.width * window.screen.height;
    if (screenArea < 800 * 600) score -= 1;

    // Determine performance level
    if (score >= 4) {
        devicePerformanceLevel = 'high';
    } else if (score >= 2) {
        devicePerformanceLevel = 'medium';
    } else {
        devicePerformanceLevel = 'low';
    }

    console.log(`Device performance level: ${devicePerformanceLevel} (score: ${score}, memory: ${memoryInfo}GB, cores: ${cores}, AdMob: ${isAdMobEnv})`);
    return devicePerformanceLevel;
}

/**
 * Batches DOM read operations to avoid layout thrashing
 * @param {Function} readCallback - Function that reads from the DOM
 * @returns {*} - The result of the read operation
 */
export function batchDOMRead(readCallback) {
    // Force a style recalculation before reading
    // This ensures we're reading the latest values
    void document.body.offsetHeight;
    return readCallback();
}

/**
 * Batches DOM write operations to avoid layout thrashing
 * @param {Function} writeCallback - Function that writes to the DOM
 */
export function batchDOMWrite(writeCallback) {
    // Use requestAnimationFrame to batch DOM writes
    requestAnimationFrame(() => {
        writeCallback();
    });
}

/**
 * Debounces a function to limit how often it can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @param {boolean} immediate - Whether to call the function immediately
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttles a function to limit how often it can be called
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Creates a ResizeObserver with a debounced callback
 * @param {Function} callback - The callback to call when resize occurs
 * @param {number} delay - The debounce delay in milliseconds
 * @returns {ResizeObserver} - The ResizeObserver instance
 */
export function createDebouncedResizeObserver(callback, delay = 100) {
    const debouncedCallback = debounce(callback, delay);
    return new ResizeObserver(debouncedCallback);
}

/**
 * Optimizes animations by using requestAnimationFrame
 * @param {Function} animationCallback - The animation callback
 * @returns {number} - The animation frame ID
 */
export function optimizedAnimation(animationCallback) {
    return requestAnimationFrame(animationCallback);
}

/**
 * Cancels an optimized animation
 * @param {number} animationId - The animation frame ID
 */
export function cancelOptimizedAnimation(animationId) {
    cancelAnimationFrame(animationId);
}

/**
 * Adds hardware acceleration hints to an element with adaptive optimization
 * @param {HTMLElement} element - The element to optimize
 */
export function addHardwareAcceleration(element) {
    if (!element) return;

    const performanceLevel = getDevicePerformanceLevel();

    // Apply different levels of optimization based on device performance
    if (performanceLevel === 'low') {
        // Minimal hardware acceleration for low-end devices
        element.style.willChange = 'auto';
        element.style.transform = 'translateZ(0)';
    } else if (performanceLevel === 'medium') {
        // Moderate optimization for medium devices
        element.style.transform = 'translateZ(0)';
        element.style.backfaceVisibility = 'hidden';
        element.style.willChange = 'transform';
    } else {
        // Full optimization for high-end devices
        element.style.transform = 'translateZ(0)';
        element.style.backfaceVisibility = 'hidden';
        element.style.willChange = 'transform, opacity';
    }
}

/**
 * Removes hardware acceleration hints from an element
 * @param {HTMLElement} element - The element to de-optimize
 */
export function removeHardwareAcceleration(element) {
    if (!element) return;

    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.willChange = '';
}

/**
 * Memory management utilities
 */
let memoryCleanupInterval = null;
let lastMemoryCheck = 0;

/**
 * Monitors memory usage and triggers cleanup when needed
 */
export function startMemoryMonitoring() {
    const performanceLevel = getDevicePerformanceLevel();
    const isAdMobEnv = detectAdMobEnvironment();

    // Adjust monitoring frequency based on device performance and AdMob environment
    let monitoringInterval;
    if (isAdMobEnv) {
        monitoringInterval = 15000; // Very aggressive monitoring for AdMob (15s)
    } else if (performanceLevel === 'low') {
        monitoringInterval = 30000; // 30s for low-end devices
    } else {
        monitoringInterval = 60000; // 60s for others
    }

    if (memoryCleanupInterval) {
        clearInterval(memoryCleanupInterval);
    }

    memoryCleanupInterval = setInterval(() => {
        checkMemoryUsage();
    }, monitoringInterval);

    console.log(`Memory monitoring started with ${monitoringInterval}ms interval (AdMob: ${isAdMobEnv})`);
}

/**
 * Checks memory usage and triggers cleanup if needed
 */
function checkMemoryUsage() {
    const now = performance.now();
    const isAdMobEnv = detectAdMobEnvironment();
    const performanceLevel = getDevicePerformanceLevel();

    // Throttle memory checks to avoid performance impact
    const throttleTime = isAdMobEnv ? 3000 : 5000; // More frequent checks for AdMob
    if (now - lastMemoryCheck < throttleTime) return;
    lastMemoryCheck = now;

    // Check if memory API is available
    if ('memory' in performance) {
        const memInfo = performance.memory;
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
        const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;

        console.log(`Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);

        // Trigger cleanup if memory usage is high (more aggressive thresholds for all environments)
        const cleanupThreshold = isAdMobEnv ? 45 : (performanceLevel === 'low' ? 50 : (performanceLevel === 'medium' ? 60 : 65));
        if (usagePercent > cleanupThreshold) {
            console.log(`High memory usage detected (${usagePercent.toFixed(1)}% > ${cleanupThreshold}%), triggering cleanup`);
            triggerMemoryCleanup();
        }
    }

    // Force garbage collection if available (Chrome DevTools)
    if (window.gc && (performanceLevel === 'low' || isAdMobEnv)) {
        window.gc();
    }
}

/**
 * Triggers memory cleanup operations
 */
function triggerMemoryCleanup() {
    // Clean up unused Monaco editors
    cleanupUnusedMonacoEditors();

    // Clean up old character gallery images
    cleanupCharacterGalleryImages();

    // Clean up old chat messages if there are too many
    cleanupOldChatMessages();

    // Clear any cached data that's not immediately needed
    clearNonEssentialCaches();

    // Clean up event listeners and observers
    cleanupEventListenersAndObservers();

    // Perform aggressive image cleanup
    aggressiveImageCleanup();
}

/**
 * Cleans up unused Monaco editors to free memory
 */
function cleanupUnusedMonacoEditors() {
    if (!window.monaco) return;

    try {
        const editors = window.monaco.editor.getEditors();
        const visibleEditors = [];

        editors.forEach(editor => {
            const container = editor.getContainerDomNode();
            if (!container || !container.isConnected || !isElementVisible(container)) {
                console.log('Disposing unused Monaco editor');
                editor.dispose();
            } else {
                visibleEditors.push(editor);
            }
        });

        console.log(`Cleaned up ${editors.length - visibleEditors.length} unused Monaco editors`);
    } catch (error) {
        console.error('Error cleaning up Monaco editors:', error);
    }
}

/**
 * Checks if an element is visible in the viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - True if the element is visible
 */
function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= windowHeight &&
        rect.left <= windowWidth
    );
}

/**
 * Cleans up character gallery images that are not visible
 */
function cleanupCharacterGalleryImages() {
    const characterCards = document.querySelectorAll('.character-card');
    let cleanedCount = 0;

    characterCards.forEach(card => {
        if (!isElementVisible(card)) {
            const img = card.querySelector('img');
            if (img && img.src && !img.src.startsWith('data:')) {
                // Replace with data-src for lazy loading
                img.dataset.src = img.src;
                img.removeAttribute('src');
                cleanedCount++;
            }
        }
    });

    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} character gallery images`);
    }
}

/**
 * Cleans up old chat messages if there are too many
 */
function cleanupOldChatMessages() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    const messages = messagesContainer.querySelectorAll('.message');
    const performanceLevel = getDevicePerformanceLevel();
    const isAdMobEnv = detectAdMobEnvironment();
    
    // More aggressive message limits for memory optimization
    let maxMessages;
    if (isAdMobEnv) {
        maxMessages = 25; // Very conservative for AdMob
    } else if (performanceLevel === 'low') {
        maxMessages = 40; // Reduced for low-end devices
    } else if (performanceLevel === 'medium') {
        maxMessages = 75; // Reduced for medium devices
    } else {
        maxMessages = 100; // High-end devices remain at 100
    }

    if (messages.length > maxMessages) {
        const messagesToRemove = messages.length - maxMessages;
        for (let i = 0; i < messagesToRemove; i++) {
            if (messages[i]) {
                messages[i].remove();
            }
        }
        console.log(`Cleaned up ${messagesToRemove} old chat messages (AdMob: ${isAdMobEnv}, max: ${maxMessages})`);
    }
}

/**
 * Clears non-essential caches
 */
function clearNonEssentialCaches() {
    // Clear any temporary image caches
    if (window.imageCache) {
        window.imageCache.clear();
    }

    // Clear any temporary data caches
    if (window.tempDataCache) {
        window.tempDataCache.clear();
    }
}

/**
 * Cleanup function for event listeners and observers to prevent memory leaks
 */
export function cleanupEventListenersAndObservers() {
    // Cleanup ResizeObserver instances
    document.querySelectorAll('[data-has-resize-observer]').forEach(element => {
        const observer = elementObservers.get(element);
        if (observer) {
            observer.disconnect();
            elementObservers.delete(element);
            element.removeAttribute('data-has-resize-observer');
        }
    });

    // Cleanup IntersectionObserver instances  
    document.querySelectorAll('[data-has-intersection-observer]').forEach(element => {
        const observer = elementObservers.get(element);
        if (observer) {
            observer.disconnect();
            elementObservers.delete(element);
            element.removeAttribute('data-has-intersection-observer');
        }
    });

    // Cleanup MutationObserver instances
    document.querySelectorAll('[data-has-mutation-observer]').forEach(element => {
        const observer = elementObservers.get(element);
        if (observer) {
            observer.disconnect();
            elementObservers.delete(element);
            element.removeAttribute('data-has-mutation-observer');
        }
    });

    // Clear cached elements that are no longer in DOM
    const elementsToRemove = [];
    cachedElements.forEach(element => {
        if (!document.contains(element)) {
            elementsToRemove.push(element);
        }
    });
    elementsToRemove.forEach(element => cachedElements.delete(element));

    console.log('Cleaned up event listeners and observers for memory optimization');
}

/**
 * Enhanced lazy loading with adaptive performance settings
 * @param {string} selector - The CSS selector for images to lazy load
 */
export function setupLazyLoading(selector = 'img[data-src]') {
    // Get all images that match the selector
    const images = document.querySelectorAll(selector);

    // If no images found, log and return
    if (images.length === 0) {
        console.log('No images found for lazy loading with selector:', selector);
        return;
    }

    console.log(`Setting up enhanced lazy loading for ${images.length} images`);

    if (!('IntersectionObserver' in window)) {
        // Fallback for browsers that don't support IntersectionObserver
        images.forEach(img => {
            if (img.dataset.src) {
                // Set the src attribute to load the image
                img.src = img.dataset.src;
                // Remove the data-src attribute to prevent double loading
                img.removeAttribute('data-src');
                console.log('Lazy loaded image (fallback):', img.alt || 'unnamed image');
            }
        });
        return;
    }

    const performanceLevel = getDevicePerformanceLevel();

    // Adaptive settings based on device performance
    let rootMargin, threshold, loadingDelay;

    if (performanceLevel === 'low') {
        // Conservative settings for low-end devices
        rootMargin = '50px 0px';  // Smaller margin to load images closer to viewport
        threshold = 0.1;          // Higher threshold to delay loading
        loadingDelay = 100;       // Small delay to reduce load spikes
    } else if (performanceLevel === 'medium') {
        // Balanced settings for medium devices
        rootMargin = '100px 0px';
        threshold = 0.05;
        loadingDelay = 50;
    } else {
        // Aggressive settings for high-end devices
        rootMargin = '200px 0px'; // Larger margin for faster loading
        threshold = 0.01;
        loadingDelay = 0;
    }

    // Create an IntersectionObserver with adaptive settings
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    // Add loading delay for low-end devices to prevent overwhelming
                    const loadImage = () => {
                        // Add loading placeholder for better UX
                        img.style.backgroundColor = '#f0f0f0';
                        img.style.minHeight = '100px';

                        // Create a new image to preload
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            // Set the src attribute to load the image
                            img.src = img.dataset.src;
                            // Remove the data-src attribute to prevent double loading
                            img.removeAttribute('data-src');
                            // Remove placeholder styling
                            img.style.backgroundColor = '';
                            img.style.minHeight = '';
                            console.log('Lazy loaded image:', img.alt || 'unnamed image');
                        };
                        tempImg.onerror = () => {
                            console.error('Failed to load image:', img.dataset.src);
                            // Remove placeholder styling even on error
                            img.style.backgroundColor = '';
                            img.style.minHeight = '';
                        };
                        tempImg.src = img.dataset.src;
                    };

                    if (loadingDelay > 0) {
                        setTimeout(loadImage, loadingDelay);
                    } else {
                        loadImage();
                    }
                }
                // Stop observing the image once it's processed
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: rootMargin,
        threshold: threshold
    });

    // Start observing each image
    images.forEach(img => {
        // If the image already has a src that matches data-src, don't observe it
        if (img.src === img.dataset.src) {
            console.log('Image already loaded, skipping observation:', img.alt || 'unnamed image');
            return;
        }

        // Otherwise, observe the image for intersection with the viewport
        imageObserver.observe(img);
    });

    console.log(`Enhanced lazy loading setup complete with ${performanceLevel} performance settings`);
}

/**
 * AdMob-specific performance optimizations
 */
export function applyAdMobOptimizations() {
    const isAdMobEnv = detectAdMobEnvironment();
    if (!isAdMobEnv) return;
    
    console.log('Applying AdMob-specific performance optimizations...');
    
    // Apply AdMob CSS class for styles
    document.body.classList.add('admob-env');
    
    // Load AdMob-specific CSS if not already loaded
    if (!document.querySelector('link[href*="admob-optimizations.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/admob-optimizations.css';
        document.head.appendChild(link);
    }
    
    // Reduce animation frame rate for AdMob environments
    const originalRAF = window.requestAnimationFrame;
    let lastFrameTime = 0;
    const targetFrameRate = 30; // 30fps for AdMob
    const frameInterval = 1000 / targetFrameRate;
    
    window.requestAnimationFrame = function(callback) {
        return originalRAF(function(currentTime) {
            if (currentTime - lastFrameTime >= frameInterval) {
                lastFrameTime = currentTime;
                callback(currentTime);
            } else {
                originalRAF(arguments.callee);
            }
        });
    };
    
    // Disable expensive CSS features for AdMob
    const style = document.createElement('style');
    style.textContent = `
        /* AdMob WebView optimizations */
        * {
            will-change: auto !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
        }
        
        /* Keep essential transforms for layout */
        .character-card, .modal-content, #messages {
            transform: translateZ(0) !important;
        }
        
        /* Reduce visual complexity */
        .character-card {
            box-shadow: none !important;
        }
        
        .modal-content {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        /* Optimize scrolling */
        * {
            -webkit-overflow-scrolling: touch !important;
            scroll-behavior: auto !important;
        }
    `;
    document.head.appendChild(style);
    
    // Aggressive image optimization for AdMob
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
    });
    
    // Reduce timer frequencies
    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay) {
        // Increase minimum delay for AdMob environments
        const minDelay = Math.max(delay, 100); // Minimum 100ms
        return originalSetInterval(callback, minDelay);
    };
    
    console.log('AdMob optimizations applied successfully');
}

/**
 * Throttled scroll handler for improved performance in AdMob environments
 */
export function createAdMobOptimizedScrollHandler(originalHandler) {
    const isAdMobEnv = detectAdMobEnvironment();
    if (!isAdMobEnv) return originalHandler;
    
    // More aggressive throttling for AdMob
    return throttle(originalHandler, 33); // ~30fps for scroll events
}

/**
 * Emergency performance mode for critical memory situations
 */
export function enableEmergencyPerformanceMode() {
    console.log('Enabling emergency performance mode...');
    
    // Add emergency performance class
    document.body.classList.add('emergency-performance');
    
    // Pause all non-essential timers
    const timers = [];
    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay) {
        if (delay < 1000) { // Only allow intervals longer than 1 second
            return null;
        }
        return originalSetInterval(callback, delay);
    };
    
    // Disable all animations immediately
    const emergencyStyle = document.createElement('style');
    emergencyStyle.id = 'emergency-performance-style';
    emergencyStyle.textContent = `
        * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            will-change: auto !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
        }
        
        /* Keep only essential layout transforms */
        #messages, #sidebar, .modal-content {
            transform: translateZ(0) !important;
        }
        
        /* Minimal visual styling */
        .character-card, .message, .button {
            background: #222 !important;
            border: 1px solid #444 !important;
            border-radius: 2px !important;
        }
    `;
    document.head.appendChild(emergencyStyle);
    
    // Aggressive memory cleanup
    triggerMemoryCleanup();
    
    // Clean up images aggressively
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.closest('#welcome-message') && !img.closest('.character-card')) {
            img.style.display = 'none';
        }
    });
    
    // Disable Monaco editors temporarily
    if (window.monaco) {
        const editors = window.monaco.editor.getEditors();
        editors.forEach(editor => {
            try {
                editor.dispose();
            } catch (e) {
                console.warn('Error disposing Monaco editor:', e);
            }
        });
    }
    
    console.log('Emergency performance mode activated');
}

/**
 * Adaptive performance monitoring that can trigger emergency mode
 */
export function startAdaptivePerformanceMonitoring() {
    const isAdMobEnv = detectAdMobEnvironment();
    if (!isAdMobEnv) return;
    
    let emergencyModeTriggered = false;
    
    const monitor = () => {
        if (emergencyModeTriggered) return;
        
        // Check memory usage
        if ('memory' in performance) {
            const memInfo = performance.memory;
            const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
            
            // Trigger emergency mode at 85% memory usage in AdMob
            if (usagePercent > 85) {
                emergencyModeTriggered = true;
                enableEmergencyPerformanceMode();
                return;
            }
        }
        
        // Check if page is becoming unresponsive
        const startTime = performance.now();
        setTimeout(() => {
            const delay = performance.now() - startTime;
            if (delay > 100) { // If setTimeout is delayed by more than 100ms
                emergencyModeTriggered = true;
                enableEmergencyPerformanceMode();
            }
        }, 0);
    };
    
    // Monitor every 5 seconds in AdMob environments
    setInterval(monitor, 5000);
    
    console.log('Adaptive performance monitoring started for AdMob environment');
}

/**
 * Optimizes API requests for AdMob environments
 * @param {string} url - API URL
 * @param {Object} options - Fetch options
 * @returns {Promise} - Optimized fetch promise
 */
export function optimizedFetch(url, options = {}) {
    const isAdMobEnv = detectAdMobEnvironment();
    
    if (!isAdMobEnv) {
        return fetch(url, options);
    }
    
    // Apply AdMob-specific optimizations
    const optimizedOptions = {
        ...options,
        // Reduce timeout for faster failure detection
        signal: AbortSignal.timeout(10000), // 10 seconds instead of default
        // Optimize headers
        headers: {
            ...options.headers,
            'Connection': 'close', // Don't keep connections alive
            'Cache-Control': 'no-cache' // Prevent caching issues
        }
    };
    
    // Add retry logic for AdMob environments
    const maxRetries = 2;
    let attempt = 0;
    
    const attemptFetch = async () => {
        try {
            const response = await fetch(url, optimizedOptions);
            return response;
        } catch (error) {
            attempt++;
            if (attempt < maxRetries && error.name !== 'AbortError') {
                console.log(`Retrying API request (attempt ${attempt + 1}/${maxRetries})`);
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                return attemptFetch();
            }
            throw error;
        }
    };
    
    return attemptFetch();
}

/**
 * Progressive loading for heavy components
 * @param {Array} components - Array of component initialization functions
 * @param {number} batchSize - Number of components to load per batch
 */
export function progressiveComponentLoading(components, batchSize = null) {
    if (!components || components.length === 0) return;

    const performanceLevel = getDevicePerformanceLevel();

    // Adaptive batch size based on device performance
    if (!batchSize) {
        batchSize = performanceLevel === 'low' ? 1 : performanceLevel === 'medium' ? 2 : 3;
    }

    const delay = performanceLevel === 'low' ? 100 : performanceLevel === 'medium' ? 50 : 16;

    let currentIndex = 0;

    const loadNextBatch = () => {
        const endIndex = Math.min(currentIndex + batchSize, components.length);

        for (let i = currentIndex; i < endIndex; i++) {
            try {
                if (typeof components[i] === 'function') {
                    components[i]();
                }
            } catch (error) {
                console.error(`Error loading component ${i}:`, error);
            }
        }

        currentIndex = endIndex;

        if (currentIndex < components.length) {
            setTimeout(loadNextBatch, delay);
        } else {
            console.log(`Progressive loading complete: ${components.length} components loaded`);
        }
    };

    // Start loading the first batch
    loadNextBatch();
}

/**
 * Adaptive animation frame rate limiting for slower devices
 * @param {Function} callback - The animation callback
 * @param {number} targetFPS - Target frames per second (optional)
 * @returns {number} - The animation frame ID
 */
export function adaptiveAnimationFrame(callback, targetFPS = null) {
    const performanceLevel = getDevicePerformanceLevel();

    // Set target FPS based on device performance if not specified
    if (!targetFPS) {
        targetFPS = performanceLevel === 'low' ? 30 : performanceLevel === 'medium' ? 45 : 60;
    }

    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = 0;

    const animationCallback = (currentTime) => {
        if (currentTime - lastFrameTime >= frameInterval) {
            callback(currentTime);
            lastFrameTime = currentTime;
        }
        return requestAnimationFrame(animationCallback);
    };

    return requestAnimationFrame(animationCallback);
}

/**
 * Virtual scrolling implementation for large lists
 * @param {HTMLElement} container - The container element
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item
 * @param {number} itemHeight - Height of each item in pixels
 */
export function setupVirtualScrolling(container, items, renderItem, itemHeight = 50) {
    if (!container || !items || !renderItem) return;

    const performanceLevel = getDevicePerformanceLevel();

    // Adjust buffer size based on device performance
    const bufferSize = performanceLevel === 'low' ? 5 : performanceLevel === 'medium' ? 10 : 15;

    const containerHeight = container.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;

    // Create virtual scroll container
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';

    // Create visible items container
    const visibleContainer = document.createElement('div');
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.width = '100%';

    scrollContainer.appendChild(visibleContainer);
    container.appendChild(scrollContainer);

    let startIndex = 0;
    let endIndex = Math.min(visibleCount + bufferSize, items.length);

    const renderVisibleItems = () => {
        visibleContainer.innerHTML = '';
        visibleContainer.style.transform = `translateY(${startIndex * itemHeight}px)`;

        for (let i = startIndex; i < endIndex; i++) {
            if (items[i]) {
                const itemElement = renderItem(items[i], i);
                itemElement.style.height = `${itemHeight}px`;
                visibleContainer.appendChild(itemElement);
            }
        }
    };

    const handleScroll = throttle(() => {
        const scrollTop = container.scrollTop;
        const newStartIndex = Math.floor(scrollTop / itemHeight);
        const newEndIndex = Math.min(newStartIndex + visibleCount + bufferSize, items.length);

        if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
            startIndex = newStartIndex;
            endIndex = newEndIndex;
            renderVisibleItems();
        }
    }, 16); // 60fps throttling

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial render
    renderVisibleItems();

    return {
        update: (newItems) => {
            items = newItems;
            scrollContainer.style.height = `${newItems.length * itemHeight}px`;
            renderVisibleItems();
        },
        destroy: () => {
            container.removeEventListener('scroll', handleScroll);
            container.removeChild(scrollContainer);
        }
    };
}

/**
 * Aggressively cleans up images and DOM references for memory optimization
 */
export function aggressiveImageCleanup() {
    // Clean up blob URLs that might be lingering
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
        if (!img.parentNode || !document.contains(img)) {
            try {
                URL.revokeObjectURL(img.src);
            } catch (e) {
                // Silently ignore errors
            }
        }
    });

    // Clean up canvas elements that might be holding memory
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        if (!document.contains(canvas)) {
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                canvas.width = 1;
                canvas.height = 1;
            } catch (e) {
                // Silently ignore errors
            }
        }
    });

    // Force garbage collection of unused image data
    if (window.gc) {
        window.gc();
    }

    console.log('Performed aggressive image cleanup for memory optimization');
}
