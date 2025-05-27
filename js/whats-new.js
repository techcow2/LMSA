// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { wasRefreshDueToCodeGeneration, clearRefreshDueToCodeGenerationFlag } from './utils.js';

// DOM Elements
const whatsNewModal = document.getElementById('whats-new-modal');
const closeWhatsNewButton = document.getElementById('close-whats-new');
const gotItButton = document.getElementById('got-it-whats-new');
const dontShowAgainToggle = document.getElementById('dont-show-again');
const versionElement = document.getElementById('whats-new-version');

// Local storage keys
const WHATS_NEW_VERSION = '4.8'; // Updated for Characters feature
const WHATS_NEW_SEEN_KEY = 'whatsNewSeen';
const WHATS_NEW_DONT_SHOW_KEY = 'whatsNewDontShow';



// Flag to track if the modal has been shown in the current session
let modalShownInCurrentSession = false;

/**
 * Loads the user's preference for the "Don't show again" toggle
 */
function loadPreferences() {
    if (dontShowAgainToggle) {
        const dontShow = localStorage.getItem(WHATS_NEW_DONT_SHOW_KEY) === 'true';
        dontShowAgainToggle.checked = dontShow;

        // Update toggle appearance based on checked state
        updateToggleAppearance();
    }
}

/**
 * Updates the toggle appearance based on its checked state
 */
function updateToggleAppearance() {
    if (!dontShowAgainToggle) return;

    const toggleContainer = dontShowAgainToggle.closest('.toggle-container');
    if (!toggleContainer) return;

    const toggleDot = toggleContainer.querySelector('.toggle-dot');
    const toggleDotActive = toggleContainer.querySelector('.toggle-dot-active');

    if (dontShowAgainToggle.checked) {
        if (toggleDotActive) toggleDotActive.style.opacity = '1';
        if (toggleDot) toggleDot.style.opacity = '0';
    } else {
        if (toggleDotActive) toggleDotActive.style.opacity = '0';
        if (toggleDot) toggleDot.style.opacity = '1';
    }
}

/**
 * Shows the What's New modal with smooth transition
 * @param {boolean} forceShow - If true, shows the modal regardless of user preferences
 */
export function showWhatsNewModal(forceShow = false) {
    // If the modal has already been shown in this session and we're not forcing it, don't show it again
    if (modalShownInCurrentSession && !forceShow) {
        return;
    }

    if (whatsNewModal) {
        // Load the user's preference for the "Don't show again" toggle
        loadPreferences();

        // Set the version number in the UI
        if (versionElement) {
            versionElement.textContent = WHATS_NEW_VERSION;
        }



        // Prepare the modal for a smooth entrance
        // First remove hidden class to make the modal visible but transparent
        whatsNewModal.classList.remove('hidden');

        // Force a reflow to ensure the transition works
        void whatsNewModal.offsetWidth;

        // Add fade-in class to trigger the transition
        whatsNewModal.classList.add('fade-in');

        // Add a simple entrance animation to the modal content
        const modalContent = whatsNewModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';

            // Force a reflow
            void modalContent.offsetWidth;

            // Animate in with a slight delay for a smoother sequence
            setTimeout(() => {
                modalContent.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease';
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';

                // Make all feature items visible immediately
                const featureItems = modalContent.querySelectorAll('.feature-item');
                featureItems.forEach(item => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                });
            }, 50);
        }

        // Adjust modal height after modal is visible
        setTimeout(adjustModalHeight, 150);

        // Mark that the modal has been shown in this session
        modalShownInCurrentSession = true;
    }
}

/**
 * Hides the What's New modal with smooth transition
 */
function hideWhatsNewModal() {
    if (whatsNewModal) {
        const modalContent = whatsNewModal.querySelector('.modal-content');
        if (modalContent) {
            // Get all feature items for resetting later
            const featureItems = modalContent.querySelectorAll('.feature-item');

            // Apply exit animation to the content
            modalContent.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';

            // Start fading out the entire modal
            setTimeout(() => {
                whatsNewModal.classList.add('fade-out');

                // Wait for the transition to complete before hiding
                setTimeout(() => {
                    whatsNewModal.classList.remove('fade-out');
                    whatsNewModal.classList.add('hidden');

                    // Reset the content styles for next time
                    if (modalContent) {
                        modalContent.style.transition = '';
                        modalContent.style.transform = '';
                        modalContent.style.opacity = '';

                        // Reset feature item styles
                        featureItems.forEach(item => {
                            item.style.transition = '';
                            item.style.transform = '';
                            item.style.opacity = '';
                        });
                    }

                    // Save the user's preference if they chose not to show again
                    savePreferences();

                    // Remove resize event listener when modal is hidden
                    window.removeEventListener('resize', adjustModalHeight);

                    // Check if welcome message should be shown
                    checkAndShowWelcomeMessage();
                }, 300); // Match this with the CSS transition duration
            }, 100); // Short delay before starting the fade-out
        } else {
            // Fallback if modal content is not found
            whatsNewModal.classList.add('fade-out');
            setTimeout(() => {
                whatsNewModal.classList.remove('fade-out');
                whatsNewModal.classList.add('hidden');
                savePreferences();
                window.removeEventListener('resize', adjustModalHeight);
                checkAndShowWelcomeMessage();
            }, 300);
        }
    }
}

/**
 * Saves the user's preferences to local storage
 */
function savePreferences() {
    if (dontShowAgainToggle && dontShowAgainToggle.checked) {
        localStorage.setItem(WHATS_NEW_DONT_SHOW_KEY, 'true');
        localStorage.setItem(WHATS_NEW_SEEN_KEY, WHATS_NEW_VERSION);
    } else {
        localStorage.removeItem(WHATS_NEW_DONT_SHOW_KEY);
        localStorage.removeItem(WHATS_NEW_SEEN_KEY);
    }
}

/**
 * Checks if the modal should be shown
 * @returns {boolean} True if the modal should be shown
 */
function shouldShowModal() {
    const dontShow = localStorage.getItem(WHATS_NEW_DONT_SHOW_KEY) === 'true';
    const lastSeenVersion = localStorage.getItem(WHATS_NEW_SEEN_KEY);

    // Check if refresh was triggered by code generation
    const isRefreshDueToCode = wasRefreshDueToCodeGeneration();

    // Don't show if user has opted out
    if (dontShow) {
        return false;
    }

    // Don't show if refresh was triggered by code generation
    if (isRefreshDueToCode) {
        return false;
    }

    // Show if never seen before or if version is different
    return !lastSeenVersion || lastSeenVersion !== WHATS_NEW_VERSION;
}

/**
 * Adjusts the modal content to fit all features without scrolling
 * Makes the container height dynamic based on content
 */
function adjustModalHeight() {
    const featuresContainer = document.querySelector('#whats-new-modal .features-container');
    const modalContent = document.querySelector('#whats-new-modal .modal-content');

    if (featuresContainer && modalContent) {
        // Reset any previously set height to get the natural content height
        featuresContainer.style.height = 'auto';
        featuresContainer.style.maxHeight = 'none';

        // Get the content's natural height
        const contentHeight = featuresContainer.scrollHeight;

        // Get the available viewport height
        const viewportHeight = window.innerHeight;

        // Get the header and footer heights
        const header = modalContent.querySelector('.flex.justify-between.items-center.mb-2');
        const footer = modalContent.querySelector('.flex.justify-between.items-center.pt-2');

        const headerHeight = header ? header.offsetHeight : 0;
        const footerHeight = footer ? footer.offsetHeight : 0;

        // Calculate modal padding
        const modalPadding = 24; // 3rem (p-3 class)

        // Calculate the maximum available height for the features container
        // Leave some space (10% of viewport) for padding and margins
        const maxAvailableHeight = viewportHeight * 0.9 - headerHeight - footerHeight - modalPadding;

        // Set the height to either the content height or the max available height, whichever is smaller
        const finalHeight = Math.min(contentHeight, maxAvailableHeight);

        // Apply the calculated height
        featuresContainer.style.height = finalHeight + 'px';

        // If content fits without scrolling, disable scrolling
        if (contentHeight <= finalHeight) {
            featuresContainer.classList.remove('overflow-y-auto');
            featuresContainer.classList.add('overflow-y-hidden');
        } else {
            // Content needs scrolling, ensure scrolling is enabled
            featuresContainer.classList.add('overflow-y-auto');
            featuresContainer.classList.remove('overflow-y-hidden');
        }
    }
}

/**
 * Initializes the What's New modal functionality
 */
export function initializeWhatsNew() {
    // Load the user's preference for the "Don't show again" toggle
    loadPreferences();

    // Always show the modal unless the user has opted out
    if (shouldShowModal()) {
        // Small delay to ensure the app is loaded
        setTimeout(() => showWhatsNewModal(), 1000);
    }

    // Event listeners
    if (closeWhatsNewButton) {
        closeWhatsNewButton.addEventListener('click', () => {
            hideWhatsNewModal();
        });
    }

    if (gotItButton) {
        gotItButton.addEventListener('click', () => {
            hideWhatsNewModal();
        });
    }

    // Add event listener for the toggle to update its appearance
    if (dontShowAgainToggle) {
        dontShowAgainToggle.addEventListener('change', updateToggleAppearance);
    }

    // Close modal when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && whatsNewModal && !whatsNewModal.classList.contains('hidden')) {
            hideWhatsNewModal();
        }
    });

    // Close modal when clicking outside
    whatsNewModal?.addEventListener('click', (e) => {
        if (e.target === whatsNewModal) {
            hideWhatsNewModal();
        }
    });

    // Add window resize listener to adjust modal height when window size changes
    window.addEventListener('resize', adjustModalHeight);
}