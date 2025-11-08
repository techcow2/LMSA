/**
 * Age Verification System
 * Verifies user age before allowing access to terms of service
 */

// Constants
const AGE_VERIFICATION_KEY = 'lmsa_age_verified';
const MINIMUM_AGE = 18;

// DOM Elements
let ageGateModal;
let dayWheel;
let monthWheel;
let yearWheel;
let verifyAgeButton;
let ageVerificationError;
let mainAppContainer;
let termsModal;

// Wheel picker state
let wheelState = {
    day: { currentIndex: 0, items: [], isScrolling: false },
    month: { currentIndex: 0, items: [], isScrolling: false },
    year: { currentIndex: 0, items: [], isScrolling: false }
};

// State
let isInitialized = false;

/**
 * Initialize the age verification system
 */
function initializeAgeVerification() {
    if (isInitialized) return;

    // Get DOM elements
    ageGateModal = document.getElementById('age-gate-modal');
    dayWheel = document.getElementById('day-wheel');
    monthWheel = document.getElementById('month-wheel');
    yearWheel = document.getElementById('year-wheel');
    verifyAgeButton = document.getElementById('verify-age-btn');
    ageVerificationError = document.getElementById('age-verification-error');
    mainAppContainer = document.getElementById('main-app-container');
    termsModal = document.getElementById('terms-modal');

    if (!ageGateModal || !dayWheel || !monthWheel || !yearWheel || !verifyAgeButton) {
        console.error('Age verification system: Required DOM elements not found');
        return;
    }

    // Immediately hide main app and terms modal to prevent flicker
    if (mainAppContainer) {
        mainAppContainer.classList.add('hidden');
    }
    if (termsModal) {
        termsModal.classList.add('hidden');
    }

    // Initialize wheel pickers
    initializeWheelPickers();

    // Check if age has already been verified
    if (hasVerifiedAge()) {
        hideAgeGate();
        proceedToTerms();
        return;
    }

    // Show age gate
    showAgeGate();
    setupEventListeners();
    isInitialized = true;
}

/**
 * Check if user has already verified their age
 */
function hasVerifiedAge() {
    return localStorage.getItem(AGE_VERIFICATION_KEY) === 'true';
}

/**
 * Show the age gate modal
 */
function showAgeGate() {
    ageGateModal.classList.remove('hidden');
    document.body.classList.add('age-gate-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    // Hide main app and terms modal
    if (mainAppContainer) {
        mainAppContainer.classList.add('hidden');
    }
    if (termsModal) {
        termsModal.classList.add('hidden');
    }

    // Set default selections
    setTimeout(() => {
        setDefaultSelections();
    }, 100);
}

/**
 * Hide the age gate modal
 */
function hideAgeGate() {
    ageGateModal.classList.add('hidden');
    document.body.classList.remove('age-gate-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Verify age button click
    verifyAgeButton.addEventListener('click', handleAgeVerification);

    // Change event listeners for selects
    [daySelect, monthSelect, yearSelect].forEach(select => {
        select.addEventListener('change', handleDateChange);
    });

    // Prevent form submission
    const ageGateForm = document.getElementById('age-gate-form');
    if (ageGateForm) {
        ageGateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAgeVerification();
        });
    }

    // Prevent escape key from closing modal
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Prevent click outside modal from closing it
    ageGateModal.addEventListener('click', handleModalClick);
}

/**
 * Initialize wheel pickers with touch and mouse events
 */
function initializeWheelPickers() {
    // Create picker items
    createWheelItems('day', generateDayItems());
    createWheelItems('month', generateMonthItems());
    createWheelItems('year', generateYearItems());

    // Setup event listeners for each wheel
    setupWheelEvents('day', dayWheel);
    setupWheelEvents('month', monthWheel);
    setupWheelEvents('year', yearWheel);
}

/**
 * Create wheel items for a picker
 */
function createWheelItems(type, items) {
    const wheel = type === 'day' ? dayWheel : type === 'month' ? monthWheel : yearWheel;
    const itemsContainer = wheel.querySelector('.wheel-picker-items');

    wheelState[type].items = items;

    items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'wheel-picker-item';
        itemElement.textContent = item.label;
        itemElement.dataset.value = item.value;
        itemElement.dataset.index = index;
        itemsContainer.appendChild(itemElement);
    });

    // Set initial position
    updateWheelPosition(type, 0);
}

/**
 * Setup touch and mouse events for a wheel
 */
function setupWheelEvents(type, wheel) {
    let startY = 0;
    let startIndex = 0;
    let isDragging = false;

    // Touch events
    wheel.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startIndex = wheelState[type].currentIndex; // Store the starting index
        isDragging = true;
        wheelState[type].isScrolling = true;
    }, { passive: true });

    wheel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;

        // Use dynamic item height based on mobile/desktop
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        const itemHeight = isMobile ? 32 : 36;

        const itemsToMove = Math.round(deltaY / itemHeight);
        const newIndex = Math.max(0, Math.min(startIndex + itemsToMove, wheelState[type].items.length - 1));

        updateWheelPosition(type, newIndex);
    }, { passive: false });

    wheel.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        snapToNearestItem(type);
    });

    // Mouse events
    wheel.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        startIndex = wheelState[type].currentIndex; // Store the starting index
        isDragging = true;
        wheelState[type].isScrolling = true;
        wheel.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const currentY = e.clientY;
        const deltaY = startY - currentY;

        // Use dynamic item height based on mobile/desktop
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        const itemHeight = isMobile ? 32 : 36;

        const itemsToMove = Math.round(deltaY / itemHeight);
        const newIndex = Math.max(0, Math.min(startIndex + itemsToMove, wheelState[type].items.length - 1));

        updateWheelPosition(type, newIndex);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        wheel.style.cursor = 'grab';
        snapToNearestItem(type);
    });

    // Scroll event for mouse wheel
    wheel.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        const currentIndex = wheelState[type].currentIndex;
        const newIndex = Math.max(0, Math.min(currentIndex + Math.sign(delta), wheelState[type].items.length - 1));

        updateWheelPosition(type, newIndex);

        clearTimeout(wheelState[type].snapTimeout);
        wheelState[type].snapTimeout = setTimeout(() => {
            snapToNearestItem(type);
        }, 150);
    });
}

/**
 * Update wheel position from scroll value
 */
function updateWheelFromScroll(type, scrollTop) {
    // Use dynamic item height based on mobile/desktop
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const itemHeight = isMobile ? 32 : 36;

    const maxIndex = wheelState[type].items.length - 1;
    const newIndex = Math.round(Math.max(0, Math.min(scrollTop / itemHeight, maxIndex)));

    updateWheelPosition(type, newIndex);
}

/**
 * Update wheel visual position
 */
function updateWheelPosition(type, index) {
    const wheel = type === 'day' ? dayWheel : type === 'month' ? monthWheel : yearWheel;
    const itemsContainer = wheel.querySelector('.wheel-picker-items');

    // Determine item height based on mobile/desktop
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const itemHeight = isMobile ? 32 : 36;

    // Clamp index to valid range
    index = Math.max(0, Math.min(index, wheelState[type].items.length - 1));
    wheelState[type].currentIndex = index;

    // Get reliable wheel height - use multiple methods to ensure accuracy
    let wheelHeight = wheel.offsetHeight;

    // Method 1: Direct measurement with fallback
    if (!wheelHeight || wheelHeight < 50) {
        // Try getBoundingClientRect for more reliable measurement
        const rect = wheel.getBoundingClientRect();
        if (rect.height > 0) {
            wheelHeight = rect.height;
        }
    }

    // Method 2: Use computed style as fallback
    if (!wheelHeight || wheelHeight < 50) {
        const computedStyle = window.getComputedStyle(wheel);
        wheelHeight = parseFloat(computedStyle.height);
    }

    // Method 3: Use CSS media query detection with hardcoded values
    const expectedHeight = isMobile ? 160 : 180;

    // If all methods fail or give unreasonable values, use expected height
    if (!wheelHeight || wheelHeight < 50 || wheelHeight > 500 || !isFinite(wheelHeight)) {
        wheelHeight = expectedHeight;

        // Debug logging for WebView issues
        if (window.location.hostname === 'localhost') {
            console.warn(`WebView wheel positioning issue detected for ${type}:`, {
                offsetHeight: wheel.offsetHeight,
                rectHeight: wheel.getBoundingClientRect().height,
                computedHeight: wheelHeight,
                isMobile,
                itemHeight,
                usingFallback: true
            });
        }
    }

    // Calculate the transform needed to center the selected item
    const wheelCenterY = wheelHeight / 2;
    const selectedItemCurrentY = (index * itemHeight) + (itemHeight / 2);
    const translateY = wheelCenterY - selectedItemCurrentY;

    // Apply the transform with explicit units
    itemsContainer.style.transform = `translateY(${translateY.toFixed(2)}px)`;

    // Update selected state
    const allItems = itemsContainer.querySelectorAll('.wheel-picker-item');
    allItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Debug logging for critical scenarios
    if (window.location.hostname === 'localhost' && (index === 0 || index === wheelState[type].items.length - 1)) {
        console.debug(`Wheel ${type} positioned at index ${index}:`, {
            wheelHeight,
            itemHeight,
            translateY,
            wheelCenterY,
            selectedItemCurrentY,
            isMobile
        });
    }
}

/**
 * Snap to nearest item with smooth animation
 */
function snapToNearestItem(type) {
    updateWheelPosition(type, wheelState[type].currentIndex);
    wheelState[type].isScrolling = false;
}

/**
 * Generate day items
 */
function generateDayItems() {
    const items = [];
    for (let i = 1; i <= 31; i++) {
        items.push({
            value: i.toString(),
            label: i.toString().padStart(2, '0')
        });
    }
    return items;
}

/**
 * Generate month items
 */
function generateMonthItems() {
    return [
        { value: '1', label: 'Jan' },
        { value: '2', label: 'Feb' },
        { value: '3', label: 'Mar' },
        { value: '4', label: 'Apr' },
        { value: '5', label: 'May' },
        { value: '6', label: 'Jun' },
        { value: '7', label: 'Jul' },
        { value: '8', label: 'Aug' },
        { value: '9', label: 'Sep' },
        { value: '10', label: 'Oct' },
        { value: '11', label: 'Nov' },
        { value: '12', label: 'Dec' }
    ];
}

/**
 * Generate year items
 */
function generateYearItems() {
    const items = [];
    const currentYear = new Date().getFullYear();

    for (let i = currentYear; i >= 1900; i--) {
        items.push({
            value: i.toString(),
            label: i.toString()
        });
    }
    return items;
}

/**
 * Set default selections
 */
function setDefaultSelections() {
    const currentYear = new Date().getFullYear();

    // Ensure wheels are properly rendered before positioning
    // This helps with WebView timing issues
    setTimeout(() => {
        // Set day to 1
        updateWheelPosition('day', 0);

        // Set month to January
        updateWheelPosition('month', 0);

        // Set year to current year (find index)
        const yearItems = wheelState.year.items;
        const currentYearIndex = yearItems.findIndex(item => item.value === currentYear.toString());
        if (currentYearIndex !== -1) {
            updateWheelPosition('year', currentYearIndex);
        }
    }, 50); // Small delay to ensure DOM is fully rendered
}

/**
 * Handle global keyboard events
 */
function handleGlobalKeyDown(event) {
    // Prevent escape key from closing modal
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * Handle clicks on modal overlay
 */
function handleModalClick(event) {
    // Prevent clicks outside content from closing modal
    if (event.target === ageGateModal) {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

/**
 * Validate date input
 */
function validateDate(day, month, year) {
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Basic validation
    if (!day || !month || !year ||
        dayNum < 1 || dayNum > 31 ||
        monthNum < 1 || monthNum > 12 ||
        yearNum < 1900 || yearNum > new Date().getFullYear()) {
        return false;
    }

    // Create date object and validate it exists
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return (
        date.getFullYear() === yearNum &&
        date.getMonth() === monthNum - 1 &&
        date.getDate() === dayNum
    );
}

/**
 * Handle age verification
 */
function handleAgeVerification() {
    // Get selected values from wheel pickers
    const dayValue = wheelState.day.items[wheelState.day.currentIndex]?.value;
    const monthValue = wheelState.month.items[wheelState.month.currentIndex]?.value;
    const yearValue = wheelState.year.items[wheelState.year.currentIndex]?.value;

    // Clear previous error
    ageVerificationError.classList.add('hidden');

    // Validate that all fields are selected
    if (!dayValue || !monthValue || !yearValue) {
        showAgeVerificationError('Please select your complete date of birth');
        return;
    }

    // Validate date format
    if (!validateDate(dayValue.padStart(2, '0'), monthValue.padStart(2, '0'), yearValue)) {
        showAgeVerificationError('Please select a valid date of birth');
        return;
    }

    // Calculate age
    const birthDate = new Date(parseInt(yearValue), parseInt(monthValue) - 1, parseInt(dayValue));
    const age = calculateAge(birthDate);

    // Check if user is old enough
    if (age < MINIMUM_AGE) {
        showAgeVerificationError(`You must be at least ${MINIMUM_AGE} years old to use this application.`);
        return;
    }

    // Show loading state
    verifyAgeButton.classList.add('loading');
    verifyAgeButton.disabled = true;

    // Simulate processing delay for better UX
    setTimeout(() => {
        // Save age verification
        localStorage.setItem(AGE_VERIFICATION_KEY, 'true');

        // Hide age gate and proceed
        hideAgeGate();
        cleanupEventListeners();

        console.log('Age verification passed successfully');

        // Proceed to terms of service
        proceedToTerms();
    }, 500);
}

/**
 * Show age verification error
 */
function showAgeVerificationError(message) {
    ageVerificationError.textContent = message;
    ageVerificationError.classList.remove('hidden');

    // Shake animation for error
    verifyAgeButton.classList.add('animate-pulse');
    setTimeout(() => {
        verifyAgeButton.classList.remove('animate-pulse');
    }, 500);
}

/**
 * Proceed to terms of service after age verification
 */
function proceedToTerms() {
    // Small delay to ensure age gate is fully hidden
    setTimeout(() => {
        // Import and initialize terms acceptance
        import('./terms-acceptance.js').then(module => {
            if (typeof module.initializeTermsAcceptance === 'function') {
                module.initializeTermsAcceptance();
            }
        }).catch(error => {
            console.error('Error loading terms acceptance after age verification:', error);
        });
    }, 100);
}

/**
 * Clean up event listeners
 */
function cleanupEventListeners() {
    if (verifyAgeButton) {
        verifyAgeButton.removeEventListener('click', handleAgeVerification);
    }

    // Clear any pending snap timeouts
    Object.keys(wheelState).forEach(type => {
        if (wheelState[type].snapTimeout) {
            clearTimeout(wheelState[type].snapTimeout);
        }
    });

    document.removeEventListener('keydown', handleGlobalKeyDown);
    ageGateModal.removeEventListener('click', handleModalClick);

    const ageGateForm = document.getElementById('age-gate-form');
    if (ageGateForm) {
        ageGateForm.removeEventListener('submit', handleAgeVerification);
    }
}

/**
 * Reset age verification (for testing purposes)
 */
function resetAgeVerification() {
    localStorage.removeItem(AGE_VERIFICATION_KEY);
}

/**
 * Get current age verification status
 */
function getAgeVerificationStatus() {
    return {
        isVerified: hasVerifiedAge(),
        minimumAge: MINIMUM_AGE
    };
}

// Export functions for use in other modules
export {
    initializeAgeVerification,
    resetAgeVerification,
    getAgeVerificationStatus,
    hasVerifiedAge
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAgeVerification);
} else {
    // DOM is already loaded
    initializeAgeVerification();
}