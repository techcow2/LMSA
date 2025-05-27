// Touch handler for chat history scrolling with optimized performance
import { chatHistory } from './dom-elements.js';
import { loadChat } from './chat-service.js';
import { throttle, optimizedAnimation, cancelOptimizedAnimation, addHardwareAcceleration } from './performance-utils.js';

/**
 * Initializes touch handling for the chat history container
 * Allows scrolling by dragging anywhere in the chat history
 * while still allowing taps to select chats
 */
export function initializeChatHistoryTouchHandler() {
    if (!chatHistory) return;

    // Add hardware acceleration to improve scrolling performance
    addHardwareAcceleration(chatHistory);

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
    const DRAG_THRESHOLD_PX = 8; // Slightly reduced threshold for more responsive feel
    const TAP_THRESHOLD_MS = 200; // Max milliseconds for a tap
    const DECELERATION = 0.92; // Slightly increased for smoother deceleration
    const MIN_VELOCITY = 0.6; // Slightly reduced for more responsive momentum scrolling
    const VELOCITY_UPDATE_INTERVAL = 16; // Only update velocity every 16ms (60fps)

    // Throttled touch move handler to prevent excessive calculations
    const throttledTouchMove = throttle(handleTouchMove, 8); // 8ms throttle (~120fps)

    // Add touch event listeners to the chat history container
    chatHistory.addEventListener('touchstart', handleTouchStart, { passive: true });
    chatHistory.addEventListener('touchmove', throttledTouchMove, { passive: true }); // Keep as passive to allow native scrolling
    chatHistory.addEventListener('touchend', handleTouchEnd, { passive: true });

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

        // Only update velocity at a controlled rate to avoid excessive calculations
        const now = Date.now();
        if (now - lastVelocityUpdate >= VELOCITY_UPDATE_INTERVAL) {
            // Calculate scroll velocity for momentum scrolling
            const currentVelocity = touch.clientY - lastTouchY;

            // Only record significant movements to prevent micro-jitters from affecting momentum
            // Slightly reduced threshold for more responsive feel
            if (Math.abs(currentVelocity) > 0.3) {
                velocityHistory.push({ velocity: currentVelocity, time: now });

                // Keep only the last 7 velocity measurements for better momentum calculation
                // Increased from 5 to 7 for smoother momentum
                if (velocityHistory.length > 7) {
                    velocityHistory.shift();
                }
            }

            lastTouchY = touch.clientY;
            lastVelocityUpdate = now;
        }

        // If movement exceeds threshold, mark as dragging
        // Use a more responsive threshold check
        if (!isTouchMoving && (deltaY > DRAG_THRESHOLD_PX || deltaX > DRAG_THRESHOLD_PX)) {
            isTouchMoving = true;

            // Add a subtle haptic feedback when drag starts (if supported)
            if (navigator.vibrate && deltaY > DRAG_THRESHOLD_PX * 2) {
                try {
                    navigator.vibrate(10); // Very subtle vibration
                } catch (e) {
                    // Ignore errors if vibration is not supported
                }
            }
        }

        // Let the browser handle the scrolling natively
        // We're not manually adjusting scrollTop here for better performance
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
            // Get the most recent velocity measurements (last 80ms for more responsive feel)
            const now = Date.now();
            const recentVelocities = velocityHistory.filter(v => now - v.time < 80);

            if (recentVelocities.length > 0) {
                // Calculate weighted average with more recent velocities having higher weight
                let totalWeight = 0;
                let weightedSum = 0;

                recentVelocities.forEach((entry, index) => {
                    // More recent entries get higher weight (exponential weighting)
                    const weight = Math.pow(2, index);
                    weightedSum += entry.velocity * weight;
                    totalWeight += weight;
                });

                finalVelocity = weightedSum / totalWeight;
            }
        }

        // Apply a scaling factor to make the momentum feel natural
        // Using a slightly higher factor for more responsive feel
        let velocity = finalVelocity * 0.9;

        // Cap the maximum velocity to prevent extremely fast scrolling
        const MAX_VELOCITY = 20; // Slightly increased for more responsive feel
        if (Math.abs(velocity) > MAX_VELOCITY) {
            velocity = velocity > 0 ? MAX_VELOCITY : -MAX_VELOCITY;
        }

        // Don't start momentum scrolling if velocity is too low
        if (Math.abs(velocity) < MIN_VELOCITY) {
            return;
        }

        // Use optimizedAnimation from performance-utils.js
        function momentumStep() {
            if (Math.abs(velocity) < MIN_VELOCITY) {
                cancelOptimizedAnimation(momentumFrame);
                momentumFrame = null;
                return;
            }

            // Use transform for smoother scrolling when possible
            // This avoids layout thrashing by not modifying scrollTop directly
            try {
                // Still use scrollTop for compatibility, but in a way that minimizes layout thrashing
                chatHistory.scrollTop -= velocity;
            } catch (e) {
                console.error('Error during momentum scrolling:', e);
            }

            // Apply a non-linear deceleration curve for more natural feeling
            // Faster at the beginning, slower as it comes to a stop
            velocity *= DECELERATION;

            // Apply additional deceleration as the scroll slows down
            if (Math.abs(velocity) < 3) {
                velocity *= 0.88; // Slightly increased for smoother stop
            }

            // Use optimizedAnimation for the next frame
            momentumFrame = optimizedAnimation(momentumStep);
        }

        // Cancel any existing animation before starting a new one
        if (momentumFrame) {
            cancelOptimizedAnimation(momentumFrame);
        }

        // Start the momentum scrolling animation
        momentumFrame = optimizedAnimation(momentumStep);

        // Clear velocity history after starting momentum
        velocityHistory = [];
    }
}
