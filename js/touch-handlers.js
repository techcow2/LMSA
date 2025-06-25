// Touch event handlers for mobile devices with performance optimizations
import { messagesContainer, userInput } from './dom-elements.js';
import { ensureCursorVisible } from './utils.js';
import { getDevicePerformanceLevel, throttle, detectAdMobEnvironment, createAdMobOptimizedScrollHandler } from './performance-utils.js';

/**
 * Initializes touch event handlers with adaptive performance optimizations
 */
export async function initializeTouchHandlers() {
    const performanceLevel = getDevicePerformanceLevel();
    const isAdMobEnv = detectAdMobEnvironment();
    console.log(`Initializing touch handlers for ${performanceLevel} performance device (AdMob: ${isAdMobEnv})`);

    // Create throttled touch handler for low-end devices and AdMob environments
    const touchMoveHandler = (performanceLevel === 'low' || isAdMobEnv)
        ? throttle(handleTouchMove, isAdMobEnv ? 33 : 16) // 30fps for AdMob, 60fps for low-end
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
                                     e.target.closest('#whats-new-modal') !== null;

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

    // Prevent sidebar toggle when interacting with chat input
    if (userInput) {
        // Import scrollToBottom function directly to avoid dynamic imports
        const { scrollToBottom } = await import('./utils.js');

        // Consolidated function to handle all input field interactions with performance optimization
        const handleInputInteraction = (performanceLevel === 'low' || isAdMobEnv)
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
            }, isAdMobEnv ? 150 : 100) // More aggressive throttling for AdMob (6.7fps vs 10fps for low-end)
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
