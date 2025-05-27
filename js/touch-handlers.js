// Touch event handlers for mobile devices
import { messagesContainer, userInput } from './dom-elements.js';
import { ensureCursorVisible } from './utils.js';

/**
 * Initializes touch event handlers
 */
export async function initializeTouchHandlers() {
    // Prevent default touch behavior except for scrollable containers
    document.body.addEventListener('touchmove', function(e) {
        // Check if the touch is within a Monaco editor component
        const isMonacoElement = e.target.closest('.monaco-container') !== null ||
                               e.target.closest('.monaco-editor') !== null ||
                               e.target.closest('.monaco-scrollable-element') !== null ||
                               e.target.closest('.lines-content') !== null ||
                               e.target.closest('.view-lines') !== null ||
                               e.target.closest('.view-line') !== null ||
                               e.target.closest('.view-overlays') !== null;

        // Check if the touch is within other scrollable containers
        const isScrollableContainer = e.target.closest('#messages') !== null ||
                                     e.target.closest('#user-input') !== null ||
                                     e.target.closest('#chat-form') !== null ||
                                     e.target.closest('#chat-history') !== null ||
                                     e.target.closest('#settings-content-wrapper') !== null ||
                                     e.target.closest('.settings-step.active') !== null;

        // If not in any scrollable container, prevent default behavior
        if (!isMonacoElement && !isScrollableContainer) {
            e.preventDefault();
        }
    }, { passive: false });

    // Allow scrolling within the messages container
    if (messagesContainer) {
        messagesContainer.addEventListener('touchmove', function(e) {
            // Check if the touch is within a Monaco editor component
            const isMonacoElement = e.target.closest('.monaco-container') !== null ||
                                   e.target.closest('.monaco-editor') !== null ||
                                   e.target.closest('.monaco-scrollable-element') !== null ||
                                   e.target.closest('.lines-content') !== null ||
                                   e.target.closest('.view-lines') !== null ||
                                   e.target.closest('.view-line') !== null ||
                                   e.target.closest('.view-overlays') !== null;

            // If the touch is within a Monaco editor, let the Monaco editor handle it
            if (isMonacoElement) {
                return;
            }

            // For other elements, allow the messages container to scroll
            e.stopPropagation();
        }, { passive: true });
    }

    // Allow scrolling within the settings modal scrollable areas
    const settingsContentWrapper = document.getElementById('settings-content-wrapper');
    if (settingsContentWrapper) {
        settingsContentWrapper.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }

    // Prevent sidebar toggle when interacting with chat input
    if (userInput) {
        // Import scrollToBottom function directly to avoid dynamic imports
        const { scrollToBottom } = await import('./utils.js');

        // Consolidated function to handle all input field interactions
        const handleInputInteraction = function(e) {
            e.stopPropagation();

            // Ensure messagesContainer exists
            if (!messagesContainer) return;

            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                // Force scroll to bottom when user interacts with input field
                scrollToBottom(messagesContainer, true);
            });
        };

        // Add event listeners for all interaction types
        userInput.addEventListener('focus', handleInputInteraction);
        userInput.addEventListener('click', handleInputInteraction);
        userInput.addEventListener('touchstart', handleInputInteraction);

        // Also handle keyboard events to ensure scrolling when typing starts
        userInput.addEventListener('keydown', function(e) {
            // Only trigger on first keypress
            if (e.target.dataset.hasTyped !== 'true') {
                e.target.dataset.hasTyped = 'true';
                handleInputInteraction(e);

                // Reset the flag after a delay
                setTimeout(() => {
                    delete e.target.dataset.hasTyped;
                }, 5000); // Reset after 5 seconds of no typing
            }
        });

        // Add a direct scroll handler for mobile devices
        userInput.addEventListener('touchmove', function(e) {
            // Allow the default behavior for horizontal scrolling
            e.stopPropagation();
        }, { passive: true });
    }
}
