// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { showExternalSiteModal } from './external-site-confirmation-modal.js';

// Get DOM elements
const aboutButtonElement = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutButton = document.getElementById('close-about');
const sidebarElement = document.getElementById('sidebar');
const modalContent = aboutModal ? aboutModal.querySelector('.modal-content') : null;
const openHelpLink = document.getElementById('open-help-link');
const helpModal = document.getElementById('help-modal');

// Function to close sidebar
function closeSidebar() {
    if (sidebarElement) {
        sidebarElement.classList.add('hidden');
        sidebarElement.classList.remove('active');
        document.body.classList.remove('sidebar-open');

        // Also close the options container
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
            optionsContainer.classList.remove('animate-fade-in');
        }

        // Remove the sidebar overlay
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
            sidebarOverlay.classList.add('hidden');
        }

        // Collapse all sections when sidebar is closed
        const sectionHeaders = sidebarElement.querySelectorAll('.section-header');
        const chatHistorySection = sidebarElement.querySelector('.sidebar-section:last-child');
        sectionHeaders.forEach(header => {
            header.classList.remove('active');
            const content = header.nextElementSibling;
            if (content && content.classList.contains('collapsible-content')) {
                content.classList.remove('show');
            }
        });

        // Ensure chat history is visible when sidebar is closed
        if (chatHistorySection) {
            chatHistorySection.classList.remove('chat-history-hidden');
        }
    }
}

// About button click handler is now managed in js/event-handlers.js
// This prevents duplicate event handlers and conflicts

// Close About modal button handler
if (closeAboutButton) {
    const handleClose = () => {
        if (aboutModal) {
            if (modalContent) {
                modalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    aboutModal.classList.add('hidden');
                    modalContent.classList.remove('animate-modal-out');

                    // Check if welcome message should be shown
                    checkAndShowWelcomeMessage();
                }, 300);
            } else {
                // Fallback if modalContent is null
                aboutModal.classList.add('hidden');
                checkAndShowWelcomeMessage();
            }
        }
    };

    // Add click event listener
    closeAboutButton.addEventListener('click', handleClose);
    
    // Add touch event listener for better mobile experience
    closeAboutButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default behavior
        e.stopPropagation(); // Stop event bubbling
        handleClose();
    }, { passive: false });
}

// Open help link click handler
if (openHelpLink && helpModal) {
    openHelpLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Close the about modal first
        if (aboutModal) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                aboutModal.classList.add('hidden');
                modalContent.classList.remove('animate-modal-out');

                // Then open the help modal
                helpModal.classList.remove('hidden');
                const helpModalContent = helpModal.querySelector('.modal-content');
                if (helpModalContent) {
                    helpModalContent.classList.add('animate-modal-in');

                    // Reset scroll position to top
                    const scrollableContent = helpModal.querySelector('.overflow-y-auto');
                    if (scrollableContent) {
                        scrollableContent.scrollTop = 0;
                    }

                    setTimeout(() => {
                        helpModalContent.classList.remove('animate-modal-in');
                    }, 300);
                }
            }, 300);
        }
    });
}

