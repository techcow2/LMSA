// Touch event handlers for mobile devices
import { messagesContainer, userInput } from './dom-elements.js';
import { ensureCursorVisible, debugLog } from './utils.js';
import { touchOptimizer, performanceMonitor } from './performance-optimizer.js';

/**
 * Initializes touch event handlers
 */
export async function initializeTouchHandlers() {
    debugLog(`Initializing touch handlers`);

    // Disable touch interference for scrollable areas - let browser handle natively
    // The CSS already has proper touch scrolling configured with:
    // - overflow-y: auto
    // - -webkit-overflow-scrolling: touch
    // - transform: translateZ(0) for hardware acceleration
    
    // No custom touch handling needed for messages container
    debugLog('Touch handlers simplified - relying on native browser scrolling');

    // Allow scrolling within the messages container
    if (messagesContainer) {
        // Don't interfere with native scrolling - remove touch move handler
        // The browser handles scrolling naturally when no preventDefault is called
    }

    // Allow scrolling within the settings modal scrollable areas
    const settingsContentWrapper = document.getElementById('settings-content-wrapper');
    if (settingsContentWrapper) {
        settingsContentWrapper.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }

    // Allow scrolling within the What's New modal
    const whatsNewModal = document.getElementById('whats-new-modal');
    if (whatsNewModal) {
        whatsNewModal.addEventListener('touchmove', function(e) {
            // Check if the touch is within the features container (scrollable area)
            if (e.target.closest('.features-container')) {
                e.stopPropagation();
            }
        }, { passive: true });
    }

    // File preview system has been removed

    // Prevent sidebar toggle when interacting with chat input
    if (userInput) {
        // Import scrollToBottom function directly to avoid dynamic imports
        const { scrollToBottom } = await import('./utils.js');

        // Function to handle all input field interactions
        function handleInputInteraction(e) {
            e.stopPropagation();
            // Remove auto-scroll when touching input field
        }

        // Add event listeners for all interaction types
        userInput.addEventListener('focus', handleInputInteraction);
        userInput.addEventListener('click', handleInputInteraction);
        userInput.addEventListener('touchstart', handleInputInteraction);
        userInput.addEventListener('touchend', handleInputInteraction);

        // Add input event listener to ensure cursor is visible when typing
        userInput.addEventListener('input', () => {
            ensureCursorVisible(userInput);
        });
    }

    debugLog('Touch handlers initialized');
}
