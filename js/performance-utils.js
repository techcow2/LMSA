// Performance utilities for optimizing app performance
// This file contains utilities for batching DOM operations, debouncing, throttling, etc.

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
 * Adds hardware acceleration hints to an element
 * @param {HTMLElement} element - The element to optimize
 */
export function addHardwareAcceleration(element) {
    if (!element) return;

    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.willChange = 'transform, opacity';
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
 * Lazy loads images when they enter the viewport
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

    console.log(`Setting up lazy loading for ${images.length} images`);

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

    // Create an IntersectionObserver to watch for images entering the viewport
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    // Set the src attribute to load the image
                    img.src = img.dataset.src;
                    // Remove the data-src attribute to prevent double loading
                    img.removeAttribute('data-src');
                    console.log('Lazy loaded image:', img.alt || 'unnamed image');
                }
                // Stop observing the image once it's loaded
                imageObserver.unobserve(img);
            }
        });
    }, {
        // Extend the root margin to start loading images before they enter the viewport
        rootMargin: '100px 0px',
        // Lower threshold to trigger loading earlier
        threshold: 0.01
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
}
