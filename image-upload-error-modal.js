import { checkAndShowWelcomeMessage } from './js/ui-manager.js';
import { getLightThemeEnabled } from './js/settings-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const imageUploadErrorModal = document.getElementById('image-upload-error-modal');
    const closeModalButton = document.getElementById('close-image-upload-error-modal');
    const okButton = document.getElementById('image-upload-error-ok');

    if (!imageUploadErrorModal) {
        console.error('Image upload error modal not found');
        return;
    }

    function applyThemeToModal() {
        const isLightTheme = getLightThemeEnabled();
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        const backdrop = imageUploadErrorModal;
        
        if (isLightTheme) {
            backdrop.style.backgroundColor = 'rgba(31, 41, 55, 0.4)';
            modalContent.style.background = 'linear-gradient(to bottom, #f8fafc, #f1f5f9)';
            modalContent.style.borderColor = '#cbd5e1';
            modalContent.style.color = '#1e293b';
            
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
            backdrop.style.backgroundColor = '';
            modalContent.style.background = '';
            modalContent.style.borderColor = '';
            modalContent.style.color = '';
            
            const elements = modalContent.querySelectorAll('*');
            elements.forEach(el => {
                el.style.color = '';
                el.style.backgroundColor = '';
                el.style.borderColor = '';
            });
        }
    }

    function showImageUploadErrorModal() {
        applyThemeToModal();
        
        imageUploadErrorModal.classList.remove('hidden');
        imageUploadErrorModal.classList.add('active');
        
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('animate-modal-out', 'animate-modal-in');
            void modalContent.offsetWidth;
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
        
        console.log('Image upload error modal shown');
    }

    function hideImageUploadErrorModal() {
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-out');
                modalContent.classList.remove('animate-modal-in');
                imageUploadErrorModal.classList.remove('active');
                imageUploadErrorModal.classList.add('hidden');
                
                const fileInputs = document.querySelectorAll('input[type="file"]');
                fileInputs.forEach(input => {
                    try {
                        if (input.value) {
                            input.value = '';
                        }
                    } catch (error) {
                        console.warn('Could not clear file input:', error);
                    }
                });
                
                checkAndShowWelcomeMessage();
            }, 300);
        } else {
            imageUploadErrorModal.classList.remove('active');
            imageUploadErrorModal.classList.add('hidden');
            
            checkAndShowWelcomeMessage();
        }
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideImageUploadErrorModal);
    }

    if (okButton) {
        okButton.addEventListener('click', hideImageUploadErrorModal);
    }

    imageUploadErrorModal.addEventListener('click', (e) => {
        if (e.target === imageUploadErrorModal) {
            hideImageUploadErrorModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageUploadErrorModal.classList.contains('active')) {
            hideImageUploadErrorModal();
        }
    });

    window.showImageUploadErrorModal = showImageUploadErrorModal;
});

export function updateImageUploadErrorModalTheme() {
    const imageUploadErrorModal = document.getElementById('image-upload-error-modal');
    if (imageUploadErrorModal) {
        const modalContent = imageUploadErrorModal.querySelector('.modal-content');
        const okButton = document.getElementById('image-upload-error-ok');
        const closeButton = document.getElementById('close-image-upload-error-modal');

        if (modalContent) {
        }

        if (okButton) {
        }

        if (closeButton) {
        }
    }
}

document.addEventListener('themeChanged', () => {
    updateImageUploadErrorModalTheme();
});

document.addEventListener('DOMContentLoaded', () => {
    updateImageUploadErrorModalTheme();
});

export function showImageUploadErrorModal() {
    const modal = document.getElementById('image-upload-error-modal');
    if (modal) {
        const isLightTheme = getLightThemeEnabled();
        const modalContent = modal.querySelector('.modal-content');
        const backdrop = modal;
        
        if (isLightTheme) {
            backdrop.style.backgroundColor = 'rgba(31, 41, 55, 0.4)';
            modalContent.style.background = 'linear-gradient(to bottom, #f8fafc, #f1f5f9)';
            modalContent.style.borderColor = '#cbd5e1';
            modalContent.style.color = '#1e293b';
            
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
        
        modal.classList.remove('hidden');
        modal.classList.add('active');
        
        if (modalContent) {
            modalContent.classList.remove('animate-modal-out', 'animate-modal-in');
            void modalContent.offsetWidth;
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
        
        console.log('Image upload error modal shown');
    }
}
