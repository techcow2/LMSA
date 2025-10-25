// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { getUploadedFiles } from './file-upload.js';

// Global variable to track if a long-press is in progress on the send button
window.isSendButtonLongPressInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
    const emptyMessageModal = document.getElementById('empty-message-modal');
    const closeModalButton = emptyMessageModal.querySelector('.close-modal');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');

    // Function to show the modal
    function showEmptyMessageModal() {
        emptyMessageModal.classList.remove('hidden');
        emptyMessageModal.classList.add('active');
    }

    // Function to hide the modal
    function hideEmptyMessageModal() {
        emptyMessageModal.classList.remove('active');
        setTimeout(() => {
            emptyMessageModal.classList.add('hidden');

            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }, 300); // Match the transition duration
    }

    // Handle empty message check before form submission
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const messageContent = userInput.value.trim();
            // Check for empty message and no files
            const hasUploadedFiles = getUploadedFiles() && getUploadedFiles().length > 0;
            
            if (messageContent === '' && !hasUploadedFiles) {
                e.preventDefault();
                showEmptyMessageModal();
                userInput.focus();
            }
        }
    });

    // Handle empty message check for send button
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', (e) => {
            // Check if the context menu is visible
            const sendContextMenu = document.getElementById('send-context-menu');
            const isContextMenuVisible = sendContextMenu &&
                sendContextMenu.style.display === 'block';

            // Skip empty message check if a long-press is in progress or context menu is visible
            if (window.isSendButtonLongPressInProgress || isContextMenuVisible) {
                return;
            }

            const messageContent = userInput.value.trim();
            // Check for uploaded files - if files are present, allow submission even with empty message
            const uploadedFiles = getUploadedFiles();
            const hasUploadedFiles = uploadedFiles && uploadedFiles.length > 0;
            
            if (messageContent === '' && !hasUploadedFiles) {
                // Only prevent default if the message is empty and no files
                e.preventDefault();
                e.stopPropagation(); // Stop event propagation
                showEmptyMessageModal();
                userInput.focus();
            }
            // If the message is not empty or files are attached, let the form submission proceed normally
        });
    }

    // Close modal when clicking the close button
    closeModalButton.addEventListener('click', hideEmptyMessageModal);

    // Close modal when clicking outside
    emptyMessageModal.addEventListener('click', (e) => {
        if (e.target === emptyMessageModal) {
            hideEmptyMessageModal();
        }
    });

    // Close modal when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && emptyMessageModal.classList.contains('active')) {
            hideEmptyMessageModal();
        }
    });
});