// Export/Import functionality for chat history
import { getChatHistoryData, updateChatHistoryUI, saveChatHistory, loadChatHistory } from './chat-service.js';
import {
    exportChatsButton, importChatsButton, importChatsInput, importModal,
    cancelImportButton, confirmImportButton, importStatusContainer, importStatusMessage,
    importSuccessModal, importSuccessMessage, closeImportSuccessButton,
    exportSuccessModal, exportSuccessMessage, closeExportSuccessButton,
    exportConfirmationModal, confirmExportButton, cancelExportButton
} from './dom-elements.js';
import { isAndroidWebView, isMobileDevice } from './utils.js';
import { showExportConfirmationModal, hideExportConfirmationModal, checkAndShowWelcomeMessage } from './ui-manager.js';
import { setActionToPerform, getActionToPerform } from './shared-state.js';
import { getSavedSystemPrompts, restoreSavedSystemPrompts } from './saved-system-prompts.js';

// Variable to store the selected file for import
let selectedImportFile = null;

/**
 * Initializes the export/import functionality
 */
export function initializeExportImport() {

    // Add event listeners
    if (exportChatsButton) {
        exportChatsButton.addEventListener('click', () => {
            // Close the sidebar first
            closeSidebar();
            // Show the export confirmation modal
            showExportConfirmationModal();
        });
    }

    // Add event listeners for export confirmation modal
    // Use direct DOM queries to ensure we get the latest elements
    const confirmExportBtn = document.getElementById('confirm-export');
    const cancelExportBtn = document.getElementById('cancel-export');

    if (confirmExportBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newConfirmExportBtn = confirmExportBtn.cloneNode(true);
        confirmExportBtn.parentNode.replaceChild(newConfirmExportBtn, confirmExportBtn);

        // Add the event listener to the new button
        newConfirmExportBtn.addEventListener('click', () => {
            // Hide the confirmation modal
            hideExportConfirmationModal();
            // Perform the export
            exportChats();
        });
        // console.log('Confirm Export button event handler attached');
    } else {
        console.error('Confirm Export button not found in the DOM');
    }

    if (cancelExportBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newCancelExportBtn = cancelExportBtn.cloneNode(true);
        cancelExportBtn.parentNode.replaceChild(newCancelExportBtn, cancelExportBtn);

        // Add the event listener to the new button
        newCancelExportBtn.addEventListener('click', hideExportConfirmationModal);
        // console.log('Cancel Export button event handler attached');
    } else {
        console.error('Cancel Export button not found in the DOM');
    }

    if (importChatsButton && importChatsInput) {
        importChatsButton.addEventListener('click', () => {
            // Close the sidebar first
            closeSidebar();
            // Trigger the file input
            importChatsInput.click();
        });

        importChatsInput.addEventListener('change', handleImportFileSelected);
    }

    if (cancelImportButton) {
        cancelImportButton.addEventListener('click', () => {
            hideImportModal();
            // Clear the selected file
            selectedImportFile = null;
        });
    }

    if (confirmImportButton) {
        confirmImportButton.addEventListener('click', handleImportConfirm);
    }

    if (closeImportSuccessButton) {
        closeImportSuccessButton.addEventListener('click', hideImportSuccessModal);
    }

    if (closeExportSuccessButton) {
        closeExportSuccessButton.addEventListener('click', hideExportSuccessModal);
    }

    /**
     * Handles the import file selection
     * @param {Event} event - The change event
     */
    function handleImportFileSelected(event) {
        const file = event.target.files[0];

        if (file) {
            // Store the selected file in the global variable
            selectedImportFile = file;

            // Show the import modal
            showImportModal();

            // Reset the file input for future selections
            event.target.value = '';
        }
    }

    /**
     * Handles the import confirmation
     */
    function handleImportConfirm() {
        // Use the stored file instead of trying to get it from the input
        if (!selectedImportFile) {
            showImportStatus('No file selected. Please try again.', 'error');
            return;
        }

        // Get the selected import option
        const importOption = document.querySelector('input[name="import-option"]:checked').value;

        // Read the file
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                // Log file content for debugging (first 500 chars)
                const fileContent = e.target.result;
                console.log('File content preview (first 500 chars):', fileContent.substring(0, 500));

                // Parse the JSON
                let importedData;
                try {
                    importedData = JSON.parse(fileContent);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    showImportStatus('Invalid JSON format. The file could not be parsed. Check browser console for details.', 'error');
                    return;
                }

                // Validate the imported data
                if (!validateImportedData(importedData)) {
                    showImportStatus('Invalid file format. Please select a valid LMSA chat export file. Check browser console for details.', 'error');
                    console.error('Please check the browser console logs for detailed validation errors.');
                    console.error('If this is a recently exported file, there might be an issue with the export format.');
                    console.error('Try exporting the chat again or contact support if the issue persists.');
                    return;
                }

                // Get the current chat history data
                let chatHistoryData = getChatHistoryData();

                // Debug: Log the imported data to see if titles are present
                console.log('Imported data before processing:', JSON.stringify(importedData));

                // Check if this is the new format with separate chats and savedSystemPrompts
                let chatsToImport, savedSystemPromptsToImport;
                if (importedData.chats && importedData.exportVersion) {
                    // New format
                    console.log('Detected new export format with version:', importedData.exportVersion);
                    chatsToImport = importedData.chats;
                    savedSystemPromptsToImport = importedData.savedSystemPrompts || {};
                } else {
                    // Old format - treat entire data as chats
                    console.log('Detected old export format (chats only)');
                    chatsToImport = importedData;
                    savedSystemPromptsToImport = {};
                }

                // Process and normalize all chats in the imported data
                for (const key in chatsToImport) {
                    const chatData = chatsToImport[key];

                    // If it's in the old format (array with title property), convert to new format
                    if (Array.isArray(chatData)) {
                        // Save the old messages
                        const oldMessages = chatData;
                        // Get the title if it exists
                        let oldTitle = oldMessages.title || null;

                        // Ensure title is a string if it exists
                        if (oldTitle !== null) {
                            if (typeof oldTitle === 'object') {
                                try {
                                    oldTitle = JSON.stringify(oldTitle) || 'Imported Chat';
                                    console.warn(`Converted object title to string for chat ${key}`);
                                } catch (e) {
                                    oldTitle = 'Imported Chat';
                                    console.warn(`Failed to stringify title object for chat ${key}, using default title`);
                                }
                            } else if (typeof oldTitle !== 'string') {
                                oldTitle = String(oldTitle);
                                console.warn(`Converted ${typeof oldTitle} title to string for chat ${key}`);
                            }
                        }

                        // Check if title is "null" string and replace with a better default
                        if (oldTitle === "null" || oldTitle === null) {
                            // Try to generate a title from the first user message
                            const firstUserMessage = oldMessages.find(msg => msg.role === 'user');
                            if (firstUserMessage && firstUserMessage.content) {
                                // Create a short title from the first few words (max 30 chars)
                                const content = firstUserMessage.content.trim();
                                oldTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
                                console.log(`Generated title from first message for chat ${key}: "${oldTitle}"`);
                            } else {
                                oldTitle = `Imported Chat ${key}`;
                                console.log(`Using default title for chat ${key}: "${oldTitle}"`);
                            }
                        }

                        // Convert to new format
                        chatsToImport[key] = {
                            messages: oldMessages,
                            title: oldTitle
                        };
                        console.log(`Converted imported chat ${key} to new format`);
                    } else if (typeof chatData === 'object' && chatData !== null) {
                        // For new format, ensure title is a string if it exists
                        if (chatData.title !== undefined && chatData.title !== null) {
                            if (typeof chatData.title === 'object') {
                                try {
                                    chatData.title = JSON.stringify(chatData.title) || 'Imported Chat';
                                    console.warn(`Converted object title to string for chat ${key}`);
                                } catch (e) {
                                    chatData.title = 'Imported Chat';
                                    console.warn(`Failed to stringify title object for chat ${key}, using default title`);
                                }
                            } else if (typeof chatData.title !== 'string') {
                                chatData.title = String(chatData.title);
                                console.warn(`Converted ${typeof chatData.title} title to string for chat ${key}`);
                            }
                        }

                        // Check if title is "null" string or null and replace with a better default
                        if (chatData.title === "null" || chatData.title === null) {
                            // Try to generate a title from the first user message
                            if (Array.isArray(chatData.messages)) {
                                const firstUserMessage = chatData.messages.find(msg => msg.role === 'user');
                                if (firstUserMessage && firstUserMessage.content) {
                                    // Create a short title from the first few words (max 30 chars)
                                    const content = firstUserMessage.content.trim();
                                    chatData.title = content.length > 30 ? content.substring(0, 30) + '...' : content;
                                    console.log(`Generated title from first message for chat ${key}: "${chatData.title}"`);
                                } else {
                                    chatData.title = `Imported Chat ${key}`;
                                    console.log(`Using default title for chat ${key}: "${chatData.title}"`);
                                }
                            } else {
                                chatData.title = `Imported Chat ${key}`;
                                console.log(`Using default title for chat ${key}: "${chatData.title}"`);
                            }
                        }
                    }
                }

                // Import the chat data
                let updatedChatData;
                if (importOption === 'replace') {
                    // Replace all existing chats
                    updatedChatData = chatsToImport;
                } else {
                    // Merge with existing chats
                    updatedChatData = { ...chatHistoryData, ...chatsToImport };
                }

                // Debug: Log the updated data to see if titles are preserved
                console.log('Updated data after processing:', JSON.stringify(updatedChatData));

                // Log a summary of chat titles for debugging
                console.log('Chat title summary:');
                for (const key in updatedChatData) {
                    const chatData = updatedChatData[key];
                    const title = chatData.title || 'null';
                    console.log(`Chat ${key}: "${title}"`);
                }

                // Update the chat history in localStorage
                localStorage.setItem('chatHistory', JSON.stringify(updatedChatData));

                // Force a reload of the chat history from localStorage
                // This ensures the chatHistoryData variable in chat-service.js is updated
                loadChatHistory();

                // Import saved system prompts if any
                if (Object.keys(savedSystemPromptsToImport).length > 0) {
                    console.log('Importing saved system prompts:', savedSystemPromptsToImport);
                    restoreSavedSystemPrompts(savedSystemPromptsToImport, importOption === 'replace');
                } else {
                    console.log('No saved system prompts to import');
                }

                // Get the number of imported chats and prompts
                const chatCount = Object.keys(chatsToImport).length;
                const promptCount = Object.keys(savedSystemPromptsToImport).length;

                // Hide the import modal
                hideImportModal();

                // Clear the selected file
                selectedImportFile = null;

                // Show the success modal with the chat and prompt count
                showImportSuccessModal(chatCount, promptCount);

            } catch (error) {
                console.error('Error importing chats:', error);
                showImportStatus('Error importing chats. Please try again.', 'error');
            }
        };

        reader.onerror = function() {
            showImportStatus('Error reading file. Please try again.', 'error');
        };

        reader.readAsText(selectedImportFile);
    }

    /**
     * Validates the imported data
     * @param {Object} data - The imported data
     * @returns {boolean} - Whether the data is valid
     */
    function validateImportedData(data) {
        // Debug: Log the data type and structure
        console.log('Validating imported data:', {
            type: typeof data,
            isNull: data === null,
            isArray: Array.isArray(data),
            keys: data ? Object.keys(data).length : 0
        });

        // Check if data is an object
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            console.error('Import validation failed: Data is not a valid object');
            return false;
        }

        // Check if the object has at least one key
        if (Object.keys(data).length === 0) {
            console.error('Import validation failed: Data object has no keys');
            return false;
        }

        // Check if this is the new format (has chats and/or savedSystemPrompts)
        const hasChats = data.hasOwnProperty('chats');
        const hasSavedSystemPrompts = data.hasOwnProperty('savedSystemPrompts');
        const hasExportVersion = data.hasOwnProperty('exportVersion');
        
        if (hasChats || hasSavedSystemPrompts || hasExportVersion) {
            console.log('Detected new export format');
            
            // Validate chats if present
            if (hasChats) {
                if (!validateChatData(data.chats)) {
                    return false;
                }
            }
            
            // Validate saved system prompts if present
            if (hasSavedSystemPrompts) {
                if (!validateSavedSystemPrompts(data.savedSystemPrompts)) {
                    return false;
                }
            }
            
            return true;
        }
        
        // Old format: validate as chat data directly
        console.log('Detected old export format (chat data only)');
        return validateChatData(data);
    }
    
    /**
     * Validates saved system prompts data
     * @param {Array} prompts - The saved system prompts array
     * @returns {boolean} - Whether the data is valid
     */
    function validateSavedSystemPrompts(prompts) {
        if (!Array.isArray(prompts)) {
            console.error('Import validation failed: savedSystemPrompts is not an array');
            return false;
        }
        
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            if (!prompt || typeof prompt !== 'object') {
                console.error(`Import validation failed: savedSystemPrompts[${i}] is not an object`);
                return false;
            }
            
            if (!prompt.id || !prompt.name || !prompt.content) {
                console.error(`Import validation failed: savedSystemPrompts[${i}] missing required fields (id, name, content)`);
                return false;
            }
            
            if (typeof prompt.id !== 'string' || typeof prompt.name !== 'string' || typeof prompt.content !== 'string') {
                console.error(`Import validation failed: savedSystemPrompts[${i}] has invalid field types`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validates chat data
     * @param {Object} chatData - The chat data object
     * @returns {boolean} - Whether the data is valid
     */
    function validateChatData(chatData) {
        // Check if each key is a valid chat ID (numeric string)
        for (const key in chatData) {
            if (!/^\d+$/.test(key)) {
                console.error(`Import validation failed: Invalid chat ID format: ${key}`);
                return false;
            }

            // Get the chat data
            const chatDataItem = chatData[key];

            // Debug: Log the chat data structure
            console.log(`Validating chat ${key}:`, {
                isArray: Array.isArray(chatDataItem),
                type: typeof chatDataItem,
                hasMessages: chatDataItem && chatDataItem.messages ? true : false,
                hasTitle: chatDataItem && 'title' in chatDataItem ? true : false
            });

            // Handle both old format (array) and new format (object with messages and title)
            if (Array.isArray(chatDataItem)) {
                // Old format: array with optional title property

                // Check if the array has at least one message
                if (chatDataItem.length === 0) {
                    console.warn(`Chat ${key} has no messages, but continuing validation`);
                    // We'll allow empty chats - they're not ideal but shouldn't break import
                }

                // Check if each item in the array has role and content properties
                for (let i = 0; i < chatDataItem.length; i++) {
                    const item = chatDataItem[i];

                    // Skip checking properties on the title (which might be attached to the array)
                    if (i === 'title') continue;

                    if (!item || typeof item !== 'object') {
                        console.error(`Import validation failed: Chat ${key} message ${i} is not an object`);
                        return false;
                    }

                    if (!item.role || typeof item.role !== 'string' || typeof item.content !== 'string') {
                        console.error(`Import validation failed: Chat ${key} message ${i} is missing required properties or has invalid types`);
                        return false;
                    }

                    // Check if role is valid
                    if (item.role !== 'user' && item.role !== 'assistant' && item.role !== 'system') {
                        console.error(`Import validation failed: Chat ${key} message ${i} has invalid role: ${item.role}`);
                        return false;
                    }
                }

                // Check if the title property exists and handle different types
                if (chatDataItem.title !== undefined) {
                    console.log(`Chat ${key} title type: ${typeof chatDataItem.title}`, chatDataItem.title);

                    // If title is an object, try to convert it to a string
                    if (typeof chatDataItem.title === 'object' && chatDataItem.title !== null) {
                        console.warn(`Converting object title to string for chat ${key}`);
                        try {
                            // Try to stringify the object or use a default title
                            chatDataItem.title = JSON.stringify(chatDataItem.title) || 'Imported Chat';
                        } catch (e) {
                            console.warn(`Failed to stringify title object, using default title`);
                            chatDataItem.title = 'Imported Chat';
                        }
                    } else if (typeof chatDataItem.title !== 'string') {
                        // For other non-string types, convert to string
                        console.warn(`Converting ${typeof chatDataItem.title} title to string for chat ${key}`);
                        chatDataItem.title = String(chatDataItem.title);
                    }
                }
            } else if (typeof chatDataItem === 'object' && chatDataItem !== null) {
                // New format: object with messages array and title property

                // Check if the messages property exists and is an array
                if (!chatDataItem.messages) {
                    console.error(`Import validation failed: Chat ${key} is missing messages property`);
                    return false;
                }

                if (!Array.isArray(chatDataItem.messages)) {
                    console.error(`Import validation failed: Chat ${key} messages is not an array`);
                    return false;
                }

                // Check if the array has at least one message
                if (chatDataItem.messages.length === 0) {
                    console.warn(`Chat ${key} has no messages, but continuing validation`);
                    // We'll allow empty chats - they're not ideal but shouldn't break import
                }

                // Check if each item in the messages array has role and content properties
                for (let i = 0; i < chatDataItem.messages.length; i++) {
                    const item = chatDataItem.messages[i];

                    if (!item || typeof item !== 'object') {
                        console.error(`Import validation failed: Chat ${key} message ${i} is not an object`);
                        return false;
                    }

                    if (!item.role || typeof item.role !== 'string' || typeof item.content !== 'string') {
                        console.error(`Import validation failed: Chat ${key} message ${i} is missing required properties or has invalid types`);
                        return false;
                    }

                    // Check if role is valid
                    if (item.role !== 'user' && item.role !== 'assistant' && item.role !== 'system') {
                        console.error(`Import validation failed: Chat ${key} message ${i} has invalid role: ${item.role}`);
                        return false;
                    }
                }

                // Check if the title property exists and handle different types
                if (chatDataItem.title !== undefined) {
                    console.log(`Chat ${key} title type: ${typeof chatDataItem.title}`, chatDataItem.title);

                    // If title is an object, try to convert it to a string
                    if (typeof chatDataItem.title === 'object' && chatDataItem.title !== null) {
                        console.warn(`Converting object title to string for chat ${key}`);
                        try {
                            // Try to stringify the object or use a default title
                            chatDataItem.title = JSON.stringify(chatDataItem.title) || 'Imported Chat';
                        } catch (e) {
                            console.warn(`Failed to stringify title object, using default title`);
                            chatDataItem.title = 'Imported Chat';
                        }
                    } else if (typeof chatDataItem.title !== 'string') {
                        // For other non-string types, convert to string
                        console.warn(`Converting ${typeof chatDataItem.title} title to string for chat ${key}`);
                        chatDataItem.title = String(chatDataItem.title);
                    }
                }
            } else {
                // Invalid format
                console.error(`Import validation failed: Chat ${key} has invalid format`);
                return false;
            }
        }

        console.log('Chat data validation successful');
        return true;
    }

    return true;
}

    /**
     * Shows the import modal
     */
    function showImportModal() {
        if (importModal) {
            importModal.classList.remove('hidden');
            const modalContent = importModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-in');
                setTimeout(() => {
                    modalContent.classList.remove('animate-modal-in');
                }, 300);
            }

            // Hide the status message
            hideImportStatus();
        }
    }

    /**
     * Hides the import modal
     */
    function hideImportModal() {
        if (importModal) {
            const modalContent = importModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    importModal.classList.add('hidden');
                    modalContent.classList.remove('animate-modal-out');

                    // Hide the status message
                    hideImportStatus();
                    // Clear the selected file
                    selectedImportFile = null;
                }, 300);
            } else {
                importModal.classList.add('hidden');
                // Clear the selected file
                selectedImportFile = null;
            }
        }
    }

    /**
     * Shows the import status message
     * @param {string} message - The message to show
     * @param {string} type - The type of message ('success' or 'error')
     */
    function showImportStatus(message, type) {
        if (importStatusContainer && importStatusMessage) {
            importStatusMessage.textContent = message;

            // Set the appropriate styling based on the message type
            if (type === 'error') {
                importStatusContainer.querySelector('div').classList.remove('bg-blue-900', 'border-blue-700');
                importStatusContainer.querySelector('div').classList.add('bg-red-900', 'border-red-700');
                importStatusMessage.classList.remove('text-blue-300');
                importStatusMessage.classList.add('text-red-300');
            } else {
                importStatusContainer.querySelector('div').classList.remove('bg-red-900', 'border-red-700');
                importStatusContainer.querySelector('div').classList.add('bg-blue-900', 'border-blue-700');
                importStatusMessage.classList.remove('text-red-300');
                importStatusMessage.classList.add('text-blue-300');
            }

            importStatusContainer.classList.remove('hidden');
        }
    }

    /**
     * Hides the import status message
     */
    function hideImportStatus() {
        if (importStatusContainer) {
            importStatusContainer.classList.add('hidden');
        }
    }

    /**
     * Shows the import success modal with a message
     * @param {number} chatCount - The number of chats imported
     * @param {number} promptCount - The number of saved system prompts imported
     */
    function showImportSuccessModal(chatCount, promptCount = 0) {
        if (importSuccessModal && importSuccessMessage) {
            // Create the success message
            let message = `Successfully imported ${chatCount} chat${chatCount !== 1 ? 's' : ''}`;
            if (promptCount > 0) {
                message += ` and ${promptCount} saved system prompt${promptCount !== 1 ? 's' : ''}`;
            }
            message += '.';
            
            importSuccessMessage.textContent = message;

            // Show the modal
            importSuccessModal.classList.remove('hidden');
            const modalContent = importSuccessModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-in');
                setTimeout(() => {
                    modalContent.classList.remove('animate-modal-in');
                }, 300);
            }
        }
    }

    /**
     * Hides the import success modal
     */
    function hideImportSuccessModal() {
        if (importSuccessModal) {
            const modalContent = importSuccessModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    importSuccessModal.classList.add('hidden');
                    modalContent.classList.remove('animate-modal-out');

                    // Show the sidebar so the user can see the imported chats
                    showSidebar();

                    // Check if welcome message should be shown
                    checkAndShowWelcomeMessage();
                }, 300);
            } else {
                importSuccessModal.classList.add('hidden');

                // Show the sidebar so the user can see the imported chats
                showSidebar();

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }
        }
    }

    /**
     * Closes the sidebar
     */
    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('active');
            document.body.classList.remove('sidebar-open');

            // Also close the options container
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.classList.add('hidden');
                optionsContainer.classList.remove('animate-fade-in');
            }

            // Remove the sidebar overlay
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
                sidebarOverlay.classList.add('hidden');
            }

            // Collapse all sections when sidebar is closed
            const sectionHeaders = sidebar.querySelectorAll('.section-header');
            const chatHistorySection = sidebar.querySelector('.sidebar-section:last-child');
            sectionHeaders.forEach(header => {
                header.classList.remove('active');
                const content = header.nextElementSibling;
                if (content && content.classList.contains('collapsible-content')) {
                    content.classList.remove('show');
                }
            });

            // Ensure chat history is visible when sidebar is closed
            if (chatHistorySection) {
                chatHistorySection.classList.remove('chat-history-hidden');
            }
        }
    }

    /**
     * Shows the sidebar
     */
    function showSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('active');
            sidebar.classList.add('animate-slide-in');
            document.body.classList.add('sidebar-open');

            // Show the sidebar overlay on mobile
            if (window.innerWidth <= 768) {
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('hidden');
                    sidebarOverlay.classList.add('active');
                }
            }

            // Reset the options button state
            const optionsBtn = document.getElementById('options-btn');
            if (optionsBtn) {
                optionsBtn.classList.remove('active');
            }

            // Make sure options container is hidden
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.classList.add('hidden');
                optionsContainer.classList.remove('animate-fade-in');
            }

            // Get chat history section
            const chatHistorySection = sidebar.querySelector('.sidebar-section:last-child');

            // Ensure chat history is visible when sidebar is shown
            if (chatHistorySection) {
                chatHistorySection.classList.remove('chat-history-hidden');
            }

            // Always make sure the import/export container is hidden
            const importExportContainer = document.getElementById('import-export-container');
            if (importExportContainer) {
                importExportContainer.classList.add('hidden');
                importExportContainer.classList.remove('animate-fade-in');

                // Reset any caret icons
                const importExportGroupButton = document.getElementById('import-export-group-btn');
                if (importExportGroupButton) {
                    // First check for up caret
                    const caretUp = importExportGroupButton.querySelector('.fa-caret-up');
                    if (caretUp) {
                        caretUp.classList.remove('fa-caret-up');
                        caretUp.classList.add('fa-caret-down');
                    }
                    // Ensure down caret is properly applied
                    const caretDown = importExportGroupButton.querySelector('.fa-caret-down');
                    if (!caretDown) {
                        // If no caret icon exists, add one
                        const caret = document.createElement('i');
                        caret.className = 'fas fa-caret-down transition-transform duration-200';
                        importExportGroupButton.appendChild(caret);
                    }
                }
            }

            setTimeout(() => {
                sidebar.classList.remove('animate-slide-in');
            }, 300);
        }
    }

    /**
     * Shows the export success modal with a message
     * @param {number} chatCount - The number of chats exported
     */
    function showExportSuccessModal(chatCount) {
        if (exportSuccessModal && exportSuccessMessage) {
            // Set the success message with the chat count
            exportSuccessMessage.textContent = `Successfully exported ${chatCount} chat${chatCount !== 1 ? 's' : ''}.`;

            // Show the modal
            exportSuccessModal.classList.remove('hidden');
            const modalContent = exportSuccessModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-in');
                setTimeout(() => {
                    modalContent.classList.remove('animate-modal-in');
                }, 300);
            }
        }
    }

    /**
     * Hides the export success modal
     */
    function hideExportSuccessModal() {
        if (exportSuccessModal) {
            const modalContent = exportSuccessModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('animate-modal-out');
                setTimeout(() => {
                    exportSuccessModal.classList.add('hidden');
                    modalContent.classList.remove('animate-modal-out');

                    // Update hamburger icon to show hamburger (in case sidebar was closed)
                    import('./ui-manager.js').then(module => {
                        module.updateHamburgerIcon(false);
                    }).catch(error => {
                        console.error('Error updating hamburger icon:', error);
                    });

                    // Check if welcome message should be shown
                    checkAndShowWelcomeMessage();
                }, 300);
            } else {
                exportSuccessModal.classList.add('hidden');

                // Update hamburger icon to show hamburger (in case sidebar was closed)
                import('./ui-manager.js').then(module => {
                    module.updateHamburgerIcon(false);
                }).catch(error => {
                    console.error('Error updating hamburger icon:', error);
                });

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }
        }
    }

/**
 * Exports the chat history to a file
 */
export function exportChats() {
    // Get the chat history data
    const chatHistoryData = getChatHistoryData();
    
    // Get saved system prompts
    const savedSystemPrompts = getSavedSystemPrompts();
    
    // Create export data structure that includes both chats and saved system prompts
    const exportData = {
        chats: chatHistoryData,
        savedSystemPrompts: savedSystemPrompts,
        exportVersion: '1.1', // Version to help with future compatibility
        exportDate: new Date().toISOString()
    };

    // Create a JSON string from the export data
    const jsonString = JSON.stringify(exportData, null, 2);

    // Generate a filename with the current date and time
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const formattedTime = `${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
    const filename = `lmsa-chats-${formattedDate}-${formattedTime}.json`;

    // Count the number of chats and saved system prompts exported
    const chatCount = Object.keys(exportData.chats).length;
    const promptCount = exportData.savedSystemPrompts.length;

    // Check if we're in an Android app with native file operations
    if (window.AndroidFileOps && typeof window.AndroidFileOps.saveFile === 'function') {
        console.log('Using Android native file saving');
        
        // Set up callback for when file is saved
        window.onFileSaved = function(success) {
            if (success) {
                console.log('File saved successfully via Android native interface');
                // Show the export success modal
                if (typeof showExportSuccessModal === 'function') {
                    showExportSuccessModal(chatCount, promptCount);
                } else if (exportSuccessModal && exportSuccessMessage) {
                    const chatText = `${chatCount} chat${chatCount !== 1 ? 's' : ''}`;
                    const promptText = `${promptCount} saved system prompt${promptCount !== 1 ? 's' : ''}`;
                    exportSuccessMessage.textContent = `Successfully exported ${chatText} and ${promptText}.`;
                    exportSuccessModal.classList.remove('hidden');
                    const modalContent = exportSuccessModal.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.classList.add('animate-modal-in');
                        setTimeout(() => {
                            modalContent.classList.remove('animate-modal-in');
                        }, 300);
                    }
                }
            } else {
                console.log('File save failed or was cancelled');
                // Could show an error message here if desired
            }
            // Clean up the callback
            delete window.onFileSaved;
        };
        
        // Call the Android native file saving method
        window.AndroidFileOps.saveFile(jsonString, filename);
        return;
    }

    // Fallback for non-Android environments or older Android versions
    console.log('Using fallback file saving method');
    
    // Check if we're in an Android WebView
    if (isAndroidWebView() || isMobileDevice()) {
        // For Android WebView without native file ops, use the standard approach
        // Create a Blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a data URL
        const dataUrl = URL.createObjectURL(blob);

        // Create a link with download attribute and special handling for Android
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.style.display = 'none';

        // Add the link to the document
        document.body.appendChild(a);

        // Trigger a click on the link
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(dataUrl);
        }, 100);
    } else {
        // Standard approach for desktop browsers
        // Create a Blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        // Append the anchor to the document
        document.body.appendChild(a);

        // Trigger a click on the anchor
        a.click();

        // Remove the anchor from the document
        document.body.removeChild(a);

        // Revoke the URL to free up memory
        URL.revokeObjectURL(url);
    }

    // Show the export success modal for fallback methods (immediate feedback)
    if (typeof showExportSuccessModal === 'function') {
        showExportSuccessModal(chatCount, promptCount);
    } else if (exportSuccessModal && exportSuccessMessage) {
        // Fallback if the function is not available
        const chatText = `${chatCount} chat${chatCount !== 1 ? 's' : ''}`;
        const promptText = `${promptCount} saved system prompt${promptCount !== 1 ? 's' : ''}`;
        exportSuccessMessage.textContent = `Successfully exported ${chatText} and ${promptText}.`;
        exportSuccessModal.classList.remove('hidden');
        const modalContent = exportSuccessModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
    }
}

/**
 * Closes the sidebar - exported for use in other modules
 */
export function closeSidebarExport() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');

        // Also close the options container
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
            optionsContainer.classList.remove('animate-fade-in');
        }

        // Remove the sidebar overlay
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
            sidebarOverlay.classList.add('hidden');
        }

        // Update hamburger icon to show hamburger
        import('./ui-manager.js').then(module => {
            module.updateHamburgerIcon(false);
        }).catch(error => {
            console.error('Error updating hamburger icon:', error);
        });

        // Collapse all sections when sidebar is closed
        const sectionHeaders = sidebar.querySelectorAll('.section-header');
        const chatHistorySection = sidebar.querySelector('.sidebar-section:last-child');
        sectionHeaders.forEach(header => {
            header.classList.remove('active');
            const content = header.nextElementSibling;
            if (content && content.classList.contains('collapsible-content')) {
                content.classList.remove('show');
            }
        });

        // Ensure chat history is visible when sidebar is closed
        if (chatHistorySection) {
            chatHistorySection.classList.remove('chat-history-hidden');
        }
    }
}
