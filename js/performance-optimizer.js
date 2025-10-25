// Performance optimization utilities for DOM updates and animations
import { debugLog } from './utils.js';

/**
 * Throttle utility for reducing frequency of function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} - Throttled function
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
 * Debounce utility for delaying function calls until after a period of inactivity
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Request animation frame throttle for smooth animations
 * @param {Function} func - Function to throttle
 * @returns {Function} - RAF-throttled function
 */
export function rafThrottle(func) {
    let rafId;
    let isScheduled = false;
    
    return function(...args) {
        if (!isScheduled) {
            isScheduled = true;
            rafId = requestAnimationFrame(() => {
                func.apply(this, args);
                isScheduled = false;
            });
        }
    };
}

/**
 * Batch DOM operations to prevent layout thrashing
 */
class DOMBatcher {
    constructor() {
        this.readOps = [];
        this.writeOps = [];
        this.scheduled = false;
    }

    /**
     * Schedule a DOM read operation
     * @param {Function} readOp - Function that reads from DOM
     * @returns {Promise} - Promise that resolves with read result
     */
    read(readOp) {
        return new Promise((resolve) => {
            this.readOps.push({ op: readOp, resolve });
            this.schedule();
        });
    }

    /**
     * Schedule a DOM write operation
     * @param {Function} writeOp - Function that writes to DOM
     * @returns {Promise} - Promise that resolves when write is complete
     */
    write(writeOp) {
        return new Promise((resolve) => {
            this.writeOps.push({ op: writeOp, resolve });
            this.schedule();
        });
    }

    /**
     * Schedule the batch execution
     */
    schedule() {
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    }

    /**
     * Execute all batched operations
     */
    flush() {
        // Execute all read operations first
        const readResults = this.readOps.map(({ op, resolve }) => {
            const result = op();
            resolve(result);
            return result;
        });

        // Then execute all write operations
        this.writeOps.forEach(({ op, resolve }) => {
            op();
            resolve();
        });

        // Clear the queues
        this.readOps = [];
        this.writeOps = [];
        this.scheduled = false;
    }
}

// Global DOM batcher instance
export const domBatcher = new DOMBatcher();

/**
 * Optimized message update throttler
 */
class MessageUpdateThrottler {
    constructor() {
        this.pendingUpdates = new Map();
        this.isUpdating = false;
        this.updateQueue = [];
        this.throttledUpdate = rafThrottle(() => this.processUpdates());
    }

    /**
     * Queue a message update
     * @param {string} messageId - Message ID
     * @param {Function} updateFunction - Function to update the message
     */
    queueUpdate(messageId, updateFunction) {
        this.pendingUpdates.set(messageId, updateFunction);
        this.throttledUpdate();
    }

    /**
     * Process all pending updates
     */
    processUpdates() {
        if (this.isUpdating || this.pendingUpdates.size === 0) return;
        
        this.isUpdating = true;
        
        // Batch DOM operations
        const updates = Array.from(this.pendingUpdates.entries());
        this.pendingUpdates.clear();
        
        requestAnimationFrame(() => {
            // Process updates in batches to avoid blocking the UI
            const batchSize = 5;
            let index = 0;
            
            const processBatch = () => {
                const batch = updates.slice(index, index + batchSize);
                
                // Execute DOM reads first
                const readData = batch.map(([messageId, updateFn]) => ({
                    messageId,
                    element: document.querySelector(`[data-message-id="${messageId}"]`)
                }));
                
                // Then execute DOM writes
                batch.forEach(([messageId, updateFn], i) => {
                    const element = readData[i].element;
                    if (element) {
                        updateFn(element);
                    }
                });
                
                index += batchSize;
                
                if (index < updates.length) {
                    // Schedule next batch
                    setTimeout(processBatch, 0);
                } else {
                    this.isUpdating = false;
                }
            };
            
            processBatch();
        });
    }
}

// Global message update throttler
export const messageUpdateThrottler = new MessageUpdateThrottler();

/**
 * Touch event optimizer for better passive event handling
 */
export class TouchEventOptimizer {
    constructor() {
        this.activeEvents = new Set();
        this.passiveSupported = this.checkPassiveSupport();
    }

    /**
     * Check if passive events are supported
     */
    checkPassiveSupport() {
        let passiveSupported = false;
        try {
            const options = Object.defineProperty({}, 'passive', {
                get: function() {
                    passiveSupported = true;
                    return false;
                }
            });
            window.addEventListener('test', null, options);
            window.removeEventListener('test', null, options);
        } catch (err) {
            passiveSupported = false;
        }
        return passiveSupported;
    }

    /**
     * Add optimized touch event listener
     * @param {Element} element - Element to add listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {boolean} needsPreventDefault - Whether preventDefault is needed
     */
    addTouchListener(element, event, handler, needsPreventDefault = false) {
        const options = this.passiveSupported ? { 
            passive: !needsPreventDefault,
            capture: false
        } : false;
        
        const optimizedHandler = this.optimizeHandler(handler, needsPreventDefault);
        element.addEventListener(event, optimizedHandler, options);
        
        const eventKey = `${element}_${event}`;
        this.activeEvents.add({ element, event, handler: optimizedHandler, options });
        
        return () => {
            element.removeEventListener(event, optimizedHandler, options);
            this.activeEvents.delete(eventKey);
        };
    }

    /**
     * Optimize event handler for better performance
     */
    optimizeHandler(handler, needsPreventDefault) {
        return function(e) {
            // Only call preventDefault if really needed
            if (needsPreventDefault && e.cancelable) {
                e.preventDefault();
            }
            
            // Use requestAnimationFrame for non-critical updates
            if (!needsPreventDefault) {
                requestAnimationFrame(() => handler(e));
            } else {
                handler(e);
            }
        };
    }

    /**
     * Clean up all event listeners
     */
    cleanup() {
        this.activeEvents.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.activeEvents.clear();
    }
}

// Global touch optimizer
export const touchOptimizer = new TouchEventOptimizer();

/**
 * Memory-efficient animation utilities
 */
export class AnimationOptimizer {
    constructor() {
        this.activeAnimations = new Map();
        this.animationFrame = null;
    }

    /**
     * Create optimized CSS transform animation
     * @param {Element} element - Element to animate
     * @param {Object} transforms - Transform properties
     * @param {number} duration - Animation duration in ms
     * @param {string} easing - CSS easing function
     */
    animateTransform(element, transforms, duration = 300, easing = 'ease-out') {
        const animationId = Math.random().toString(36);
        
        // Cancel any existing animation on this element
        this.cancelAnimation(element);
        
        // Use CSS transitions for better performance
        const originalTransition = element
        const originalTransform = element.style.transform;
        
        // Build transform string
        const transformString = Object.entries(transforms)
            .map(([key, value]) => `${key}(${value})`)
            .join(' ');
        
        // Apply transition
        element
        element.style.transform = transformString;
        
        // Clean up after animation
        const cleanup = () => {
            element
            this.activeAnimations.delete(element);
        };
        
        // Store animation reference
        this.activeAnimations.set(element, {
            id: animationId,
            cleanup,
            startTime: performance.now()
        });
        
        // Set timeout for cleanup
        setTimeout(cleanup, duration + 50);
        
        return animationId;
    }

    /**
     * Cancel animation on element
     */
    cancelAnimation(element) {
        const animation = this.activeAnimations.get(element);
        if (animation) {
            animation.cleanup();
        }
    }

    /**
     * Fade element with transform-based animation
     */
    fade(element, opacity, duration = 300) {
        return this.animateTransform(element, {}, duration, 'ease-out').then(() => {
            element.style.opacity = opacity;
        });
    }

    /**
     * Slide element with transform
     */
    slide(element, x = 0, y = 0, duration = 300) {
        return this.animateTransform(element, {
            translateX: `${x}px`,
            translateY: `${y}px`
        }, duration);
    }

    /**
     * Scale element with transform
     */
    scale(element, scaleX = 1, scaleY = scaleX, duration = 300) {
        return this.animateTransform(element, {
            scaleX,
            scaleY
        }, duration);
    }

    /**
     * Clean up all animations
     */
    cleanup() {
        this.activeAnimations.forEach((animation, element) => {
            animation.cleanup();
        });
        this.activeAnimations.clear();
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

// Global animation optimizer
export const animationOptimizer = new AnimationOptimizer();

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            domUpdates: 0,
            animationFrames: 0,
            touchEvents: 0,
            memoryUsage: 0
        };
        this.startTime = performance.now();
    }

    /**
     * Track DOM update performance
     */
    trackDOMUpdate() {
        this.metrics.domUpdates++;
    }

    /**
     * Track animation frame usage
     */
    trackAnimationFrame() {
        this.metrics.animationFrames++;
    }

    /**
     * Track touch event frequency
     */
    trackTouchEvent() {
        this.metrics.touchEvents++;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const now = performance.now();
        const duration = (now - this.startTime) / 1000; // seconds
        
        return {
            ...this.metrics,
            duration,
            domUpdatesPerSecond: this.metrics.domUpdates / duration,
            animationFramesPerSecond: this.metrics.animationFrames / duration,
            touchEventsPerSecond: this.metrics.touchEvents / duration,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Get memory usage if available
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            domUpdates: 0,
            animationFrames: 0,
            touchEvents: 0,
            memoryUsage: 0
        };
        this.startTime = performance.now();
    }

    /**
     * Log performance summary
     */
    logSummary() {
        const metrics = this.getMetrics();
        debugLog('Performance Metrics:', metrics);
        
        // Warn about potential performance issues
        if (metrics.domUpdatesPerSecond > 60) {
            console.warn('High DOM update frequency detected:', metrics.domUpdatesPerSecond, 'updates/sec');
        }
        
        if (metrics.touchEventsPerSecond > 120) {
            console.warn('High touch event frequency detected:', metrics.touchEventsPerSecond, 'events/sec');
        }
        
        if (metrics.memoryUsage && metrics.memoryUsage.used > 100) {
            console.warn('High memory usage detected:', metrics.memoryUsage.used, 'MB');
        }
    }
}

// Global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Auto-log performance metrics every 30 seconds in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    setInterval(() => {
        performanceMonitor.logSummary();
    }, 30000);
}