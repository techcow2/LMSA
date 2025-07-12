// WebView Flex and Layout Compatibility Fixes
// Addresses specific issues with flexbox and transforms in Android WebView environments

import { isAndroidWebView, getAndroidVersion } from './android-webview-config.js';

/**
 * Initialize WebView flex and layout fixes
 */
export function initializeWebViewFlexFixes() {
    if (!isAndroidWebView()) {
        console.log('Not in Android WebView, skipping flex fixes');
        return;
    }
    
    console.log('Applying WebView flex and layout compatibility fixes...');
    
    // Apply fixes
    applyFlexboxFixes();
    applyTransformFixes();
    applyLayoutStabilityFixes();
    applyScrollingFixes();
    
    console.log('WebView flex fixes applied successfully');
}

/**
 * Apply flexbox compatibility fixes for WebView
 */
function applyFlexboxFixes() {
    const style = document.createElement('style');
    style.id = 'webview-flex-fixes';
    style.textContent = `
        /* WebView Flexbox Compatibility Fixes */
        
        /* Fix flex container issues in WebView */
        .flex, [style*="display: flex"], [style*="display:flex"] {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
        }
        
        /* Fix flex direction issues */
        .flex-col, [style*="flex-direction: column"], [style*="flex-direction:column"] {
            -webkit-box-orient: vertical !important;
            -webkit-box-direction: normal !important;
            -webkit-flex-direction: column !important;
            flex-direction: column !important;
        }
        
        /* Fix flex alignment issues */
        [style*="justify-content: center"], [style*="justify-content:center"] {
            -webkit-box-pack: center !important;
            -webkit-justify-content: center !important;
            justify-content: center !important;
        }
        
        [style*="align-items: center"], [style*="align-items:center"] {
            -webkit-box-align: center !important;
            -webkit-align-items: center !important;
            align-items: center !important;
        }
        
        /* Fix flex grow/shrink issues */
        .flex-1, [style*="flex: 1"], [style*="flex:1"] {
            -webkit-box-flex: 1 !important;
            -webkit-flex: 1 !important;
            flex: 1 !important;
        }
        
        /* Specific fixes for main layout containers */
        #chat-container {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-orient: vertical !important;
            -webkit-box-direction: normal !important;
            -webkit-flex-direction: column !important;
            flex-direction: column !important;
            min-height: 0 !important;
        }
        
        #messages {
            -webkit-box-flex: 1 !important;
            -webkit-flex-grow: 1 !important;
            flex-grow: 1 !important;
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-orient: vertical !important;
            -webkit-box-direction: normal !important;
            -webkit-flex-direction: column !important;
            flex-direction: column !important;
        }
        
        /* Fix for active character display */
        #active-character-display {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-align: center !important;
            -webkit-align-items: center !important;
            align-items: center !important;
        }
        
        #active-character-display.hidden {
            display: none !important;
        }
        
        /* Fix for welcome message layout */
        #welcome-message {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-align: center !important;
            -webkit-align-items: center !important;
            align-items: center !important;
            -webkit-box-pack: center !important;
            -webkit-justify-content: center !important;
            justify-content: center !important;
        }
        
        /* Fix for header layout */
        header {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-pack: justify !important;
            -webkit-justify-content: space-between !important;
            justify-content: space-between !important;
            -webkit-box-align: center !important;
            -webkit-align-items: center !important;
            align-items: center !important;
        }
        
        /* Fix for sidebar layout */
        .sidebar-section {
            display: -webkit-box !important;
            display: -webkit-flex !important;
            display: flex !important;
            -webkit-box-orient: vertical !important;
            -webkit-box-direction: normal !important;
            -webkit-flex-direction: column !important;
            flex-direction: column !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Apply transform compatibility fixes for WebView
 */
function applyTransformFixes() {
    const androidVersion = getAndroidVersion();
    const isAndroid13Plus = androidVersion >= 13;
    
    const style = document.createElement('style');
    style.id = 'webview-transform-fixes';
    style.textContent = `
        /* WebView Transform Compatibility Fixes */
        
        /* Disable problematic transforms in Android 13+ */
        ${isAndroid13Plus ? `
            .message, .chat-item, .settings-item {
                -webkit-transform: none !important;
                transform: none !important;
                will-change: auto !important;
            }
            
            /* Disable hover transforms that can cause crashes */
            .menu-item:hover,
            .chat-item:hover,
            .character-card:hover {
                -webkit-transform: none !important;
                transform: none !important;
            }
        ` : ''}
        
        /* Safe transform fallbacks */
        [style*="transform:"] {
            -webkit-transform: translateZ(0) !important;
            transform: translateZ(0) !important;
        }
        
        /* Fix for sidebar overlay */
        #sidebar-overlay {
            -webkit-transform: none !important;
            transform: none !important;
            will-change: opacity !important;
        }
        
        /* Fix for modal transforms */
        .modal, .modal-content {
            -webkit-transform: none !important;
            transform: none !important;
        }
        
        /* Disable 3D transforms that can cause issues */
        * {
            -webkit-transform-style: flat !important;
            transform-style: flat !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Apply layout stability fixes
 */
function applyLayoutStabilityFixes() {
    const style = document.createElement('style');
    style.id = 'webview-layout-stability-fixes';
    style.textContent = `
        /* WebView Layout Stability Fixes */
        
        /* Prevent layout shifts */
        body {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
        }
        
        /* Fix viewport issues */
        html, body {
            min-height: 100vh !important;
            min-height: -webkit-fill-available !important;
            overflow-x: hidden !important;
        }
        
        /* Prevent horizontal scrolling */
        * {
            max-width: 100% !important;
            box-sizing: border-box !important;
        }
        
        /* Fix for container overflow */
        .flex-1, .flex {
            min-width: 0 !important;
            min-height: 0 !important;
        }
        
        /* Prevent content from breaking layout */
        pre, code {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            white-space: pre-wrap !important;
        }
        
        /* Fix for message containers */
        #messages > div {
            max-width: 85% !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Apply scrolling fixes for WebView
 */
function applyScrollingFixes() {
    const style = document.createElement('style');
    style.id = 'webview-scrolling-fixes';
    style.textContent = `
        /* WebView Scrolling Fixes */
        
        /* Improve scrolling performance */
        #messages, .messages-container {
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
            scroll-behavior: auto !important;
        }
        
        /* Fix for scroll containers */
        .overflow-y-auto, [style*="overflow-y: auto"] {
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
        }
        
        /* Prevent scroll issues with flex containers */
        .flex-1 {
            overflow: hidden !important;
        }
        
        /* Fix for chat container scrolling */
        #chat-container {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Fix specific flex issues that occur during runtime
 */
export function fixRuntimeFlexIssues() {
    if (!isAndroidWebView()) return;
    
    // Fix flex containers that lose their display property
    const flexContainers = document.querySelectorAll('.flex, [style*="display: flex"], [style*="display:flex"]');
    flexContainers.forEach(container => {
        if (getComputedStyle(container).display !== 'flex') {
            container.style.display = 'flex';
        }
    });
    
    // Fix active character display if it's broken
    const activeCharacterDisplay = document.getElementById('active-character-display');
    if (activeCharacterDisplay && !activeCharacterDisplay.classList.contains('hidden')) {
        const computedStyle = getComputedStyle(activeCharacterDisplay);
        if (computedStyle.display !== 'flex') {
            activeCharacterDisplay.style.display = 'flex';
            activeCharacterDisplay.style.alignItems = 'center';
        }
    }
    
    // Fix welcome message layout
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        const computedStyle = getComputedStyle(welcomeMessage);
        if (computedStyle.display !== 'flex') {
            welcomeMessage.style.display = 'flex';
            welcomeMessage.style.alignItems = 'center';
            welcomeMessage.style.justifyContent = 'center';
        }
    }
}

/**
 * Monitor and fix flex issues periodically
 */
export function startFlexMonitoring() {
    if (!isAndroidWebView()) return;
    
    // Check and fix flex issues every 5 seconds
    setInterval(() => {
        fixRuntimeFlexIssues();
    }, 5000);
    
    // Also fix on resize events
    window.addEventListener('resize', () => {
        setTimeout(fixRuntimeFlexIssues, 100);
    });
    
    // Fix on orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(fixRuntimeFlexIssues, 300);
    });
}