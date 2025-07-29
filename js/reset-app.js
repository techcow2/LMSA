// Reset App functionality
import { clearAllChats } from './chat-service.js';
import { debugLog, debugError } from './utils.js';
import { showConfirmationModal } from './ui-manager.js';
import { setActionToPerform } from './shared-state.js';

/**
 * Resets the entire application to its default state
 * - Deletes all chats
 * - Deletes all saved characters
 * - Clears all saved settings including server connection settings
 * - Resets the app to its default state
 */
export function resetApp() {
    try {
        debugLog('Resetting app to default state');

        // 1. Clear all chats
        clearAllChats();

        // 2. Delete all saved characters
        localStorage.removeItem('charactersData');
        localStorage.removeItem('activeCharacterId');

        // 3. Clear all saved settings
        localStorage.removeItem('systemPrompt');
        localStorage.removeItem('isUserCreatedSystemPrompt');
        localStorage.removeItem('temperature');
            localStorage.removeItem('hideThinking');
    localStorage.removeItem('autoGenerateTitles');
        localStorage.removeItem('lightThemeEnabled');
    

        // 4. Clear server connection settings
        localStorage.removeItem('serverIp');
        localStorage.removeItem('serverPort');

        // 5. Clear other app state
        localStorage.removeItem('lastActiveChatId');
        localStorage.removeItem('refreshDueToCodeGeneration');

        // 6. Clear What's New preferences
        localStorage.removeItem('whatsNewDontShow');
        localStorage.removeItem('whatsNewSeen');

        // 7. Reload the page to apply all changes
        window.location.reload();

        debugLog('App reset complete');
    } catch (error) {
        debugError('Error resetting app:', error);
    }
}

/**
 * Shows the reset app confirmation modal
 */
export function showResetAppConfirmation() {
    setActionToPerform('resetApp');
    showConfirmationModal('Are you sure you want to reset the app? This will delete all chats, clear all saved settings (including server connection settings), and delete all saved characters. This action cannot be undone.');
}

/**
 * Initializes the reset app button event listener
 */
export function initializeResetAppButton() {
    const resetAppButton = document.getElementById('reset-app');
    if (resetAppButton) {
        resetAppButton.addEventListener('click', showResetAppConfirmation);
        debugLog('Reset app button event listener initialized');
    }
}
