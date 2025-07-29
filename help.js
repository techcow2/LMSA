// Import required functions
import { checkAndShowWelcomeMessage } from './js/ui-manager.js';
import { hideSettingsModal } from './js/settings-modal-manager.js';
import { showExternalSiteModal } from './external-site-confirmation-modal.js';
import { handleNewChatButtonClick } from './character-continuation-modal.js';

document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const newChatHeaderBtn = document.getElementById('new-chat-header-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help');
    const tutorialVideoBtn = document.getElementById('tutorial-video-btn');
    const supportArticlesBtn = document.getElementById('support-articles-btn');
    const settingsHelpBtn = document.getElementById('settings-help-btn');
    const sidebarElement = document.getElementById('sidebar');
    const modalContent = helpModal ? helpModal.querySelector('.modal-content') : null;
    const openSettingsLink = document.getElementById('open-settings-link');
    const settingsModal = document.getElementById('settings-modal');

    // Contact support modal elements
    const needMoreHelpLink = document.getElementById('need-more-help-link');
    const contactFormModal = document.getElementById('contact-form-modal');
    const closeContactFormBtn = document.getElementById('close-contact-form');
    const contactFormModalContent = contactFormModal ? contactFormModal.querySelector('.modal-content') : null;
    const openEmailSupportBtn = document.getElementById('open-email-support');

    // Function to generate email support link
    function generateSupportEmail() {
        const supportEmail = 'help@techray.on.spiceworks.com';
        const subject = 'LMSA App Technical Support';

        // Create a user-friendly email template with simple questions
        const emailBody = `Hello LMSA Support Team,

I need help with the LMSA app. Please see my information below:

1. What device are you using? (phone, tablet, etc.)
   Answer:

2. What problem are you having?
   Answer:

3. When did this problem start?
   Answer:

4. Does this happen every time you use the app?
   Answer:

5. Have you tried closing and reopening the app?
   Answer:

6. Any other details you think might help:
   Answer:

📷 SCREENSHOT: If possible, please attach a screenshot of the issue. This helps us understand the problem much faster!

Thank you for your help!

[Your Name]`;

        // Encode the email components for URL
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(emailBody);

        // Create the mailto link
        const mailtoLink = `mailto:${supportEmail}?subject=${encodedSubject}&body=${encodedBody}`;

        return mailtoLink;
    }

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

    // Function to open contact support modal
    function openContactFormModal() {
        if (contactFormModal && contactFormModalContent) {
            // Close the help modal first
            closeHelpModal();
            // Show the contact support modal
            contactFormModal.classList.remove('hidden');
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
        if (tutorialVideoBtn) {
            tutorialVideoBtn.addEventListener('click', () => {
                // Show confirmation modal before opening YouTube video
                const youtubeUrl = 'https://www.youtube.com/watch?v=qoXfa6In5BM&pp=ygUMbG1zYSBhbmRyb2lk';
                showExternalSiteModal(youtubeUrl);
            });
        }

        // Support Articles button event listener
        if (supportArticlesBtn) {
            supportArticlesBtn.addEventListener('click', () => {
                // Show confirmation modal before opening support articles
                const supportUrl = 'https://lmsa.app/support.html';
                showExternalSiteModal(supportUrl);
            });
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

    // Contact support modal event listeners
    if (contactFormModal && closeContactFormBtn) {
        closeContactFormBtn.addEventListener('click', closeContactFormModal);

        // Add email support button handler
        if (openEmailSupportBtn) {
            openEmailSupportBtn.addEventListener('click', () => {
                const emailLink = generateSupportEmail();

                // Try to open the email link
                try {
                    window.location.href = emailLink;
                } catch (error) {
                    // Fallback: copy email address to clipboard if available
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText('help@techray.on.spiceworks.com').then(() => {
                            alert('Email address copied to clipboard: help@techray.on.spiceworks.com');
                        }).catch(() => {
                            alert('Please email us at: help@techray.on.spiceworks.com');
                        });
                    } else {
                        alert('Please email us at: help@techray.on.spiceworks.com');
                    }
                }
            });
        }

        // Both outside click and Escape key closing functionality removed
        // The modal can now only be closed using the X button
    }
});
