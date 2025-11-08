// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { showExternalSiteModal } from './external-site-confirmation-modal.js';

// DOM Elements
const whatsNewModal = document.getElementById('whats-new-modal');
const closeWhatsNewButton = document.getElementById('close-whats-new');
const gotItButton = document.getElementById('got-it-whats-new');
const versionElement = document.getElementById('whats-new-version');

// Local storage keys
const WHATS_NEW_VERSION = '8.9'; // Updated for new features: Age gate and terms acceptance for safety, Default model selection

// Flag to track if the modal has been shown in the current session
let modalShownInCurrentSession = false;

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
        // Set the version number in the UI
        if (versionElement) {
            versionElement.textContent = WHATS_NEW_VERSION;
        }

        // Add modal-open class to html and body to help with touch handling and prevent background interaction
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        
        // Prevent scrolling of the body
        document.body.style.overflow = 'hidden';

        // Fix touch scrolling for the modal
        setupTouchScrolling();

        // Adjust modal height immediately to prevent dragging during animation
        adjustModalHeight();
        
        // For forced shows (like from side menu), ensure it runs again after DOM is fully ready
        if (forceShow) {
            setTimeout(() => {
                adjustModalHeight();
            }, 50);
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
                modalContent
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

        // Adjust modal height again after animation completes to ensure accuracy
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
        // For version 8.8, save to dismissal tracking; for others, use the original logic
        if (WHATS_NEW_VERSION === '8.8') {
            localStorage.setItem('whatsNewDismissedVersion', WHATS_NEW_VERSION);
        } else {
            localStorage.setItem('whatsNewSeenVersion', WHATS_NEW_VERSION);
        }

        const modalContent = whatsNewModal.querySelector('.modal-content');
        if (modalContent) {
            // Get all feature items for resetting later
            const featureItems = modalContent.querySelectorAll('.feature-item');

            // Apply exit animation to the content
            modalContent
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
                        modalContent
                        modalContent.style.transform = '';
                        modalContent.style.opacity = '';

                        // Reset feature item styles
                        featureItems.forEach(item => {
                            item
                            item.style.transform = '';
                            item.style.opacity = '';
                        });
                    }

                    // Remove resize event listener when modal is hidden
                    window.removeEventListener('resize', adjustModalHeight);

                    // Remove modal-open class from html and body
                    document.documentElement.classList.remove('modal-open');
                    document.body.classList.remove('modal-open');
                    
                    // Restore body scrolling
                    document.body.style.overflow = '';

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
                window.removeEventListener('resize', adjustModalHeight);
                
                // Remove modal-open class from html and body
                document.documentElement.classList.remove('modal-open');
                document.body.classList.remove('modal-open');
                
                // Restore body scrolling
                document.body.style.overflow = '';
                
                checkAndShowWelcomeMessage();
            }, 300);
        }
    }
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

        // Always allow scrolling to ensure users can access all content
        featuresContainer.classList.add('overflow-y-auto');
        featuresContainer.classList.remove('overflow-y-hidden');
        // Enable touch scrolling properties
        featuresContainer.style.webkitOverflowScrolling = 'touch';
        featuresContainer.style.touchAction = 'pan-y';
        featuresContainer.style.overscrollBehavior = 'contain';
        // Ensure overflow is set for scrolling
        featuresContainer.style.overflow = 'auto';
    }
}

/**
 * Attaches event handler to the "Locate order number" link in What's New modal
 */
function attachLocateOrderNumberHandler() {
    const whatsNewLocateOrderLink = document.getElementById('whats-new-locate-order-number-link');
    if (whatsNewLocateOrderLink) {
        whatsNewLocateOrderLink.addEventListener('click', (e) => {
            e.preventDefault();
            whatsNewLocateOrderLink.classList.add('active-scale');

            // Close the What's New modal first
            hideWhatsNewModal();

            setTimeout(() => {
                const orderNumberUrl = 'https://support.google.com/store/answer/13714320?hl=en';
                showExternalSiteModal(orderNumberUrl);
                whatsNewLocateOrderLink.classList.remove('active-scale');
            }, 200);
        });
    }
}

/**
 * Sets up proper touch scrolling for the What's New modal
 */
function setupTouchScrolling() {
    const featuresContainer = document.querySelector('#whats-new-modal .features-container');
    const modalContent = document.querySelector('#whats-new-modal .modal-content');

    if (featuresContainer) {
        // Remove any conflicting classes that might interfere with native scrolling
        featuresContainer.classList.remove('drag-scrollable');
        modalContent?.classList.remove('drag-scrollable');

        // Set basic scrolling styles (specific touch properties will be set by adjustModalHeight)
        featuresContainer.style.msOverflowStyle = '-ms-autohiding-scrollbar';

        // Remove any existing touch event listeners that might conflict
        const newFeaturesContainer = featuresContainer.cloneNode(true);
        featuresContainer.parentNode.replaceChild(newFeaturesContainer, featuresContainer);

        // Re-attach event handlers after cloning
        attachLocateOrderNumberHandler();
    }
}

/**
 * Initializes the What's New modal functionality
 */
export function initializeWhatsNew() {
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

    // Check if user has dismissed this specific version
    const dismissedVersion = localStorage.getItem('whatsNewDismissedVersion');
    
    // For version 8.8, always show the modal unless user has specifically dismissed it
    if (WHATS_NEW_VERSION === '8.8' && dismissedVersion !== WHATS_NEW_VERSION) {
        // Show the modal after a brief delay for version 8.8
        setTimeout(() => {
            showWhatsNewModal();
        }, 1500); // 1.5 second delay to allow app to finish loading
    } else if (WHATS_NEW_VERSION !== '8.8') {
        // For future versions, use the original logic
        const seenVersion = localStorage.getItem('whatsNewSeenVersion');
        if (seenVersion !== WHATS_NEW_VERSION) {
            setTimeout(() => {
                showWhatsNewModal();
            }, 1500);
        }
    }
}