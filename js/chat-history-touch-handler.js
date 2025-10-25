// Touch handler for chat history scrolling
import { chatHistory } from './dom-elements.js';
import { loadChat } from './chat-service.js';
import { debugLog } from './utils.js';

/**
 * Initializes touch handling for the chat history container
 * Allows scrolling by dragging anywhere in the chat history
 * while still allowing taps to select chats
 */
export function initializeChatHistoryTouchHandler() {
    if (!chatHistory) return;

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
    let lastVelocityUpdate = 0;

    // Constants for determining tap vs. drag
    const DRAG_THRESHOLD_PX = 8;
    const TAP_THRESHOLD_MS = 200; // Max milliseconds for a tap
    const DECELERATION = 0.92;
    const MIN_VELOCITY = 0.6;
    const VELOCITY_UPDATE_INTERVAL = 16;

    // Disable custom touch handlers - let browser handle native scrolling
    // The CSS already provides proper touch scrolling with -webkit-overflow-scrolling: touch
    debugLog('Chat history touch handlers disabled - using native browser scrolling');

    // Add a click event listener to handle direct clicks and taps
    chatHistory.addEventListener('click', handleClick, { passive: true });

    /**
     * Handles the touch start event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchStart(e) {
        if (e.touches.length !== 1) return; // Only handle single touches

        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        lastTouchY = touch.clientY;
        touchStartTime = Date.now();
        isTouchMoving = false;
        touchedElement = e.target.closest('button'); // Store the touched button if any

        // Stop any ongoing momentum scrolling
        if (momentumFrame) {
            cancelAnimationFrame(momentumFrame);
            momentumFrame = null;
        }
    }

    /**
     * Handles the touch move event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchMove(e) {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaY = Math.abs(touch.clientY - touchStartY);
        const deltaX = Math.abs(touch.clientX - touchStartX);

        // Update velocity
        const now = Date.now();
        if (now - lastVelocityUpdate >= VELOCITY_UPDATE_INTERVAL) {
            // Calculate scroll velocity for momentum scrolling
            const currentVelocity = touch.clientY - lastTouchY;

            if (Math.abs(currentVelocity) > 0.3) {
                velocityHistory.push({ velocity: currentVelocity, time: now });

                if (velocityHistory.length > 7) {
                    velocityHistory.shift();
                }
            }

            lastTouchY = touch.clientY;
            lastVelocityUpdate = now;
        }

        // If movement exceeds threshold, mark as dragging
        if (!isTouchMoving && (deltaY > DRAG_THRESHOLD_PX || deltaX > DRAG_THRESHOLD_PX)) {
            isTouchMoving = true;

            // Add a subtle haptic feedback when drag starts (if supported)
            if (navigator.vibrate && deltaY > DRAG_THRESHOLD_PX * 2) {
                try {
                    navigator.vibrate(10);
                } catch (e) {
                    // Ignore errors if vibration is not supported
                }
            }
        }

        // Let the browser handle the scrolling natively - don't call preventDefault
        // The browser's native scrolling works best for touch devices
    }

    /**
     * Handles the touch end event
     * @param {TouchEvent} e - The touch event
     */
    function handleTouchEnd() {
        const touchDuration = Date.now() - touchStartTime;

        // If it was a short touch and didn't move much, consider it a tap
        if (!isTouchMoving && touchDuration < TAP_THRESHOLD_MS && touchedElement) {
            // This was a tap - manually trigger the chat loading
            const chatId = touchedElement.dataset.chatId;
            if (chatId) {
                loadChat(chatId);
            }
        } else if (isTouchMoving) {
            // This was a drag - prevent the next click and start momentum scrolling
            preventNextClick = true;

            // Start momentum scrolling
            startMomentumScroll(scrollVelocity);

            // Reset the prevention after a short delay
            setTimeout(() => {
                preventNextClick = false;
            }, 300);
        }

        // Reset touch tracking
        touchedElement = null;
        isTouchMoving = false;
    }

    /**
     * Handles click events on the chat history
     * @param {MouseEvent} e - The click event
     */
    function handleClick(e) {
        if (preventNextClick) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    /**
     * Starts momentum scrolling with the given initial velocity
     * @param {number} initialVelocity - Initial scroll velocity
     */
    function startMomentumScroll(initialVelocity) {
        // Calculate weighted average velocity from recent history for smoother momentum
        let finalVelocity = initialVelocity;

        if (velocityHistory.length > 0) {
            // Get the most recent velocity measurements
            const now = Date.now();
            const recentVelocities = velocityHistory.filter(v => now - v.time < 80);

            if (recentVelocities.length > 0) {
                // Calculate weighted average with more recent velocities having higher weight
                let totalWeight = 0;
                let weightedSum = 0;

                recentVelocities.forEach((entry, index) => {
                    const weight = Math.pow(2, index);
                    weightedSum += entry.velocity * weight;
                    totalWeight += weight;
                });

                finalVelocity = weightedSum / totalWeight;
            }
        }

        let velocity = finalVelocity * 0.9;

        // Cap the maximum velocity to prevent extremely fast scrolling
        const MAX_VELOCITY = 20;
        velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));

        // Only start momentum if velocity is significant
        if (Math.abs(velocity) < MIN_VELOCITY) {
            velocityHistory = [];
            return;
        }

        function momentumStep() {
            if (Math.abs(velocity) < MIN_VELOCITY) {
                velocityHistory = [];
                return;
            }

            // Apply the velocity to scroll position
            chatHistory.scrollTop -= velocity;

            // Apply deceleration
            velocity *= DECELERATION;

            // Continue the momentum
            momentumFrame = requestAnimationFrame(momentumStep);
        }

        // Start the momentum animation
        momentumFrame = requestAnimationFrame(momentumStep);

        // Clear velocity history after momentum starts
        setTimeout(() => {
            velocityHistory = [];
        }, 100);
    }

    // console.log('Chat history touch handler initialized');
}
