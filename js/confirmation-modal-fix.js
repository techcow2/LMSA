// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { getLightThemeEnabled } from './settings-manager.js';

// Script to ensure the confirmation modal is properly hidden on page load
document.addEventListener('DOMContentLoaded', function() {
    // Get the confirmation modal
    const confirmationModal = document.getElementById('confirmation-modal');

    // Ensure it's properly hidden
    if (confirmationModal) {
        confirmationModal.classList.add('hidden');
        confirmationModal.style.display = 'none';

        // Set the z-index to ensure it appears on top of other modals when shown
        confirmationModal.style.zIndex = '1060'; // Higher than settings modal (1050)

        // Find the modal content and ensure it's also on top
        const modalContent = confirmationModal.querySelector('div:first-child');
        if (modalContent) {
            modalContent.style.zIndex = '1061'; // Higher than the modal background
        }

        // Add event listener to the cancel button
        const cancelButton = document.getElementById('cancel-action');
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                confirmationModal.classList.add('hidden');
                confirmationModal.style.display = 'none';

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            });
        }

        // Add event listener to the modal background for closing when clicked outside
        confirmationModal.addEventListener('click', function(event) {
            if (event.target === confirmationModal) {
                confirmationModal.classList.add('hidden');
                confirmationModal.style.display = 'none';

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }
        });
    }
});

// Function to update the confirmation modal theme when the theme changes
export function updateConfirmationModalTheme() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        const modalContent = confirmationModal.querySelector('div:first-child');
        const cancelButton = document.getElementById('cancel-action');

        if (modalContent) {
            // Update modal background color based on current theme
            modalContent.style.backgroundColor = 'var(--bg-secondary)';
            modalContent.style.color = 'var(--text-primary)';
        }

        if (cancelButton) {
            // Update cancel button color based on current theme
            cancelButton.style.backgroundColor = 'var(--bg-tertiary)';
            cancelButton.style.color = 'var(--text-primary)';
        }
    }
}

// Function to update the export/import modals theme when the theme changes
export function updateExportImportModalsTheme() {
    // Export Confirmation Modal
    const exportConfirmationModal = document.getElementById('export-confirmation-modal');
    if (exportConfirmationModal) {
        const modalContent = exportConfirmationModal.querySelector('.modal-content');
        const cancelButton = document.getElementById('cancel-export');

        if (modalContent) {
            // Ensure the modal content uses theme variables
            modalContent.style.backgroundColor = 'var(--bg-secondary)';
            modalContent.style.color = 'var(--text-primary)';
        }

        if (cancelButton) {
            // Ensure the cancel button uses theme variables
            cancelButton.style.backgroundColor = 'var(--bg-tertiary)';
            cancelButton.style.color = 'var(--text-primary)';
        }
    }

    // Export Success Modal
    const exportSuccessModal = document.getElementById('export-success-modal');
    if (exportSuccessModal) {
        const modalContent = exportSuccessModal.querySelector('.modal-content');
        const successMessage = document.getElementById('export-success-message');

        if (modalContent) {
            modalContent.style.backgroundColor = 'var(--bg-secondary)';
            modalContent.style.color = 'var(--text-primary)';
        }

        if (successMessage) {
            successMessage.style.color = 'var(--text-primary)';
        }
    }

    // Import Modal
    const importModal = document.getElementById('import-modal');
    if (importModal) {
        const modalContent = importModal.querySelector('.modal-content');
        const cancelButton = document.getElementById('cancel-import');
        const radioLabels = importModal.querySelectorAll('label span');

        if (modalContent) {
            modalContent.style.backgroundColor = 'var(--bg-secondary)';
            modalContent.style.color = 'var(--text-primary)';
        }

        if (cancelButton) {
            cancelButton.style.backgroundColor = 'var(--bg-tertiary)';
            cancelButton.style.color = 'var(--text-primary)';
        }

        // Update text color for radio button labels
        radioLabels.forEach(span => {
            span.style.color = 'var(--text-primary)';
        });
    }

    // Import Success Modal
    const importSuccessModal = document.getElementById('import-success-modal');
    if (importSuccessModal) {
        const modalContent = importSuccessModal.querySelector('.modal-content');
        const successMessage = document.getElementById('import-success-message');

        if (modalContent) {
            modalContent.style.backgroundColor = 'var(--bg-secondary)';
            modalContent.style.color = 'var(--text-primary)';
        }

        if (successMessage) {
            successMessage.style.color = 'var(--text-primary)';
        }
    }
}

// Listen for theme changes
document.addEventListener('themeChanged', () => {
    updateConfirmationModalTheme();
    updateExportImportModalsTheme();
});

// Initialize the themes when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateExportImportModalsTheme();
});
