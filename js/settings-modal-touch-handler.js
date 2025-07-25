// Touch handler for settings modal scrolling
import { settingsModal } from './dom-elements.js';
import { debugLog } from './utils.js';

/**
 * Initializes touch handling for the settings modal scrollable areas
 * Ensures touch scrolling works properly on touchscreens
 */
export function initializeSettingsModalTouchHandler() {
    if (!settingsModal) return;

    // Get the scrollable elements in the settings modal
    const settingsContentWrapper = document.getElementById('settings-content-wrapper');

    // If the settings content wrapper exists, add touch event listeners
    if (settingsContentWrapper) {
        // Ensure touch events are properly handled
        settingsContentWrapper.addEventListener('touchstart', function(e) {
            // Allow default behavior for touch events in scrollable areas
            e.stopPropagation();
        }, { passive: true });

        settingsContentWrapper.addEventListener('touchmove', function(e) {
            // Allow default behavior for touch events in scrollable areas
            e.stopPropagation();
        }, { passive: true });

        settingsContentWrapper.addEventListener('touchend', function(e) {
            // Allow default behavior for touch events in scrollable areas
            e.stopPropagation();
        }, { passive: true });
    }

    // Add specific touch event handlers for navigation buttons
    const navigationButtons = [
        'to-prompt-step-btn',
        'back-to-connection-btn',
        'to-options-step-btn',
        'back-to-prompt-btn',
        'to-actions-step-btn',
        'back-to-options-btn'
    ];

    // Get the navigation buttons container
    const navButtonsContainer = document.getElementById('settings-navigation-buttons');
    if (navButtonsContainer) {
        // Add touch events to the container
        navButtonsContainer.addEventListener('touchstart', function(e) {
            // Allow default behavior for touch events in the navigation area
            e.stopPropagation();
        }, { passive: true });

        navButtonsContainer.addEventListener('touchmove', function(e) {
            // Allow default behavior for touch events in the navigation area
            e.stopPropagation();
        }, { passive: true });

        navButtonsContainer.addEventListener('touchend', function(e) {
            // Allow default behavior for touch events in the navigation area
            e.stopPropagation();
        }, { passive: true });
    }

    // Add touch event handlers to each navigation button
    navigationButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            // Remove any existing event listeners by cloning and replacing
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Add click event with stopPropagation
            newButton.addEventListener('click', function(e) {
                debugLog(`Navigation button ${buttonId} clicked`);
                e.stopPropagation();
            });

            // Add touch events with stopPropagation
            newButton.addEventListener('touchstart', function(e) {
                debugLog(`Navigation button ${buttonId} touchstart`);
                e.stopPropagation();
            }, { passive: false });

            newButton.addEventListener('touchend', function(e) {
                debugLog(`Navigation button ${buttonId} touchend`);
                e.preventDefault();
                e.stopPropagation();
                // Trigger a click event to ensure the button action is performed
                newButton.click();
            }, { passive: false });
        }
    });

    // Add touch event listeners to each active settings step
    settingsModal.addEventListener('click', function() {
        // Get all active settings steps
        const activeSteps = settingsModal.querySelectorAll('.settings-step.active');

        // Add touch event listeners to each active step
        activeSteps.forEach(step => {
            // Ensure touch events are properly handled
            step.addEventListener('touchstart', function(e) {
                // Allow default behavior for touch events in scrollable areas
                e.stopPropagation();
            }, { passive: true });

            step.addEventListener('touchmove', function(e) {
                // Allow default behavior for touch events in scrollable areas
                e.stopPropagation();
            }, { passive: true });

            step.addEventListener('touchend', function(e) {
                // Allow default behavior for touch events in scrollable areas
                e.stopPropagation();
            }, { passive: true });
        });
    });
}
