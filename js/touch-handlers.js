// Touch event handlers for mobile devices
import { messagesContainer, userInput } from './dom-elements.js';
import { ensureCursorVisible, debugLog } from './utils.js';

/**
 * Initializes touch event handlers
 */
export async function initializeTouchHandlers() {
    debugLog(`Initializing touch handlers`);

    function handleTouchMove(e) {
        // Monaco Editor removed - no need to check for Monaco elements

        // Check if the touch is within other scrollable containers
        const isScrollableContainer = e.target.closest('#messages') !== null ||
                                     e.target.closest('#user-input') !== null ||
                                     e.target.closest('#chat-form') !== null ||
                                     e.target.closest('#chat-history') !== null ||
                                     e.target.closest('#settings-content-wrapper') !== null ||
                                     e.target.closest('.settings-step.active') !== null ||
                                     e.target.closest('#whats-new-modal') !== null ||
                                     e.target.closest('.file-previews') !== null;

        // If not in any scrollable container, prevent default behavior
        if (!isScrollableContainer) {
            e.preventDefault();
        }
    }

    // Prevent default touch behavior except for scrollable containers
    document.body.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Allow scrolling within the messages container
    if (messagesContainer) {
        messagesContainer.addEventListener('touchmove', function(e) {
            // Monaco Editor removed - no special handling needed

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

    // Allow scrolling within the file previews container
    function setupFilePreviewsScrolling() {
        const filePreviewsContainer = document.querySelector('.file-previews');
        if (filePreviewsContainer) {
            filePreviewsContainer.addEventListener('touchmove', function(e) {
                e.stopPropagation();
            }, { passive: true });
        }
    }

    // Set up file previews scrolling initially
    setupFilePreviewsScrolling();

    // Set up a MutationObserver to handle dynamically added file preview containers
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node is a file previews container or contains one
                    if (node.classList && node.classList.contains('file-previews')) {
                        node.addEventListener('touchmove', function(e) {
                            e.stopPropagation();
                        }, { passive: true });
                    }
                    // Also check for file previews containers within the added node
                    const filePreviewsContainers = node.querySelectorAll('.file-previews');
                    filePreviewsContainers.forEach(function(container) {
                        container.addEventListener('touchmove', function(e) {
                            e.stopPropagation();
                        }, { passive: true });
                    });
                }
            });
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Store observer reference for potential cleanup
    if (!window.touchHandlerObserver) {
        window.touchHandlerObserver = observer;
    }

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
