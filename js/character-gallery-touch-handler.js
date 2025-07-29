// Touch handler for character gallery
import { characterGalleryContainer, characterGalleryGrid } from './dom-elements.js';
import { debugLog } from './utils.js';

/**
 * Initializes touch handling for the character gallery
 * Improves touch interaction on mobile devices
 */
export function initializeCharacterGalleryTouchHandler() {
    if (!characterGalleryContainer) return;

    debugLog('Initializing character gallery touch handler');

    // Variables to track touch state
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    let isTouchMoving = false;
    let touchedElement = null;
    let preventNextClick = false;
    let lastTouchY = 0;
    let scrollVelocity = 0;
    let momentumFrame = null;
    let velocityHistory = []; // Array to store recent velocity measurements
    let lastScrollTop = 0;
    let lastTouchTime = 0;

    // Constants for determining tap vs. drag
    const DRAG_THRESHOLD_PX = 10; // Pixels of movement to consider a drag
    const TAP_THRESHOLD_MS = 200; // Max milliseconds for a tap
    const DECELERATION = 0.90; // Momentum scrolling deceleration factor
    const MIN_VELOCITY = 0.8; // Minimum velocity to continue momentum scrolling

    // Add touch event listeners to the character gallery container
    characterGalleryContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    characterGalleryContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    characterGalleryContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    characterGalleryContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Add a click event listener to handle direct clicks and taps
    characterGalleryContainer.addEventListener('click', handleClick, { passive: false });

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
        touchStartTime = Date.now();
        lastTouchTime = touchStartTime;
        isTouchMoving = false;
        scrollVelocity = 0;
        velocityHistory = [];
        lastScrollTop = characterGalleryContainer.scrollTop;

        // Store the touched button if any (exclude the non-interactive indicator)
        touchedElement = e.target.closest('.character-card-btn, .character-card, .character-gallery-back-btn, .character-gallery-create-btn');

        // Don't add touch-active to the indicator since it's not interactive
        if (touchedElement && (touchedElement.classList.contains('character-card-indicator') ||
                              touchedElement.closest('.character-card-indicator'))) {
            touchedElement = null;
        }

        // Add active state to the touched button
        if (touchedElement) {
            touchedElement.classList.add('touch-active');
        }

        // Prevent default behavior to avoid page scrolling
        // This is important for touch scrolling to work properly
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
        const currentX = touch.clientX;
        const deltaY = touchStartY - currentY;
        const deltaX = Math.abs(touchStartX - currentX);
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

        // If moved more than threshold, consider it a drag
        if (Math.abs(deltaY) > DRAG_THRESHOLD_PX || deltaX > DRAG_THRESHOLD_PX) {
            isTouchMoving = true;

            // Remove active state from the touched button when dragging
            if (touchedElement) {
                touchedElement.classList.remove('touch-active');
            }
        }

        // Update last touch position and time
        lastTouchY = currentY;
        lastTouchTime = now;

        // Prevent default behavior to avoid page scrolling
        // This is important for touch scrolling to work properly
        e.stopPropagation();
    }

    /**
     * Handles the touch end event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchEnd(e) {
        const touchDuration = Date.now() - touchStartTime;

        // Remove active state from the touched button
        if (touchedElement) {
            touchedElement.classList.remove('touch-active');
        }

        // If it was a short touch and didn't move much, consider it a tap
        if (!isTouchMoving && touchDuration < TAP_THRESHOLD_MS && touchedElement) {
            // This was a tap - manually trigger the click event
            touchedElement.click();
        } else if (isTouchMoving) {
            // This was a drag - prevent the next click
            preventNextClick = true;

            // Calculate average velocity from recent measurements
            if (velocityHistory.length > 0) {
                scrollVelocity = velocityHistory.reduce((sum, v) => sum + v, 0) / velocityHistory.length;

                // Amplify the velocity slightly to improve the feel of momentum scrolling
                scrollVelocity *= 1.2;

                // Start momentum scrolling if velocity is significant
                if (Math.abs(scrollVelocity) > MIN_VELOCITY) {
                    momentumScroll();
                }
            }

            // Reset the prevention after a short delay
            setTimeout(() => {
                preventNextClick = false;
            }, 300);
        }

        // Prevent default behavior to avoid page scrolling
        // This is important for touch scrolling to work properly
        e.stopPropagation();
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
        characterGalleryContainer.scrollTop += scrollAmount;

        // Continue animation if velocity is still significant
        if (Math.abs(scrollVelocity) > MIN_VELOCITY) {
            setTimeout(momentumScroll, 16);
        } else {
            momentumFrame = null;

            // Ensure we're not in the middle of an inertial scroll
            // This helps prevent the scrolling from stopping abruptly
            if (Math.abs(scrollVelocity) > 0.1) {
                scrollVelocity = 0;
                characterGalleryContainer.style.scrollBehavior = 'auto';
                setTimeout(() => {
                    characterGalleryContainer.style.scrollBehavior = 'smooth';
                }, 50);
            }
        }
    }

    /**
     * Handles the click event
     * @param {MouseEvent} e - The click event
     */
    function handleClick(e) {
        if (preventNextClick) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // Add specific touch handling for character cards
    if (characterGalleryGrid) {
        // Delegate touch events for character cards
        characterGalleryGrid.addEventListener('touchstart', function(e) {
            const cardElement = e.target.closest('.character-card');
            if (cardElement) {
                cardElement.classList.add('touch-active');
            }

            // Don't stop propagation here to allow the container's touch handler to work
        }, { passive: false });

        characterGalleryGrid.addEventListener('touchmove', function(e) {
            // If we're scrolling, remove the active state from all cards
            if (isTouchMoving) {
                const cardElements = characterGalleryGrid.querySelectorAll('.character-card.touch-active');
                cardElements.forEach(card => card.classList.remove('touch-active'));
            }

            // Don't stop propagation here to allow the container's touch handler to work
        }, { passive: false });

        characterGalleryGrid.addEventListener('touchend', function(e) {
            const cardElements = characterGalleryGrid.querySelectorAll('.character-card.touch-active');
            cardElements.forEach(card => card.classList.remove('touch-active'));

            // Don't stop propagation here to allow the container's touch handler to work
        }, { passive: false });

        characterGalleryGrid.addEventListener('touchcancel', function(e) {
            const cardElements = characterGalleryGrid.querySelectorAll('.character-card.touch-active');
            cardElements.forEach(card => card.classList.remove('touch-active'));

            // Don't stop propagation here to allow the container's touch handler to work
        }, { passive: false });
    }

    debugLog('Character gallery touch handler initialized with momentum scrolling');
}
