// Character Gallery - A dedicated page for viewing and managing saved characters
import {
    characterGalleryContainer,
    characterGalleryBackButton,
    characterGalleryCreateButton,
    characterGalleryImportButton,
    characterGalleryImportInput,
    characterGalleryGrid,
    characterGalleryEmpty,
    messagesContainer
} from './dom-elements.js';
import {
    showEditCharacterModal,
    setActiveCharacter,
    getActiveCharacter,
    handleCharacterCardUpload
} from './character-manager.js';
import { debugLog, debugError, formatDate, addHardwareAcceleration } from './utils.js';
import { createNewChat } from './chat-service.js';
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { appendMessage } from './ui-manager.js';

// Store characters data reference
let charactersData = {};
// Store animation frame ID for cancellation
let animationFrameId = null;

/**
 * Initializes the character gallery
 */
export function initializeCharacterGallery() {
    setupEventListeners();

    // Initialize touch handler for better mobile experience
    import('./character-gallery-touch-handler.js').then(module => {
        module.initializeCharacterGalleryTouchHandler();
    }).catch(error => {
        debugError('Error initializing character gallery touch handler:', error);
    });

    // Ensure the gallery container is properly initialized
    if (characterGalleryContainer) {
        // Make sure it's hidden initially
        characterGalleryContainer.style.display = 'none';

        debugLog('Character gallery container initialized');
    }

    // Load the character data
    try {
        const savedCharacters = localStorage.getItem('charactersData');
        if (savedCharacters) {
            charactersData = JSON.parse(savedCharacters);
            debugLog('Loaded characters data:', Object.keys(charactersData).length);
        }
    } catch (error) {
        debugError('Error loading characters data:', error);
    }

    debugLog('Character gallery initialized');
}

/**
 * Sets up event listeners for the character gallery
 */
function setupEventListeners() {
    if (characterGalleryBackButton) {
        characterGalleryBackButton.addEventListener('click', hideCharacterGallery);
    }

    if (characterGalleryCreateButton) {
        characterGalleryCreateButton.addEventListener('click', () => {
            hideCharacterGallery();
            // Use a timeout that matches the animation duration plus a small buffer
            setTimeout(() => {
                // Import and call the function to show the character creation modal
                import('./character-manager.js').then(module => {
                    module.showCreateCharacterModal();
                });
            }, 350);
        });
    }

    // Add event listener for the import button
    if (characterGalleryImportButton && characterGalleryImportInput) {
        characterGalleryImportButton.addEventListener('click', () => {
            // Trigger the hidden file input
            characterGalleryImportInput.click();
        });

        // Add event listener for the file input
        characterGalleryImportInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Check if the file is JSON
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                appendMessage('error', 'Please upload a JSON character card file');
                return;
            }

            // Store the file for later use
            const selectedFile = file;

            // Hide the gallery first
            hideCharacterGallery();

            // Use a timeout that matches the animation duration plus a small buffer
            setTimeout(() => {
                // Import and call the function to show the character creation modal
                import('./character-manager.js').then(module => {
                    // Show the character creation modal
                    module.showCreateCharacterModal();

                    // Process the file using the existing handler from character-manager.js
                    // We need to create a fake event object with the file
                    module.handleCharacterCardUpload({
                        target: {
                            files: [selectedFile]
                        }
                    });
                });

                // Clear the input value so the same file can be selected again
                characterGalleryImportInput.value = '';
            }, 350);
        });
    }

    // Add event listener for the empty state create button
    const emptyCreateButton = document.getElementById('character-gallery-empty-create-btn');
    if (emptyCreateButton) {
        emptyCreateButton.addEventListener('click', () => {
            hideCharacterGallery();
            // Use a timeout that matches the animation duration plus a small buffer
            setTimeout(() => {
                // Import and call the function to show the character creation modal
                import('./character-manager.js').then(module => {
                    module.showCreateCharacterModal();
                });
            }, 350);
        });
    }

    // Listen for character changes to update the gallery
    document.addEventListener('character-changed', () => {
        // Always reload characters data from localStorage to ensure we have the latest data
        // This ensures that when the gallery is opened, it will have the latest data
        const savedCharacters = localStorage.getItem('charactersData');
        if (savedCharacters) {
            try {
                charactersData = JSON.parse(savedCharacters);
                console.log('Reloaded characters data after change:', Object.keys(charactersData).length);
            } catch (error) {
                console.error('Error reloading characters data:', error);
            }
        }

        // Only update the gallery UI if it's currently visible
        if (isCharacterGalleryVisible()) {
            console.log('Character gallery is visible, updating UI');
            updateCharacterGallery();
        } else {
            console.log('Character gallery is not visible, data updated but UI not refreshed');
        }
    });
}

// Track if this is the first time opening the gallery
let isFirstGalleryOpen = true;

/**
 * Shows the character gallery with optimized animations
 * @param {Object} characters - The characters data object
 */
export function showCharacterGallery(characters) {
    if (!characterGalleryContainer) {
        debugError('Character gallery container not found');
        return;
    }

    debugLog('showCharacterGallery called with characters:', characters ? Object.keys(characters).length : 'none');

    // Cancel any ongoing animations
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Load characters data efficiently
    const loadCharactersData = () => {
        // Always reload characters from localStorage to ensure we have the latest data
        // This ensures newly created characters appear in the gallery without requiring a refresh
        try {
            const savedCharacters = localStorage.getItem('charactersData');
            if (savedCharacters) {
                const loadedCharacters = JSON.parse(savedCharacters);
                debugLog('Loaded characters from localStorage:', Object.keys(loadedCharacters).length);
                charactersData = loadedCharacters;
            } else if (characters) {
                // If no localStorage data but characters were provided
                charactersData = characters;
                debugLog('Using provided characters data:', Object.keys(charactersData).length);
            } else {
                // No data available
                charactersData = {};
                debugLog('No characters data available');
            }
        } catch (error) {
            debugError('Error loading characters data:', error);
            // If we can't load from localStorage, fall back to the provided characters
            if (characters) {
                charactersData = characters;
            } else {
                charactersData = {};
            }
        }
    };

    // Load the characters data
    loadCharactersData();

    // Simple animation function
    const animateGalleryOpen = () => {
        // Make it visible
        characterGalleryContainer.style.display = 'flex';
        
        // Update the gallery content
        updateCharacterGallery();
        
        // Mark that we've opened the gallery at least once
        isFirstGalleryOpen = false;
    };

    // Start the animation
    animateGalleryOpen();

    debugLog('Character gallery shown with optimized animations');
}

/**
 * Hides the character gallery
 */
export function hideCharacterGallery() {
    if (!characterGalleryContainer) return;

    // Hide the gallery container
    characterGalleryContainer.style.display = 'none';

    // Show welcome message when returning from character gallery
    import('./ui-manager.js').then(module => {
        // Show the welcome message
        module.showWelcomeMessage();
        // Make sure it's properly positioned
        module.ensureWelcomeMessagePosition();
        debugLog('Showing welcome message after hiding character gallery');
    });

    debugLog('Character gallery hidden');
}

/**
 * Updates the character gallery content with optimized rendering
 */
function updateCharacterGallery() {
    if (!characterGalleryGrid) return;

    debugLog('Updating character gallery with data:', Object.keys(charactersData).length);

    // Use a document fragment for batch DOM operations
    // This significantly improves performance by reducing reflows
    const fragment = document.createDocumentFragment();

    // Get the active character info once to avoid repeated calls
    const activeCharacter = getActiveCharacter();
    const activeCharacterId = activeCharacter ? activeCharacter.id : null;

    // Check if there are characters to display
    if (!charactersData || Object.keys(charactersData).length === 0) {
        // Batch DOM operations for empty state
        // Show empty state
        if (characterGalleryEmpty) {
            characterGalleryEmpty.classList.remove('hidden');
        }
        characterGalleryGrid.classList.add('hidden');

        // Clear the grid to free memory
        characterGalleryGrid.innerHTML = '';
        return;
    }

    // Batch DOM operations for showing the grid
    // Hide empty state and show grid
    if (characterGalleryEmpty) {
        characterGalleryEmpty.classList.add('hidden');
    }
    characterGalleryGrid.classList.remove('hidden');

    // Clear the grid
    characterGalleryGrid.innerHTML = '';

    // Sort characters by newest first (most recently updated or created at the top)
    // This ensures the most recently modified characters appear first in the gallery
    const sortedCharacters = Object.values(charactersData).sort((a, b) => {
        // First try to use the updated timestamp if available for both characters
        // This ensures edited characters appear at the top
        if (a.updated && b.updated) {
            return new Date(b.updated).getTime() - new Date(a.updated).getTime();
        }

        // If one character has an updated timestamp but the other doesn't,
        // prioritize the one with the updated timestamp
        if (a.updated && !b.updated) {
            return -1; // a comes first
        }
        if (!a.updated && b.updated) {
            return 1; // b comes first
        }

        // If updated is not available for both, use created timestamp
        if (a.created && b.created) {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        }

        // If neither is available, fall back to using the ID (which is a timestamp)
        // This is a reliable fallback since IDs are generated using Date.now()
        return parseInt(b.id) - parseInt(a.id);
    });

    // Create character cards in batches to avoid blocking the main thread
    // This improves perceived performance by allowing the UI to remain responsive
    const batchSize = 10; // Process 10 characters at a time
    let currentIndex = 0;

    function processBatch() {
        const endIndex = Math.min(currentIndex + batchSize, sortedCharacters.length);

        // Process this batch
        for (let i = currentIndex; i < endIndex; i++) {
            const character = sortedCharacters[i];
            if (character && character.id) {
                const card = createCharacterCard(character, character.id === activeCharacterId);
                fragment.appendChild(card);
            }
        }

        // If this is the last batch or the first batch, append to the DOM
        if (endIndex === sortedCharacters.length || currentIndex === 0) {
            characterGalleryGrid.appendChild(fragment);
        }

        // Move to the next batch
        currentIndex = endIndex;

        // If there are more characters to process, schedule the next batch
        if (currentIndex < sortedCharacters.length) {
            setTimeout(processBatch, 0); // Use setTimeout to yield to the browser
        } else {
            // All characters processed
            debugLog('Character gallery updated with ' + sortedCharacters.length + ' characters');
        }
    }

    // Start processing the first batch
    processBatch();
}

/**
 * Creates a character card element with optimized rendering
 * @param {Object} character - The character data
 * @param {boolean} isActive - Whether the character is currently active
 * @returns {HTMLElement} - The character card element
 */
function createCharacterCard(character, isActive) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.characterId = character.id;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Character: ${character.name}`);
    card.setAttribute('tabindex', '0'); // Make focusable for keyboard navigation

    // Add hardware acceleration for smoother animations and interactions
    addHardwareAcceleration(card);

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'character-card-image';

    if (character.image) {
        const img = document.createElement('img');
        // Set both src and data-src to ensure the image loads immediately
        // while still supporting lazy loading for scrolling
        img.dataset.src = character.image;
        img.src = character.image;
        img.alt = character.name;

        // Add loading="lazy" attribute for native lazy loading support
        img.loading = 'lazy';

        // Add fade-in effect when image loads
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease-in';
        img.onload = () => {
            img.style.opacity = '1';
        };

        imageContainer.appendChild(img);
    } else {
        const icon = document.createElement('i');
        icon.className = 'fas fa-user';
        imageContainer.appendChild(icon);
    }

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'character-card-content';

    // Create name
    const name = document.createElement('div');
    name.className = 'character-card-name';
    name.textContent = character.name;

    // Create description
    const description = document.createElement('div');
    description.className = 'character-card-description';
    description.textContent = character.description || 'No description';

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'character-card-footer';

    // Create date
    const date = document.createElement('div');
    date.className = 'character-card-date';
    date.textContent = character.updated
        ? `Updated ${formatDate(new Date(character.updated))}`
        : `Created ${formatDate(new Date(character.created))}`;

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'character-card-actions';

    // Create edit button
    const editButton = document.createElement('button');
    editButton.className = 'character-card-btn';
    editButton.title = 'Edit character';
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.setAttribute('aria-label', 'Edit character');
    editButton.setAttribute('role', 'button');
    editButton.setAttribute('tabindex', '0');
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        hideCharacterGallery();
        // Use a timeout that matches the animation duration plus a small buffer
        setTimeout(() => {
            showEditCharacterModal(character.id);
        }, 350);
    });

    // Create active indicator (not a button)
    const activeIndicator = document.createElement('div');
    activeIndicator.className = `character-card-indicator ${isActive ? 'active' : 'hidden'}`;
    activeIndicator.title = isActive ? 'Currently active' : '';
    activeIndicator.innerHTML = '<i class="fas fa-check"></i>';
    activeIndicator.setAttribute('aria-label', isActive ? 'Currently active' : '');
    activeIndicator.setAttribute('role', 'status');
    // No click event - this is just an indicator

    // Create chat button
    const chatButton = document.createElement('button');
    chatButton.className = 'character-card-btn';
    chatButton.title = 'Start chat with this character';
    chatButton.innerHTML = '<i class="fas fa-comment"></i>';
    chatButton.setAttribute('aria-label', 'Start chat with this character');
    chatButton.setAttribute('role', 'button');
    chatButton.setAttribute('tabindex', '0');
    chatButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Character chat button clicked for:', character.name, 'ID:', character.id);
        console.log('Starting a new chat with this character (not continuing previous chat)');

        // Make sure the character ID is valid
        if (!character.id) {
            console.error('Character ID is missing or invalid');
            return;
        }

        // Store the character ID for later use
        const characterId = character.id;

        // Hide gallery first
        hideCharacterGallery();

        // Use a timeout that matches the animation duration plus a small buffer
        setTimeout(() => {
            // First set the character as active, then create a new chat
            import('./character-manager.js').then(module => {
                console.log('Setting character as active before creating new chat:', character.name);

                // Set as active character
                module.setActiveCharacter(characterId);

                // Get the active character to verify it was set correctly
                const activeCharacter = module.getActiveCharacter();

                // If the character was set successfully
                if (activeCharacter) {
                    console.log('Character set as active:', activeCharacter.name);

                    // Now create a new chat with the character already active
                    // IMPORTANT: Use keepCharacter=true to prevent the character from being cleared
                    import('./chat-service.js').then(chatModule => {
                        // Verify the active character ID is set in localStorage before creating a new chat
                        console.log('Active character ID in localStorage before creating new chat:', localStorage.getItem('activeCharacterId'));

                        // Create a new chat and keep the character
                        chatModule.createNewChat(true);

                        // Get the current chat ID
                        const currentChatId = chatModule.getCurrentChatId();
                        const chatHistoryData = chatModule.getChatHistoryData();

                        if (chatHistoryData[currentChatId]) {
                            // Store the character ID in the chat data
                            chatHistoryData[currentChatId].characterId = characterId;
                            console.log('Stored character ID in chat data:', characterId);

                            // Save the chat history
                            chatModule.saveChatHistory();
                        } else {
                            console.error('Chat history data not found for current chat ID:', currentChatId);
                        }
                    });
                } else {
                    console.error('Failed to set character as active:', character.name);
                }
            });
        }, 350);
    });

    // Create export button
    const exportButton = document.createElement('button');
    exportButton.className = 'character-card-btn character-card-export-btn';
    exportButton.title = 'Export character card';
    exportButton.innerHTML = '<i class="fas fa-file-export"></i>';
    exportButton.setAttribute('aria-label', 'Export character card');
    exportButton.setAttribute('role', 'button');
    exportButton.setAttribute('tabindex', '0');
    exportButton.addEventListener('click', (e) => {
        // Prevent event bubbling and default behavior
        e.stopPropagation();
        e.preventDefault();

        // Export the character card
        exportCharacterCard(character);

        // Return false to ensure the event doesn't propagate
        return false;
    });

    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'character-card-btn character-card-delete-btn';
    deleteButton.title = 'Delete character';
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteButton.setAttribute('aria-label', 'Delete character');
    deleteButton.setAttribute('role', 'button');
    deleteButton.setAttribute('tabindex', '0');
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();

        // Show delete confirmation modal
        import('./character-manager.js').then(module => {
            // We need to set the current character ID before showing the delete modal
            // This is a workaround since the delete modal expects currentCharacterId to be set
            module.showDeleteCharacterConfirmation(character.id);
        });
    });

    // Assemble the card
    actions.appendChild(editButton);
    actions.appendChild(activeIndicator); // Changed from selectButton to activeIndicator
    actions.appendChild(chatButton);
    actions.appendChild(exportButton); // Add the export button
    actions.appendChild(deleteButton); // Add the delete button
    footer.appendChild(date);
    footer.appendChild(actions);
    contentContainer.appendChild(name);
    contentContainer.appendChild(description);
    contentContainer.appendChild(footer);
    card.appendChild(imageContainer);
    card.appendChild(contentContainer);

    return card;
}

/**
 * Checks if the character gallery is currently visible
 * @returns {boolean} - Whether the gallery is visible
 */
export function isCharacterGalleryVisible() {
    return characterGalleryContainer &&
           characterGalleryContainer.style.display === 'flex';
}

// Flag to prevent multiple simultaneous exports
let isExporting = false;
// Store the last export timestamp to implement debounce
let lastExportTime = 0;
// Debounce time in milliseconds
const EXPORT_DEBOUNCE_TIME = 1500;

/**
 * Exports a character card to a JSON file
 * @param {Object} character - The character data to export
 */
function exportCharacterCard(character) {
    // Get current time
    const now = Date.now();

    // Prevent multiple simultaneous exports and implement debounce
    if (isExporting || (now - lastExportTime < EXPORT_DEBOUNCE_TIME)) {
        debugLog('Export already in progress or debounce period active, ignoring request');
        return;
    }

    if (!character) {
        debugError('No character data provided for export');
        return;
    }

    // Set the flag to prevent multiple exports and update last export time
    isExporting = true;
    lastExportTime = now;

    try {
        // Create a character card object in a format compatible with Silly Tavern
        const characterCard = {
            name: character.name,
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            // First message fields are no longer supported
            first_message: '',
            first_mes: '',
            // Include the image if available
            avatar: character.image || null,
            // Add metadata
            created: character.created || new Date().toISOString(),
            modified: character.updated || new Date().toISOString(),
            // Add empty fields that might be expected by some importers
            mes_example: '',
            // Add LMSA metadata
            source: 'LMSA Character Card',
            source_version: '1.0'
        };

        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(characterCard, null, 2);

        // Generate a filename with the character name and current date
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
        // Sanitize the character name for use in a filename
        const sanitizedName = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedName}-character-card-${formattedDate}-${formattedTime}.json`;

        // Check if we're in an Android WebView or mobile device
        const isAndroidWebView = () => {
            return window.navigator.userAgent.includes('wv') && window.navigator.userAgent.includes('Android');
        };

        const isMobileDevice = () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        };

        // Create a single download function to avoid code duplication
        const downloadFile = (blob, filename) => {
            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            // Append the anchor to the document
            document.body.appendChild(a);

            // Trigger a click on the anchor
            a.click();

            // Remove the anchor from the document after a short delay
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        };

        // Create a Blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Download the file
        downloadFile(blob, filename);

        // Show a success message
        appendMessage('ai', `Character card for "${character.name}" exported successfully`);
        debugLog(`Character card exported: ${character.name}`);
    } catch (error) {
        // Log the error and show an error message
        debugError('Error exporting character card:', error);
        appendMessage('error', `Failed to export character card: ${error.message}`);
    } finally {
        // Reset the export flag after a delay to prevent accidental double-clicks
        // This ensures the flag is reset even if an error occurs
        setTimeout(() => {
            isExporting = false;
        }, 1000);
    }
}

