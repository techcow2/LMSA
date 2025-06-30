// Simplified performance utilities - focused on essential optimizations only

let devicePerformanceLevel = null;

/**
 * Simple device performance detection
 * @returns {string} - 'high', 'medium', or 'low'
 */
export function getDevicePerformanceLevel() {
    if (devicePerformanceLevel !== null) {
        return devicePerformanceLevel;
    }

    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4;
    const isTouch = 'ontouchstart' in window;
    
    let score = 0;
    if (memory >= 8) score += 2;
    else if (memory >= 4) score += 1;
    
    if (cores >= 8) score += 2;
    else if (cores >= 4) score += 1;
    
    // Touch devices are often less powerful
    if (isTouch) score -= 1;

    if (score >= 3) devicePerformanceLevel = 'high';
    else if (score >= 1) devicePerformanceLevel = 'medium';
    else devicePerformanceLevel = 'low';

    return devicePerformanceLevel;
}

/**
 * Simple debounce function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Simple throttle function
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Simple lazy loading setup
 * @param {string} selector - CSS selector for images to lazy load
 */
export function setupLazyLoading(selector = 'img[data-src]') {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll(selector).forEach(img => observer.observe(img));
}

/**
 * Simple hardware acceleration for animating elements only
 * @param {HTMLElement} element - The element to optimize
 */
export function addHardwareAcceleration(element) {
    if (!element) return;
    // Only add to elements that actually animate
    if (element.classList.contains('modal-content') || 
        element.id === 'scroll-to-bottom' ||
        element.classList.contains('character-card')) {
        element.style.transform = 'translateZ(0)';
        element.style.backfaceVisibility = 'hidden';
    }
}

/**
 * Remove hardware acceleration
 * @param {HTMLElement} element - The element to remove optimization from
 */
export function removeHardwareAcceleration(element) {
    if (!element) return;
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.willChange = 'auto';
}

/**
 * Basic memory cleanup - runs less frequently
 */
export function basicMemoryCleanup() {
    // Simple garbage collection hint
    if (window.gc) {
        window.gc();
    }
    
    // Clean up any disconnected images
    document.querySelectorAll('img').forEach(img => {
        if (!img.isConnected && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
}

/**
 * Start basic memory monitoring - much less aggressive
 */
export function startMemoryMonitoring() {
    // Only clean up every 10 minutes instead of constantly
    setInterval(basicMemoryCleanup, 600000);
}
