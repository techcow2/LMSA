// Prompt Preview functionality for new chats
import { userInput, messagesContainer } from './dom-elements.js';
import { isFirstMessage } from './chat-service.js';
import { debugLog } from './utils.js';

let previewArea = null;
let previewText = null;
let isPreviewVisible = false;
let hideTimeout = null;
let actualInputValue = ''; // Store the actual input value
let isPreviewMode = false;
let firstMessageSent = false; // Track if first message has been sent in this session

/**
 * Initialize the prompt preview functionality
 */
export function initializePromptPreview() {
    previewArea = document.getElementById('prompt-preview-area');
    previewText = document.getElementById('prompt-preview-text');
    
    if (!previewArea || !previewText || !userInput) {
        debugLog('Prompt preview elements not found, skipping initialization');
        return;
    }
    
    // Make preview text editable
    previewText.setAttribute('contenteditable', 'true');
    previewText.setAttribute('spellcheck', 'false');
    previewText.setAttribute('autocorrect', 'off');
    previewText.setAttribute('autocapitalize', 'off');
    previewText.setAttribute('tabindex', '0');
    previewText.setAttribute('role', 'textbox');
    previewText.setAttribute('aria-label', 'Type your message here');
    
    // For Android WebView, use simplified direct editing
    if (isAndroidWebView()) {
        initializeAndroidWebViewPreview();
        return;
    }
    
    // Add input event listener
    userInput.addEventListener('input', handleInputChange);
    
    // Add keyboard event listeners for better handling
    userInput.addEventListener('keydown', handleKeyDown);
    userInput.addEventListener('keyup', handleKeyUp);
    
    // Ensure composition events are ignored for prompt preview
    userInput.addEventListener('compositionstart', function(e) {
        if (isAndroidWebView()) {
            // Let Android handle composition naturally
            return;
        }
    });
    
    userInput.addEventListener('compositionend', function(e) {
        if (isAndroidWebView()) {
            // Let Android handle composition naturally
            return;
        }
    });
    
    // Add focus event listener
    userInput.addEventListener('focus', handleInputFocus);
    
    // Add blur event listener with delay
    userInput.addEventListener('blur', handleInputBlur);
    
    // Add click handlers for expanded focus area
    initializeExpandedFocusArea();
    
    debugLog('Prompt preview initialized');
}

/**
 * Check if this is truly a new chat (no messages)
 */
function isNewChat() {
    if (!messagesContainer) return false;
    
    // Check if there are any message elements in the container
    const messages = messagesContainer.querySelectorAll('.message, .user-message, .ai-message');
    return messages.length === 0;
}

/**
 * Check if running in Android WebView
 */
function isAndroidWebView() {
    return document.body.classList.contains('android-webview');
}

/**
 * Initialize simplified preview for Android WebView
 */
function initializeAndroidWebViewPreview() {
    debugLog('Initializing Android WebView preview with direct editing');
    
    // Show preview immediately for new chats
    if (shouldPreviewBeAvailable()) {
        showPreview('');
    }
    
    // Add input event listener to the editable preview text
    previewText.addEventListener('input', function(e) {
        actualInputValue = previewText.textContent || '';
        debugLog('Android WebView preview input:', actualInputValue);
    });
    
    // Handle keyboard events specifically for the preview text
    previewText.addEventListener('keydown', function(e) {
        debugLog('Android WebView preview keydown:', e.key);
        // Allow all keyboard input - don't prevent default or stop propagation
        // This ensures normal typing works without requiring CTRL
    });
    
    previewText.addEventListener('keyup', function(e) {
        debugLog('Android WebView preview keyup:', e.key);
        // Update the actual input value after key events
        actualInputValue = previewText.textContent || '';
    });
    
    // Handle composition events for virtual keyboard
    previewText.addEventListener('compositionstart', function(e) {
        debugLog('Android WebView preview composition start');
        // Allow composition events to work naturally
    });
    
    previewText.addEventListener('compositionupdate', function(e) {
        debugLog('Android WebView preview composition update:', e.data);
        // Allow composition events to work naturally
    });
    
    previewText.addEventListener('compositionend', function(e) {
        debugLog('Android WebView preview composition end:', e.data);
        actualInputValue = previewText.textContent || '';
        // Allow composition events to work naturally
    });
    
    // Handle focus on the preview text
    previewText.addEventListener('focus', function(e) {
        debugLog('Android WebView preview focused');
        if (shouldPreviewBeAvailable()) {
            isPreviewMode = true;
            showPreview(actualInputValue);
        }
    });
    
    // Sync preview content to hidden input field for submission
    previewText.addEventListener('blur', function(e) {
        debugLog('Android WebView preview blurred');
        if (userInput) {
            userInput.value = actualInputValue;
        }
    });
    
    debugLog('Android WebView preview initialized with direct editing');
}

/**
 * Check if preview should be available (only for the very first message of a brand new chat)
 */
function shouldPreviewBeAvailable() {
    return isFirstMessage && isNewChat() && !firstMessageSent;
}

/**
 * Initialize expanded focus area - make the entire area between header and input clickable
 */
function initializeExpandedFocusArea() {
    // Find the main chat container
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
    // Add click handler to the chat container
    chatContainer.addEventListener('click', handleChatContainerClick);
    
    // Add click handler to the preview area to prevent blur
    if (previewArea) {
        previewArea.addEventListener('click', handlePreviewAreaClick);
        
        // Add specific handler for Android WebView to always focus input
        if (isAndroidWebView()) {
            previewArea.addEventListener('click', function(e) {
                // Don't prevent default or stop propagation to allow normal interaction
                if (userInput) {
                    userInput.focus();
                    userInput.click();
                }
            });
        }
    }
    
    // Add click handler to the preview text to prevent blur
    if (previewText) {
        previewText.addEventListener('click', handlePreviewTextClick);
    }
    
    // Add global click handler to detect clicks outside the expanded area
    document.addEventListener('click', handleGlobalClick);
}

/**
 * Handle clicks in the chat container area
 */
function handleChatContainerClick(event) {
    try {
        // Only handle for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Don't interfere if clicking on specific interactive elements
        const target = event.target;
        if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea')) {
            return;
        }
        
        // Don't interfere if clicking on the welcome message
        if (target.closest('#welcome-message')) {
            return;
        }
        
        // Focus the input field to activate preview mode
        if (userInput) {
            userInput.focus();
        }
        
    } catch (error) {
        console.error('Error in chat container click handler:', error);
    }
}

/**
 * Handle clicks in the preview area
 */
function handlePreviewAreaClick(event) {
    try {
        // Only handle for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Ensure input stays focused
        if (userInput) {
            userInput.focus();
        }
        
        // Prevent event from bubbling up
        event.stopPropagation();
        
    } catch (error) {
        console.error('Error in preview area click handler:', error);
    }
}

/**
 * Handle clicks on the preview text
 */
function handlePreviewTextClick(event) {
    try {
        // Only handle for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Ensure input stays focused
        if (userInput) {
            userInput.focus();
        }
        
        // Prevent event from bubbling up
        event.stopPropagation();
        
    } catch (error) {
        console.error('Error in preview text click handler:', error);
    }
}

/**
 * Handle global clicks to detect clicks outside the expanded focus area
 */
function handleGlobalClick(event) {
    try {
        // Only handle for the very first message of a brand new chat and when preview is active
        if (!shouldPreviewBeAvailable() || !isPreviewMode) {
            return;
        }
        
        const target = event.target;
        const chatContainer = document.getElementById('chat-container');
        const header = document.querySelector('header');
        const chatForm = document.getElementById('chat-form');
        
        // Check if click is outside the expanded focus area
        const isOutsideExpandedArea = (
            // Not in chat container
            (!chatContainer || !chatContainer.contains(target)) &&
            // Not in header
            (!header || !header.contains(target)) &&
            // Not in chat form
            (!chatForm || !chatForm.contains(target)) &&
            // Not in preview area
            (!previewArea || !previewArea.contains(target))
        );
        
        if (isOutsideExpandedArea) {
            // Clear any pending hide timeout
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            
            // Hide the preview
            isPreviewMode = false;
            hidePreview();
        }
        
    } catch (error) {
        console.error('Error in global click handler:', error);
    }
}

/**
 * Handle keyboard input
 */
function handleKeyDown(event) {
    try {
        // Skip all handling for Android WebView to prevent input conflicts
        if (isAndroidWebView()) {
            return;
        }
        
        // Only handle for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Don't interfere with special keys
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
            return;
        }
        
        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Handle backspace
        if (event.key === 'Backspace') {
            actualInputValue = actualInputValue.slice(0, -1);
            // Keep preview visible even when text is empty
            showPreview(actualInputValue);
            // Don't prevent default to ensure proper input handling
            // Let the browser handle backspace naturally
            return;
        }
        
        // Handle regular character input
        if (event.key.length === 1) {
            actualInputValue += event.key;
            isPreviewMode = true;
            showPreview(actualInputValue);
            // Don't prevent default to ensure proper input handling
            // Let the browser handle all input naturally
        }
    } catch (error) {
        console.error('Error in prompt preview keydown handler:', error);
    }
}

/**
 * Handle key up events
 */
function handleKeyUp(event) {
    // Skip all handling for Android WebView to prevent input conflicts
    if (isAndroidWebView()) {
        return;
    }
    
    // Ensure input field stays empty in preview mode
    if (isPreviewMode && userInput && userInput.value !== '') {
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset height
    }
}

/**
 * Handle input changes (fallback)
 */
function handleInputChange(event) {
    try {
        // Skip all handling for Android WebView to prevent input conflicts
        if (isAndroidWebView()) {
            return;
        }
        
        const inputValue = event.target.value;
        
        // Only show preview for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            isPreviewMode = false;
            actualInputValue = inputValue;
            hidePreview();
            return;
        }
        
        // Handle Android WebView differently - sync input with preview
        if (isAndroidWebView() && isPreviewMode && inputValue !== actualInputValue) {
            actualInputValue = inputValue;
            showPreview(actualInputValue);
        }
        // If somehow text got into the input field, move it to preview
        else if (inputValue && !isPreviewMode) {
            actualInputValue = inputValue;
            isPreviewMode = true;
            if (!isAndroidWebView()) {
                userInput.value = '';
                userInput.style.height = 'auto'; // Reset height
            }
            showPreview(actualInputValue);
        }
    } catch (error) {
        console.error('Error in prompt preview input handler:', error);
    }
}

/**
 * Handle input focus
 */
function handleInputFocus() {
    try {
        // Skip all handling for Android WebView to prevent input conflicts
        if (isAndroidWebView()) {
            return;
        }
        
        // Only show preview for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Always show preview when focusing on a new chat
        isPreviewMode = true;
        
        // If there's existing text in the preview area, keep it there
        // If the preview is already visible, just ensure it stays visible
        if (!isPreviewVisible) {
            showPreview(actualInputValue);
        }
        
    } catch (error) {
        console.error('Error in prompt preview focus handler:', error);
    }
}

/**
 * Handle input blur with delay
 */
function handleInputBlur(event) {
    // Skip all handling for Android WebView to prevent input conflicts
    if (isAndroidWebView()) {
        return;
    }
    
    // Add a longer delay before hiding to give user time to return to input
    hideTimeout = setTimeout(() => {
        // Check if the user clicked within the expanded focus area
        const activeElement = document.activeElement;
        const chatContainer = document.getElementById('chat-container');
        
        // Don't hide if focus is still within the chat container or preview area
        if (activeElement && (
            activeElement === userInput ||
            (chatContainer && chatContainer.contains(activeElement)) ||
            (previewArea && previewArea.contains(activeElement))
        )) {
            return;
        }
        
        // Only hide if we're still in preview mode and user hasn't returned
        if (isPreviewMode) {
            // Don't restore text to input field - keep it in preview
            isPreviewMode = false;
            hidePreview();
        }
    }, 200); // Reduced delay since we have better detection
}

/**
 * Show the preview area with the given text
 */
function showPreview(text = '') {
    if (!previewArea || !previewText) return;
    
    // Update the preview text (empty string will show the placeholder)
    previewText.textContent = text;
    
    // Show the preview area if not already visible
    if (!isPreviewVisible) {
        previewArea.classList.remove('hidden', 'hide');
        previewArea.classList.add('show');
        
        // Add class to body to style the input field
        document.body.classList.add('preview-active');
        
        isPreviewVisible = true;
        
        debugLog('Prompt preview shown');
    }
}

/**
 * Hide the preview area
 */
function hidePreview() {
    if (!previewArea || !isPreviewVisible) return;
    
    // Remove class from body to show input text and cursor again
    document.body.classList.remove('preview-active');
    
    // Add hide animation
    previewArea.classList.remove('show');
    previewArea.classList.add('hide');
    
    // Hide completely after animation
    setTimeout(() => {
        if (previewArea.classList.contains('hide')) {
            previewArea.classList.add('hidden');
            previewArea.classList.remove('hide');
            isPreviewVisible = false;
        }
    }, 300);
    
    debugLog('Prompt preview hidden');
}

/**
 * Force hide the preview (called when chat is submitted or new chat is started)
 */
export function forceHidePreview() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    
    // Only restore the actual value to the input field when submitting (not when just hiding)
    if (isPreviewMode && userInput && actualInputValue) {
        userInput.value = actualInputValue;
    }
    
    // Reset state
    isPreviewMode = false;
    actualInputValue = '';
    
    // Immediately remove the preview-active class
    document.body.classList.remove('preview-active');
    
    hidePreview();
}

/**
 * Check if preview should be shown based on current state
 */
export function shouldShowPreview() {
    return shouldPreviewBeAvailable() && actualInputValue.trim().length > 0;
}

/**
 * Mark that the first message has been sent (called when form is submitted)
 */
export function markFirstMessageSent() {
    firstMessageSent = true;
    debugLog('First message sent, preview disabled for this session');
}

/**
 * Get the actual input value (for form submission)
 */
export function getActualInputValue() {
    // For Android WebView, use the preview text content if in preview mode
    if (isAndroidWebView()) {
        if (isPreviewMode && previewText) {
            return previewText.textContent || '';
        }
        return userInput ? userInput.value : '';
    }
    return isPreviewMode ? actualInputValue : (userInput ? userInput.value : '');
}

/**
 * Reset preview state (called when starting a new chat)
 */
export function resetPreviewState() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    
    // Reset all state
    isPreviewMode = false;
    actualInputValue = '';
    firstMessageSent = false; // Reset for new chat
    
    // Remove the preview-active class
    document.body.classList.remove('preview-active');
    
    // Clear preview text
    if (previewText) {
        previewText.textContent = '';
    }
    
    // Clear input field
    if (userInput) {
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset height
    }
    
    // Hide preview if visible
    if (isPreviewVisible) {
        hidePreview();
    }
    
    debugLog('Prompt preview state reset');
}

/**
 * Simplified Android WebView input change handler
 */
function handleInputChangeAndroid(event) {
    try {
        const inputValue = event.target.value;
        
        // Only show preview for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Simple synchronization - just show the input value in the preview
        actualInputValue = inputValue;
        showPreview(actualInputValue);
        
    } catch (error) {
        console.error('Error in Android prompt preview input handler:', error);
    }
}

/**
 * Simplified Android WebView focus handler
 */
function handleInputFocusAndroid() {
    try {
        // Only show preview for the very first message of a brand new chat
        if (!shouldPreviewBeAvailable()) {
            return;
        }
        
        // Show preview when focusing
        isPreviewMode = true;
        showPreview(actualInputValue);
        
    } catch (error) {
        console.error('Error in Android prompt preview focus handler:', error);
    }
}

/**
 * Simplified Android WebView blur handler
 */
function handleInputBlurAndroid() {
    try {
        // Add a delay before hiding
        hideTimeout = setTimeout(() => {
            if (isPreviewMode && shouldPreviewBeAvailable()) {
                isPreviewMode = false;
                hidePreview();
            }
        }, 300);
        
    } catch (error) {
        console.error('Error in Android prompt preview blur handler:', error);
    }
}