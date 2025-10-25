// IP/Port Confirmation Modal Manager
import { debugLog, debugError } from './utils.js';

// Store original IP/Port values to detect changes
let originalIp = '';
let originalPort = '';
let pendingChanges = null;
let pendingCallback = null;

// Modal elements
let modal = null;
let corsCheck = null;
let localNetworkCheck = null;
let vpnCheck = null;
let confirmBtn = null;
let cancelBtn = null;

/**
 * Initialize the IP/Port confirmation modal
 */
export function initializeIpPortConfirmationModal() {
    // Get modal elements
    modal = document.getElementById('ip-port-confirmation-modal');
    corsCheck = document.getElementById('cors-check');
    localNetworkCheck = document.getElementById('local-network-check');
    vpnCheck = document.getElementById('vpn-check');
    confirmBtn = document.getElementById('ip-port-confirm-btn');
    cancelBtn = document.getElementById('ip-port-cancel-btn');

    if (!modal || !corsCheck || !localNetworkCheck || !vpnCheck || !confirmBtn || !cancelBtn) {
        debugError('IP/Port confirmation modal elements not found');
        return;
    }

    // Store initial IP/Port values
    storeOriginalValues();

    // Add event listeners
    setupEventListeners();

    debugLog('IP/Port confirmation modal initialized');
}

/**
 * Store the original IP and Port values
 */
function storeOriginalValues() {
    const serverIpInput = document.getElementById('server-ip');
    const serverPortInput = document.getElementById('server-port');
    
    if (serverIpInput && serverPortInput) {
        originalIp = serverIpInput.value.trim();
        originalPort = serverPortInput.value.trim();
        debugLog('Stored original IP/Port values:', { ip: originalIp, port: originalPort });
    }
}

/**
 * Check if IP or Port values have changed
 */
function hasIpPortChanged() {
    const serverIpInput = document.getElementById('server-ip');
    const serverPortInput = document.getElementById('server-port');
    
    if (!serverIpInput || !serverPortInput) {
        return false;
    }

    const currentIp = serverIpInput.value.trim();
    const currentPort = serverPortInput.value.trim();
    
    const changed = (currentIp !== originalIp) || (currentPort !== originalPort);
    debugLog('IP/Port change check:', { 
        original: { ip: originalIp, port: originalPort },
        current: { ip: currentIp, port: currentPort },
        changed: changed
    });
    
    return changed;
}



/**
 * Show the IP/Port confirmation modal
 */
function showModal() {
    if (!modal) return;

    // Reset checkboxes
    corsCheck.checked = false;
    localNetworkCheck.checked = false;
    vpnCheck.checked = false;
    
    // Disable confirm button initially
    confirmBtn.disabled = true;
    
    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Add backdrop blur effect
    document.body.style.overflow = 'hidden';
    
    debugLog('IP/Port confirmation modal shown');
}

/**
 * Hide the IP/Port confirmation modal
 */
function hideModal() {
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Remove backdrop blur effect
    document.body.style.overflow = '';
    
    // Clear pending changes
    pendingChanges = null;
    pendingCallback = null;
    
    debugLog('IP/Port confirmation modal hidden');
}

/**
 * Update confirm button state based on checkbox status
 */
function updateConfirmButtonState() {
    if (!confirmBtn || !corsCheck || !localNetworkCheck || !vpnCheck) return;
    
    const allChecked = corsCheck.checked && localNetworkCheck.checked && vpnCheck.checked;
    confirmBtn.disabled = !allChecked;
}

/**
 * Setup event listeners for the modal
 */
function setupEventListeners() {
    // Checkbox change listeners
    [corsCheck, localNetworkCheck, vpnCheck].forEach(checkbox => {
        checkbox.addEventListener('change', updateConfirmButtonState);
    });

    // Confirm button click
    confirmBtn.addEventListener('click', handleConfirm);

    // Cancel button click
    cancelBtn.addEventListener('click', handleCancel);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            handleCancel();
        }
    });
}

/**
 * Handle confirm button click
 */
function handleConfirm() {
    // Update original values to current values
    storeOriginalValues();

    // Execute pending callback if exists
    if (pendingCallback) {
        pendingCallback();
    }

    hideModal();
}

/**
 * Handle cancel button click
 */
function handleCancel() {
    // Revert IP/Port values to original
    const serverIpInput = document.getElementById('server-ip');
    const serverPortInput = document.getElementById('server-port');
    
    if (serverIpInput && serverPortInput) {
        serverIpInput.value = originalIp;
        serverPortInput.value = originalPort;
        debugLog('Reverted IP/Port values to original');
    }

    hideModal();
}

/**
 * Intercept IP/Port changes and show confirmation modal if needed
 * @param {Function} callback - Function to execute after confirmation
 */
export function interceptIpPortChanges(callback) {
    // Check if values have changed
    if (!hasIpPortChanged()) {
        // No changes, execute callback immediately
        if (callback) callback();
        return;
    }

    // Store pending callback
    pendingCallback = callback;

    // Show confirmation modal
    showModal();
}



/**
 * Update stored original values (call this when settings are successfully applied)
 */
export function updateOriginalIpPortValues() {
    storeOriginalValues();
}