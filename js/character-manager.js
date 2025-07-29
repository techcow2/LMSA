// Character Manager for handling character creation, management, and card uploads
import {
    characterModal,
    closeCharacterButton,
    createCharacterButton,
    saveCharacterButton,
    characterNameInput,
    characterDescriptionInput,
    characterPersonalityInput,
    characterScenarioInput,
    characterImageUpload,
    characterCardUpload,
    deleteCharacterButton,
    characterPreviewImage,
    characterForm,
    deleteCharacterModal,
    closeDeleteCharacterModalButton,
    cancelDeleteCharacterButton,
    confirmDeleteCharacterButton,
    deleteCharacterAvatar,
    deleteCharacterName,
    deleteCharacterDescription
} from './dom-elements.js';
import { appendMessage } from './ui-manager.js';
import { debugLog, debugError } from './utils.js';
import { getSystemPrompt, setSystemPrompt } from './settings-manager.js';
// Import showCharacterGallery for redirecting after saving
import { showCharacterGallery } from './character-gallery.js';

// Store characters data
let charactersData = {};
let currentCharacterId = null;
let activeCharacterId = null;

/**
 * Gets all characters data
 * @returns {Object} - The characters data object
 */
export function getCharactersData() {
    return charactersData;
}

/**
 * Initializes the character manager
 */
export function initializeCharacterManager() {
    // Check if there's an active character ID in localStorage
    const savedActiveCharacterId = localStorage.getItem('activeCharacterId');
    // console.log('Initializing character manager. Active character ID in localStorage:', savedActiveCharacterId);

    // If there's no active character ID or it's empty, ensure it's properly set to an empty string
    if (!savedActiveCharacterId) {
        // console.log('No active character ID found in localStorage, setting to empty string');
        localStorage.setItem('activeCharacterId', '');
    }

    // Now load characters
    loadCharacters();
    setupEventListeners();

    // Initialize touch handler for character modal
    import('./character-modal-touch-handler.js').then(module => {
        module.initializeCharacterModalTouchHandler();
    }).catch(error => {
        debugError('Error initializing character modal touch handler:', error);
    });

    // Dispatch a custom event to update the active character display
    document.dispatchEvent(new CustomEvent('character-changed'));
}

/**
 * Sets up event listeners for character-related elements
 */
function setupEventListeners() {
    if (createCharacterButton) {
        createCharacterButton.addEventListener('click', showCreateCharacterModal);
    }

    if (closeCharacterButton) {
        closeCharacterButton.addEventListener('click', hideCharacterModal);
    }

    if (saveCharacterButton && characterForm) {
        characterForm.addEventListener('submit', handleCharacterFormSubmit);
    }

    if (deleteCharacterButton) {
        deleteCharacterButton.addEventListener('click', showDeleteCharacterModal);
    }

    if (characterImageUpload) {
        characterImageUpload.addEventListener('change', handleCharacterImageUpload);
    }

    if (characterCardUpload) {
        characterCardUpload.addEventListener('change', handleCharacterCardUpload);
    }

    // Delete character confirmation modal event listeners
    if (closeDeleteCharacterModalButton) {
        closeDeleteCharacterModalButton.addEventListener('click', hideDeleteCharacterModal);
    }

    if (cancelDeleteCharacterButton) {
        cancelDeleteCharacterButton.addEventListener('click', hideDeleteCharacterModal);
    }

    if (confirmDeleteCharacterButton) {
        confirmDeleteCharacterButton.addEventListener('click', handleConfirmDeleteCharacter);
    }

    // Close modal when clicking outside
    if (deleteCharacterModal) {
        deleteCharacterModal.addEventListener('click', (e) => {
            if (e.target === deleteCharacterModal) {
                hideDeleteCharacterModal();
            }
        });
    }
}

/**
 * Shows the character creation modal with smooth transition
 */
export function showCreateCharacterModal() {
    resetCharacterForm();
    currentCharacterId = null;
    deleteCharacterButton.classList.add('hidden');

    // Show the modal
    characterModal.classList.remove('hidden');
}

/**
 * Shows the character edit modal with smooth transition
 * @param {string} characterId - The ID of the character to edit
 */
export function showEditCharacterModal(characterId) {
    const character = charactersData[characterId];
    if (!character) {
        debugError(`Character with ID ${characterId} not found`);
        return;
    }

    resetCharacterForm();
    currentCharacterId = characterId;

    // Fill the form with character data
    characterNameInput.value = character.name;
    characterDescriptionInput.value = character.description || '';
    characterPersonalityInput.value = character.personality || '';
    characterScenarioInput.value = character.scenario || '';

    // Show character image if available
    if (character.image) {
        characterPreviewImage.src = character.image;
        characterPreviewImage.classList.remove('hidden');
        
        // Hide the placeholder when an image is loaded
        const imagePlaceholder = document.getElementById('character-image-placeholder');
        if (imagePlaceholder) {
            imagePlaceholder.classList.add('hidden');
        }
    }

    // Show delete button for editing
    deleteCharacterButton.classList.remove('hidden');

    // Show the modal
    characterModal.classList.remove('hidden');
}

/**
 * Hides the character modal with smooth exit transition
 */
export function hideCharacterModal() {
    // Get the modal content for animation
    const modalContent = characterModal.querySelector('.character-modal');

    // Add hiding classes for animations
    characterModal.classList.add('hiding');
    if (modalContent) {
        modalContent.classList.add('hiding');
    }

    // Hide the modal after animation completes
    setTimeout(() => {
        characterModal.classList.add('hidden');
        characterModal.classList.remove('hiding');
        
        if (modalContent) {
            modalContent.classList.remove('hiding');
        }
    }, 400);
}

/**
 * Resets the character form
 */
function resetCharacterForm() {
    if (characterForm) {
        characterForm.reset();
    }

    if (characterPreviewImage) {
        characterPreviewImage.src = '';
        characterPreviewImage.classList.add('hidden');
    }
    
    // Show the image placeholder when resetting
    const imagePlaceholder = document.getElementById('character-image-placeholder');
    if (imagePlaceholder) {
        imagePlaceholder.classList.remove('hidden');
    }
}

/**
 * Handles the character form submission
 * @param {Event} event - The form submission event
 */
function handleCharacterFormSubmit(event) {
    event.preventDefault();

    const name = characterNameInput.value.trim();
    if (!name) {
        appendMessage('error', 'Character name is required');
        return;
    }

    const description = characterDescriptionInput.value.trim();
    const personality = characterPersonalityInput.value.trim();
    const scenario = characterScenarioInput.value.trim();
    const image = characterPreviewImage.classList.contains('hidden') ? null : characterPreviewImage.src;

    // Log image status for debugging
    console.log('Character image status:',
        image ? 'Image present, length: ' + image.length + ' bytes' : 'No image');

    let characterId;
    if (currentCharacterId) {
        // Update existing character
        updateCharacter(currentCharacterId, name, description, personality, scenario, image);
        characterId = currentCharacterId;
        console.log('Updated character:', name, 'with ID:', characterId);
    } else {
        // Create new character
        characterId = createCharacter(name, description, personality, scenario, image);
        console.log('Created new character:', name, 'with ID:', characterId);
    }

    hideCharacterModal();
    saveCharacters();

    // Verify the character was saved correctly
    const savedCharacters = JSON.parse(localStorage.getItem('charactersData') || '{}');
    const savedCharacter = savedCharacters[characterId];
    if (savedCharacter) {
        console.log('Character saved successfully:', savedCharacter.name);
        console.log('Character has image:', savedCharacter.image ? 'Yes' : 'No');
    } else {
        console.error('Failed to save character with ID:', characterId);
    }

    // Dispatch a custom event to notify that characters have changed
    document.dispatchEvent(new CustomEvent('character-changed'));

    // Redirect to character gallery after saving
    // Use a small timeout to ensure the character modal is fully hidden first
    setTimeout(() => {
        console.log('Redirecting to character gallery after saving character');
        showCharacterGallery(charactersData);
    }, 450); // Slightly longer than the modal hide animation (400ms)
}

/**
 * Creates a new character
 * @param {string} name - The character name
 * @param {string} description - The character description
 * @param {string} personality - The character personality
 * @param {string} scenario - The character scenario
 * @param {string} image - The character image data URL
 * @returns {string} - The ID of the created character
 */
function createCharacter(name, description, personality, scenario, image) {
    const id = Date.now().toString();
    charactersData[id] = {
        id,
        name,
        description,
        personality,
        scenario,
        image,
        created: new Date().toISOString()
    };

    debugLog(`Created character: ${name} (${id})`);
    return id;
}

/**
 * Updates an existing character
 * @param {string} id - The character ID
 * @param {string} name - The character name
 * @param {string} description - The character description
 * @param {string} personality - The character personality
 * @param {string} scenario - The character scenario
 * @param {string} image - The character image data URL
 */
function updateCharacter(id, name, description, personality, scenario, image) {
    if (!charactersData[id]) {
        debugError(`Character with ID ${id} not found`);
        return;
    }

    // Create updated character data
    const updatedCharacter = {
        ...charactersData[id],
        name,
        description,
        personality,
        scenario,
        image,
        updated: new Date().toISOString()
    };

    // Remove any pendingFirstMessage property if it exists
    if (updatedCharacter.pendingFirstMessage) {
        delete updatedCharacter.pendingFirstMessage;
    }

    // Remove any first_message property if it exists
    if (updatedCharacter.first_message) {
        delete updatedCharacter.first_message;
    }

    // Update the character data
    charactersData[id] = updatedCharacter;

    debugLog(`Updated character: ${name} (${id})`);
}

/**
 * Shows the delete character confirmation modal
 * @private
 */
function showDeleteCharacterModal() {
    if (!currentCharacterId) {
        return;
    }

    const character = charactersData[currentCharacterId];

    // Update the modal with character information
    deleteCharacterName.textContent = character.name;
    deleteCharacterDescription.textContent = character.description || 'No description';

    // Update the avatar
    deleteCharacterAvatar.innerHTML = '';
    if (character.image) {
        const img = document.createElement('img');
        img.src = character.image;
        img.className = 'w-full h-full object-cover';
        deleteCharacterAvatar.appendChild(img);
    } else {
        const icon = document.createElement('i');
        icon.className = 'fas fa-user text-gray-400';
        deleteCharacterAvatar.appendChild(icon);
    }

    // Show the modal with animation
    deleteCharacterModal.classList.remove('hidden');

    // Add animation class
    const modalContent = deleteCharacterModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }
}

/**
 * Shows the delete character confirmation modal for a specific character
 * This is a public version that can be called from other modules
 * @param {string} characterId - The ID of the character to delete
 * @export
 */
export function showDeleteCharacterConfirmation(characterId) {
    if (!characterId || !charactersData[characterId]) {
        debugError(`Character with ID ${characterId} not found`);
        return;
    }

    // Set the current character ID so the delete modal knows which character to delete
    currentCharacterId = characterId;

    // Show the delete confirmation modal
    showDeleteCharacterModal();
}

/**
 * Hides the delete character confirmation modal
 */
function hideDeleteCharacterModal() {
    // Add animation class
    const modalContent = deleteCharacterModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            deleteCharacterModal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');
        }, 300);
    } else {
        deleteCharacterModal.classList.add('hidden');
    }
}

/**
 * Handles the confirmation of character deletion
 */
function handleConfirmDeleteCharacter() {
    if (!currentCharacterId) {
        return;
    }

    // Get the character name before deleting it
    const characterName = charactersData[currentCharacterId]?.name || 'Character';

    // Delete the character
    deleteCharacter(currentCharacterId);

    // Hide modals
    hideDeleteCharacterModal();
    hideCharacterModal();

    // Save changes to localStorage
    saveCharacters();

    // Show confirmation message
    appendMessage('ai', `Character "${characterName}" has been deleted`);

    // Dispatch a custom event to notify that characters have changed
    document.dispatchEvent(new CustomEvent('character-changed'));

    // Redirect to character gallery after deleting
    // Use a small timeout to ensure the modals are fully hidden first
    setTimeout(() => {
        console.log('Redirecting to character gallery after deleting character');
        showCharacterGallery(charactersData);
    }, 450); // Slightly longer than the modal hide animation
}

/**
 * Deletes a character
 * @param {string} id - The character ID
 */
function deleteCharacter(id) {
    if (!charactersData[id]) {
        debugError(`Character with ID ${id} not found`);
        return;
    }

    const name = charactersData[id].name;
    delete charactersData[id];

    // If the deleted character was active, clear the active character
    if (activeCharacterId === id) {
        setActiveCharacter(null);
    }

    debugLog(`Deleted character: ${name} (${id})`);
}

/**
 * Handles character image upload
 * @param {Event} event - The change event from the file input
 */
function handleCharacterImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB max size
        appendMessage('error', 'Image size is too large. Please upload an image smaller than 2MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        characterPreviewImage.src = e.target.result;
        characterPreviewImage.classList.remove('hidden');
        
        // Hide the placeholder when an image is uploaded
        const imagePlaceholder = document.getElementById('character-image-placeholder');
        if (imagePlaceholder) {
            imagePlaceholder.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Handles character card upload
 * @param {Event} event - The change event from the file input
 * @export
 */
export function handleCharacterCardUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if the file is JSON
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        appendMessage('error', 'Please upload a JSON character card file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const cardData = JSON.parse(e.target.result);

            // Fill form with card data
            if (cardData.name) {
                characterNameInput.value = cardData.name;
            }

            if (cardData.description) {
                characterDescriptionInput.value = cardData.description;
            }

            // Handle personality field (support both Silly Tavern and other formats)
            if (cardData.personality) {
                characterPersonalityInput.value = cardData.personality;
            } else if (cardData.data && cardData.data.personality) {
                characterPersonalityInput.value = cardData.data.personality;
            }

            // Handle scenario field (support both Silly Tavern and other formats)
            if (cardData.scenario) {
                characterScenarioInput.value = cardData.scenario;
            } else if (cardData.data && cardData.data.scenario) {
                characterScenarioInput.value = cardData.data.scenario;
            }

            // First message field is no longer supported

            // Handle image if present in the card
            let imageSource = null;

            // Check all possible image field locations in different character card formats
            if (cardData.image) {
                imageSource = cardData.image;
                console.log('Found image in cardData.image');
            } else if (cardData.avatar) {
                imageSource = cardData.avatar;
                console.log('Found image in cardData.avatar');
            } else if (cardData.data && cardData.data.avatar) {
                imageSource = cardData.data.avatar;
                console.log('Found image in cardData.data.avatar');
            } else if (cardData.char_portrait) {
                imageSource = cardData.char_portrait;
                console.log('Found image in cardData.char_portrait');
            }

            // If we found an image, set it and make it visible
            if (imageSource) {
                console.log('Setting character preview image from card');
                characterPreviewImage.src = imageSource;
                characterPreviewImage.classList.remove('hidden');

                // Force the image to load by creating a temporary Image object
                const tempImg = new Image();
                tempImg.onload = () => {
                    console.log('Character card image loaded successfully');
                };
                tempImg.onerror = (e) => {
                    console.error('Error loading character card image:', e);
                };
                tempImg.src = imageSource;
            } else {
                console.log('No image found in character card');
            }

            // Store the full card data for later use
            if (currentCharacterId) {
                charactersData[currentCharacterId].cardData = cardData;
            }

            appendMessage('ai', `Character card for "${cardData.name}" loaded successfully`);

            // Note: We don't redirect to gallery here because the user might want to
            // edit the character details before saving. The redirect will happen
            // when they submit the form.
        } catch (error) {
            debugError('Error parsing character card:', error);
            appendMessage('error', 'Invalid character card format');
        }
    };
    reader.readAsText(file);
}

/**
 * Sets the active character
 * @param {string|null} characterId - The character ID or null to clear
 */
export function setActiveCharacter(characterId) {
    console.log('setActiveCharacter called with characterId:', characterId);
    console.log('Current charactersData:', JSON.stringify(charactersData));

    // Store the previous active character ID for comparison
    const previousActiveCharacterId = activeCharacterId;

    // Update the active character ID in memory
    activeCharacterId = characterId;

    // IMPORTANT: Save the active character ID to localStorage BEFORE setting the system prompt
    // This ensures that when setSystemPrompt is called, it can find the active character ID
    localStorage.setItem('activeCharacterId', activeCharacterId || '');
    console.log('Active character ID saved to localStorage:', localStorage.getItem('activeCharacterId'));

    // Update system prompt with character information if a character is selected
    if (characterId && charactersData[characterId]) {
        const character = charactersData[characterId];
        console.log('Setting active character:', character.name, 'with ID:', characterId);

        // Force update the system prompt with character information
        // This will override any existing system prompt
        let characterInfo = `You are ${character.name}.`;

        if (character.description) {
            characterInfo += `\n\n${character.description}`;
        }

        if (character.personality) {
            characterInfo += `\n\nYour personality: ${character.personality}`;
        }

        if (character.scenario) {
            characterInfo += `\n\nCurrent scenario: ${character.scenario}`;
        }

        characterInfo += `\n\nStay in character at all times and speak as ${character.name} would. Do not refer to yourself as a model or AI assistant.`;

        // Remove any first message or pending first message properties
        if (character.first_message) {
            delete character.first_message;
        }
        if (character.pendingFirstMessage) {
            delete character.pendingFirstMessage;
        }

        // Verify activeCharacterId is set in localStorage before setting system prompt
        console.log('Active character ID in localStorage before setting system prompt:', localStorage.getItem('activeCharacterId'));

        // Pass true to indicate this is from a character
        console.log('Setting system prompt with character info:', characterInfo);
        setSystemPrompt(characterInfo, true);

        // Verify the system prompt was set correctly
        import('./settings-manager.js').then(module => {
            const currentSystemPrompt = module.getSystemPrompt();
            console.log('System prompt after setting character:', currentSystemPrompt);
            console.log('Character info in system prompt:', currentSystemPrompt.includes(character.name));
        });
    } else if (characterId === null) {
        console.log('Clearing active character');

        // Verify activeCharacterId is cleared in localStorage before setting system prompt
        console.log('Active character ID in localStorage before clearing system prompt:', localStorage.getItem('activeCharacterId'));

        // If character is being cleared, reset the system prompt to empty
        // Pass false to indicate this is NOT from a character action (since we're clearing it)
        setSystemPrompt('', false);

        // Verify the system prompt was cleared
        import('./settings-manager.js').then(module => {
            const currentSystemPrompt = module.getSystemPrompt();
            console.log('System prompt after clearing character:', currentSystemPrompt);
        });
    } else {
        console.error('Character ID not found in charactersData:', characterId);
        // Character ID was provided but not found in charactersData
        // This is likely the cause of the issue
        console.log('Available character IDs:', Object.keys(charactersData));

        // Try to reload characters data from localStorage
        const savedCharacters = localStorage.getItem('charactersData');
        if (savedCharacters) {
            try {
                const freshCharactersData = JSON.parse(savedCharacters);
                console.log('Reloaded charactersData from localStorage:', Object.keys(freshCharactersData));

                // Update the charactersData with the fresh data
                charactersData = freshCharactersData;

                // Try again with the fresh data
                if (charactersData[characterId]) {
                    const character = charactersData[characterId];
                    console.log('Character found after reload:', character.name);

                    // Now set the system prompt with more complete character info
                    let characterInfo = `You are ${character.name}.`;

                    if (character.description) {
                        characterInfo += `\n\n${character.description}`;
                    }

                    if (character.personality) {
                        characterInfo += `\n\nYour personality: ${character.personality}`;
                    }

                    if (character.scenario) {
                        characterInfo += `\n\nCurrent scenario: ${character.scenario}`;
                    }

                    characterInfo += `\n\nStay in character at all times and speak as ${character.name} would. Do not refer to yourself as a model or AI assistant.`;

                    // Verify activeCharacterId is set in localStorage before setting system prompt
                    console.log('Active character ID in localStorage before setting reloaded system prompt:', localStorage.getItem('activeCharacterId'));

                    console.log('Setting system prompt with reloaded character info:', characterInfo);
                    setSystemPrompt(characterInfo, true);

                    // Verify the system prompt was set correctly
                    import('./settings-manager.js').then(module => {
                        const currentSystemPrompt = module.getSystemPrompt();
                        console.log('System prompt after setting reloaded character:', currentSystemPrompt);
                        console.log('Character info in system prompt:', currentSystemPrompt.includes(character.name));
                    });
                } else {
                    console.error('Character still not found after reload');
                    // Clear the active character ID since it doesn't exist
                    activeCharacterId = null;
                    localStorage.setItem('activeCharacterId', '');
                    console.log('Cleared invalid active character ID from localStorage');
                }
            } catch (error) {
                console.error('Error reloading characters data:', error);
            }
        }
    }

    // Dispatch a custom event to update the active character display
    document.dispatchEvent(new CustomEvent('character-changed'));

    debugLog(`Active character set to: ${activeCharacterId ? (charactersData[activeCharacterId] ? charactersData[activeCharacterId].name : 'Unknown') : 'None'}`);
}

// Function removed as it's no longer needed - we directly set the system prompt in setActiveCharacter

/**
 * Gets the active character
 * @returns {Object|null} - The active character data or null if none
 */
export function getActiveCharacter() {
    if (!activeCharacterId || !charactersData[activeCharacterId]) {
        // If we have an active character ID but no data, try to reload from localStorage
        if (activeCharacterId) {
            console.warn('Active character ID exists but character data not found, attempting to reload');
            const savedCharacters = localStorage.getItem('charactersData');
            if (savedCharacters) {
                try {
                    const freshCharactersData = JSON.parse(savedCharacters);
                    // Update the charactersData with the fresh data
                    charactersData = freshCharactersData;

                    // Check if the character exists in the fresh data
                    if (charactersData[activeCharacterId]) {
                        console.log('Character data found after reload:', charactersData[activeCharacterId].name);
                        return charactersData[activeCharacterId];
                    } else {
                        console.error('Character still not found after reload, clearing active character ID');
                        // Clear the active character ID since the character doesn't exist
                        activeCharacterId = null;
                        localStorage.setItem('activeCharacterId', '');
                    }
                } catch (error) {
                    console.error('Error reloading characters data:', error);
                }
            }
        }
        return null;
    }

    return charactersData[activeCharacterId];
}

/**
 * Ensures the character information is properly set in the system prompt
 * This is a utility function to restore character information if it gets lost
 */
export function ensureCharacterInSystemPrompt() {
    console.log('Ensuring character information is in system prompt');

    // Get the active character ID
    const activeCharacterId = localStorage.getItem('activeCharacterId');

    // If there's no active character, there's nothing to do
    if (!activeCharacterId || activeCharacterId === '') {
        console.log('No active character, nothing to ensure');
        return;
    }

    // Get the current system prompt
    import('./settings-manager.js').then(module => {
        const currentSystemPrompt = module.getSystemPrompt();

        // Get the active character first
        const activeCharacter = getActiveCharacter();

        // Check if the system prompt already contains character information
        if (currentSystemPrompt && activeCharacter && (currentSystemPrompt.includes(`You are ${activeCharacter.name}`) || 
                                   currentSystemPrompt.includes(`speak as ${activeCharacter.name} would`))) {
            console.log('System prompt already contains character information');
            return;
        }

        // If there's no active character data, we can't restore the character information
        if (!activeCharacter) {
            console.error('Active character ID exists but character data not found, cannot restore character information');
            return;
        }

        // Rebuild character info
        let characterInfo = `You are ${activeCharacter.name}.`;

        if (activeCharacter.description) {
            characterInfo += `\n\n${activeCharacter.description}`;
        }

        if (activeCharacter.personality) {
            characterInfo += `\n\nYour personality: ${activeCharacter.personality}`;
        }

        if (activeCharacter.scenario) {
            characterInfo += `\n\nCurrent scenario: ${activeCharacter.scenario}`;
        }

        characterInfo += `\n\nStay in character at all times and speak as ${activeCharacter.name} would. Do not refer to yourself as a model or AI assistant.`;

        // Update the system prompt
        console.log('Restoring system prompt with character info:', characterInfo);
        module.setSystemPrompt(characterInfo, true);
    });
}

/**
 * Clears the active character
 */
export function clearActiveCharacter() {
    console.log('clearActiveCharacter called - clearing active character and system prompt');

    // First clear the active character ID in memory and localStorage
    activeCharacterId = null;
    localStorage.setItem('activeCharacterId', '');

    // Import settings-manager to properly handle system prompt clearing
    import('./settings-manager.js').then(module => {
        // Reset the system prompt to empty string
        // Pass false to indicate this is NOT from a character action
        // This avoids the warning about setting a character prompt with no active character
        module.setSystemPrompt('', false);

        // Double-check that the system prompt is empty
        console.log('System prompt after clearing:', module.getSystemPrompt());
    });

    // Dispatch a custom event to update the active character display
    document.dispatchEvent(new CustomEvent('character-changed'));

    debugLog('Active character cleared and system prompt reset to empty');

    // Force update the active character display
    const updateActiveCharacterDisplayFn = window.updateActiveCharacterDisplay;
    if (typeof updateActiveCharacterDisplayFn === 'function') {
        updateActiveCharacterDisplayFn();
    }
}

/**
 * Saves characters data to localStorage
 */
function saveCharacters() {
    localStorage.setItem('charactersData', JSON.stringify(charactersData));
    debugLog('Characters saved to localStorage');
}

/**
 * Loads characters data from localStorage
 */
function loadCharacters() {
    // console.log('Loading characters from localStorage');
    const savedCharacters = localStorage.getItem('charactersData');
    if (savedCharacters) {
        try {
            charactersData = JSON.parse(savedCharacters);
            console.log('Characters loaded from localStorage:', Object.keys(charactersData).length, 'characters found');
            debugLog('Characters loaded from localStorage');
        } catch (error) {
            console.error('Error parsing charactersData from localStorage:', error);
            debugError('Error loading characters:', error);
            charactersData = {};
        }
    } else {
        // console.log('No characters found in localStorage');
        charactersData = {};
    }

    // Check if there's a user-created system prompt
    const isUserCreated = localStorage.getItem('isUserCreatedSystemPrompt') === 'true';
    const savedPrompt = localStorage.getItem('systemPrompt');
    // console.log('User-created system prompt:', isUserCreated, 'Saved prompt:', savedPrompt);

    // Load active character ID
    const savedActiveCharacterId = localStorage.getItem('activeCharacterId');
    // console.log('Saved active character ID:', savedActiveCharacterId);

    if (savedActiveCharacterId && charactersData[savedActiveCharacterId]) {
        // First, set the active character ID in memory
        activeCharacterId = savedActiveCharacterId;

        // Then, ensure it's properly set in localStorage BEFORE setting the system prompt
        localStorage.setItem('activeCharacterId', activeCharacterId);

        console.log(`Active character loaded: ${charactersData[activeCharacterId].name} (ID: ${activeCharacterId})`);
        debugLog(`Active character loaded: ${charactersData[activeCharacterId].name}`);

        // Update system prompt with character information
        const character = charactersData[activeCharacterId];

        // Force update the system prompt with character information
        // This will override any existing system prompt
        let characterInfo = `You are ${character.name}.`;

        if (character.description) {
            characterInfo += `\n\n${character.description}`;
        }

        if (character.personality) {
            characterInfo += `\n\nYour personality: ${character.personality}`;
        }

        if (character.scenario) {
            characterInfo += `\n\nCurrent scenario: ${character.scenario}`;
        }

        characterInfo += `\n\nStay in character at all times and speak as ${character.name} would. Do not refer to yourself as a model or AI assistant.`;

        // Remove any first message or pending first message properties
        if (character.first_message) {
            delete character.first_message;
        }
        if (character.pendingFirstMessage) {
            delete character.pendingFirstMessage;
        }

        console.log('Setting system prompt with character info during load:', characterInfo);

        // Verify activeCharacterId is set in localStorage before setting system prompt
        console.log('Active character ID in localStorage before setting system prompt:', localStorage.getItem('activeCharacterId'));

        // Now set the system prompt with the character info
        setSystemPrompt(characterInfo, true);

        // Verify the system prompt was set correctly
        import('./settings-manager.js').then(module => {
            const currentSystemPrompt = module.getSystemPrompt();
            console.log('System prompt after loading character:', currentSystemPrompt);
            console.log('Character info in system prompt:', currentSystemPrompt.includes(character.name));
        });
    } else {
        if (savedActiveCharacterId) {
            console.warn(`Active character ID ${savedActiveCharacterId} found in localStorage but not in charactersData`);
            // Clear the active character ID since it doesn't exist in charactersData
            activeCharacterId = null;
            localStorage.setItem('activeCharacterId', '');
            console.log('Cleared invalid active character ID from localStorage');
        } else {
            // console.log('No active character ID found in localStorage');
            // Ensure activeCharacterId is null and localStorage is empty string
            activeCharacterId = null;
            localStorage.setItem('activeCharacterId', '');
        }

        // If no active character, check if there's a user-created system prompt to restore
        if (isUserCreated && savedPrompt) {
            // Restore the user-created system prompt
            console.log('Restoring user-created system prompt:', savedPrompt);
            // Verify activeCharacterId is empty before setting system prompt
            console.log('Active character ID in localStorage before setting user prompt:', localStorage.getItem('activeCharacterId'));
            setSystemPrompt(savedPrompt, false);
        } else {
            // If no active character and no user-created prompt, ensure system prompt is empty
            // console.log('No active character and no user-created prompt, setting empty system prompt');
            // Verify activeCharacterId is empty before setting empty system prompt
            // console.log('Active character ID in localStorage before setting empty prompt:', localStorage.getItem('activeCharacterId'));
            setSystemPrompt('', false); // Changed from true to false since this is not from a character
        }
    }

    // Dispatch a custom event to notify that characters have been loaded
    document.dispatchEvent(new CustomEvent('character-changed'));
}
