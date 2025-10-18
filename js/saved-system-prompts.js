// Saved System Prompts Manager
// This module handles saving, loading, and managing user-created system prompts

import { debugLog } from './utils.js';
import { closeSidebarExport } from './export-import.js';
import { checkAndShowWelcomeMessage } from './ui-manager.js';

// Local storage key for saved system prompts
const SAVED_PROMPTS_KEY = 'savedSystemPrompts';

/**
 * Gets all saved system prompts from localStorage
 * @returns {Array} Array of saved prompt objects
 */
export function getSavedSystemPrompts() {
    try {
        const saved = localStorage.getItem(SAVED_PROMPTS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        debugLog('Error loading saved system prompts:', error);
        return [];
    }
}

/**
 * Saves a system prompt to localStorage
 * @param {string} name - The name/title for the prompt
 * @param {string} content - The prompt content
 * @returns {boolean} Success status
 */
export function saveSystemPrompt(name, content) {
    try {
        if (!name || !content) {
            throw new Error('Name and content are required');
        }

        const savedPrompts = getSavedSystemPrompts();
        const newPrompt = {
            id: Date.now().toString(),
            name: name.trim(),
            content: content.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        savedPrompts.push(newPrompt);
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(savedPrompts));
        debugLog('System prompt saved successfully:', newPrompt.name);
        return true;
    } catch (error) {
        debugLog('Error saving system prompt:', error);
        return false;
    }
}

/**
 * Deletes a saved system prompt
 * @param {string} id - The ID of the prompt to delete
 * @returns {boolean} Success status
 */
export function deleteSystemPrompt(id) {
    try {
        const savedPrompts = getSavedSystemPrompts();
        const filteredPrompts = savedPrompts.filter(prompt => prompt.id !== id);
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(filteredPrompts));
        debugLog('System prompt deleted successfully:', id);
        return true;
    } catch (error) {
        debugLog('Error deleting system prompt:', error);
        return false;
    }
}

/**
 * Updates a saved system prompt
 * @param {string} id - The ID of the prompt to update
 * @param {string} name - The new name
 * @param {string} content - The new content
 * @returns {boolean} Success status
 */
export function updateSystemPrompt(id, name, content) {
    try {
        const savedPrompts = getSavedSystemPrompts();
        const promptIndex = savedPrompts.findIndex(prompt => prompt.id === id);
        
        if (promptIndex === -1) {
            throw new Error('Prompt not found');
        }

        savedPrompts[promptIndex] = {
            ...savedPrompts[promptIndex],
            name: name.trim(),
            content: content.trim(),
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(savedPrompts));
        debugLog('System prompt updated successfully:', id);
        return true;
    } catch (error) {
        debugLog('Error updating system prompt:', error);
        return false;
    }
}

/**
 * Restores saved system prompts from imported data
 * @param {Array} prompts - Array of prompt objects to restore
 */
export function restoreSavedSystemPrompts(prompts) {
    try {
        if (!Array.isArray(prompts)) {
            debugLog('Invalid prompts data for restore');
            return;
        }

        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts));
        debugLog('Saved system prompts restored successfully');
    } catch (error) {
        debugLog('Error restoring saved system prompts:', error);
    }
}

/**
 * Shows the saved system prompts modal
 */
export function showSavedSystemPromptsModal() {
    const modal = document.getElementById('saved-prompts-modal');
    if (!modal) {
        debugLog('Saved prompts modal not found');
        return;
    }

    // Close sidebar first
    closeSidebarExport();

    // Populate the modal with saved prompts
    populateSavedPromptsModal();

    // Show the modal
    modal.classList.remove('hidden');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the saved system prompts modal
 */
export function hideSavedSystemPromptsModal() {
    const modal = document.getElementById('saved-prompts-modal');
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            modal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');
            document.body.style.overflow = '';
            checkAndShowWelcomeMessage();
        }, 300);
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        checkAndShowWelcomeMessage();
    }
}

/**
 * Populates the saved prompts modal with current saved prompts
 */
function populateSavedPromptsModal() {
    const container = document.getElementById('saved-prompts-list');
    if (!container) return;

    const savedPrompts = getSavedSystemPrompts();
    
    if (savedPrompts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>No saved system prompts yet.</p>
                <p class="text-sm mt-2">Create and save prompts from the Settings modal.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = savedPrompts.map(prompt => `
        <div class="saved-prompt-item border rounded-lg p-4 mb-3" style="border-color: var(--border-color); background: var(--settings-label-bg);">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-medium text-lg" style="color: var(--text-primary);">${escapeHtml(prompt.name)}</h3>
                <div class="flex space-x-2">
                    <button class="restore-prompt-btn text-blue-400 hover:text-blue-300 p-1" data-id="${prompt.id}" title="Restore this prompt">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="edit-prompt-btn text-yellow-400 hover:text-yellow-300 p-1" data-id="${prompt.id}" title="Edit this prompt">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-prompt-btn text-red-400 hover:text-red-300 p-1" data-id="${prompt.id}" title="Delete this prompt">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="prompt-content text-sm mb-2" style="color: var(--text-secondary);">
                ${escapeHtml(prompt.content.length > 150 ? prompt.content.substring(0, 150) + '...' : prompt.content)}
            </div>
            <div class="text-xs" style="color: var(--text-tertiary);">
                Created: ${new Date(prompt.createdAt).toLocaleDateString()}
                ${prompt.updatedAt !== prompt.createdAt ? `• Updated: ${new Date(prompt.updatedAt).toLocaleDateString()}` : ''}
            </div>
        </div>
    `).join('');

    // Add event listeners to buttons
    addPromptItemEventListeners();
}

/**
 * Adds event listeners to prompt item buttons
 */
function addPromptItemEventListeners() {
    // Restore buttons
    document.querySelectorAll('.restore-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            restorePrompt(id);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editPrompt(id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            confirmDeletePrompt(id);
        });
    });
}

/**
 * Restores a saved prompt to the current system prompt
 * @param {string} id - The ID of the prompt to restore
 */
function restorePrompt(id) {
    const savedPrompts = getSavedSystemPrompts();
    const prompt = savedPrompts.find(p => p.id === id);
    
    if (!prompt) {
        debugLog('Prompt not found for restore:', id);
        return;
    }

    // Import settings manager to set the system prompt
    import('./settings-manager.js').then(module => {
        module.setSystemPrompt(prompt.content, true);
        
        // Update UI elements
        const hiddenTextarea = document.getElementById('system-prompt');
        const previewDiv = document.getElementById('system-prompt-preview');
        const editor = document.getElementById('system-prompt-editor');

        if (hiddenTextarea) {
            hiddenTextarea.value = prompt.content;
            const changeEvent = new Event('change', { bubbles: true });
            hiddenTextarea.dispatchEvent(changeEvent);
        }

        if (editor) {
            editor.value = prompt.content;
        }

        if (previewDiv) {
            previewDiv.textContent = prompt.content;
        }

        // Close the modal
        hideSavedSystemPromptsModal();
        
        // Show success message
        showSuccessMessage(`System prompt "${prompt.name}" has been restored.`);
        
        debugLog('System prompt restored:', prompt.name);
    }).catch(error => {
        debugLog('Error importing settings manager:', error);
    });
}

/**
 * Shows the edit prompt modal
 * @param {string} id - The ID of the prompt to edit
 */
function editPrompt(id) {
    const savedPrompts = getSavedSystemPrompts();
    const prompt = savedPrompts.find(p => p.id === id);
    
    if (!prompt) {
        debugLog('Prompt not found for edit:', id);
        return;
    }

    showEditPromptModal(prompt);
}

/**
 * Shows the edit prompt modal
 * @param {Object} prompt - The prompt object to edit
 */
function showEditPromptModal(prompt) {
    const modal = document.getElementById('edit-prompt-modal');
    if (!modal) return;

    // Populate the form
    const nameInput = document.getElementById('edit-prompt-name');
    const contentTextarea = document.getElementById('edit-prompt-content');
    
    if (nameInput) nameInput.value = prompt.name;
    if (contentTextarea) contentTextarea.value = prompt.content;

    // Store the prompt ID for saving
    modal.dataset.promptId = prompt.id;

    // Show the modal
    modal.classList.remove('hidden');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }
}

/**
 * Hides the edit prompt modal
 */
function hideEditPromptModal() {
    const modal = document.getElementById('edit-prompt-modal');
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            modal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');
        }, 300);
    } else {
        modal.classList.add('hidden');
    }
}

/**
 * Saves the edited prompt
 */
function saveEditedPrompt() {
    const modal = document.getElementById('edit-prompt-modal');
    if (!modal) return;

    const promptId = modal.dataset.promptId;
    const nameInput = document.getElementById('edit-prompt-name');
    const contentTextarea = document.getElementById('edit-prompt-content');

    if (!nameInput || !contentTextarea || !promptId) return;

    const name = nameInput.value.trim();
    const content = contentTextarea.value.trim();

    if (!name || !content) {
        showErrorMessage('Please provide both a name and content for the prompt.');
        return;
    }

    if (updateSystemPrompt(promptId, name, content)) {
        hideEditPromptModal();
        populateSavedPromptsModal(); // Refresh the list
        showSuccessMessage('Prompt updated successfully.');
    } else {
        showErrorMessage('Failed to update prompt. Please try again.');
    }
}

/**
 * Shows confirmation dialog for deleting a prompt
 * @param {string} id - The ID of the prompt to delete
 */
function confirmDeletePrompt(id) {
    const savedPrompts = getSavedSystemPrompts();
    const prompt = savedPrompts.find(p => p.id === id);
    
    if (!prompt) return;

    const modal = document.getElementById('delete-prompt-confirmation-modal');
    if (!modal) return;

    // Set the prompt name in the confirmation message
    const messageElement = document.getElementById('delete-prompt-message');
    if (messageElement) {
        messageElement.textContent = `Are you sure you want to delete the prompt "${prompt.name}"? This action cannot be undone.`;
    }

    // Store the prompt ID for deletion
    modal.dataset.promptId = id;

    // Show the modal
    modal.classList.remove('hidden');
}

/**
 * Hides the delete confirmation modal
 */
function hideDeleteConfirmationModal() {
    const modal = document.getElementById('delete-prompt-confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Confirms and executes prompt deletion
 */
function confirmPromptDeletion() {
    const modal = document.getElementById('delete-prompt-confirmation-modal');
    if (!modal) return;

    const promptId = modal.dataset.promptId;
    if (!promptId) return;

    if (deleteSystemPrompt(promptId)) {
        hideDeleteConfirmationModal();
        populateSavedPromptsModal(); // Refresh the list
        showSuccessMessage('Prompt deleted successfully.');
    } else {
        showErrorMessage('Failed to delete prompt. Please try again.');
    }
}

/**
 * Handles saving from the settings modal
 */
function handleSaveFromSettings() {
    debugLog('handleSaveFromSettings called');
    
    // Get the current system prompt from the hidden textarea (which always contains the current value)
    const systemPromptInput = document.getElementById('system-prompt');
    debugLog('systemPromptInput element:', systemPromptInput);
    
    const currentPrompt = systemPromptInput ? systemPromptInput.value.trim() : '';
    debugLog('currentPrompt:', currentPrompt);
    
    if (!currentPrompt) {
        debugLog('No current prompt, showing error message');
        showErrorMessage('Please enter a system prompt before saving.');
        return;
    }
    
    debugLog('Calling showSavePromptModal with prompt:', currentPrompt);
    showSavePromptModal(currentPrompt);
}

/**
 * Shows the save prompt modal
 * @param {string} currentPrompt - The current system prompt content to pre-fill
 */
export function showSavePromptModal(currentPrompt = '') {
    debugLog('showSavePromptModal called with prompt:', currentPrompt);
    
    const modal = document.getElementById('save-prompt-modal');
    debugLog('save-prompt-modal element:', modal);
    
    if (!modal) {
        debugLog('Modal not found!');
        return;
    }

    // Clear and populate the form
    const nameInput = document.getElementById('save-prompt-name');
    const contentTextarea = document.getElementById('save-prompt-content');
    
    debugLog('nameInput element:', nameInput);
    debugLog('contentTextarea element:', contentTextarea);
    
    if (nameInput) nameInput.value = '';
    if (contentTextarea) contentTextarea.value = currentPrompt;

    // Show the modal
    debugLog('Removing hidden class from modal');
    modal.classList.remove('hidden');
    
    const modalContent = modal.querySelector('.modal-content');
    debugLog('modalContent element:', modalContent);
    
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }

    // Focus on the name input
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
    
    debugLog('Modal should now be visible');
}

/**
 * Hides the save prompt modal
 */
function hideSavePromptModal() {
    const modal = document.getElementById('save-prompt-modal');
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            modal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');
        }, 300);
    } else {
        modal.classList.add('hidden');
    }
}

/**
 * Saves a new prompt from the save modal
 */
function saveNewPrompt() {
    const nameInput = document.getElementById('save-prompt-name');
    const contentTextarea = document.getElementById('save-prompt-content');

    if (!nameInput || !contentTextarea) return;

    const name = nameInput.value.trim();
    const content = contentTextarea.value.trim();

    if (!name || !content) {
        showErrorMessage('Please provide both a name and content for the prompt.');
        return;
    }

    if (saveSystemPrompt(name, content)) {
        hideSavePromptModal();
        showSuccessMessage('Prompt saved successfully.');
        
        // Refresh the saved prompts modal if it's currently open
        const savedPromptsModal = document.getElementById('saved-prompts-modal');
        if (savedPromptsModal && !savedPromptsModal.classList.contains('hidden')) {
            populateSavedPromptsModal();
        }
    } else {
        showErrorMessage('Failed to save prompt. Please try again.');
    }
}

/**
 * Shows a success message
 * @param {string} message - The success message to show
 */
function showSuccessMessage(message) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 items-center justify-center modal-container';
    modalOverlay.style.cssText = 'z-index: 9999; background: var(--modal-overlay); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); display: flex;';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content rounded-lg shadow-xl p-6 max-w-sm mx-4';
    modalContent.style.cssText = 'background: var(--chat-bg); border: 1px solid var(--border-color);';

    // Create success icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'flex justify-center mb-4';
    iconContainer.innerHTML = '<i class="fas fa-check-circle text-5xl text-green-500"></i>';

    // Create message text
    const messageText = document.createElement('p');
    messageText.className = 'text-center text-lg';
    messageText.style.color = 'var(--text-primary)';
    messageText.textContent = message;

    // Assemble modal
    modalContent.appendChild(iconContainer);
    modalContent.appendChild(messageText);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Animate in
    setTimeout(() => {
        modalContent.classList.add('animate-modal-in');
    }, 10);

    // Remove after 2 seconds
    setTimeout(() => {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
                document.body.style.overflow = '';
            }
        }, 300);
    }, 2000);
}

/**
 * Shows an error message
 * @param {string} message - The error message to show
 */
function showErrorMessage(message) {
    // Create a temporary error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300';
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initializes the saved system prompts functionality
 */
export function initializeSavedSystemPrompts() {
    debugLog('Initializing saved system prompts functionality');

    // Add event listeners for the saved prompts modal
    const savedPromptsButton = document.getElementById('saved-prompts-btn');
    if (savedPromptsButton) {
        savedPromptsButton.addEventListener('click', showSavedSystemPromptsModal);
    }

    // Close saved prompts modal
    const closeSavedPromptsButton = document.getElementById('close-saved-prompts-modal');
    if (closeSavedPromptsButton) {
        closeSavedPromptsButton.addEventListener('click', hideSavedSystemPromptsModal);
    }

    // Save system prompt button from settings modal
    const saveSystemPromptButton = document.getElementById('save-system-prompt-btn');
    if (saveSystemPromptButton) {
        saveSystemPromptButton.addEventListener('click', handleSaveFromSettings);
    }

    // Save prompt modal event listeners
    const savePromptButton = document.getElementById('save-prompt-btn');
    if (savePromptButton) {
        savePromptButton.addEventListener('click', saveNewPrompt);
    }

    const cancelSavePromptButton = document.getElementById('cancel-save-prompt');
    if (cancelSavePromptButton) {
        cancelSavePromptButton.addEventListener('click', hideSavePromptModal);
    }

    const closeSavePromptButton = document.getElementById('close-save-prompt-modal');
    if (closeSavePromptButton) {
        closeSavePromptButton.addEventListener('click', hideSavePromptModal);
    }

    // Edit prompt modal event listeners
    const saveEditPromptButton = document.getElementById('save-edit-prompt');
    if (saveEditPromptButton) {
        saveEditPromptButton.addEventListener('click', saveEditedPrompt);
    }

    const cancelEditPromptButton = document.getElementById('cancel-edit-prompt');
    if (cancelEditPromptButton) {
        cancelEditPromptButton.addEventListener('click', hideEditPromptModal);
    }

    const closeEditPromptButton = document.getElementById('close-edit-prompt-modal');
    if (closeEditPromptButton) {
        closeEditPromptButton.addEventListener('click', hideEditPromptModal);
    }

    // Delete confirmation modal event listeners
    const confirmDeletePromptButton = document.getElementById('confirm-delete-prompt');
    if (confirmDeletePromptButton) {
        confirmDeletePromptButton.addEventListener('click', confirmPromptDeletion);
    }

    const cancelDeletePromptButton = document.getElementById('cancel-delete-prompt');
    if (cancelDeletePromptButton) {
        cancelDeletePromptButton.addEventListener('click', hideDeleteConfirmationModal);
    }

    // Delete prompt modal close button
    const closeDeletePromptButton = document.getElementById('close-delete-prompt-modal');
    if (closeDeletePromptButton) {
        closeDeletePromptButton.addEventListener('click', hideDeleteConfirmationModal);
    }

    // Close modals when clicking outside
    const modals = [
        'saved-prompts-modal',
        'save-prompt-modal', 
        'edit-prompt-modal',
        'delete-prompt-confirmation-modal'
    ];

    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modalId === 'saved-prompts-modal') {
                        hideSavedSystemPromptsModal();
                    } else if (modalId === 'save-prompt-modal') {
                        hideSavePromptModal();
                    } else if (modalId === 'edit-prompt-modal') {
                        hideEditPromptModal();
                    } else if (modalId === 'delete-prompt-confirmation-modal') {
                        hideDeleteConfirmationModal();
                    }
                }
            });
        }
    });

    // Handle escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visibleModal = modals.find(modalId => {
                const modal = document.getElementById(modalId);
                return modal && !modal.classList.contains('hidden');
            });

            if (visibleModal) {
                if (visibleModal === 'saved-prompts-modal') {
                    hideSavedSystemPromptsModal();
                } else if (visibleModal === 'save-prompt-modal') {
                    hideSavePromptModal();
                } else if (visibleModal === 'edit-prompt-modal') {
                    hideEditPromptModal();
                } else if (visibleModal === 'delete-prompt-confirmation-modal') {
                    hideDeleteConfirmationModal();
                }
            }
        }
    });

    debugLog('Saved system prompts functionality initialized');
}