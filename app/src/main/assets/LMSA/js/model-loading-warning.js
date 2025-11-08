// Model Loading Warning Modal functionality
import { debugLog } from './debug-config.js';

let warningModalShown = false;

/**
 * Shows the model loading warning modal if it hasn't been dismissed
 * @returns {Promise<boolean>} - True if warning was shown, false if skipped
 */
export function showModelLoadingWarning() {
    return new Promise((resolve) => {
        // Check if user has chosen not to see this warning again
        const dontShowAgain = localStorage.getItem('dontShowModelLoadingWarning') === 'true';
        
        if (dontShowAgain) {
            debugLog.log('MODEL_MANAGER', 'Model loading warning dismissed by user preference');
            resolve(false);
            return;
        }

        // Check if warning is already shown to prevent multiple instances
        if (warningModalShown) {
            console.log('Model loading warning already shown');
            resolve(false);
            return;
        }

        const warningModal = document.getElementById('model-loading-warning-modal');
        const closeBtn = document.getElementById('close-model-warning-btn');
        const okBtn = document.getElementById('model-warning-ok-btn');
        const dontShowCheckbox = document.getElementById('dont-show-model-warning');

        if (!warningModal || !closeBtn || !okBtn || !dontShowCheckbox) {
            console.error('Model loading warning modal elements not found');
            resolve(false);
            return;
        }

        // Mark as shown
        warningModalShown = true;

        // Show the modal
        warningModal.classList.remove('hidden');
        
        // Add animation class to modal content
        const modalContent = warningModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }

        // Function to close the modal
        const closeModal = () => {
            // Check if "don't show again" is checked
            if (dontShowCheckbox.checked) {
                localStorage.setItem('dontShowModelLoadingWarning', 'true');
                console.log('User chose not to see model loading warning again');
            }

            // Hide the modal with animation
            if (modalContent) {
                modalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    modalContent.classList.remove('animate-modal-out');
                    warningModal.classList.add('hidden');
                    warningModalShown = false;
                    resolve(true);
                }, 300);
            } else {
                warningModal.classList.add('hidden');
                warningModalShown = false;
                resolve(true);
            }
        };

        // Add event listeners (use once: true to prevent memory leaks)
        closeBtn.addEventListener('click', closeModal, { once: true });
        okBtn.addEventListener('click', closeModal, { once: true });

        // Close modal when clicking outside (optional)
        const handleOutsideClick = (e) => {
            if (e.target === warningModal) {
                closeModal();
                warningModal.removeEventListener('click', handleOutsideClick);
            }
        };
        warningModal.addEventListener('click', handleOutsideClick);

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !warningModal.classList.contains('hidden')) {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Focus management for accessibility
        const firstFocusableElement = okBtn;
        const lastFocusableElement = dontShowCheckbox;

        // Focus the OK button when modal opens
        setTimeout(() => {
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }, 100);

        // Trap focus within modal
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusableElement) {
                        e.preventDefault();
                        lastFocusableElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusableElement) {
                        e.preventDefault();
                        firstFocusableElement.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleTabKey);

        // Clean up event listeners when modal closes
        const originalCloseModal = closeModal;
        closeModal = () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleTabKey);
            warningModal.removeEventListener('click', handleOutsideClick);
            originalCloseModal();
        };

        console.log('Model loading warning modal shown');
    });
}

/**
 * Resets the warning modal state (for testing purposes)
 */
export function resetModelLoadingWarning() {
    localStorage.removeItem('dontShowModelLoadingWarning');
    warningModalShown = false;
    console.log('Model loading warning state reset');
}

/**
 * Checks if the warning should be shown
 * @returns {boolean} - True if warning should be shown
 */
export function shouldShowModelLoadingWarning() {
    return localStorage.getItem('dontShowModelLoadingWarning') !== 'true';
}