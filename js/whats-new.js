// Import statements
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { wasRefreshDueToCodeGeneration, clearRefreshDueToCodeGenerationFlag } from './utils.js';
import { showExternalSiteModal } from '../external-site-confirmation-modal.js';

// DOM Elements
const whatsNewModal = document.getElementById('whats-new-modal');
const gotItButton = document.getElementById('got-it-whats-new');
const understandCheckbox = document.getElementById('understand-checkbox');
let premiumFormLink = null; // Will be set when modal is shown
const understandToggleContainer = document.getElementById('understand-toggle-container');

// Local storage keys
const AD_NOTICE_VERSION = '1.0'; // Version for ad support notice
const AD_NOTICE_SEEN_KEY = 'adNoticeSeen';
const AD_NOTICE_ACKNOWLEDGED_KEY = 'adNoticeAcknowledged'; // Tracks actual user acknowledgment
const NOTICE_REMINDER_SHOWN_KEY = 'noticeReminderShown'; // Tracks if reminder modal has been shown

// Form URL
const PREMIUM_FORM_URL = 'https://forms.gle/CH7Cet2LAzoTsmwA6';
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';



// Flag to track if the modal has been shown in the current session
let modalShownInCurrentSession = false;

// Flag to track if user has scrolled to bottom
let hasScrolledToBottom = false;

/**
 * Enables the understand checkbox when user scrolls to bottom
 */
function enableUnderstandCheckbox() {
    if (!understandCheckbox || !understandToggleContainer) return;
    
    hasScrolledToBottom = true;
    understandCheckbox.disabled = false;
    understandToggleContainer.classList.remove('opacity-50', 'cursor-not-allowed');
    understandToggleContainer.classList.add('cursor-pointer');
    
    // Update the label to be clickable
    const label = understandToggleContainer.closest('label');
    if (label) {
        label.classList.remove('cursor-not-allowed');
        label.classList.add('cursor-pointer');
    }
}

/**
 * Sets up scroll detection to enable the "I understand" checkbox
 */
function setupScrollDetection() {
    const noticeContent = document.querySelector('#whats-new-modal .notice-content');
    
    if (noticeContent) {
        // Remove any existing scroll listeners
        noticeContent.removeEventListener('scroll', checkScrollPosition);
        
        // Add scroll event listener
        noticeContent.addEventListener('scroll', checkScrollPosition, { passive: true });
        
        // Always require scrolling to bottom, even for short content
        // This ensures users must scroll through all content before enabling the toggle
    }
    
    function checkScrollPosition() {
        if (!noticeContent || hasScrolledToBottom) return;
        
        const scrollTop = noticeContent.scrollTop;
        const scrollHeight = noticeContent.scrollHeight;
        const clientHeight = noticeContent.clientHeight;
        
        // Check if scrolled within 10px of the bottom
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            enableUnderstandCheckbox();
        }
    }
}

/**
 * Updates the "Got it!" button state based on checkbox
 */
function updateGotItButtonState() {
    if (!gotItButton || !understandCheckbox) return;

    if (understandCheckbox.checked && hasScrolledToBottom) {
        // Enable the button
        gotItButton.disabled = false;
        gotItButton.classList.remove('opacity-50', 'cursor-not-allowed');
        gotItButton.style.background = 'linear-gradient(135deg, #1e40af, #3b82f6)';
        gotItButton.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
        
        // Add hover effects
        gotItButton.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 12px -1px rgba(37, 99, 235, 0.3), 0 4px 8px -1px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            this.style.background = 'linear-gradient(135deg, #2563eb, #60a5fa)';
        };
        gotItButton.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
            this.style.background = 'linear-gradient(135deg, #1e40af, #3b82f6)';
        };
    } else {
        // Disable the button
        gotItButton.disabled = true;
        gotItButton.classList.add('opacity-50', 'cursor-not-allowed');
        gotItButton.style.background = 'linear-gradient(135deg, #6b7280, #9ca3af)';
        gotItButton.style.boxShadow = '0 4px 6px -1px rgba(107, 114, 128, 0.2), 0 2px 4px -1px rgba(107, 114, 128, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
        gotItButton.onmouseover = null;
        gotItButton.onmouseout = null;
    }
}

/**
 * Updates the toggle appearance based on its checked state
 */
function updateToggleAppearance() {
    if (!understandCheckbox) return;

    const toggleContainer = understandCheckbox.closest('.toggle-container');
    if (!toggleContainer) return;

    const toggleDot = toggleContainer.querySelector('.toggle-dot');
    const toggleDotActive = toggleContainer.querySelector('.toggle-dot-active');

    if (understandCheckbox.checked && hasScrolledToBottom) {
        if (toggleDotActive) toggleDotActive.style.opacity = '1';
        if (toggleDot) toggleDot.style.opacity = '0';
    } else {
        if (toggleDotActive) toggleDotActive.style.opacity = '0';
        if (toggleDot) toggleDot.style.opacity = '1';
        
        // If user tries to check before scrolling, uncheck it
        if (understandCheckbox.checked && !hasScrolledToBottom) {
            understandCheckbox.checked = false;
        }
    }

    // Update button state
    updateGotItButtonState();
}

/**
 * Shows the Ad Notice modal with smooth transition
 * @param {boolean} forceShow - If true, shows the modal regardless of user preferences
 * @param {boolean} isManualOpen - If true, indicates the modal was opened manually from sidebar
 */
export function showWhatsNewModal(forceShow = false, isManualOpen = false) {
    // Check if modal should be shown automatically
    if (!forceShow && !isManualOpen && modalShownInCurrentSession) {
        return;
    }

    if (whatsNewModal) {
        // If manually opened and user has already acknowledged, pre-check the checkbox
        if (isManualOpen && localStorage.getItem(AD_NOTICE_ACKNOWLEDGED_KEY) === AD_NOTICE_VERSION) {
            hasScrolledToBottom = true;
            if (understandCheckbox) {
                understandCheckbox.checked = true;
                understandCheckbox.disabled = false;
            }
            
            // Enable toggle container appearance
            if (understandToggleContainer) {
                understandToggleContainer.classList.remove('opacity-50', 'cursor-not-allowed');
                understandToggleContainer.classList.add('cursor-pointer');
            }
            
            // Enable label appearance
            const label = understandToggleContainer?.closest('label');
            if (label) {
                label.classList.remove('cursor-not-allowed');
                label.classList.add('cursor-pointer');
            }
        } else {
            // Reset scroll and checkbox state for first-time viewing
            hasScrolledToBottom = false;
            if (understandCheckbox) {
                understandCheckbox.checked = false;
                understandCheckbox.disabled = true;
            }
            
            // Reset toggle container appearance
            if (understandToggleContainer) {
                understandToggleContainer.classList.add('opacity-50', 'cursor-not-allowed');
                understandToggleContainer.classList.remove('cursor-pointer');
            }
            
            // Reset label appearance
            const label = understandToggleContainer?.closest('label');
            if (label) {
                label.classList.add('cursor-not-allowed');
                label.classList.remove('cursor-pointer');
            }
            
            // Set up scroll detection only for first-time viewing
            setupScrollDetection();
        }

        // Update toggle and button appearance
        updateToggleAppearance();

        // Fix touch scrolling for the modal
        setupTouchScrolling();

        // Prepare the modal for a smooth entrance
        // First remove hidden class to make the modal visible but transparent
        whatsNewModal.classList.remove('hidden');

        // Force a reflow to ensure the transition works
        void whatsNewModal.offsetWidth;

        // Add fade-in class to trigger the transition
        whatsNewModal.classList.add('fade-in');

        // Add a simple entrance animation to the modal content
        const modalContent = whatsNewModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';

            // Force a reflow
            void modalContent.offsetWidth;

            // Animate in with a slight delay for a smoother sequence
            setTimeout(() => {
                modalContent.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease';
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';

                // Make all feature items visible immediately
                const featureItems = modalContent.querySelectorAll('.feature-item');
                featureItems.forEach(item => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                });
            }, 50);
        }

        // Adjust modal height after modal is visible
        setTimeout(adjustModalHeight, 150);

        // Mark that the modal has been shown in this session
        modalShownInCurrentSession = true;
        
        // Setup premium form link event listener now that modal is visible
        premiumFormLink = document.getElementById('premium-form-link');
        if (premiumFormLink) {
            console.log('Premium form link element found in modal, adding event listener');
            premiumFormLink.addEventListener('click', handlePremiumFormClick);
        } else {
            console.error('Premium form link element not found in modal!');
        }

        // Note: Do not save to localStorage here - only save when user actually acknowledges
    }
}

/**
 * Checks if the Ad Notice modal should be shown
 * @returns {boolean} True if the modal should be shown
 */
function shouldShowAdNoticeModal() {
    // Check if user has already acknowledged the ad notice by clicking 'Got it!'
    const hasAcknowledged = localStorage.getItem(AD_NOTICE_ACKNOWLEDGED_KEY) === AD_NOTICE_VERSION;
    return !hasAcknowledged;
}

/**
 * Handles the premium form link click with external site confirmation
 */
function handlePremiumFormClick(event) {
    console.log('Premium form link clicked!');
    event.preventDefault();
    
    // Debug: Check if showExternalSiteModal is available
    console.log('showExternalSiteModal function:', typeof showExternalSiteModal);
    
    // Show the external site modal with custom message
    showExternalSiteModal(PREMIUM_FORM_URL);
    
    // Update the message after modal is created
    setTimeout(() => {
        const messageElement = document.getElementById('external-site-message');
        if (messageElement) {
            messageElement.innerHTML = `
                You are about to leave the LMSA app and visit a Google Forms page to claim your LMSA Premium promotion code. 
                Once you leave, you will no longer be covered by the LMSA Privacy Policy, but instead by the 
                <a href="${GOOGLE_PRIVACY_URL}" target="_blank" class="text-blue-300 font-medium hover:text-blue-200 underline">Google Privacy Policy</a> 
                which will be in effect on the form page.
            `;
        }
    }, 100);
}

/**
 * Creates and shows the notice reminder modal
 */
function showNoticeReminderModal() {
    // Check if reminder has already been shown
    if (localStorage.getItem(NOTICE_REMINDER_SHOWN_KEY) === 'true') {
        return;
    }

    // Create the reminder modal HTML
    const reminderModalHTML = `
        <div id="notice-reminder-modal" class="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center modal-container" style="z-index: 1070; padding: 1.5rem;">
            <div class="bg-gradient-to-b from-[#0a192f]/95 via-[#0c1e36]/95 to-[#0a192f]/95 p-6 rounded-2xl shadow-2xl modal-content border border-white/10 max-w-md w-full mx-4" style="box-shadow: 0 20px 60px -15px rgba(0,0,0,0.7), 0 0 30px rgba(31, 66, 135, 0.2), 0 0 0 1px rgba(255,255,255,0.1) inset;">
                <div class="flex items-center mb-4">
                    <div class="icon-wrapper mr-3 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 w-10 h-10 text-white shadow-lg">
                        <i class="fas fa-info-circle text-lg"></i>
                    </div>
                    <h2 class="text-xl font-bold text-blue-300">Quick Tip</h2>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-300 text-sm leading-relaxed mb-3">
                        If you want to view the important notice message again, you can manually launch it from:
                    </p>
                    <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                        <p class="text-blue-300 text-sm font-medium flex items-center">
                            <i class="fas fa-bars mr-2"></i>
                            Side Menu → Options → Notice
                        </p>
                    </div>
                    <p class="text-gray-400 text-xs">
                        This tip will only be shown once.
                    </p>
                </div>
                
                <div class="flex justify-end">
                    <button id="close-reminder-modal" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
                        <i class="fas fa-check mr-2"></i>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', reminderModalHTML);

    const reminderModal = document.getElementById('notice-reminder-modal');
    const closeButton = document.getElementById('close-reminder-modal');

    // Show the modal with fade-in animation
    reminderModal.style.opacity = '0';
    reminderModal.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    const modalContent = reminderModal.querySelector('.modal-content');
    modalContent.style.transform = 'translateY(20px) scale(0.95)';
    modalContent.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
    
    // Force reflow
    void reminderModal.offsetWidth;
    
    // Trigger fade-in
    setTimeout(() => {
        reminderModal.style.opacity = '1';
        modalContent.style.transform = 'translateY(0) scale(1)';
    }, 50);

    // Close button event listener
    closeButton.addEventListener('click', () => {
        // Apply fade-out animation
        reminderModal.style.opacity = '0';
        modalContent.style.transform = 'translateY(20px) scale(0.95)';
        
        setTimeout(() => {
            reminderModal.remove();
            // Mark that reminder has been shown
            localStorage.setItem(NOTICE_REMINDER_SHOWN_KEY, 'true');
            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }, 400); // Match the transition duration
    });

    // Close on outside click
    reminderModal.addEventListener('click', (e) => {
        if (e.target === reminderModal) {
            closeButton.click();
        }
    });

    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeButton.click();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Hides the Ad Notice modal with smooth transition
 */
function hideAdNoticeModal() {
    if (whatsNewModal) {
        const modalContent = whatsNewModal.querySelector('.modal-content');
        if (modalContent) {
            // Get all feature items for resetting later
            const featureItems = modalContent.querySelectorAll('.feature-item');

            // Apply exit animation to the content
            modalContent.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
            modalContent.style.transform = 'translateY(20px)';
            modalContent.style.opacity = '0';

            // Start fading out the entire modal
            setTimeout(() => {
                whatsNewModal.classList.add('fade-out');

                // Wait for the transition to complete before hiding
                setTimeout(() => {
                    whatsNewModal.classList.remove('fade-out');
                    whatsNewModal.classList.add('hidden');

                    // Reset the content styles for next time
                    if (modalContent) {
                        modalContent.style.transition = '';
                        modalContent.style.transform = '';
                        modalContent.style.opacity = '';

                        // Reset feature item styles
                        featureItems.forEach(item => {
                            item.style.transition = '';
                            item.style.transform = '';
                            item.style.opacity = '';
                        });
                    }

                    // Save that user has acknowledged the ad notice
                    localStorage.setItem(AD_NOTICE_ACKNOWLEDGED_KEY, AD_NOTICE_VERSION);
                    localStorage.setItem(AD_NOTICE_SEEN_KEY, AD_NOTICE_VERSION);

                    // Remove resize event listener when modal is hidden
                    window.removeEventListener('resize', adjustModalHeight);

                    // Show the reminder modal after a short delay
                    setTimeout(() => {
                        showNoticeReminderModal();
                    }, 500);
                }, 300); // Match this with the CSS transition duration
            }, 100); // Short delay before starting the fade-out
        } else {
            // Fallback if modal content is not found
            whatsNewModal.classList.add('fade-out');
            setTimeout(() => {
                whatsNewModal.classList.remove('fade-out');
                whatsNewModal.classList.add('hidden');
                localStorage.setItem(AD_NOTICE_ACKNOWLEDGED_KEY, AD_NOTICE_VERSION);
                localStorage.setItem(AD_NOTICE_SEEN_KEY, AD_NOTICE_VERSION);
                window.removeEventListener('resize', adjustModalHeight);
                // Show the reminder modal after a short delay
                setTimeout(() => {
                    showNoticeReminderModal();
                }, 500);
            }, 300);
        }
    }
}



/**
 * Checks if the modal should be shown
 * @returns {boolean} True if the modal should be shown
 */
function shouldShowModal() {
    const dontShow = localStorage.getItem(WHATS_NEW_DONT_SHOW_KEY) === 'true';
    const lastSeenVersion = localStorage.getItem(WHATS_NEW_SEEN_KEY);

    // Check if refresh was triggered by code generation
    const isRefreshDueToCode = wasRefreshDueToCodeGeneration();

    // Don't show if user has opted out
    if (dontShow) {
        return false;
    }

    // Don't show if refresh was triggered by code generation
    if (isRefreshDueToCode) {
        return false;
    }

    // Show if never seen before or if version is different
    return !lastSeenVersion || lastSeenVersion !== WHATS_NEW_VERSION;
}

/**
 * Adjusts the modal content to fit all features without scrolling
 * Makes the container height dynamic based on content
 */
function adjustModalHeight() {
    const featuresContainer = document.querySelector('#whats-new-modal .features-container');
    const modalContent = document.querySelector('#whats-new-modal .modal-content');

    if (featuresContainer && modalContent) {
        // Reset any previously set height to get the natural content height
        featuresContainer.style.height = 'auto';
        featuresContainer.style.maxHeight = 'none';

        // Get the content's natural height
        const contentHeight = featuresContainer.scrollHeight;

        // Get the available viewport height
        const viewportHeight = window.innerHeight;

        // Get the header and footer heights
        const header = modalContent.querySelector('.flex.justify-between.items-center.mb-2');
        const footer = modalContent.querySelector('.flex.justify-between.items-center.pt-2');

        const headerHeight = header ? header.offsetHeight : 0;
        const footerHeight = footer ? footer.offsetHeight : 0;

        // Calculate modal padding
        const modalPadding = 24; // 3rem (p-3 class)

        // Calculate the maximum available height for the features container
        // Leave some space (10% of viewport) for padding and margins
        const maxAvailableHeight = viewportHeight * 0.9 - headerHeight - footerHeight - modalPadding;

        // Set the height to either the content height or the max available height, whichever is smaller
        const finalHeight = Math.min(contentHeight, maxAvailableHeight);

        // Apply the calculated height
        featuresContainer.style.height = finalHeight + 'px';

        // If content fits without scrolling, disable scrolling
        if (contentHeight <= finalHeight) {
            featuresContainer.classList.remove('overflow-y-auto');
            featuresContainer.classList.add('overflow-y-hidden');
        } else {
            // Content needs scrolling, ensure scrolling is enabled
            featuresContainer.classList.add('overflow-y-auto');
            featuresContainer.classList.remove('overflow-y-hidden');
        }
    }
}

/**
 * Sets up proper touch scrolling for the What's New modal
 */
function setupTouchScrolling() {
    const noticeContent = document.querySelector('#whats-new-modal .notice-content');
    const modalContent = document.querySelector('#whats-new-modal .modal-content');
    
    if (noticeContent) {
        // Remove any conflicting classes that might interfere with native scrolling
        noticeContent.classList.remove('drag-scrollable');
        modalContent?.classList.remove('drag-scrollable');
        
        // Ensure proper CSS properties for smooth native touch scrolling
        noticeContent.style.webkitOverflowScrolling = 'touch';
        noticeContent.style.overflowY = 'auto';
        noticeContent.style.touchAction = 'pan-y';
        noticeContent.style.overscrollBehavior = 'contain';
        noticeContent.style.msOverflowStyle = '-ms-autohiding-scrollbar';
        noticeContent.style.scrollBehavior = 'smooth';
        
        // Add momentum scrolling for iOS
        noticeContent.style.webkitTransform = 'translateZ(0)';
        noticeContent.style.transform = 'translateZ(0)';
        
        // Ensure the container has proper dimensions for scrolling
        noticeContent.style.minHeight = '0';
        noticeContent.style.maxHeight = '100%';
        
        // Remove any existing problematic touch event listeners
        const newNoticeContent = noticeContent.cloneNode(true);
        noticeContent.parentNode.replaceChild(newNoticeContent, noticeContent);
        
        // Re-setup scroll detection on the new element
        setTimeout(() => {
            if (!hasScrolledToBottom) {
                setupScrollDetection();
            }
        }, 100);
    }
}

/**
 * Initializes the Ad Notice modal functionality
 */
export function initializeWhatsNew() {
    // Always show the ad notice modal to all users
    if (shouldShowAdNoticeModal() && !wasRefreshDueToCodeGeneration()) {
        // Show the modal after a short delay to ensure the app has loaded
        setTimeout(() => showWhatsNewModal(), 1000);
    }

    // Event listener for the "Got it!" button
    if (gotItButton) {
        gotItButton.addEventListener('click', () => {
            // Only allow closing if checkbox is checked
            if (understandCheckbox && understandCheckbox.checked) {
                hideAdNoticeModal();
            }
        });
    }

    // Event listener for the "I understand" checkbox
    if (understandCheckbox) {
        understandCheckbox.addEventListener('change', function(e) {
            // Prevent checking if user hasn't scrolled to bottom
            if (!hasScrolledToBottom && e.target.checked) {
                e.preventDefault();
                e.target.checked = false;
                return false;
            }
            updateToggleAppearance();
        });
        
        // Also prevent clicking on the label before scrolling
        const label = understandCheckbox.closest('label');
        if (label) {
            label.addEventListener('click', function(e) {
                if (!hasScrolledToBottom) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    }

    // Premium form link event listener is now set up when modal is shown
    // This ensures the element exists when we try to attach the listener

    // Note: Removed escape key and click-outside handlers to prevent accidental closing
    // Users must check the "I understand" box and click "Got it!" to close

    // Add window resize listener to adjust modal height when window size changes
    window.addEventListener('resize', adjustModalHeight);
}