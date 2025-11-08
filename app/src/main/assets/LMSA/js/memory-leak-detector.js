// Memory Leak Detection and Prevention for LMSA
import { debugLog, debugError } from './utils.js';

/**
 * Memory leak detector and prevention system
 */
class MemoryLeakDetector {
    constructor() {
        this.eventListeners = new WeakMap();
        this.intervals = new Set();
        this.timeouts = new Set();
        this.observers = new Set();
        this.abortControllers = new Set();
        this.animationFrames = new Set();
        this.webworkers = new Set();
        this.objectUrls = new Set();
        this.mediaStreams = new Set();
        this.periodicCleanupInterval = null;
        this.memoryCheckInterval = null;
        this.lastMemorySnapshot = null;
        this.memoryGrowthThreshold = 50 * 1024 * 1024; // 50MB growth threshold
        
        this.init();
    }

    /**
     * Initialize memory leak detection
     */
    init() {
        this.wrapGlobalAPIs();
        this.startPeriodicCleanup();
        this.monitorMemoryGrowth();
        this.setupPageUnloadCleanup();
        debugLog('Memory leak detector initialized');
    }

    /**
     * Wrap global APIs to track resource usage
     */
    wrapGlobalAPIs() {
        // Track setInterval
        const originalSetInterval = window.setInterval;
        window.setInterval = (callback, delay, ...args) => {
            const intervalId = originalSetInterval(callback, delay, ...args);
            this.intervals.add(intervalId);
            return intervalId;
        };

        // Track setTimeout
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => {
            const timeoutId = originalSetTimeout(callback, delay, ...args);
            this.timeouts.add(timeoutId);
            return timeoutId;
        };

        // Track clearInterval
        const originalClearInterval = window.clearInterval;
        window.clearInterval = (intervalId) => {
            this.intervals.delete(intervalId);
            return originalClearInterval(intervalId);
        };

        // Track clearTimeout
        const originalClearTimeout = window.clearTimeout;
        window.clearTimeout = (timeoutId) => {
            this.timeouts.delete(timeoutId);
            return originalClearTimeout(timeoutId);
        };

        // Track requestAnimationFrame
        const originalRequestAnimationFrame = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
            const wrappedCallback = (...args) => {
                try {
                    callback(...args);
                } finally {
                    // Remove from tracking when callback executes
                    this.animationFrames.delete(frameId);
                }
            };
            const frameId = originalRequestAnimationFrame(wrappedCallback);
            this.animationFrames.add(frameId);
            return frameId;
        };

        // Track cancelAnimationFrame
        const originalCancelAnimationFrame = window.cancelAnimationFrame;
        window.cancelAnimationFrame = (frameId) => {
            this.animationFrames.delete(frameId);
            return originalCancelAnimationFrame(frameId);
        };

        // Track URL.createObjectURL
        const originalCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = (object) => {
            const url = originalCreateObjectURL(object);
            this.objectUrls.add(url);
            return url;
        };

        // Track URL.revokeObjectURL
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.revokeObjectURL = (url) => {
            this.objectUrls.delete(url);
            return originalRevokeObjectURL(url);
        };
    }

    /**
     * Track event listeners to prevent memory leaks
     */
    trackEventListener(element, event, listener, options) {
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, new Map());
        }
        
        const elementListeners = this.eventListeners.get(element);
        if (!elementListeners.has(event)) {
            elementListeners.set(event, new Set());
        }
        
        elementListeners.get(event).add({ listener, options });
    }

    /**
     * Track MutationObserver
     */
    trackObserver(observer) {
        this.observers.add(observer);
        return observer;
    }

    /**
     * Track AbortController
     */
    trackAbortController(controller) {
        this.abortControllers.add(controller);
        return controller;
    }

    /**
     * Track Web Worker
     */
    trackWorker(worker) {
        this.webworkers.add(worker);
        return worker;
    }

    /**
     * Track MediaStream
     */
    trackMediaStream(stream) {
        this.mediaStreams.add(stream);
        return stream;
    }

    /**
     * Clean up all tracked resources
     */
    cleanup() {
        // Clear all intervals
        this.intervals.forEach(intervalId => {
            try {
                clearInterval(intervalId);
            } catch (e) {
                debugError('Error clearing interval:', e);
            }
        });
        this.intervals.clear();

        // Clear all timeouts
        this.timeouts.forEach(timeoutId => {
            try {
                clearTimeout(timeoutId);
            } catch (e) {
                debugError('Error clearing timeout:', e);
            }
        });
        this.timeouts.clear();

        // Cancel all animation frames
        this.animationFrames.forEach(frameId => {
            try {
                cancelAnimationFrame(frameId);
            } catch (e) {
                debugError('Error canceling animation frame:', e);
            }
        });
        this.animationFrames.clear();

        // Disconnect all observers
        this.observers.forEach(observer => {
            try {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            } catch (e) {
                debugError('Error disconnecting observer:', e);
            }
        });
        this.observers.clear();

        // Abort all abort controllers
        this.abortControllers.forEach(controller => {
            try {
                if (controller && typeof controller.abort === 'function') {
                    controller.abort();
                }
            } catch (e) {
                debugError('Error aborting controller:', e);
            }
        });
        this.abortControllers.clear();

        // Terminate all workers
        this.webworkers.forEach(worker => {
            try {
                if (worker && typeof worker.terminate === 'function') {
                    worker.terminate();
                }
            } catch (e) {
                debugError('Error terminating worker:', e);
            }
        });
        this.webworkers.clear();

        // Revoke all object URLs
        this.objectUrls.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                debugError('Error revoking object URL:', e);
            }
        });
        this.objectUrls.clear();

        // Stop all media streams
        this.mediaStreams.forEach(stream => {
            try {
                if (stream && stream.getTracks) {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (e) {
                debugError('Error stopping media stream:', e);
            }
        });
        this.mediaStreams.clear();

        debugLog('Memory leak detector cleanup completed');
    }

    /**
     * Start periodic cleanup of resources
     */
    startPeriodicCleanup() {
        // Clean up dead references every 5 minutes
        this.periodicCleanupInterval = setInterval(() => {
            this.cleanupDeadReferences();
        }, 5 * 60 * 1000);
    }

    /**
     * Clean up dead references and unused resources
     */
    cleanupDeadReferences() {
        let cleanedUp = 0;

        // Clean up completed timeouts (they auto-remove, but check for consistency)
        const initialTimeoutsSize = this.timeouts.size;
        
        // Clean up disconnected observers
        this.observers.forEach(observer => {
            try {
                // Check if observer is still connected to DOM
                if (observer.takeRecords && observer.takeRecords().length === 0) {
                    // Observer might be inactive, but we can't be sure without more context
                }
            } catch (e) {
                // Observer is likely dead, remove it
                this.observers.delete(observer);
                cleanedUp++;
            }
        });

        // Clean up aborted controllers
        this.abortControllers.forEach(controller => {
            if (controller.signal && controller.signal.aborted) {
                this.abortControllers.delete(controller);
                cleanedUp++;
            }
        });

        debugLog(`Cleaned up ${cleanedUp} dead references`);
    }

    /**
     * Monitor memory growth over time
     */
    monitorMemoryGrowth() {
        if (!performance.memory) return;

        this.memoryCheckInterval = setInterval(() => {
            const currentMemory = performance.memory.usedJSHeapSize;
            
            if (this.lastMemorySnapshot) {
                const growth = currentMemory - this.lastMemorySnapshot;
                
                if (growth > this.memoryGrowthThreshold) {
                    console.warn(`Significant memory growth detected: ${Math.round(growth / 1024 / 1024)}MB`);
                    debugLog('Current resource usage:', {
                        intervals: this.intervals.size,
                        timeouts: this.timeouts.size,
                        observers: this.observers.size,
                        animationFrames: this.animationFrames.size,
                        abortControllers: this.abortControllers.size,
                        objectUrls: this.objectUrls.size,
                        workers: this.webworkers.size,
                        mediaStreams: this.mediaStreams.size
                    });
                    
                    // Trigger cleanup if memory is growing too fast
                    this.cleanupDeadReferences();
                }
            }
            
            this.lastMemorySnapshot = currentMemory;
        }, 2 * 60 * 1000); // Check every 2 minutes
    }

    /**
     * Setup cleanup on page unload
     */
    setupPageUnloadCleanup() {
        const cleanup = () => this.cleanup();
        
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('pagehide', cleanup);
        
        // Also cleanup on visibility change to hidden (mobile background)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.cleanupDeadReferences();
            }
        });
    }

    /**
     * Get current resource usage statistics
     */
    getResourceStats() {
        const stats = {
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            observers: this.observers.size,
            animationFrames: this.animationFrames.size,
            abortControllers: this.abortControllers.size,
            objectUrls: this.objectUrls.size,
            workers: this.webworkers.size,
            mediaStreams: this.mediaStreams.size
        };

        if (performance.memory) {
            stats.memory = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }

        return stats;
    }

    /**
     * Force garbage collection if available
     */
    forceGarbageCollection() {
        if (window.gc) {
            try {
                window.gc();
                debugLog('Forced garbage collection');
            } catch (e) {
                debugError('Error forcing garbage collection:', e);
            }
        }
    }

    /**
     * Detect potential memory leaks based on resource growth
     */
    detectPotentialLeaks() {
        const stats = this.getResourceStats();
        const leaks = [];

        if (stats.intervals > 50) {
            leaks.push(`High number of intervals: ${stats.intervals}`);
        }
        
        if (stats.timeouts > 100) {
            leaks.push(`High number of timeouts: ${stats.timeouts}`);
        }
        
        if (stats.observers > 20) {
            leaks.push(`High number of observers: ${stats.observers}`);
        }
        
        if (stats.animationFrames > 100) {
            leaks.push(`High number of animation frames: ${stats.animationFrames}`);
        }
        
        if (stats.objectUrls > 50) {
            leaks.push(`High number of object URLs: ${stats.objectUrls}`);
        }

        if (stats.memory && stats.memory.used > 200) {
            leaks.push(`High memory usage: ${stats.memory.used}MB`);
        }

        if (leaks.length > 0) {
            console.warn('Potential memory leaks detected:', leaks);
            return leaks;
        }

        return null;
    }
}

// Global memory leak detector instance
export const memoryLeakDetector = new MemoryLeakDetector();

/**
 * Utility functions for memory-safe operations
 */
export const MemoryUtils = {
    /**
     * Create a memory-safe event listener
     */
    addEventListenerSafe(element, event, listener, options = {}) {
        element.addEventListener(event, listener, options);
        memoryLeakDetector.trackEventListener(element, event, listener, options);
        
        // Return cleanup function
        return () => {
            element.removeEventListener(event, listener, options);
        };
    },

    /**
     * Create a memory-safe interval
     */
    setIntervalSafe(callback, delay) {
        return setInterval(callback, delay);
    },

    /**
     * Create a memory-safe timeout
     */
    setTimeoutSafe(callback, delay) {
        return setTimeout(callback, delay);
    },

    /**
     * Create a memory-safe mutation observer
     */
    createObserverSafe(callback, options) {
        const observer = new MutationObserver(callback);
        memoryLeakDetector.trackObserver(observer);
        return observer;
    },

    /**
     * Create a memory-safe abort controller
     */
    createAbortControllerSafe() {
        const controller = new AbortController();
        memoryLeakDetector.trackAbortController(controller);
        return controller;
    },

    /**
     * Create a memory-safe worker
     */
    createWorkerSafe(scriptUrl, options) {
        const worker = new Worker(scriptUrl, options);
        memoryLeakDetector.trackWorker(worker);
        return worker;
    },

    /**
     * Get memory and resource statistics
     */
    getStats() {
        return memoryLeakDetector.getResourceStats();
    },

    /**
     * Perform manual cleanup check
     */
    checkForLeaks() {
        return memoryLeakDetector.detectPotentialLeaks();
    },

    /**
     * Force cleanup of all tracked resources
     */
    forceCleanup() {
        memoryLeakDetector.cleanup();
    }
};

// memoryLeakDetector is already exported above with const export

// Auto-check for leaks every 10 minutes in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    setInterval(() => {
        const leaks = MemoryUtils.checkForLeaks();
        if (leaks) {
            console.table(MemoryUtils.getStats());
        }
    }, 10 * 60 * 1000);
}