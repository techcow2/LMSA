/**
 * Terms of Service Acceptance System
 * Forces users to accept terms before using any app features
 */

// Constants
const TERMS_ACCEPTED_KEY = 'lmsa_terms_accepted';
const TERMS_VERSION_KEY = 'lmsa_terms_version';
const CURRENT_TERMS_VERSION = '2025-11-07'; // Matches effective date

// DOM Elements
let termsModal;
let termsContent;
let acceptButton;
let scrollIndicator;
let mainAppContainer;

// State
let hasScrolledToBottom = false;
let isInitialized = false;

/**
 * Initialize the terms acceptance system
 */
function initializeTermsAcceptance() {
    if (isInitialized) return;

    // Get DOM elements
    termsModal = document.getElementById('terms-modal');
    termsContent = document.getElementById('terms-content');
    acceptButton = document.getElementById('accept-terms-btn');
    scrollIndicator = document.getElementById('scroll-indicator');
    mainAppContainer = document.getElementById('main-app-container');

    if (!termsModal || !termsContent || !acceptButton || !mainAppContainer) {
        console.error('Terms acceptance system: Required DOM elements not found');
        return;
    }

    // Check if terms need to be accepted
    if (hasAcceptedCurrentTerms()) {
        hideTermsModal();
        showMainApp();
        return;
    }

    // Show terms modal
    showTermsModal();
    setupEventListeners();
    isInitialized = true;
}

/**
 * Check if user has accepted the current version of terms
 */
function hasAcceptedCurrentTerms() {
    const acceptedVersion = localStorage.getItem(TERMS_VERSION_KEY);
    const hasAccepted = localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true';
    return hasAccepted && acceptedVersion === CURRENT_TERMS_VERSION;
}

/**
 * Show the terms modal and prevent body scroll
 */
function showTermsModal() {
    termsModal.classList.remove('hidden');
    document.body.classList.add('terms-modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    // Reset scroll state
    hasScrolledToBottom = false;
    updateAcceptButton();

    // Scroll to top of terms
    termsContent.scrollTop = 0;

    // Prevent any app interactions
    hideMainApp();
}

/**
 * Hide the terms modal
 */
function hideTermsModal() {
    termsModal.classList.add('hidden');
    document.body.classList.remove('terms-modal-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
}

/**
 * Show the main application
 */
function showMainApp() {
    mainAppContainer.classList.remove('hidden');
}

/**
 * Hide the main application
 */
function hideMainApp() {
    mainAppContainer.classList.add('hidden');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Scroll event for terms content
    termsContent.addEventListener('scroll', handleScroll);

    // Touch events for terms content to ensure proper touch scrolling
    termsContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    termsContent.addEventListener('touchmove', handleTouchMove, { passive: true });
    termsContent.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Accept button click
    acceptButton.addEventListener('click', handleAcceptTerms);

    // Prevent escape key from closing modal
    document.addEventListener('keydown', handleKeyDown);

    // Prevent click outside modal from closing it
    termsModal.addEventListener('click', handleModalClick);

    // Touch move prevention on body
    document.body.addEventListener('touchmove', preventBodyScroll, { passive: false });
}

/**
 * Handle touch start on terms content
 */
function handleTouchStart(event) {
    // Allow the touch to start normally - this enables touch scrolling
    return true;
}

/**
 * Handle touch move on terms content
 */
function handleTouchMove(event) {
    // Allow touch move for scrolling within the terms content
    // This ensures touch scrolling works properly
    return true;
}

/**
 * Handle touch end on terms content
 */
function handleTouchEnd(event) {
    // After touch ends, check scroll position
    // Use a small timeout to allow the scroll to settle
    setTimeout(() => {
        handleScroll();
    }, 50);
    return true;
}

/**
 * Handle scroll event in terms content
 */
function handleScroll() {
    const scrollElement = termsContent;
    const scrollTop = scrollElement.scrollTop;
    const scrollHeight = scrollElement.scrollHeight;
    const clientHeight = scrollElement.clientHeight;

    // Check if scrolled to bottom (with 10px tolerance)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isAtBottom && !hasScrolledToBottom) {
        hasScrolledToBottom = true;
        scrollIndicator.classList.add('hidden');
        updateAcceptButton();
    } else if (!isAtBottom && hasScrolledToBottom) {
        hasScrolledToBottom = false;
        scrollIndicator.classList.remove('hidden');
        updateAcceptButton();
    }
}

/**
 * Update accept button state based on scroll position
 */
function updateAcceptButton() {
    if (hasScrolledToBottom) {
        acceptButton.disabled = false;
        acceptButton.classList.remove('bg-gray-300', 'dark:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
    } else {
        acceptButton.disabled = true;
        acceptButton.classList.add('bg-gray-300', 'dark:bg-gray-600', 'text-gray-500', 'dark:text-gray-400');
    }
}

/**
 * Handle accept terms button click
 */
async function handleAcceptTerms() {
    if (!hasScrolledToBottom) return;

    // Show loading state
    acceptButton.classList.add('loading');
    acceptButton.disabled = true;

    try {
        // Simulate processing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Save acceptance
        localStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
        localStorage.setItem(TERMS_VERSION_KEY, CURRENT_TERMS_VERSION);

        // Hide modal and show app
        hideTermsModal();
        showMainApp();

        // Clean up event listeners
        cleanupEventListeners();

        console.log('Terms of Service accepted successfully');

        // Initialize the main app now that terms are accepted
        initializeMainApp();

        // Auto-reload the page after terms acceptance to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 100);

    } catch (error) {
        console.error('Error accepting terms:', error);
        // Reset button state on error
        acceptButton.classList.remove('loading');
        acceptButton.disabled = false;
        updateAcceptButton();
    }
}

/**
 * Handle keyboard events
 */
function handleKeyDown(event) {
    // Prevent escape key from closing modal
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
    }

    // Prevent tabbing outside modal
    if (event.key === 'Tab') {
        const focusableElements = termsModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
}

/**
 * Handle clicks on modal overlay
 */
function handleModalClick(event) {
    // Prevent clicks outside content from closing modal
    if (event.target === termsModal) {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * Prevent body scroll when modal is open, but allow scrolling in terms content
 */
function preventBodyScroll(event) {
    if (termsModal && !termsModal.classList.contains('hidden')) {
        // Allow touch events on terms content
        if (termsContent && termsContent.contains(event.target)) {
            return;
        }
        // Prevent touch events elsewhere (body, modal overlay, etc.)
        event.preventDefault();
    }
}

/**
 * Clean up event listeners
 */
function cleanupEventListeners() {
    if (termsContent) {
        termsContent.removeEventListener('scroll', handleScroll);
        termsContent.removeEventListener('touchstart', handleTouchStart);
        termsContent.removeEventListener('touchmove', handleTouchMove);
        termsContent.removeEventListener('touchend', handleTouchEnd);
    }

    if (acceptButton) {
        acceptButton.removeEventListener('click', handleAcceptTerms);
    }

    document.removeEventListener('keydown', handleKeyDown);
    document.body.removeEventListener('touchmove', preventBodyScroll);

    if (termsModal) {
        termsModal.removeEventListener('click', handleModalClick);
    }
}

/**
 * Force re-show terms (for testing or when terms are updated)
 */
function forceShowTerms() {
    localStorage.removeItem(TERMS_ACCEPTED_KEY);
    localStorage.removeItem(TERMS_VERSION_KEY);

    if (isInitialized) {
        cleanupEventListeners();
        isInitialized = false;
    }

    initializeTermsAcceptance();
}

/**
 * Get current terms acceptance status
 */
function getTermsStatus() {
    return {
        hasAccepted: localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true',
        acceptedVersion: localStorage.getItem(TERMS_VERSION_KEY),
        currentVersion: CURRENT_TERMS_VERSION,
        needsAcceptance: !hasAcceptedCurrentTerms()
    };
}

/**
 * Initialize the main app after terms are accepted
 */
function initializeMainApp() {
    // Import and call the main app initialization
    import('./main.js').then(module => {
        // The main.js file already has its own DOMContentLoaded handler
        // that checks for terms acceptance, so we just need to trigger it
        if (typeof module.initializeApp === 'function') {
            module.initializeApp();
        } else {
            // Fallback: try to access the global initializeApp function
            if (typeof window.initializeApp === 'function') {
                window.initializeApp();
            }
        }
    }).catch(error => {
        console.error('Error initializing main app after terms acceptance:', error);
    });
}

/**
 * Reset terms acceptance (for testing purposes)
 */
function resetTermsAcceptance() {
    localStorage.removeItem(TERMS_ACCEPTED_KEY);
    localStorage.removeItem(TERMS_VERSION_KEY);
}

// Export functions for use in other modules
export {
    initializeTermsAcceptance,
    forceShowTerms,
    getTermsStatus,
    resetTermsAcceptance,
    hasAcceptedCurrentTerms
};

// Don't auto-initialize - age verification will initialize this after successful verification