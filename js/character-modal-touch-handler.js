// Touch handler for character modal
import { characterModal } from './dom-elements.js';
import { debugLog } from './utils.js';

/**
 * Initializes touch handling for the character modal
 * Improves touch interaction on mobile devices
 */
export function initializeCharacterModalTouchHandler() {
    if (!characterModal) return;

    debugLog('Initializing character modal touch handler');

    // Get the modal body element
    const modalBody = characterModal.querySelector('.character-modal-body');
    if (!modalBody) return;

    // Variables to track touch state
    let touchStartY = 0;
    let touchStartX = 0;
    let lastTouchY = 0;
    let scrollVelocity = 0;
    let momentumFrame = null;
    let velocityHistory = []; // Array to store recent velocity measurements
    let lastTouchTime = 0;

    // Constants for momentum scrolling
    const DECELERATION = 0.90; // Momentum scrolling deceleration factor
    const MIN_VELOCITY = 0.8; // Minimum velocity to continue momentum scrolling

    // Add touch event listeners to the modal body
    modalBody.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalBody.addEventListener('touchmove', handleTouchMove, { passive: true });
    modalBody.addEventListener('touchend', handleTouchEnd, { passive: true });
    modalBody.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    /**
     * Handles the touch start event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchStart(e) {
        if (e.touches.length !== 1) return; // Only handle single touches

        // Cancel any ongoing momentum scrolling
        if (momentumFrame) {
            cancelAnimationFrame(momentumFrame);
            momentumFrame = null;
        }

        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        lastTouchY = touchStartY;
        lastTouchTime = Date.now();
        scrollVelocity = 0;
        velocityHistory = [];

        // Prevent event propagation to allow scrolling
        e.stopPropagation();
    }

    /**
     * Handles the touch move event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchMove(e) {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const currentY = touch.clientY;
        const now = Date.now();
        const timeDelta = now - lastTouchTime;

        // Calculate velocity (pixels per millisecond)
        if (timeDelta > 0) {
            const instantVelocity = (lastTouchY - currentY) / timeDelta;
            velocityHistory.push(instantVelocity);
            
            // Keep only the last 5 velocity measurements
            if (velocityHistory.length > 5) {
                velocityHistory.shift();
            }
        }

        // Update last touch position and time
        lastTouchY = currentY;
        lastTouchTime = now;

        // Prevent event propagation to allow scrolling
        e.stopPropagation();
    }

    /**
     * Handles the touch end event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchEnd() {
        // Calculate average velocity from recent measurements
        if (velocityHistory.length > 0) {
            scrollVelocity = velocityHistory.reduce((sum, v) => sum + v, 0) / velocityHistory.length;
            
            // Start momentum scrolling if velocity is significant
            if (Math.abs(scrollVelocity) > MIN_VELOCITY) {
                momentumScroll();
            }
        }
    }

    /**
     * Performs momentum scrolling animation
     */
    function momentumScroll() {
        // Cancel any existing animation frame
        if (momentumFrame) {
            cancelAnimationFrame(momentumFrame);
        }

        // Apply deceleration to velocity
        scrollVelocity *= DECELERATION;

        // Calculate scroll amount based on velocity
        const scrollAmount = scrollVelocity * 16; // Assuming ~60fps (16ms per frame)

        // Apply scroll
        modalBody.scrollTop += scrollAmount;

        // Continue animation if velocity is still significant
        if (Math.abs(scrollVelocity) > MIN_VELOCITY) {
            momentumFrame = requestAnimationFrame(momentumScroll);
        } else {
            momentumFrame = null;
        }
    }

    debugLog('Character modal touch handler initialized');
}
