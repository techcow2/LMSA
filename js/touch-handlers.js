// Touch event handlers for mobile devices with performance optimizations
import { messagesContainer, userInput } from './dom-elements.js';
import { ensureCursorVisible } from './utils.js';
import { getDevicePerformanceLevel, throttle } from './performance-utils.js';

/**
 * Initializes touch event handlers with adaptive performance optimizations
 */
export async function initializeTouchHandlers() {
    const performanceLevel = getDevicePerformanceLevel();
    console.log(`Initializing touch handlers for ${performanceLevel} performance device`);

    // Create throttled touch handler for low-end devices
    const touchMoveHandler = (performanceLevel === 'low')
        ? throttle(handleTouchMove, 16) // 60fps for low-end
        : handleTouchMove;

    function handleTouchMove(e) {
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
                                     e.target.closest('.settings-step.active') !== null ||
                                     e.target.closest('#whats-new-modal') !== null ||
                                     e.target.closest('.file-previews') !== null;

        // If not in any scrollable container, prevent default behavior
        if (!isMonacoElement && !isScrollableContainer) {
            e.preventDefault();
        }
    }

    // Prevent default touch behavior except for scrollable containers
    document.body.addEventListener('touchmove', touchMoveHandler, { passive: false });

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

        // Consolidated function to handle all input field interactions with performance optimization
        const handleInputInteraction = (performanceLevel === 'low')
            ? throttle(function(e) {
                e.stopPropagation();

                // Ensure messagesContainer exists
                if (!messagesContainer) return;

                // Use requestAnimationFrame for smoother scrolling
                requestAnimationFrame(() => {
                    // Scroll to bottom when user interacts with input field (only if auto-scroll is not disabled)
                    const disableAutoScroll = localStorage.getItem('disableAutoScroll') === 'true';
                    if (!disableAutoScroll) {
                        scrollToBottom(messagesContainer, true);
                    }
                });
            }, 100) // Throttle for low-end devices (10fps)
            : function(e) {
                e.stopPropagation();

                // Ensure messagesContainer exists
                if (!messagesContainer) return;

                // Use requestAnimationFrame for smoother scrolling
                requestAnimationFrame(() => {
                    // Scroll to bottom when user interacts with input field (only if auto-scroll is not disabled)
                    const disableAutoScroll = localStorage.getItem('disableAutoScroll') === 'true';
                    if (!disableAutoScroll) {
                        scrollToBottom(messagesContainer, true);
                    }
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
