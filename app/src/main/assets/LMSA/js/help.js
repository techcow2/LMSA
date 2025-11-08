// Import required functions
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { hideSettingsModal } from './settings-modal-manager.js';
import { showExternalSiteModal } from './external-site-confirmation-modal.js';

document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const newChatHeaderBtn = document.getElementById('new-chat-header-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help');
    const tutorialVideoBtn = document.getElementById('tutorial-video-btn');
      const settingsHelpBtn = document.getElementById('settings-help-btn');
    const sidebarElement = document.getElementById('sidebar');
    const modalContent = helpModal ? helpModal.querySelector('.modal-content') : null;
    const openSettingsLink = document.getElementById('open-settings-link');
    const settingsModal = document.getElementById('settings-modal');

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

    // Function to close help modal
    function closeHelpModal() {
        if (helpModal && modalContent) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                helpModal.classList.add('hidden');
                modalContent.classList.remove('animate-modal-out');

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }, 300);
        }
    }

    // Function to open help modal
    function openHelpModal() {
        if (helpModal && modalContent) {
            // Close the sidebar first
            closeSidebar();
            // Show the help modal
            helpModal.classList.remove('hidden');
            modalContent.classList.add('animate-modal-in');

            // Reset scroll position to top
            const scrollableContent = helpModal.querySelector('.overflow-y-auto');
            if (scrollableContent) {
                scrollableContent.scrollTop = 0;
            }

            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
    }


    // Event listeners
    if (helpBtn) {
        helpBtn.addEventListener('click', openHelpModal);
    }

    // New chat header button - triggers new chat functionality
    if (newChatHeaderBtn) {
        newChatHeaderBtn.addEventListener('click', () => {
            import('./chat-service.js').then(module => {
                module.createNewChat();
            });
        });
    }

    // Settings help button - closes Settings modal and opens Help modal
    if (settingsHelpBtn) {
        settingsHelpBtn.addEventListener('click', () => {
            // First close the settings modal
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                // Close the settings modal using the imported function
                hideSettingsModal();

                // Wait a short time for the settings modal to close before opening help
                setTimeout(() => {
                    openHelpModal();
                }, 100);
            } else {
                // If settings modal isn't found, just open help modal
                openHelpModal();
            }
        });
    }

    // Only proceed with other modal functionality if required elements exist
    if (helpModal && closeHelpBtn) {
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', closeHelpModal);
        }

        // Tutorial video button event listener
        /*
        if (tutorialVideoBtn) {
            tutorialVideoBtn.addEventListener('click', () => {
                // Show confirmation modal before opening YouTube video
                const youtubeUrl = 'https://www.youtube.com/watch?v=qoXfa6In5BM&pp=ygUMbG1zYSBhbmRyb2lk';
                showExternalSiteModal(youtubeUrl);
            });
        }
        */

  
        // Settings link event listener
        if (openSettingsLink && settingsModal) {
            openSettingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Close help modal
                closeHelpModal();

                // Show the settings modal using classes instead of inline styles
                settingsModal.classList.remove('hidden');
                settingsModal.classList.add('show');
                settingsModal.classList.remove('hide');

                // Only set minimal inline styles that don't conflict with our CSS
                document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open

                const settingsModalContent = settingsModal.querySelector('.modal-content');
                if (settingsModalContent) {
                    settingsModalContent.classList.add('animate-modal-in');
                    setTimeout(() => {
                        settingsModalContent.classList.remove('animate-modal-in');
                    }, 300);
                }
            });
        }

        // Close modal when clicking outside - REMOVED
        // helpModal.addEventListener('click', (e) => {
        //     if (e.target === helpModal) {
        //         closeHelpModal();
        //     }
        // });

        // Close modal with Escape key - REMOVED
        // document.addEventListener('keydown', (e) => {
        //     if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
        //         closeHelpModal();
        //     }
        // });
    }

});
