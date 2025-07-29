/**
 * File Preview Touch Handler - Handles expandable file preview area
 * Allows users to touch/click the file preview area to expand it for better visibility
 */

import { removeUploadedFileByName } from './file-upload.js';

let isFilePreviewExpanded = false;
let filePreviewObserver = null;
let outsideClickListener = null;
let longPressTimer = null;
let longPressTarget = null;
let isLongPressing = false;
let modalJustShown = false;

/**
 * Initialize file preview touch handlers
 */
export function initializeFilePreviewTouchHandler() {
    // console.log('Initializing file preview touch handlers');
    
    // Set up initial handlers for existing file preview containers
    setupFilePreviewHandlers();
    
    // Set up mutation observer to handle dynamically added file preview containers
    setupFilePreviewObserver();
}

/**
 * Set up touch/click handlers for file preview containers
 */
function setupFilePreviewHandlers() {
    const filePreviewContainers = document.querySelectorAll('.file-previews');
    filePreviewContainers.forEach(container => {
        addFilePreviewHandlers(container);
    });
}

/**
 * Add touch/click handlers to a specific file preview container
 * @param {HTMLElement} container - The file preview container element
 */
function addFilePreviewHandlers(container) {
    if (container.dataset.expandHandlerAdded === 'true') {
        return; // Already has handlers
    }
    
    console.log('Adding expand handlers to file preview container');
    
    // Touch start handler for long-press detection
    const handleTouchStart = (e) => {
        // Clear any existing timer
        clearLongPressTimer();
        
        // Check if touching a file preview item
        const filePreview = e.target.closest('.file-preview');
        console.log('Touch start - filePreview found:', !!filePreview, 'target:', e.target);
        
        if (filePreview && !e.target.closest('.remove-file')) {
            console.log('Starting long press timer for file:', filePreview);
            
            longPressTarget = filePreview;
            isLongPressing = false;
            
            // Start long press timer (500ms)
            longPressTimer = setTimeout(() => {
                isLongPressing = true;
                // Now prevent scrolling and text selection since we're doing a long press
                document.getSelection().removeAllRanges();
                console.log('Long press detected, showing modal...');
                // Add a small delay to ensure touch events have completed
                setTimeout(() => {
                    modalJustShown = true;
                    showFileRemovalModal(filePreview, container);
                    // Reset the flag after a short delay
                    setTimeout(() => {
                        modalJustShown = false;
                    }, 200);
                }, 50);
            }, 500);
            
            // Add visual feedback for potential long press
            filePreview.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
        
        // Handle expansion logic for non-file items or when not long pressing
        if (!filePreview || e.target.closest('.remove-file')) {
            handleExpansion(e);
        }
    };
    
    // Touch end handler
    const handleTouchEnd = (e) => {
        console.log('Touch end detected, isLongPressing:', isLongPressing);
        
        // Clear long press timer
        clearLongPressTimer();
        
        // Remove visual feedback
        if (longPressTarget) {
            longPressTarget.style.backgroundColor = '';
            
            // If this was not a long press and we touched a file, handle expansion
            if (!isLongPressing && longPressTarget.contains(e.target)) {
                console.log('Short tap detected, expanding...');
                handleExpansion(e);
            }
            
            longPressTarget = null;
        }
        
        isLongPressing = false;
    };
    
    // Touch cancel handler
    const handleTouchCancel = (e) => {
        clearLongPressTimer();
        if (longPressTarget) {
            longPressTarget.style.backgroundColor = '';
            longPressTarget = null;
        }
        isLongPressing = false;
    };
    
    // Touch/click handler for expansion
    const handleExpansion = (e) => {
        // Don't expand if we're in the middle of a long press
        if (isLongPressing) {
            return;
        }
        
        // If already expanded, don't allow collapse from within
        if (container.classList.contains('expanded')) {
            return; // Already expanded, don't toggle
        }
        
        // When collapsed, allow expansion from anywhere within the container
        // including file preview items (but not remove buttons which should have their own action)
        if (e.target.closest('.remove-file')) {
            return; // Let remove buttons handle their own action
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        expandFilePreview(container);
    };
    
    // Add touch and click event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    container.addEventListener('touchmove', (e) => {
        // Only prevent scrolling if we're actually long pressing, not just during potential long press
        if (longPressTarget && isLongPressing) {
            e.preventDefault();
        } else if (longPressTarget) {
            // If we're moving during potential long press, cancel it (user is scrolling)
            clearLongPressTimer();
            if (longPressTarget) {
                longPressTarget.style.backgroundColor = '';
                longPressTarget = null;
            }
        }
    }, { passive: false });
    container.addEventListener('click', handleExpansion);
    
    // Add visual feedback for touch interactions (only when not expanded)
    container.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.remove-file') && !container.classList.contains('expanded')) {
            container.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
        }
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        if (!e.target.closest('.remove-file') && !container.classList.contains('expanded')) {
            container.style.backgroundColor = '#1a1a1a';
        }
    }, { passive: true });
    
    container.addEventListener('touchcancel', (e) => {
        container.style.backgroundColor = '#1a1a1a';
    }, { passive: true });
    
    // Mark as having handlers to avoid duplicate listeners
    container.dataset.expandHandlerAdded = 'true';
    
    // Add accessibility attributes
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', 'Expand file preview area (click anywhere to expand, click outside or press Escape to collapse)');
    container.setAttribute('aria-expanded', 'false');
    
    // Add keyboard support (only for expansion)
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            // Only allow expansion, not collapse
            if (!container.classList.contains('expanded')) {
                e.preventDefault();
                expandFilePreview(container);
            }
        }
    });
}

/**
 * Expand a file preview container
 * @param {HTMLElement} container - The file preview container element
 */
function expandFilePreview(container) {
    // Collapse any other expanded previews first
    collapseAllFilePreviews();
    
    container.classList.add('expanded');
    container.setAttribute('aria-expanded', 'true');
    container.setAttribute('aria-label', 'File preview area expanded (click outside or press Escape to collapse)');
    isFilePreviewExpanded = true;
    console.log('File preview expanded');
    
    // Set up outside click listener to auto-collapse
    setupOutsideClickListener(container);
    
    // Scroll the expanded area into view if needed
    requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // If the bottom of the container is below the viewport, scroll it into view
        if (rect.bottom > viewportHeight) {
            container.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end',
                inline: 'nearest'
            });
        }
    });
    
    // Dispatch custom event for other components to listen to
    const expansionEvent = new CustomEvent('filePreviewExpansionChange', {
        detail: {
            expanded: true,
            container: container
        }
    });
    document.dispatchEvent(expansionEvent);
}

/**
 * Collapse a file preview container
 * @param {HTMLElement} container - The file preview container element
 */
function collapseFilePreview(container) {
    container.classList.remove('expanded');
    container.setAttribute('aria-expanded', 'false');
    container.setAttribute('aria-label', 'Expand file preview area (click anywhere to expand, click outside or press Escape to collapse)');
    isFilePreviewExpanded = false;
    console.log('File preview collapsed');
    
    // Remove outside click listener
    removeOutsideClickListener();
    
    // Dispatch custom event for other components to listen to
    const expansionEvent = new CustomEvent('filePreviewExpansionChange', {
        detail: {
            expanded: false,
            container: container
        }
    });
    document.dispatchEvent(expansionEvent);
}

/**
 * Clear the long press timer
 */
function clearLongPressTimer() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

/**
 * Show the file removal confirmation modal
 * @param {HTMLElement} filePreview - The file preview element
 * @param {HTMLElement} container - The container element
 */
function showFileRemovalModal(filePreview, container) {
    console.log('showFileRemovalModal called with:', filePreview);
    
    const modal = document.getElementById('file-removal-modal');
    const fileIcon = document.getElementById('file-removal-icon');
    const fileName = document.getElementById('file-removal-name');
    const cancelBtn = document.getElementById('cancel-file-removal');
    const confirmBtn = document.getElementById('confirm-file-removal');
    
    console.log('Modal elements found:', {
        modal: !!modal,
        fileIcon: !!fileIcon,
        fileName: !!fileName,
        cancelBtn: !!cancelBtn,
        confirmBtn: !!confirmBtn
    });
    
    if (!modal || !fileIcon || !fileName || !cancelBtn || !confirmBtn) {
        console.error('File removal modal elements not found');
        return;
    }
    
    // Get file information from the preview element
    const iconElement = filePreview.querySelector('i');
    const nameElement = filePreview.querySelector('.file-name');
    
    console.log('Icon and name elements found:', {
        iconElement: !!iconElement,
        nameElement: !!nameElement,
        iconClass: iconElement?.className,
        fileName: nameElement?.textContent
    });
    
    if (nameElement) {
        // Set the icon class (use default if no icon found)
        if (iconElement) {
            fileIcon.className = iconElement.className;
        } else {
            // Default file icon if no specific icon found
            fileIcon.className = 'fas fa-file text-blue-400';
        }
        
        fileName.textContent = nameElement.textContent;
        
        console.log('File info set in modal:', {
            iconClass: fileIcon.className,
            fileName: fileName.textContent
        });
        
        // Show the modal
        console.log('Showing modal, removing hidden class...');
        modal.classList.remove('hidden');
        console.log('Modal classes after showing:', modal.className);
        console.log('Modal display style:', window.getComputedStyle(modal).display);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Focus the cancel button for accessibility
        setTimeout(() => {
            cancelBtn.focus();
            console.log('Modal should be visible now');
            console.log('Modal visibility check:', {
                hasHiddenClass: modal.classList.contains('hidden'),
                display: window.getComputedStyle(modal).display,
                visibility: window.getComputedStyle(modal).visibility,
                zIndex: window.getComputedStyle(modal).zIndex
            });
        }, 100);
        
        // Set up event handlers
        const handleCancel = () => {
            hideFileRemovalModal();
        };
        
        const handleConfirm = () => {
            removeFileFromPreview(filePreview, container);
            hideFileRemovalModal();
        };
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                hideFileRemovalModal();
            }
        };
        
        // Add event listeners
        cancelBtn.addEventListener('click', handleCancel);
        confirmBtn.addEventListener('click', handleConfirm);
        document.addEventListener('keydown', handleEscape);
        
        // Store handlers for cleanup
        modal._handlers = {
            cancel: handleCancel,
            confirm: handleConfirm,
            escape: handleEscape
        };
        
        console.log('File removal modal shown for:', nameElement.textContent);
    } else {
        console.error('Could not find file name element in preview:', filePreview);
        return;
    }
}

/**
 * Hide the file removal confirmation modal
 */
function hideFileRemovalModal() {
    const modal = document.getElementById('file-removal-modal');
    const cancelBtn = document.getElementById('cancel-file-removal');
    const confirmBtn = document.getElementById('confirm-file-removal');
    
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clean up event listeners
        if (modal._handlers) {
            cancelBtn.removeEventListener('click', modal._handlers.cancel);
            confirmBtn.removeEventListener('click', modal._handlers.confirm);
            document.removeEventListener('keydown', modal._handlers.escape);
            delete modal._handlers;
        }
        
        console.log('File removal modal hidden');
    }
}

/**
 * Remove a file from the preview
 * @param {HTMLElement} filePreview - The file preview element to remove
 * @param {HTMLElement} container - The container element
 */
function removeFileFromPreview(filePreview, container) {
    const fileName = filePreview.querySelector('.file-name')?.textContent;
    console.log('Removing file from preview:', fileName);
    
    // Remove the file from the uploadedFiles state as well
    if (fileName) {
        removeUploadedFileByName(fileName);
    }
    
    // Remove the file preview element
    filePreview.remove();
    
    // Check if container is now empty
    const remainingFiles = container.querySelectorAll('.file-preview');
    if (remainingFiles.length === 0) {
        // If no files left, remove the entire container
        container.remove();
        isFilePreviewExpanded = false;
        removeOutsideClickListener();
        console.log('All files removed, container removed');
    }
    
    // Dispatch custom event for other components to listen to
    const removalEvent = new CustomEvent('fileRemovedFromPreview', {
        detail: {
            fileName: fileName,
            remainingCount: remainingFiles.length
        }
    });
    document.dispatchEvent(removalEvent);
}

/**
 * Set up outside click listener to auto-collapse expanded previews
 * @param {HTMLElement} expandedContainer - The currently expanded container
 */
function setupOutsideClickListener(expandedContainer) {
    // Remove any existing listener first
    removeOutsideClickListener();
    
    // Create the outside click handler
    outsideClickListener = (e) => {
        // Don't collapse if a modal was just shown (prevents immediate collapse)
        if (modalJustShown) {
            console.log('Modal just shown, ignoring outside click');
            return;
        }
        
        // Don't collapse if clicking within the expanded container
        if (expandedContainer.contains(e.target)) {
            return;
        }
        
        // Don't collapse if clicking on file input or related elements
        if (e.target.closest('#file-upload-input') || 
            e.target.closest('#paperclip-button') ||
            e.target.closest('.file-preview') ||
            e.target.closest('.remove-file')) {
            return;
        }
        
        // Don't collapse if clicking on modal overlays or other UI elements
        if (e.target.closest('.modal-container') ||
            e.target.closest('#sidebar') ||
            e.target.closest('#settings-modal') ||
            e.target.closest('#context-menu') ||
            e.target.closest('#send-context-menu') ||
            e.target.closest('#empty-message-modal') ||
            e.target.closest('#confirmation-modal') ||
            e.target.closest('#whats-new-modal') ||
            e.target.closest('#about-modal') ||
            e.target.closest('#help-modal') ||
            e.target.closest('#model-modal') ||
            e.target.closest('#file-removal-modal')) {
            return;
        }
        
        // Don't collapse if this is a scroll event
        if (e.type === 'scroll') {
            return;
        }
        
        // Collapse the expanded preview
        collapseFilePreview(expandedContainer);
    };
    
    // Create escape key handler
    const escapeKeyHandler = (e) => {
        if (e.key === 'Escape') {
            collapseFilePreview(expandedContainer);
        }
    };
    
    // Store the escape handler for cleanup
    outsideClickListener.escapeHandler = escapeKeyHandler;
    
    // Add listeners for both touch and mouse events
    // Use a small delay to prevent immediate collapse when expanding
    setTimeout(() => {
        document.addEventListener('touchstart', outsideClickListener, { passive: true });
        document.addEventListener('click', outsideClickListener, { passive: true });
        document.addEventListener('keydown', escapeKeyHandler, { passive: true });
    }, 100);
    
    console.log('Outside click listener set up for file preview auto-collapse');
}

/**
 * Remove the outside click listener
 */
function removeOutsideClickListener() {
    if (outsideClickListener) {
        document.removeEventListener('touchstart', outsideClickListener);
        document.removeEventListener('click', outsideClickListener);
        
        // Remove escape key handler if it exists
        if (outsideClickListener.escapeHandler) {
            document.removeEventListener('keydown', outsideClickListener.escapeHandler);
        }
        
        outsideClickListener = null;
        console.log('Outside click listener removed');
    }
}

/**
 * Set up mutation observer to handle dynamically added file preview containers
 */
function setupFilePreviewObserver() {
    if (filePreviewObserver) {
        filePreviewObserver.disconnect();
    }
    
    filePreviewObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node is a file preview container
                    if (node.classList && node.classList.contains('file-previews')) {
                        addFilePreviewHandlers(node);
                    }
                    
                    // Also check for file preview containers within the added node
                    const filePreviewContainers = node.querySelectorAll && node.querySelectorAll('.file-previews');
                    if (filePreviewContainers) {
                        filePreviewContainers.forEach(container => {
                            addFilePreviewHandlers(container);
                        });
                    }
                }
            });
        });
    });
    
    // Start observing
    filePreviewObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // console.log('File preview mutation observer set up');
}

/**
 * Get the current expansion state
 * @returns {boolean} True if any file preview is currently expanded
 */
export function isFilePreviewCurrentlyExpanded() {
    return isFilePreviewExpanded;
}

/**
 * Force collapse all expanded file previews
 */
export function collapseAllFilePreviews() {
    const expandedContainers = document.querySelectorAll('.file-previews.expanded');
    expandedContainers.forEach(container => {
        container.classList.remove('expanded');
        container.setAttribute('aria-expanded', 'false');
        container.setAttribute('aria-label', 'Expand file preview area (click anywhere to expand, click outside or press Escape to collapse)');
    });
    isFilePreviewExpanded = false;
    
    // Remove outside click listener
    removeOutsideClickListener();
    
    // console.log('All file previews collapsed');
}

/**
 * Clean up observers and event listeners
 */
export function cleanupFilePreviewHandlers() {
    if (filePreviewObserver) {
        filePreviewObserver.disconnect();
        filePreviewObserver = null;
    }
    
    // Remove outside click listener
    removeOutsideClickListener();
    
    // Clear any active long press timer
    clearLongPressTimer();
    
    // Hide file removal modal if open
    hideFileRemovalModal();
    
    // Remove handlers from existing containers
    const filePreviewContainers = document.querySelectorAll('.file-previews');
    filePreviewContainers.forEach(container => {
        container.dataset.expandHandlerAdded = 'false';
        container.removeAttribute('role');
        container.removeAttribute('tabindex');
        container.removeAttribute('aria-label');
        container.removeAttribute('aria-expanded');
    });
    
    console.log('File preview handlers cleaned up');
} 