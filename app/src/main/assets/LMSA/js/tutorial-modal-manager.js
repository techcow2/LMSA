// Tutorial Modal Manager
// Handles displaying tutorial GIFs in an integrated modal

// Tutorial data
const TUTORIALS = {
    'lm-studio': {
        title: 'LM Studio Server Setup',
        subtitle: 'How to configure LM Studio for LMSA',
        description: 'Follow these steps to set up LM Studio on your computer:\n\n1. Start LM Studio and load your preferred language model\n2. Go to the server tab (speech bubble icon)\n3. Enable "Enable CORS" in server settings\n4. Enable "Serve on Local Host"\n5. Note the IP address and port (usually 1234)\n6. Connect LMSA using this information',
        gifUrl: 'https://lmsa.app/Images/lmstudiotutorial.gif'
    },
    'lmsa-mobile': {
        title: 'LMSA Mobile Setup',
        subtitle: 'How to use LMSA on your Android device',
        description: 'Follow these steps to set up LMSA on your mobile device:\n\n1. Open LMSA on your Android device\n2. Enter the IP address and port from LM Studio\n3. Tap "Connect" to establish connection\n4. Load a model from your mobile device\n5. Start chatting with your AI model\n6. Use the sidebar to manage conversations',
        gifUrl: 'https://lmsa.app/Images/apptutorial.gif'
    }
};

// Current tutorial state
let currentTutorial = null;
let externalUrl = null;

// DOM elements
let tutorialModal = null;
let tutorialGif = null;
let tutorialTitle = null;
let tutorialSubtitle = null;
let tutorialDescription = null;
let closeTutorialBtn = null;
let openExternalBtn = null;

// Initialize tutorial modal
function initTutorialModal() {
    tutorialModal = document.getElementById('tutorial-modal');
    tutorialGif = document.getElementById('tutorial-gif');
    tutorialTitle = document.getElementById('tutorial-title');
    tutorialSubtitle = document.getElementById('tutorial-subtitle');
    tutorialDescription = document.getElementById('tutorial-description');
    closeTutorialBtn = document.getElementById('close-tutorial');
    openExternalBtn = document.getElementById('open-tutorial-external');

    if (!tutorialModal || !tutorialGif || !closeTutorialBtn) {
        console.warn('Tutorial modal elements not found');
        return;
    }

    // Close button event listener
    closeTutorialBtn.addEventListener('click', closeTutorialModal);

    // Open in browser button event listener
    if (openExternalBtn) {
        openExternalBtn.addEventListener('click', openTutorialInBrowser);
    }

    // Close modal when clicking outside the modal content
    tutorialModal.addEventListener('click', (e) => {
        if (e.target === tutorialModal) {
            closeTutorialModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tutorialModal.classList.contains('hidden')) {
            closeTutorialModal();
        }
    });

    // Click on GIF to open in browser
    tutorialGif.addEventListener('click', openTutorialInBrowser);
}

// Show tutorial modal
function showTutorialModal(tutorialType) {
    if (!tutorialModal || !TUTORIALS[tutorialType]) {
        console.error('Tutorial modal not initialized or invalid tutorial type');
        return;
    }

    currentTutorial = TUTORIALS[tutorialType];
    externalUrl = currentTutorial.gifUrl;

    // Update modal content
    tutorialTitle.querySelector('span').textContent = currentTutorial.title;
    tutorialSubtitle.textContent = currentTutorial.subtitle;
    tutorialDescription.textContent = currentTutorial.description;

    // Set GIF source
    tutorialGif.src = currentTutorial.gifUrl;
    tutorialGif.alt = currentTutorial.title + ' Tutorial GIF';

    // Show modal with animation
    tutorialModal.classList.remove('hidden');
    const modalContent = tutorialModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }

    // Reset scroll position
    const scrollableContent = tutorialModal.querySelector('.overflow-y-auto');
    if (scrollableContent) {
        scrollableContent.scrollTop = 0;
    }

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

// Close tutorial modal
function closeTutorialModal() {
    if (!tutorialModal) return;

    const modalContent = tutorialModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            tutorialModal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');
            // Clear GIF source to stop loading
            tutorialGif.src = '';
            currentTutorial = null;
            externalUrl = null;
        }, 300);
    } else {
        tutorialModal.classList.add('hidden');
        tutorialGif.src = '';
        currentTutorial = null;
        externalUrl = null;
    }

    // Restore body scrolling
    document.body.style.overflow = '';
}

// Open tutorial in external browser
function openTutorialInBrowser() {
    if (!externalUrl) return;

    // Open in new window/tab
    window.open(externalUrl, '_blank');
}

// Export functions for use in other modules
export {
    initTutorialModal,
    showTutorialModal,
    closeTutorialModal,
    openTutorialInBrowser
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure all elements are available
    setTimeout(() => {
        initTutorialModal();
    }, 100);
});