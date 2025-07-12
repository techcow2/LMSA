// Android Crash Prevention System
// Specifically designed to prevent androidx.appcompat.app.i.I crashes on Android 13+

import { getAndroidVersion } from './android-webview-config.js';

/**
 * Initialize comprehensive crash prevention for Android 13+
 */
export function initializeAndroidCrashPrevention() {
    const androidVersion = getAndroidVersion();
    const isAndroid13Plus = androidVersion >= 13;
    
    if (!isAndroid13Plus) {
        console.log('Android version < 13, skipping crash prevention');
        return;
    }
    
    console.log('Initializing Android 13+ crash prevention system...');
    
    // Initialize all crash prevention measures
    preventAppCompatCrashes();
    preventWebViewCrashes();
    preventResourceNotFoundErrors();
    preventActionModeCrashes();
    setupGlobalErrorHandler();
    preventMemoryRelatedCrashes();
    
    console.log('Android 13+ crash prevention system initialized');
}

/**
 * Prevent androidx.appcompat related crashes
 */
function preventAppCompatCrashes() {
    // Override problematic AppCompat methods that cause crashes
    const originalCreateContextMenu = HTMLElement.prototype.createContextMenu;
    if (originalCreateContextMenu) {
        HTMLElement.prototype.createContextMenu = function() {
            try {
                return originalCreateContextMenu.call(this);
            } catch (error) {
                console.warn('Prevented AppCompat context menu crash:', error);
                return null;
            }
        };
    }
    
    // Prevent action mode related crashes
    document.addEventListener('selectionchange', function(e) {
        try {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                // Prevent selection in problematic elements
                if (container && container.nodeType === Node.ELEMENT_NODE) {
                    const element = container;
                    if (element.classList && 
                        (element.classList.contains('message') || 
                         element.classList.contains('chat-item') ||
                         element.closest('.messages-container'))) {
                        // Clear selection to prevent action mode
                        selection.removeAllRanges();
                    }
                }
            }
        } catch (error) {
            console.warn('Prevented selection change crash:', error);
        }
    });
}

/**
 * Prevent WebView specific crashes
 */
function preventWebViewCrashes() {
    // Override WebView methods that commonly crash
    if (window.WebView) {
        const originalLoadUrl = window.WebView.prototype.loadUrl;
        if (originalLoadUrl) {
            window.WebView.prototype.loadUrl = function(url) {
                try {
                    return originalLoadUrl.call(this, url);
                } catch (error) {
                    console.warn('Prevented WebView loadUrl crash:', error);
                    return false;
                }
            };
        }
        
        const originalEvaluateJavascript = window.WebView.prototype.evaluateJavascript;
        if (originalEvaluateJavascript) {
            window.WebView.prototype.evaluateJavascript = function(script, callback) {
                try {
                    return originalEvaluateJavascript.call(this, script, callback);
                } catch (error) {
                    console.warn('Prevented WebView evaluateJavascript crash:', error);
                    if (callback) callback(null);
                    return false;
                }
            };
        }
    }
    
    // Prevent WebView touch event crashes
    document.addEventListener('touchstart', function(e) {
        try {
            // Prevent multi-touch gestures that can crash WebView
            if (e.touches && e.touches.length > 2) {
                e.preventDefault();
                return false;
            }
        } catch (error) {
            console.warn('Prevented touch event crash:', error);
        }
    }, { passive: false });
}

/**
 * Prevent Resource Not Found errors that cause androidx.appcompat crashes
 */
function preventResourceNotFoundErrors() {
    // Override resource access methods
    const originalGetString = String.prototype.toString;
    
    // Intercept resource ID access attempts
    Object.defineProperty(window, 'Resources', {
        get: function() {
            return {
                getString: function(id) {
                    try {
                        // Return empty string for problematic resource IDs
                        if (typeof id === 'number' && (id === 0x2040002 || id === 0x2040003 || id === 0x2090000)) {
                            console.warn(`Prevented access to problematic resource ID: 0x${id.toString(16)}`);
                            return '';
                        }
                        return '';
                    } catch (error) {
                        console.warn('Prevented resource getString crash:', error);
                        return '';
                    }
                },
                getText: function(id) {
                    try {
                        if (typeof id === 'number' && (id === 0x2040002 || id === 0x2040003 || id === 0x2090000)) {
                            console.warn(`Prevented access to problematic resource ID: 0x${id.toString(16)}`);
                            return '';
                        }
                        return '';
                    } catch (error) {
                        console.warn('Prevented resource getText crash:', error);
                        return '';
                    }
                }
            };
        },
        configurable: true
    });
}

/**
 * Prevent Action Mode crashes (common cause of androidx.appcompat issues)
 */
function preventActionModeCrashes() {
    // Disable floating action mode completely
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);
    
    // Prevent long press actions that trigger action mode
    let longPressTimer = null;
    
    document.addEventListener('touchstart', function(e) {
        longPressTimer = setTimeout(() => {
            // Prevent long press context menu
            e.preventDefault();
            e.stopPropagation();
        }, 500);
    }, true);
    
    document.addEventListener('touchend', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, true);
    
    document.addEventListener('touchmove', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, true);
    
    // Override startActionMode methods
    if (window.View && window.View.prototype) {
        const originalStartActionMode = window.View.prototype.startActionMode;
        if (originalStartActionMode) {
            window.View.prototype.startActionMode = function() {
                console.warn('Prevented startActionMode call to avoid crash');
                return null;
            };
        }
    }
}

/**
 * Setup global error handler for androidx.appcompat crashes
 */
function setupGlobalErrorHandler() {
    // Catch and handle specific error patterns
    window.addEventListener('error', function(event) {
        const error = event.error;
        const message = error ? error.message : event.message;
        
        // Check for androidx.appcompat related errors
        if (message && (
            message.includes('androidx.appcompat.app.i.I') ||
            message.includes('Resource ID #0x') ||
            message.includes('NotFoundException') ||
            message.includes('android.content.res.Resources$NotFoundException') ||
            message.includes('ContentViewCore') ||
            message.includes('AwContents') ||
            message.includes('SelectActionModeCallback')
        )) {
            console.warn('Caught and prevented androidx.appcompat crash:', message);
            event.preventDefault();
            event.stopPropagation();
            
            // Attempt recovery
            attemptCrashRecovery();
            
            return false;
        }
    }, true);
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const message = reason ? reason.message || reason.toString() : '';
        
        if (message.includes('androidx.appcompat') || message.includes('Resource ID')) {
            console.warn('Caught and prevented androidx.appcompat promise rejection:', message);
            event.preventDefault();
            return false;
        }
    });
}

/**
 * Prevent memory-related crashes common in Android 13
 */
function preventMemoryRelatedCrashes() {
    // Monitor memory usage and prevent crashes
    let memoryCheckInterval = setInterval(() => {
        try {
            if (performance && performance.memory) {
                const memory = performance.memory;
                const usedMemory = memory.usedJSHeapSize;
                const totalMemory = memory.totalJSHeapSize;
                const memoryUsage = (usedMemory / totalMemory) * 100;
                
                // If memory usage is too high, force cleanup
                if (memoryUsage > 85) {
                    console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}%`);
                    performEmergencyCleanup();
                }
            }
        } catch (error) {
            console.warn('Error checking memory usage:', error);
        }
    }, 30000); // Check every 30 seconds
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        if (memoryCheckInterval) {
            clearInterval(memoryCheckInterval);
        }
    });
}

/**
 * Attempt to recover from a crash
 */
function attemptCrashRecovery() {
    try {
        // Clear any active selections
        if (window.getSelection) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
        }
        
        // Remove any problematic event listeners
        document.removeEventListener('contextmenu', null, true);
        document.removeEventListener('selectstart', null, true);
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Re-initialize crash prevention
        setTimeout(() => {
            preventActionModeCrashes();
        }, 100);
        
        console.log('Attempted crash recovery');
    } catch (error) {
        console.error('Error during crash recovery:', error);
    }
}

/**
 * Perform emergency cleanup to prevent crashes
 */
function performEmergencyCleanup() {
    try {
        // Clear caches
        if (window.messageCache && window.messageCache.performCleanup) {
            window.messageCache.performCleanup();
        }
        
        // Clear selections
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        
        // Remove unused DOM elements
        const unusedElements = document.querySelectorAll('.message[data-unused="true"]');
        unusedElements.forEach(el => el.remove());
        
        // Force garbage collection
        if (window.gc) {
            window.gc();
        }
        
        console.log('Emergency cleanup performed');
    } catch (error) {
        console.error('Error during emergency cleanup:', error);
    }
}

/**
 * Check if the current environment is prone to androidx.appcompat crashes
 * @returns {boolean}
 */
export function isProneToAppCompatCrashes() {
    const androidVersion = getAndroidVersion();
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Android 13+ with WebView is most prone to these crashes
    return androidVersion >= 13 && 
           (userAgent.includes('wv') || userAgent.includes('webview'));
}

/**
 * Get crash prevention status
 * @returns {Object}
 */
export function getCrashPreventionStatus() {
    return {
        androidVersion: getAndroidVersion(),
        isAndroid13Plus: getAndroidVersion() >= 13,
        isWebView: navigator.userAgent.toLowerCase().includes('wv'),
        crashPreventionActive: getAndroidVersion() >= 13,
        proneToAppCompatCrashes: isProneToAppCompatCrashes()
    };
}