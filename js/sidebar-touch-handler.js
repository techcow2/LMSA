// Sidebar touch handler for improved touch scrolling on mobile devices
import { debugError, debugLog } from './utils.js';

/**
 * Initializes touch handlers for the sidebar to improve scrolling on mobile devices
 */
export function initializeSidebarTouchHandler() {
    const sidebar = document.getElementById('sidebar');
    const chatHistory = document.getElementById('chat-history');

    if (!sidebar || !chatHistory) {
        debugError('Sidebar or chat history elements not found');
        return;
    }

    // Variables to track touch state
    let touchStartY = 0;
    let touchStartX = 0;
    let isDragging = false;
    let isScrolling = false;
    const DRAG_THRESHOLD = 5; // Pixels of movement to consider a drag (reduced for faster detection)
    let touchedElement = null;
    let scrollStartTime = 0;
    let scrollTimeout = null;

    // Immediately apply the no-highlight class to all interactive elements
    function applyNoHighlightToAll() {
        const interactiveElements = sidebar.querySelectorAll('.menu-item, .section-header');
        interactiveElements.forEach(el => {
            el.classList.add('no-touch-highlight');
        });
    }

    // Remove the no-highlight class from all interactive elements
    function removeNoHighlightFromAll() {
        const interactiveElements = sidebar.querySelectorAll('.no-touch-highlight');
        interactiveElements.forEach(el => {
            el.classList.remove('no-touch-highlight');
        });
    }

    // Set scrolling state
    function setScrollingState(scrolling) {
        isScrolling = scrolling;

        if (scrolling) {
            applyNoHighlightToAll();

            // Clear any existing timeout
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        } else {
            // Set a timeout to remove the no-highlight class after scrolling stops
            scrollTimeout = setTimeout(() => {
                if (!isDragging) {
                    removeNoHighlightFromAll();
                }
            }, 300); // Wait 300ms after scrolling stops
        }
    }

    // Add touch event handlers to the sidebar
    sidebar.addEventListener('touchstart', function(e) {
        // Record the starting position and time
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        scrollStartTime = Date.now();
        isDragging = false;
        touchedElement = e.target;

        // Immediately apply no-highlight to prevent the initial highlight
        applyNoHighlightToAll();
    }, { passive: false });

    sidebar.addEventListener('touchmove', function(e) {
        // Calculate distance moved
        const touchY = e.touches[0].clientY;
        const touchX = e.touches[0].clientX;
        const deltaY = Math.abs(touchY - touchStartY);
        const deltaX = Math.abs(touchX - touchStartX);

        // If moved more than threshold, consider it a drag/scroll
        if (deltaY > DRAG_THRESHOLD || deltaX > DRAG_THRESHOLD) {
            isDragging = true;
            setScrollingState(true);
        }

        // Stop propagation but don't prevent default scrolling
        e.stopPropagation();
    }, { passive: true });

    sidebar.addEventListener('touchend', function(e) {
        // Calculate if this was a quick tap or a scroll/drag
        const touchDuration = Date.now() - scrollStartTime;
        const wasQuickTap = touchDuration < 200 && !isDragging;

        // If this was a quick tap, allow the click to happen
        if (wasQuickTap) {
            // Only remove no-highlight from the tapped element
            if (touchedElement) {
                const targetElement = touchedElement.closest('.menu-item, .section-header');
                if (targetElement) {
                    targetElement.classList.remove('no-touch-highlight');
                }
            }
        } else {
            // This was a scroll/drag, keep no-highlight for a moment
            setTimeout(() => {
                setScrollingState(false);
            }, 100);
        }

        // Reset dragging state
        isDragging = false;
    }, { passive: true });

    // Handle scroll events to maintain the no-highlight state during scrolling
    sidebar.addEventListener('scroll', function() {
        setScrollingState(true);
    }, { passive: true });

    // Add specific touch event handlers to the chat history section
    chatHistory.addEventListener('touchstart', function(e) {
        // Apply no-highlight to all menu items during chat history scrolling
        applyNoHighlightToAll();
    }, { passive: true });

    chatHistory.addEventListener('touchmove', function(e) {
        // Keep no-highlight during scrolling
        setScrollingState(true);
        e.stopPropagation();
    }, { passive: true });

    chatHistory.addEventListener('touchend', function(e) {
        // Reset scrolling state after a delay
        setTimeout(() => {
            setScrollingState(false);
        }, 300);
    }, { passive: true });

    // Add touch event handlers to all menu items
    const menuItems = sidebar.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        // Prevent default active state on touchstart
        item.addEventListener('touchstart', function(e) {
            item.classList.add('no-touch-highlight');
        }, { passive: false });

        // Remove highlight during move
        item.addEventListener('touchmove', function(e) {
            item.classList.add('no-touch-highlight');
            e.stopPropagation();
        }, { passive: true });
    });

    // Add touch event handlers to all section headers
    const sectionHeaders = sidebar.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        // Prevent default active state on touchstart
        header.addEventListener('touchstart', function(e) {
            header.classList.add('no-touch-highlight');
        }, { passive: false });

        // Remove highlight during move
        header.addEventListener('touchmove', function(e) {
            header.classList.add('no-touch-highlight');
            e.stopPropagation();
        }, { passive: true });
    });

    debugLog('Sidebar touch handlers initialized with improved drag detection');
}
