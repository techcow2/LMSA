// Reset App functionality
import { clearAllChats } from './chat-service.js';
import { debugLog, debugError } from './utils.js';
import { showConfirmationModal } from './ui-manager.js';
import { setActionToPerform } from './shared-state.js';

/**
 * Resets the entire application to its default state
 * - Deletes all chats
 * - Clears all saved settings including server connection settings
 * - Resets the app to its default state
 */
export function resetApp() {
    try {
        console.log('RESET APP: Starting app reset to default state');

        // 1. Clear all chats first
        try {
            clearAllChats();
            console.log('RESET APP: Cleared all chats successfully');
        } catch (error) {
            console.error('RESET APP: Error clearing chats:', error);
        }

        // 2. Clear all saved settings - comprehensive localStorage clear
        const itemsToRemove = [
            'systemPrompt',
            'isUserCreatedSystemPrompt',
            'temperature',
            'hideThinking',
            'autoGenerateTitles',
            'lightThemeEnabled',
            'serverIp',
            'serverPort',
            'lastActiveChatId',
            'refreshDueToCodeGeneration',
            'whatsNewDontShow',
            'whatsNewSeen',
            'whatsNewSeenVersion',
            'whatsNewDismissedVersion',
            'reasoningTimeout'
        ];

        console.log('RESET APP: Clearing localStorage items...');
        itemsToRemove.forEach(item => {
            try {
                localStorage.removeItem(item);
                console.log(`RESET APP: Removed ${item}`);
            } catch (error) {
                console.error(`RESET APP: Error removing ${item}:`, error);
            }
        });

        // 3. Also clear any chat history data
        try {
            const chatKeys = Object.keys(localStorage).filter(key => key.startsWith('chat_'));
            chatKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`RESET APP: Removed chat data: ${key}`);
            });
        } catch (error) {
            console.error('RESET APP: Error clearing chat data:', error);
        }

        // 4. Clear any other app-specific localStorage keys
        try {
            const allKeys = Object.keys(localStorage);
            console.log('RESET APP: All localStorage keys before cleanup:', allKeys);
            
            // Remove any keys that might be app-specific
            const appKeys = allKeys.filter(key => 
                key.includes('lmsa') || 
                key.includes('chat') || 
                key.includes('model') ||
                key.includes('prompt') ||
                key.includes('theme') ||
                key.includes('settings')
            );
            
            appKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`RESET APP: Removed app key: ${key}`);
            });
        } catch (error) {
            console.error('RESET APP: Error clearing additional app keys:', error);
        }

        console.log('RESET APP: LocalStorage clearing complete, initiating page reload...');
        
        // 5. Force reload the page after a short delay to ensure all operations complete
        setTimeout(() => {
            console.log('RESET APP: Reloading page now...');
            window.location.reload(true); // Force reload from server
        }, 100);

        debugLog('App reset complete');
    } catch (error) {
        console.error('RESET APP: Critical error during reset:', error);
        debugError('Error resetting app:', error);
        
        // Force reload even if there was an error
        setTimeout(() => {
            console.log('RESET APP: Force reloading due to error...');
            window.location.reload(true);
        }, 500);
    }
}

/**
 * Shows the reset app confirmation modal
 */
export function showResetAppConfirmation() {
    console.log('RESET APP: Showing confirmation modal');
    // Import and close settings modal first to avoid conflicts
    import('./settings-modal-manager.js').then(module => {
        module.hideSettingsModal();
        
        // Small delay to let settings modal close completely
        setTimeout(() => {
            setActionToPerform('resetApp');
            showConfirmationModal('Are you sure you want to reset the app? This will delete all chats, clear all saved settings (including server connection settings), and delete all saved characters. This action cannot be undone.');
            console.log('RESET APP: Confirmation modal should now be visible');
        }, 100);
    });
}

/**
 * Initializes the reset app button event listener
 */
export function initializeResetAppButton() {
    // Try to find the button immediately
    let resetAppButton = document.getElementById('reset-app');
    
    if (resetAppButton) {
        // Remove any existing event listeners to prevent duplicates by cloning the node
        const newResetAppButton = resetAppButton.cloneNode(true);
        resetAppButton.parentNode.replaceChild(newResetAppButton, resetAppButton);
        
        // Add event listener to the new button
        newResetAppButton.addEventListener('click', (e) => {
            debugLog('Reset app button clicked');
            e.preventDefault();
            e.stopPropagation();
            showResetAppConfirmation();
        });
        debugLog('Reset app button event listener initialized');
    } else {
        // If button not found immediately, try again after DOM is fully loaded
        debugLog('Reset app button not found immediately, trying with delay...');
        setTimeout(() => {
            resetAppButton = document.getElementById('reset-app');
            if (resetAppButton) {
                // Remove any existing event listeners
                const newResetAppButton = resetAppButton.cloneNode(true);
                resetAppButton.parentNode.replaceChild(newResetAppButton, resetAppButton);
                
                // Add event listener
                newResetAppButton.addEventListener('click', (e) => {
                    debugLog('Reset app button clicked (delayed init)');
                    e.preventDefault();
                    e.stopPropagation();
                    showResetAppConfirmation();
                });
                debugLog('Reset app button event listener initialized after delay');
            } else {
                debugLog('Reset app button still not found after delay - check HTML structure');
            }
        }, 100);
    }
}
