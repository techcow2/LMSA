// Performance utilities for optimizing app performance
// This file contains utilities for batching DOM operations, debouncing, throttling, etc.

// Device performance detection
let devicePerformanceLevel = null;
let memoryInfo = null;

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

    console.log(`Device performance level: ${devicePerformanceLevel} (score: ${score}, memory: ${memoryInfo}GB, cores: ${cores})`);
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

    // Adjust monitoring frequency based on device performance
    const monitoringInterval = performanceLevel === 'low' ? 30000 : 60000; // 30s for low-end, 60s for others

    if (memoryCleanupInterval) {
        clearInterval(memoryCleanupInterval);
    }

    memoryCleanupInterval = setInterval(() => {
        checkMemoryUsage();
    }, monitoringInterval);

    console.log(`Memory monitoring started with ${monitoringInterval}ms interval`);
}

/**
 * Checks memory usage and triggers cleanup if needed
 */
function checkMemoryUsage() {
    const now = performance.now();

    // Throttle memory checks to avoid performance impact
    if (now - lastMemoryCheck < 5000) return;
    lastMemoryCheck = now;

    // Check if memory API is available
    if ('memory' in performance) {
        const memInfo = performance.memory;
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
        const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;

        console.log(`Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);

        // Trigger cleanup if memory usage is high
        if (usagePercent > 70) {
            console.log('High memory usage detected, triggering cleanup');
            triggerMemoryCleanup();
        }
    }

    // Force garbage collection if available (Chrome DevTools)
    if (window.gc && getDevicePerformanceLevel() === 'low') {
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
    const maxMessages = getDevicePerformanceLevel() === 'low' ? 50 : 100;

    if (messages.length > maxMessages) {
        const messagesToRemove = messages.length - maxMessages;
        for (let i = 0; i < messagesToRemove; i++) {
            if (messages[i]) {
                messages[i].remove();
            }
        }
        console.log(`Cleaned up ${messagesToRemove} old chat messages`);
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
