// Character Continuation Modal
// This module handles the character continuation modal functionality

import { getActiveCharacter } from './js/character-manager.js';
import { createNewChat } from './js/chat-service.js';
import { checkAndShowWelcomeMessage } from './js/ui-manager.js';
import { handleContinueWithCharacter as continueWithCharacterHandler } from './js/event-handlers.js';

// DOM elements
let characterContinuationModal;
let closeCharacterContinuationModalButton;
let newChatWithoutCharacterButton;
let continueWithCharacterButton;
let characterContinuationName;
let characterContinuationDescription;
let characterContinuationAvatar;

/**
 * Initializes the character continuation modal
 */
function initializeCharacterContinuationModal() {
    // Get DOM elements
    characterContinuationModal = document.getElementById('character-continuation-modal');
    closeCharacterContinuationModalButton = document.getElementById('close-character-continuation-modal');
    newChatWithoutCharacterButton = document.getElementById('new-chat-without-character');
    continueWithCharacterButton = document.getElementById('continue-with-character-btn');
    characterContinuationName = document.getElementById('character-continuation-name');
    characterContinuationDescription = document.getElementById('character-continuation-description');
    characterContinuationAvatar = document.getElementById('character-continuation-avatar');

    // Add event listeners
    if (closeCharacterContinuationModalButton) {
        closeCharacterContinuationModalButton.addEventListener('click', hideCharacterContinuationModal);
    }

    if (newChatWithoutCharacterButton) {
        newChatWithoutCharacterButton.addEventListener('click', handleNewChatWithoutCharacter);
    }

    if (continueWithCharacterButton) {
        continueWithCharacterButton.addEventListener('click', handleContinueWithCharacter);
    }

    // Close modal when clicking outside
    if (characterContinuationModal) {
        characterContinuationModal.addEventListener('click', (e) => {
            if (e.target === characterContinuationModal) {
                hideCharacterContinuationModal();
            }
        });
    }

    // Override the new chat button click event
    const newChatButton = document.getElementById('new-chat');
    if (newChatButton) {
        // Remove any existing event listeners by cloning and replacing the element
        const newChatButtonClone = newChatButton.cloneNode(true);
        newChatButton.parentNode.replaceChild(newChatButtonClone, newChatButton);

        // Keep a reference to the original background
        const originalBackground = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        const activeBackground = 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)';
        
        // Track whether we're currently touching the button
        let isTouching = false;
        
        // Regular click event - handled last to ensure it doesn't interfere with touch
        newChatButtonClone.addEventListener('click', (e) => {
            if (!isTouching) { // Only handle click if not from a touch event
                handleNewChatButtonClick();
            }
        });
        
        // Touch start - change to active state
        newChatButtonClone.addEventListener('touchstart', (e) => {
            isTouching = true;
            newChatButtonClone.style.background = activeBackground;
            newChatButtonClone.style.transform = 'translateY(1px)';
            newChatButtonClone.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
        }, { passive: true });
        
        // Touch end - restore original state and handle the action
        newChatButtonClone.addEventListener('touchend', (e) => {
            // Prevent default browser behavior that might cause stuck states
            e.preventDefault();
            
            // Reset visual state immediately
            newChatButtonClone.style.background = originalBackground;
            newChatButtonClone.style.transform = 'none';
            newChatButtonClone.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            
            // Force blur
            newChatButtonClone.blur();
            
            // Handle the action
            handleNewChatButtonClick();
            
            // Reset touch state after a short delay
            setTimeout(() => {
                isTouching = false;
            }, 300);
        }, { passive: false });
        
        // Touch cancel - just restore original state
        newChatButtonClone.addEventListener('touchcancel', (e) => {
            // Reset visual state immediately
            newChatButtonClone.style.background = originalBackground;
            newChatButtonClone.style.transform = 'none';
            newChatButtonClone.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            
            // Force blur
            newChatButtonClone.blur();
            
            // Reset touch state
            isTouching = false;
        }, { passive: true });
        
        // Handle leaving the button area during touch
        newChatButtonClone.addEventListener('touchmove', (e) => {
            // Check if touch has moved out of the button
            const touch = e.touches[0];
            const buttonRect = newChatButtonClone.getBoundingClientRect();
            
            if (touch.clientX < buttonRect.left || touch.clientX > buttonRect.right || 
                touch.clientY < buttonRect.top || touch.clientY > buttonRect.bottom) {
                // Touch moved outside button - reset visual state
                newChatButtonClone.style.background = originalBackground;
                newChatButtonClone.style.transform = 'none';
                newChatButtonClone.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            }
        }, { passive: true });
    }
}

/**
 * Handles the new chat button click
 * If a character is active, shows the character continuation modal
 * Otherwise, creates a new chat
 */
export function handleNewChatButtonClick() {
    // Force blur on active element to prevent any stuck focus states
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
    // Get the button again to ensure we're working with the current DOM element
    const button = document.getElementById('new-chat');
    if (button) {
        // Reset any CSS classes that might be keeping the button in a highlighted state
        button.classList.remove('active', 'touch-active', 'focus', 'focus-visible');
    }
    
    // Check if the modal is already visible
    if (characterContinuationModal && !characterContinuationModal.classList.contains('hidden')) {
        // Modal is already open, close it and create a new chat without character
        hideCharacterContinuationModal();
        
        // Import character-manager to explicitly clear the active character
        import('./js/character-manager.js').then(module => {
            // First clear the active character
            module.clearActiveCharacter();
            
            // Then create a new chat without character
            createNewChat(false);
        });
        return;
    }
    
    const activeCharacter = getActiveCharacter();

    if (activeCharacter) {
        // Show the character continuation modal
        showCharacterContinuationModal(activeCharacter);
    } else {
        // No active character, just create a new chat
        createNewChat();
    }
}

/**
 * Shows the character continuation modal
 * @param {Object} character - The active character data
 */
export function showCharacterContinuationModal(character) {
    if (!characterContinuationModal) return;

    // Update the modal with character information
    if (characterContinuationName) {
        characterContinuationName.textContent = character.name;
    }

    if (characterContinuationDescription) {
        characterContinuationDescription.textContent = character.description || 'No description';
    }

    // Update the avatar
    if (characterContinuationAvatar) {
        characterContinuationAvatar.innerHTML = '';
        if (character.image) {
            const img = document.createElement('img');
            img.src = character.image;
            img.className = 'w-full h-full object-cover';
            characterContinuationAvatar.appendChild(img);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fas fa-user text-white';
            characterContinuationAvatar.appendChild(icon);
        }
    }

    // Show the modal with animation
    characterContinuationModal.classList.remove('hidden');

    // Add animation class
    const modalContent = characterContinuationModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-in');
        setTimeout(() => {
            modalContent.classList.remove('animate-modal-in');
        }, 300);
    }
}

/**
 * Hides the character continuation modal
 */
function hideCharacterContinuationModal() {
    if (!characterContinuationModal) return;

    // Add animation class
    const modalContent = characterContinuationModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.add('animate-modal-out');
        setTimeout(() => {
            characterContinuationModal.classList.add('hidden');
            modalContent.classList.remove('animate-modal-out');

            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }, 300);
    } else {
        characterContinuationModal.classList.add('hidden');

        // Check if welcome message should be shown
        checkAndShowWelcomeMessage();
    }
}

/**
 * Handles the "New Chat without Character" button click
 * Creates a new chat without the character
 */
function handleNewChatWithoutCharacter() {
    // Hide the modal first
    hideCharacterContinuationModal();

    // Import character-manager to explicitly clear the active character
    import('./js/character-manager.js').then(module => {
        // First clear the active character
        module.clearActiveCharacter();
        
        // Then create a new chat without character
        createNewChat(false);
    });
}

/**
 * Handles the "Continue with Character" button click
 * Creates a new chat while keeping the current character active
 */
function handleContinueWithCharacter() {
    // Hide the modal first
    hideCharacterContinuationModal();

    // Use the imported handler function
    continueWithCharacterHandler();
}

// Initialize the modal when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCharacterContinuationModal);
