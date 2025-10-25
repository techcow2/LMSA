// Image Upload Error Modal functionality
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { getLightThemeEnabled } from './settings-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const imageUploadErrorModal = document.getElementById('image-upload-error-modal');
    const closeModalButton = document.getElementById('close-image-upload-error-modal');
    const okButton = document.getElementById('image-upload-error-ok');

    if (!imageUploadErrorModal) {
        return;
    }

    // Function to apply theme-specific styling to the modal
    function applyThemeToModal() {
        const isLightTheme = getLightThemeEnabled();
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        const backdrop = imageUploadErrorModal;
        
        if (isLightTheme) {
            // Light theme styling
            backdrop.style.backgroundColor = 'rgba(31, 41, 55, 0.4)';
            modalContent.style.background = 'linear-gradient(to bottom, #f8fafc, #f1f5f9)';
            modalContent.style.borderColor = '#cbd5e1';
            modalContent.style.color = '#1e293b';
            
            // Update text colors
            const title = modalContent.querySelector('#image-upload-error-title');
            const titleIcon = modalContent.querySelector('#image-upload-error-title i');
            const closeButton = modalContent.querySelector('#close-image-upload-error-modal');
            const mainText = modalContent.querySelector('p');
            const infoBox = modalContent.querySelector('.bg-blue-900\\/20, [class*="bg-blue-900"]');
            const infoText = infoBox?.querySelector('p');
            const secondaryText = modalContent.querySelector('p.text-gray-400, p[class*="text-gray-400"]');
            const okButton = modalContent.querySelector('#image-upload-error-ok');
            
            if (title) title.style.color = '#1d4ed8';
            if (titleIcon) titleIcon.style.color = '#1d4ed8';
            if (closeButton) closeButton.style.color = '#64748b';
            if (mainText) mainText.style.color = '#374151';
            if (infoBox) {
                infoBox.style.backgroundColor = 'rgba(219, 234, 254, 0.7)';
                infoBox.style.borderColor = '#bfdbfe';
            }
            if (infoText) infoText.style.color = '#1e40af';
            if (secondaryText) secondaryText.style.color = '#6b7280';
            if (okButton) {
                okButton.style.backgroundColor = '#3b82f6';
                okButton.style.borderColor = '#3b82f6';
            }
        } else {
            // Dark theme styling (reset to default)
            backdrop.style.backgroundColor = '';
            modalContent.style.background = '';
            modalContent.style.borderColor = '';
            modalContent.style.color = '';
            
            // Reset text colors to default
            const elements = modalContent.querySelectorAll('*');
            elements.forEach(el => {
                el.style.color = '';
                el.style.backgroundColor = '';
                el.style.borderColor = '';
            });
        }
    }

    // Function to show the modal
    function showImageUploadErrorModal() {
        // Apply theme-specific styling
        applyThemeToModal();
        
        // Ensure clean state before showing
        imageUploadErrorModal.classList.remove('hidden');
        imageUploadErrorModal.classList.add('active');
        
        // Add animation classes
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        if (modalContent) {
            // Remove any existing animation classes first
            modalContent.classList.remove('animate-modal-out', 'animate-modal-in');
            // Force a reflow to ensure classes are removed
            void modalContent.offsetWidth;
            // Add the entrance animation
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
    }

    // Function to hide the modal
    function hideImageUploadErrorModal() {
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-out');
                modalContent.classList.remove('animate-modal-in'); // Ensure clean state
                imageUploadErrorModal.classList.remove('active');
                imageUploadErrorModal.classList.add('hidden');
                
                // Clear any file input that might be lingering
                const fileInputs = document.querySelectorAll('input[type="file"]');
                fileInputs.forEach(input => {
                    try {
                        if (input.value) {
                            input.value = '';
                        }
                    } catch (error) {
                        // Silently handle file input clearing errors
                    }
                });
                
                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }, 300);
        } else {
            imageUploadErrorModal.classList.remove('active');
            imageUploadErrorModal.classList.add('hidden');
            
            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }
    }

    // Event listeners for close buttons
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideImageUploadErrorModal);
    }

    if (okButton) {
        okButton.addEventListener('click', hideImageUploadErrorModal);
    }

    // Close modal when clicking outside
    imageUploadErrorModal.addEventListener('click', (e) => {
        if (e.target === imageUploadErrorModal) {
            hideImageUploadErrorModal();
        }
    });

    // Close modal when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageUploadErrorModal.classList.contains('active')) {
            hideImageUploadErrorModal();
        }
    });

    // Export the show function globally so it can be called from other modules
    window.showImageUploadErrorModal = showImageUploadErrorModal;
});

// Function to update the image upload error modal theme when the theme changes
export function updateImageUploadErrorModalTheme() {
    const imageUploadErrorModal = document.getElementById('image-upload-error-modal');
    if (imageUploadErrorModal) {
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        const okButton = document.getElementById('image-upload-error-ok');
        const closeButton = document.getElementById('close-image-upload-error-modal');

        if (modalContent) {
            // The modal already uses CSS variables in its gradient, so it should adapt automatically
            // But we can ensure proper theme handling here if needed
        }

        if (okButton) {
            // Button colors are handled by CSS classes, but we can add theme-specific adjustments if needed
        }

        if (closeButton) {
            // Close button colors are handled by CSS classes
        }
    }
}

// Listen for theme changes
document.addEventListener('themeChanged', () => {
    updateImageUploadErrorModalTheme();
});

// Initialize the theme when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateImageUploadErrorModalTheme();
});

// Export for module use
export function showImageUploadErrorModal() {
    const modal = document.getElementById('image-upload-error-modal');
    if (modal) {
        // Apply theme-specific styling
        const isLightTheme = getLightThemeEnabled();
        const modalContent = modal.querySelector('.modal-content');
        const backdrop = modal;
        
        if (isLightTheme) {
            // Light theme styling
            backdrop.style.backgroundColor = 'rgba(31, 41, 55, 0.4)';
            modalContent.style.background = 'linear-gradient(to bottom, #f8fafc, #f1f5f9)';
            modalContent.style.borderColor = '#cbd5e1';
            modalContent.style.color = '#1e293b';
            
            // Update text colors
            const title = modalContent.querySelector('#image-upload-error-title');
            const titleIcon = modalContent.querySelector('#image-upload-error-title i');
            const closeButton = modalContent.querySelector('#close-image-upload-error-modal');
            const mainText = modalContent.querySelector('p');
            const infoBox = modalContent.querySelector('[class*="bg-blue-900"]');
            const infoText = infoBox?.querySelector('p');
            const secondaryText = modalContent.querySelector('p[class*="text-gray-400"]');
            const okButton = modalContent.querySelector('#image-upload-error-ok');
            
            if (title) title.style.color = '#1d4ed8';
            if (titleIcon) titleIcon.style.color = '#1d4ed8';
            if (closeButton) closeButton.style.color = '#64748b';
            if (mainText) mainText.style.color = '#374151';
            if (infoBox) {
                infoBox.style.backgroundColor = 'rgba(219, 234, 254, 0.7)';
                infoBox.style.borderColor = '#bfdbfe';
            }
            if (infoText) infoText.style.color = '#1e40af';
            if (secondaryText) secondaryText.style.color = '#6b7280';
            if (okButton) {
                okButton.style.backgroundColor = '#3b82f6';
                okButton.style.borderColor = '#3b82f6';
            }
        }
        
        // Ensure clean state before showing
        modal.classList.remove('hidden');
        modal.classList.add('active');
        
        // Add animation classes
        if (modalContent) {
            // Remove any existing animation classes first
            modalContent.classList.remove('animate-modal-out', 'animate-modal-in');
            // Force a reflow to ensure classes are removed
            void modalContent.offsetWidth;
            // Add the entrance animation
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
    }
} 