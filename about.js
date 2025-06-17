// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './js/ui-manager.js';
import { showExternalSiteModal } from './external-site-confirmation-modal.js';

// Get DOM elements
const aboutButtonElement = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutButton = document.getElementById('close-about');
const sidebarElement = document.getElementById('sidebar');
const modalContent = aboutModal ? aboutModal.querySelector('.modal-content') : null;
const openHelpLink = document.getElementById('open-help-link');
const helpModal = document.getElementById('help-modal');
const rateAppLink = document.getElementById('rate-app-link');
const officialWebsiteLink = document.getElementById('official-website-link');
const githubLink = document.getElementById('github-link');
const licenseLink = document.getElementById('license-link');

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
    closeAboutButton.addEventListener('click', () => {
        if (aboutModal) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                aboutModal.classList.add('hidden');
                modalContent.classList.remove('animate-modal-out');

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }, 300);
        }
    });
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

// Rate app link click handler
if (rateAppLink) {
    rateAppLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Add a visual feedback effect when clicked
        rateAppLink.classList.add('active-scale');

        // Short delay before showing confirmation modal for visual feedback
        setTimeout(() => {
            // Show confirmation modal before opening Google Play Store
            const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.lmsa.app&pcampaignid=web_share';
            showExternalSiteModal(googlePlayUrl);

            // Remove the active scale class
            rateAppLink.classList.remove('active-scale');
        }, 200);
    });
}

// Official website link click handler
if (officialWebsiteLink) {
    officialWebsiteLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Add a visual feedback effect when clicked
        officialWebsiteLink.classList.add('active-scale');

        // Short delay before showing confirmation modal for visual feedback
        setTimeout(() => {
            // Show confirmation modal before opening official website
            const officialWebsiteUrl = 'https://lmsa.app';
            showExternalSiteModal(officialWebsiteUrl);

            // Remove the active scale class
            officialWebsiteLink.classList.remove('active-scale');
        }, 200);
    });
}

// GitHub link click handler
if (githubLink) {
    githubLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Add a visual feedback effect when clicked
        githubLink.classList.add('active-scale');

        // Short delay before showing confirmation modal for visual feedback
        setTimeout(() => {
            // Show confirmation modal before opening GitHub repository
            const githubUrl = 'https://github.com/techcow2/LMSA';
            showExternalSiteModal(githubUrl);

            // Remove the active scale class
            githubLink.classList.remove('active-scale');
        }, 200);
    });
}

// MIT License link click handler
if (licenseLink) {
    licenseLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Add a visual feedback effect when clicked
        licenseLink.classList.add('active-scale');

        // Short delay before showing confirmation modal for visual feedback
        setTimeout(() => {
            // Show confirmation modal before opening MIT license
            const licenseUrl = 'https://github.com/techcow2/LMSA/blob/main/LICENSE';
            showExternalSiteModal(licenseUrl);

            // Remove the active scale class
            licenseLink.classList.remove('active-scale');
        }, 200);
    });
}