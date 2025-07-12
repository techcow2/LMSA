// Import necessary functions
import { showExternalSiteModal } from './external-site-confirmation-modal.js';
import { initializeSettingsModal, hideSettingsModal } from './js/settings-modal-manager.js';
import { checkAndShowWelcomeMessage } from './js/ui-manager.js';
import { showCharacterContinuationModal, handleNewChatButtonClick } from './character-continuation-modal.js';

// Use both DOMContentLoaded and a fallback with setTimeout to ensure DOM is ready
function initializeHelpEventListeners() {
    console.log('Initializing help event listeners...');
    
    const initHelp = () => {
        console.log('DOM ready, initializing help functionality...');
        
        const helpBtn = document.getElementById('help-btn');
        const newChatHeaderBtn = document.getElementById('new-chat-header-button');
        const settingsHelpBtn = document.getElementById('settings-help-btn');
        const helpModal = document.getElementById('help-modal');
        const closeHelpBtn = document.getElementById('close-help');
        const modalContent = helpModal ? helpModal.querySelector('.modal-content') : null;
        const tutorialVideoBtn = document.getElementById('tutorial-video-btn');
        const supportArticlesBtn = document.getElementById('support-articles-btn');
        const openSettingsLink = document.getElementById('open-settings-link');
        const settingsModal = document.getElementById('settings-modal');
        const needMoreHelpLink = document.getElementById('need-more-help-link');
        const contactFormModal = document.getElementById('contact-form-modal');
        const contactFormModalContent = contactFormModal ? contactFormModal.querySelector('.modal-content') : null;
        const closeContactFormBtn = document.getElementById('close-contact-form');
        const sendSupportEmailBtn = document.getElementById('send-support-email-btn');

        console.log('Tutorial video button:', tutorialVideoBtn);
        console.log('Support articles button:', supportArticlesBtn);

        // Function to close sidebar
        function closeSidebar() {
            const sidebarElement = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            const mainContent = document.getElementById('main-content');

            if (sidebarElement && sidebarToggle && mainContent) {
                sidebarElement.classList.remove('sidebar-open');
                sidebarToggle.classList.remove('sidebar-open');
                mainContent.classList.remove('sidebar-open');

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
                helpModal.classList.add('flex');
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

        // Function to open contact support modal
        function openContactFormModal() {
            if (contactFormModal && contactFormModalContent) {
                // Close the help modal first
                closeHelpModal();
                // Show the contact support modal
                contactFormModal.classList.remove('hidden');
                contactFormModal.classList.add('flex');
                contactFormModalContent.classList.add('animate-modal-in');
                // Use a slightly longer duration for a smoother effect
                setTimeout(() => {
                    contactFormModalContent.classList.remove('animate-modal-in');
                }, 400);
            }
        }

        // Function to close contact support modal
        function closeContactFormModal() {
            if (contactFormModal && contactFormModalContent) {
                contactFormModalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    contactFormModal.classList.add('hidden');
                    contactFormModalContent.classList.remove('animate-modal-out');

                    // Check if welcome message should be shown
                    checkAndShowWelcomeMessage();
                }, 300);
            }
        }

        // Event listeners
        if (helpBtn) {
            helpBtn.addEventListener('click', openHelpModal);
        }

        // New chat header button - triggers new chat functionality
        if (newChatHeaderBtn) {
            newChatHeaderBtn.addEventListener('click', handleNewChatButtonClick);
            console.log('New chat header button event listener attached');
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
            console.log('Settings help button event listener attached');
        }

        // Only proceed with other modal functionality if required elements exist
        console.log('=== MODAL ELEMENT DEBUG ===');
        console.log('helpModal exists:', !!helpModal);
        console.log('helpModal element:', helpModal);
        console.log('closeHelpBtn exists:', !!closeHelpBtn);
        console.log('closeHelpBtn element:', closeHelpBtn);
        console.log('Document ready state:', document.readyState);
        console.log('Trying to find elements again...');
        const helpModalCheck = document.getElementById('help-modal');
        const closeHelpBtnCheck = document.getElementById('close-help');
        console.log('helpModal re-check:', helpModalCheck);
        console.log('closeHelpBtn re-check:', closeHelpBtnCheck);
        console.log('=== END MODAL DEBUG ===');
        if (helpModal && closeHelpBtn) {
            console.log('Modal elements found, setting up event listeners');
            if (closeHelpBtn) {
                closeHelpBtn.addEventListener('click', closeHelpModal);
                console.log('Close help button event listener attached');
            }

            // Tutorial video button event listener
            console.log('Checking tutorial video button:', !!tutorialVideoBtn);
            if (tutorialVideoBtn) {
                console.log('Tutorial video button found, attaching event listener');
                tutorialVideoBtn.addEventListener('click', () => {
                    console.log('Tutorial video button clicked');
                    // Open YouTube video directly
                    const youtubeUrl = 'https://www.youtube.com/watch?v=qoXfa6In5BM&pp=ygUMbG1zYSBhbmRyb2lk';
                    window.open(youtubeUrl, '_blank');
                });
            } else {
                console.error('Tutorial video button not found in DOM');
            }

            // Support Articles button event listener
            console.log('Checking support articles button:', !!supportArticlesBtn);
            if (supportArticlesBtn) {
                console.log('Support articles button found, attaching event listener');
                supportArticlesBtn.addEventListener('click', () => {
                    console.log('Support articles button clicked');
                    // Open support articles directly
                    const supportUrl = 'https://lmsa.app/support.html';
                    window.open(supportUrl, '_blank');
                });
            } else {
                console.error('Support articles button not found in DOM');
            }

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

            // Need more help link event listener
            if (needMoreHelpLink) {
                needMoreHelpLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    openContactFormModal();
                });
            }
        }

        // Contact form modal event listeners
        if (contactFormModal && closeContactFormBtn) {
            closeContactFormBtn.addEventListener('click', closeContactFormModal);

            // Close modal when clicking outside
            contactFormModal.addEventListener('click', (e) => {
                if (e.target === contactFormModal) {
                    closeContactFormModal();
                }
            });

            // Close modal when pressing Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !contactFormModal.classList.contains('hidden')) {
                    closeContactFormModal();
                }
            });
        }

        // Send support email button event listener
        if (sendSupportEmailBtn) {
            sendSupportEmailBtn.addEventListener('click', () => {
                // Generate support email link
                const subject = encodeURIComponent('LMSA Support Request');
                const body = encodeURIComponent('Hello LMSA Support Team,\n\nI need assistance with:\n\n[Please describe your issue here]\n\nDevice Information:\n- Device: [Your device model]\n- Android Version: [Your Android version]\n- LMSA Version: [App version if known]\n\nThank you for your help!');
                const emailLink = `mailto:support@lmsa.app?subject=${subject}&body=${body}`;
                
                // Open email client
                window.location.href = emailLink;
                
                // Close the contact form modal
                closeContactFormModal();
            });
        }
    };

    // Try to initialize immediately if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHelp);
    } else {
        // DOM is already loaded
        initHelp();
    }

    // Also try with a small delay as a fallback
    setTimeout(initHelp, 100);
}

// Call the initialization function
initializeHelpEventListeners();
