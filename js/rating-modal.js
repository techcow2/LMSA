// Rating Modal Manager
// Shows a rating request modal on the 3rd, 10th, and 30th app openings
// 
// Behavior:
// - First show (3rd opening): "Rate on Play Store" or "Remind Me Later" (no manual disable option)
// - Second show (10th opening): "Rate on Play Store" or "Remind Me Later" (no manual disable option)
// - Third show (30th opening): "Rate on Play Store" or "Not Right Now" (final show)
// - Modal ALWAYS appears on scheduled openings regardless of previous choices
// - Only permanent dismiss is after third show (any action on third show)

import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { showExternalSiteModal } from '../external-site-confirmation-modal.js';
import { getLightThemeEnabled } from './settings-manager.js';

// Constants for tracking
const APP_OPEN_COUNT_KEY = 'appOpenCount';
const RATING_MODAL_SHOWN_KEY = 'ratingModalShown';
const RATING_MODAL_FIRST_SHOWN_KEY = 'ratingModalFirstShown';
const RATING_DISMISSED_KEY = 'ratingDismissed';

// Show modal on 3rd, 10th, and 30th openings
const FIRST_SHOW_COUNT = 3;
const SECOND_SHOW_COUNT = 10;
const THIRD_SHOW_COUNT = 30;

// Google Play Store URL (same as in about.js)
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.lmsa.app&pcampaignid=web_share';

/**
 * Initializes the rating modal system
 */
export function initializeRatingModal() {
    // Track app opening
    trackAppOpening();
    
    // Check if we should show the rating modal
    checkAndShowRatingModal();
    
    // Listen for theme changes
    document.addEventListener('themeChanged', () => {
        updateRatingModalTheme();
    });
    
    // Add global functions for testing (only in development)
    if (typeof window !== 'undefined') {
        window.ratingModal = {
            reset: resetRatingModalTracking,
            show: forceShowRatingModal,
            status: getRatingModalStatus
        };
    }
}

/**
 * Tracks each app opening by incrementing the counter
 */
function trackAppOpening() {
    const currentCount = parseInt(localStorage.getItem(APP_OPEN_COUNT_KEY) || '0');
    const newCount = currentCount + 1;
    localStorage.setItem(APP_OPEN_COUNT_KEY, newCount.toString());
    console.log(`App opened ${newCount} times`);
}

/**
 * Checks if the rating modal should be shown and shows it if appropriate
 */
function checkAndShowRatingModal() {
    const openCount = parseInt(localStorage.getItem(APP_OPEN_COUNT_KEY) || '0');
    const modalShown = localStorage.getItem(RATING_MODAL_SHOWN_KEY) === 'true';
    const dismissed = localStorage.getItem(RATING_DISMISSED_KEY) === 'true';
    const secondShown = localStorage.getItem('ratingModalSecondShown') === 'true';
    const thirdShown = localStorage.getItem('ratingModalThirdShown') === 'true';
    
    // If permanently dismissed after third show, never show again
    if (dismissed) {
        return;
    }
    
    // First show: on 3rd app opening
    if (openCount >= FIRST_SHOW_COUNT && !modalShown) {
        showRatingModal(false, 1); // false = not final show, 1 = first show
        return;
    }
    
    // Second show: on 10th app opening
    if (openCount >= SECOND_SHOW_COUNT && modalShown && !secondShown) {
        showRatingModal(false, 2); // false = not final show, 2 = second show
        localStorage.setItem('ratingModalSecondShown', 'true');
        return;
    }
    
    // Third show: on 30th app opening (final show)
    if (openCount >= THIRD_SHOW_COUNT && secondShown && !thirdShown) {
        showRatingModal(true, 3); // true = final show, 3 = third show
        localStorage.setItem('ratingModalThirdShown', 'true');
    }
}

/**
 * Shows the rating modal with smooth animations
 * @param {boolean} isFinalShow - Whether this is the final show
 * @param {number} showNumber - Which show this is (1, 2, or 3)
 */
function showRatingModal(isFinalShow = false, showNumber = 1) {
    // Create the modal if it doesn't exist
    createRatingModal(isFinalShow, showNumber);
    
    const modal = document.getElementById('rating-modal');
    if (!modal) return;
    
    // Update theme
    updateRatingModalTheme();
    
    // Show the modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // Add entrance animation
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }
    
    // Track that modal was shown
    if (showNumber === 1) {
        localStorage.setItem(RATING_MODAL_SHOWN_KEY, 'true');
    }
    
    console.log(`Rating modal shown (${showNumber === 1 ? 'first' : showNumber === 2 ? 'second' : 'third'} time)`);
}

/**
 * Creates the rating modal HTML
 * @param {boolean} isFinalShow - Whether this is the final show
 * @param {number} showNumber - Which show this is (1, 2, or 3)
 */
function createRatingModal(isFinalShow = false, showNumber = 1) {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('rating-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const isLightTheme = getLightThemeEnabled();
    
    const modalHTML = `
    <div id="rating-modal" class="fixed inset-0 z-40 flex items-center justify-center p-4 modal-container ${isLightTheme ? 'bg-slate-500 bg-opacity-50' : 'bg-black bg-opacity-70'}" style="display: none;">
        <div class="modal-content relative w-full max-w-md mx-auto ${isLightTheme ? 'bg-white' : 'bg-darkSecondary'} rounded-2xl shadow-2xl overflow-hidden">
            <!-- Header -->
            <div class="relative px-6 py-6 ${isLightTheme ? 'text-gray-800' : 'text-white'}">
                <div class="relative z-10 text-center">
                    <!-- Star icons -->
                    <div class="flex justify-center space-x-1 mb-3">
                        <i class="fas fa-star text-yellow-300 text-2xl animate-pulse" style="animation-delay: 0s;"></i>
                        <i class="fas fa-star text-yellow-300 text-2xl animate-pulse" style="animation-delay: 0.2s;"></i>
                        <i class="fas fa-star text-yellow-300 text-2xl animate-pulse" style="animation-delay: 0.4s;"></i>
                        <i class="fas fa-star text-yellow-300 text-2xl animate-pulse" style="animation-delay: 0.6s;"></i>
                        <i class="fas fa-star text-yellow-300 text-2xl animate-pulse" style="animation-delay: 0.8s;"></i>
                    </div>
                    <h2 class="text-xl font-bold">Enjoying LMSA?</h2>
                </div>
            </div>
            
            <!-- Content -->
            <div class="px-6 py-6">
                                 <div class="text-center mb-6">
                     <div class="mb-4">
                         <div class="inline-flex items-center justify-center mb-4">
                             <i class="fas fa-heart text-red-500 text-4xl animate-bounce"></i>
                         </div>
                     </div>
                    
                    <p class="${isLightTheme ? 'text-gray-700' : 'text-gray-300'} text-base leading-relaxed mb-4">
                        ${showNumber === 1 
                            ? "We're thrilled you're using LMSA! If you're enjoying your experience, would you mind taking a moment to rate us on the Play Store?"
                            : showNumber === 2
                            ? "We hope you're still loving LMSA! Your feedback would really help us improve and reach more users who could benefit from our app."
                            : "We hope you're still loving LMSA! This is our final request - your feedback would mean the world to us and helps other users discover our app."
                        }
                    </p>
                    
                    <p class="${isLightTheme ? 'text-gray-600' : 'text-gray-400'} text-sm">
                        Your rating helps other users discover LMSA and supports our continued development. ⭐
                    </p>
                </div>
                
                <!-- Action buttons -->
                <div class="space-y-3">
                    <button id="rate-now-btn" class="w-full ${isLightTheme ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'} text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center group">
                        <i class="fas fa-star mr-2 group-hover:animate-spin"></i>
                        Rate on Play Store
                        <i class="fab fa-google-play ml-2"></i>
                    </button>
                    
                    <button id="maybe-later-btn" class="w-full ${isLightTheme ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02]">
                        ${isFinalShow ? 'Not Right Now' : 'Remind Me Later'}
                    </button>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="${isLightTheme ? 'bg-gray-50' : 'bg-darkTertiary'} px-6 py-3">
                <p class="${isLightTheme ? 'text-gray-500' : 'text-gray-500'} text-xs text-center">
                    <i class="fas fa-shield-alt mr-1"></i>
                    Your privacy is important to us - no tracking, just genuine feedback
                </p>
            </div>
        </div>
    </div>
    `;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    setupRatingModalEventListeners(isFinalShow);
}

/**
 * Sets up event listeners for the rating modal
 */
function setupRatingModalEventListeners(isFinalShow = false) {
    const modal = document.getElementById('rating-modal');
    const rateNowBtn = document.getElementById('rate-now-btn');
    const maybeLaterBtn = document.getElementById('maybe-later-btn');
    
    if (!modal) return;
    
    // Rate now button
    if (rateNowBtn) {
        rateNowBtn.addEventListener('click', () => {
            hideRatingModal();
            if (isFinalShow) {
                // Only permanently dismiss after final (third) show
                localStorage.setItem(RATING_DISMISSED_KEY, 'true');
            }
            // Show external site confirmation modal
            showExternalSiteModal(GOOGLE_PLAY_URL);
        });
    }
    
    // Maybe later button - never permanently dismisses except on final show
    if (maybeLaterBtn) {
        maybeLaterBtn.addEventListener('click', () => {
            hideRatingModal();
            if (isFinalShow) {
                // Final show - mark as permanently dismissed
                localStorage.setItem(RATING_DISMISSED_KEY, 'true');
            }
            // For first and second shows, don't mark as dismissed - allow next show
        });
    }
    
    // Close when clicking outside - only permanently dismisses on final show
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideRatingModal();
            if (isFinalShow) {
                // Final show - mark as permanently dismissed
                localStorage.setItem(RATING_DISMISSED_KEY, 'true');
            }
            // For first and second shows, don't mark as dismissed - allow next show
        }
    });
    
    // Close with Escape key - only permanently dismisses on final show
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            hideRatingModal();
            if (isFinalShow) {
                // Final show - mark as permanently dismissed
                localStorage.setItem(RATING_DISMISSED_KEY, 'true');
            }
            // For first and second shows, don't mark as dismissed - allow next show
        }
    });
}

/**
 * Hides the rating modal with smooth animation
 */
function hideRatingModal() {
    const modal = document.getElementById('rating-modal');
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            modalContent.classList.remove('animate-modal-out');
            
            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }, 300);
    } else {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        
        // Check if welcome message should be shown
        checkAndShowWelcomeMessage();
    }
}

/**
 * Updates the rating modal theme based on current theme setting
 */
function updateRatingModalTheme() {
    const modal = document.getElementById('rating-modal');
    if (!modal) return;
    
    const isLightTheme = getLightThemeEnabled();
    
    // Update backdrop
    if (isLightTheme) {
        modal.classList.remove('bg-black', 'bg-opacity-70');
        modal.classList.add('bg-slate-500', 'bg-opacity-50');
    } else {
        modal.classList.remove('bg-slate-500', 'bg-opacity-50');
        modal.classList.add('bg-black', 'bg-opacity-70');
    }
}

/**
 * Resets the rating modal tracking (for testing purposes)
 */
export function resetRatingModalTracking() {
    localStorage.removeItem(APP_OPEN_COUNT_KEY);
    localStorage.removeItem(RATING_MODAL_SHOWN_KEY);
    localStorage.removeItem(RATING_MODAL_FIRST_SHOWN_KEY); // Keep for backwards compatibility
    localStorage.removeItem(RATING_DISMISSED_KEY);
    localStorage.removeItem('ratingModalSecondShown');
    localStorage.removeItem('ratingModalThirdShown');
    console.log('Rating modal tracking reset');
}

/**
 * Forces the rating modal to show (for testing purposes)
 */
export function forceShowRatingModal() {
    showRatingModal();
}

/**
 * Gets current tracking status (for debugging)
 */
export function getRatingModalStatus() {
    return {
        openCount: parseInt(localStorage.getItem(APP_OPEN_COUNT_KEY) || '0'),
        modalShown: localStorage.getItem(RATING_MODAL_SHOWN_KEY) === 'true',
        dismissed: localStorage.getItem(RATING_DISMISSED_KEY) === 'true',
        secondShown: localStorage.getItem('ratingModalSecondShown') === 'true',
        thirdShown: localStorage.getItem('ratingModalThirdShown') === 'true'
    };
} 