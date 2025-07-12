// External site modal import removed - links now open directly

// Initialize about functionality
function initializeAboutEventListeners() {
    console.log('Initializing about event listeners...');
    
    const initAbout = () => {
        console.log('DOM ready, initializing about functionality...');
        
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
        const devWebsiteLink = document.getElementById('dev-website-link');
        
        console.log('Rate app link:', rateAppLink);
        console.log('Official website link:', officialWebsiteLink);
        console.log('Dev website link:', devWebsiteLink);

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
                    if (modalContent) {
                        modalContent.classList.add('animate-modal-out');
                        setTimeout(() => {
                            aboutModal.classList.add('hidden');
                            modalContent.classList.remove('animate-modal-out');
                        }, 300);
                    } else {
                        aboutModal.classList.add('hidden');
                    }
                }
            });
        }

        // Open help link click handler
        if (openHelpLink && helpModal) {
            openHelpLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Show the help modal
                helpModal.classList.remove('hidden');
                helpModal.classList.add('flex');
                
                const modalContent = helpModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.add('animate-modal-in');
                    setTimeout(() => {
                        modalContent.classList.remove('animate-modal-in');
                    }, 300);
                }
            });
        }

        // Rate app link click handler
        if (rateAppLink) {
            console.log('Rate app link found, attaching event listener');
            rateAppLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Rate app link clicked');

                // Add a visual feedback effect when clicked
                rateAppLink.classList.add('active-scale');

                // Short delay before opening link for visual feedback
                setTimeout(() => {
                    // Open Google Play Store directly
                    const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.lmsa.app&pcampaignid=web_share';
                    window.open(googlePlayUrl, '_blank');

                    // Remove the active scale class
                    rateAppLink.classList.remove('active-scale');
                }, 200);
            });
        } else {
            console.error('Rate app link not found in DOM');
        }

        // Official website link click handler
        if (officialWebsiteLink) {
            console.log('Official website link found, attaching event listener');
            officialWebsiteLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Official website link clicked');

                // Add a visual feedback effect when clicked
                officialWebsiteLink.classList.add('active-scale');

                // Short delay before opening link for visual feedback
                setTimeout(() => {
                    // Open official website directly
                    const officialWebsiteUrl = 'https://lmsa.app';
                    window.open(officialWebsiteUrl, '_blank');

                    // Remove the active scale class
                    officialWebsiteLink.classList.remove('active-scale');
                }, 200);
            });
        } else {
            console.error('Official website link not found in DOM');
        }

        // Dev website link click handler
        if (devWebsiteLink) {
            console.log('Dev website link found, attaching event listener');
            devWebsiteLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Dev website link clicked');

                // Add a visual feedback effect when clicked
                devWebsiteLink.classList.add('active-scale');

                // Short delay before opening link for visual feedback
                setTimeout(() => {
                    // Open dev website directly
                    const devWebsiteUrl = 'https://islandapps.dev';
                    window.open(devWebsiteUrl, '_blank');

                    // Remove the active scale class
                    devWebsiteLink.classList.remove('active-scale');
                }, 200);
            });
        } else {
            console.error('Dev website link not found in DOM');
        }
    };
    
    // Try to initialize immediately if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAbout);
    } else {
        // DOM is already loaded
        initAbout();
    }
    
    // Also try with a small delay as a fallback
    setTimeout(initAbout, 100);
}

// Call the initialization function
initializeAboutEventListeners();