// Only proceed if sidebar exists and is currently active/visible
  // Event Handlers for the application
import {
    chatForm, userInput, clearChatButton, newChatButton, settingsButton,
    closeSettingsButton, closeSettingsXButton, settingsModal, welcomeMessage, messagesContainer,
    sidebarToggle, closeSidebarButton, confirmActionButton, cancelActionButton,
    helpButton, newChatHeaderButton, whatsNewButton, aboutButton, stopButton, contextMenu, copyTextButton,
    regenerateTextButton, exitButton, refreshButton, modelToggleButton, loadedModelDisplay,
    settingsIconButton, newTopicButton, sendButton, sendContextMenu, newTopicMenuButton, scrollToBottomMenuButton,
    modelButton, importExportGroupButton, importExportContainer,
    welcomeModelsBtn, welcomeNewChatBtn, welcomeHelpBtn
} from './dom-elements.js';
import { showSettingsModal, hideSettingsModal } from './settings-modal-manager.js';
import {
    showWelcomeMessage, hideWelcomeMessage, toggleSidebar, closeSidebar, showLoadingIndicator,
    hideLoadingIndicator, toggleSendStopButton, hideConfirmationModal, showConfirmationModal,
    getSelectedText, getSelectedMessageElement, appendMessage
} from './ui-manager.js';
import {
    generateAIResponse,
    isGeneratingText,
    abortGeneration,
    setAbortController,
    createNewChat,
    isFirstMessage,
    setIsFirstMessage,
    addTopicBoundary,
    regenerateLastResponse,
    chatHistoryData,
    currentChatId,
    clearAllChats,
    deleteChatHistory,
    getChatToDelete,
    saveChatHistory,
    loadChatHistory,
    updateChatHistoryUI,
    addUserMessageToHistory
} from './chat-service.js';
import { resetApp, initializeResetAppButton } from './reset-app.js';
import { fetchAvailableModels, isServerRunning, getAvailableModels } from './api-service.js';
import { resetUploadedFiles, getUploadedFiles, uploadFilesToLMStudio } from './file-upload.js';
import { setActionToPerform, getActionToPerform } from './shared-state.js';
import { closeSidebarExport } from './export-import.js';
import { showModelModal } from './model-manager.js';
import { showWhatsNewModal } from './whats-new.js';
import { interceptIpPortChanges } from './ip-port-confirmation-modal.js';
import { debugLog, debugError, formatDate } from './utils.js';
import { closeApplication, copyToClipboard, sanitizeInput, scrollToBottom, scrollToBottomManual, handleScroll, ensureCursorVisible } from './utils.js';

let abortController = null;
let sidebar = document.getElementById('sidebar');

/**
 * Initializes all event handlers
 */
export function initializeEventHandlers() {
    // "Continue with Character" button has been removed
    // Event listeners for it are no longer needed
    // Settings button in welcome message
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) {
        // Function to open settings modal
        const openSettingsModal = () => {
            debugLog('Settings button clicked, opening settings modal');

            // Remove sidebar click handler while modal is open
            document.body.removeEventListener('click', handleSidebarOutsideClick);

            // Ensure the welcome message is hidden when settings modal is shown
            if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                welcomeMessage.style.opacity = '0';
                welcomeMessage.style.visibility = 'hidden';
            }
            // Use the centralized settings modal manager
            try {
                showSettingsModal();
            } catch (error) {
                debugError('Error showing settings modal:', error);
            }
        };

        // Remove any existing event listeners to prevent duplicates
        const newGetStartedBtn = getStartedBtn.cloneNode(true);
        getStartedBtn.parentNode.replaceChild(newGetStartedBtn, getStartedBtn);

        // Update the reference
        const updatedGetStartedBtn = document.getElementById('get-started-btn');

        // Add click event listener
        updatedGetStartedBtn.addEventListener('click', openSettingsModal);

        // Add touch event listener for better mobile experience
        updatedGetStartedBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default to avoid any conflicts
            e.stopPropagation(); // Prevent event bubbling
            updatedGetStartedBtn.classList.remove('active');
            openSettingsModal();
        }, { passive: false });

        // Add visual feedback for touch devices
        updatedGetStartedBtn.addEventListener('touchstart', () => {
            updatedGetStartedBtn.classList.add('active');
        });

        // Add touchcancel handler
        updatedGetStartedBtn.addEventListener('touchcancel', () => {
            updatedGetStartedBtn.classList.remove('active');
        });
    }


    // Models button in welcome screen
    if (welcomeModelsBtn) {
        // Function to open models modal
        const openModelsModal = () => {
            debugLog('Models button clicked, opening models modal');

            // Import the module and handle potential errors
            try {
                import('./model-manager.js').then(module => {
                    module.showModelModal();
                }).catch(error => {
                    debugError('Error importing model-manager.js:', error);
                });
            } catch (error) {
                debugError('Error in model button handler:', error);
            }
        };

        // Remove any existing event listeners to prevent duplicates
        const newWelcomeModelsBtn = welcomeModelsBtn.cloneNode(true);
        welcomeModelsBtn.parentNode.replaceChild(newWelcomeModelsBtn, welcomeModelsBtn);

        // Update the reference
        const updatedWelcomeModelsBtn = document.getElementById('welcome-models-btn');

        // Add click event listener
        updatedWelcomeModelsBtn.addEventListener('click', openModelsModal);

        // Add touch event listener for better mobile experience
        updatedWelcomeModelsBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default to avoid any conflicts
            e.stopPropagation(); // Prevent event bubbling
            updatedWelcomeModelsBtn.classList.remove('active');
            openModelsModal();
        }, { passive: false });

        // Add visual feedback for touch devices
        updatedWelcomeModelsBtn.addEventListener('touchstart', () => {
            updatedWelcomeModelsBtn.classList.add('active');
        });

        // Add touchcancel handler
        updatedWelcomeModelsBtn.addEventListener('touchcancel', () => {
            updatedWelcomeModelsBtn.classList.remove('active');
        });
    }

    // Welcome "Saved" button (previously used inline onclick)
    const welcomeNewChatBtn = document.getElementById('welcome-new-chat-btn');
    if (welcomeNewChatBtn) {
        // Function to handle saved chats button click
        const openSavedChats = () => {
            debugLog('Saved chats button clicked, opening sidebar');

            // Open sidebar with saved chats
            toggleSidebar();
        };

        // Remove any existing event listeners to prevent duplicates
        const newWelcomeNewChatBtn = welcomeNewChatBtn.cloneNode(true);
        welcomeNewChatBtn.parentNode.replaceChild(newWelcomeNewChatBtn, welcomeNewChatBtn);

        // Update the reference
        const updatedWelcomeNewChatBtn = document.getElementById('welcome-new-chat-btn');

        // Add click event listener
        updatedWelcomeNewChatBtn.addEventListener('click', openSavedChats);

        // Add touch event listener for better mobile experience
        updatedWelcomeNewChatBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default to avoid any conflicts
            e.stopPropagation(); // Prevent event bubbling
            updatedWelcomeNewChatBtn.classList.remove('active');
            openSavedChats();
        }, { passive: false });

        // Add visual feedback for touch devices
        updatedWelcomeNewChatBtn.addEventListener('touchstart', () => {
            updatedWelcomeNewChatBtn.classList.add('active');
        });

        // Add touchcancel handler
        updatedWelcomeNewChatBtn.addEventListener('touchcancel', () => {
            updatedWelcomeNewChatBtn.classList.remove('active');
        });
    }

    // Welcome "Help" button (previously used inline onclick)
    const welcomeHelpBtn = document.getElementById('welcome-help-btn');
    if (welcomeHelpBtn) {
        // Function to open help screen
        const openHelpScreen = () => {
            debugLog('Help button clicked, opening help screen');

            try {
                // Get the help button and click it
                const helpBtnMain = document.getElementById('help-btn');
                if (helpBtnMain) {
                    helpBtnMain.click();
                }
            } catch (error) {
                debugError('Error opening help screen:', error);
            }
        };

        // Remove any existing event listeners to prevent duplicates
        const newWelcomeHelpBtn = welcomeHelpBtn.cloneNode(true);
        welcomeHelpBtn.parentNode.replaceChild(newWelcomeHelpBtn, welcomeHelpBtn);

        // Update the reference
        const updatedWelcomeHelpBtn = document.getElementById('welcome-help-btn');

        // Add click event listener
        updatedWelcomeHelpBtn.addEventListener('click', openHelpScreen);

        // Add touch event listener for better mobile experience
        updatedWelcomeHelpBtn.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default to avoid any conflicts
            e.stopPropagation(); // Prevent event bubbling
            updatedWelcomeHelpBtn.classList.remove('active');
            openHelpScreen();
        }, { passive: false });

        // Add visual feedback for touch devices
        updatedWelcomeHelpBtn.addEventListener('touchstart', () => {
            updatedWelcomeHelpBtn.classList.add('active');
        });

        // Add touchcancel handler
        updatedWelcomeHelpBtn.addEventListener('touchcancel', () => {
            updatedWelcomeHelpBtn.classList.remove('active');
        });
    }

    // Chat form submission
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatFormSubmit);
    }

    // Add input field event listeners for cursor visibility
    if (userInput) {
        // Define height constants
        const singleLineHeight = 52;  // Height for single line of text (matches actual scrollHeight)
        const maxHeight = 200;

        // Function to auto-resize the textarea based on content
        const autoResizeTextarea = function(textarea) {
            if (!textarea) return;

            // Save the current scroll position
            const scrollTop = textarea.scrollTop;

            // Temporarily shrink to single line height to get accurate measurement
            textarea.style.height = singleLineHeight + 'px';

            // Get the scroll height - if content doesn't fit, this will be larger
            const scrollHeight = textarea.scrollHeight;

            // Determine the new height
            let newHeight;
            if (scrollHeight <= singleLineHeight) {
                // Content fits in single line
                newHeight = singleLineHeight;
            } else {
                // Content needs more space
                newHeight = Math.min(scrollHeight, maxHeight);
            }

            // Set the final height
            textarea.style.height = newHeight + 'px';

            // Restore scroll position
            textarea.scrollTop = scrollTop;

            // Enable scrolling if content exceeds max height
            if (scrollHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }
        };

        // Simple direct method to ensure cursor is at the end when typing
        const scrollInputToEnd = function(input) {
            // Use setTimeout to ensure this runs after the browser has updated the input value
            setTimeout(() => {
                // For textarea, scroll to bottom
                input.scrollTop = input.scrollHeight;
            }, 0);
        };

        // Handle input events to ensure cursor visibility during typing
        userInput.addEventListener('input', function(e) {
            // Auto-resize the textarea
            autoResizeTextarea(e.target);
            // Use both methods for maximum compatibility
            scrollInputToEnd(e.target);
            ensureCursorVisible(e.target);
        });

        // Handle keydown events for cursor visibility and Enter key
        userInput.addEventListener('keydown', function(e) {
            // Handle Enter key to submit form (unless Shift is held)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent new line
                chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                return;
            }

            // For arrow keys, we need special handling
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
                e.key === 'Home' || e.key === 'End') {
                // Use setTimeout to run after the cursor has moved
                setTimeout(() => {
                    ensureCursorVisible(e.target);
                }, 0);
            } else {
                // For other keys, ensure cursor is visible
                ensureCursorVisible(e.target);
            }
        });

        // Handle selection change events
        userInput.addEventListener('select', function(e) {
            // Ensure cursor is visible when selection changes
            ensureCursorVisible(e.target);
        });

        // Handle click events to ensure cursor visibility when clicking within text
        userInput.addEventListener('click', function(e) {
            // Ensure cursor is visible when clicking to position cursor
            ensureCursorVisible(e.target);
        });

        // Handle focus events to ensure cursor visibility when focusing the input field
        userInput.addEventListener('focus', function(e) {
            // Hide welcome screen when user focuses on input field
            import('./ui-manager.js').then(module => {
                if (typeof module.hideWelcomeMessage === 'function' && welcomeMessage && welcomeMessage.style.display !== 'none') {
                    module.hideWelcomeMessage();
                }
            }).catch(error => {
                console.error('Error importing ui-manager module:', error);
            });

            // When focusing, move cursor to end for better UX
            const length = e.target.value.length;
            e.target.setSelectionRange(length, length);
            // Then ensure cursor is visible
            scrollInputToEnd(e.target);
            ensureCursorVisible(e.target);
        });

        // Handle touchstart events for touch devices to hide welcome screen immediately
        userInput.addEventListener('touchstart', function(e) {
            // Hide welcome screen when user touches the input field
            import('./ui-manager.js').then(module => {
                if (typeof module.hideWelcomeMessage === 'function' && welcomeMessage && welcomeMessage.style.display !== 'none') {
                    module.hideWelcomeMessage();
                }
            }).catch(error => {
                console.error('Error importing ui-manager module:', error);
            });
        }, { passive: true });

        // Handle touchend events for mobile devices
        userInput.addEventListener('touchend', function(e) {
            // Ensure cursor is visible after touch interaction
            setTimeout(() => {
                ensureCursorVisible(e.target);
            }, 0);
        });

        // Initialize textarea to correct single-line height on page load
        // This ensures consistent height before and after typing
        setTimeout(() => {
            // Set to minimum first
            userInput.style.height = singleLineHeight + 'px';
            // Measure what the browser thinks the scrollHeight should be for single line
            const naturalScrollHeight = userInput.scrollHeight;
            // Set to that height for consistency
            userInput.style.height = naturalScrollHeight + 'px';
            userInput.style.overflowY = 'hidden';

        }, 0);
    }

    // Clear chat button
    if (clearChatButton) {
        clearChatButton.addEventListener('click', () => {
            setActionToPerform('clearAllChats');
            showConfirmationModal('Are you sure you want to clear all chats? This action cannot be undone.');
        });
    }

    // New chat button
    if (newChatButton) {
        newChatButton.addEventListener('click', () => {
            // Show interstitial ad (if on Android)
            if (typeof AndroidAds !== 'undefined' && AndroidAds.showInterstitial) {
                try {
                    AndroidAds.showInterstitial();
                } catch (error) {
                    console.log('Interstitial ad trigger failed:', error);
                }
            }
            createNewChat();
        });
    }

    // Settings button
    if (settingsButton) {
        settingsButton.addEventListener('click', handleSettingsButtonClick);
    }

    // Close settings button
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', handleCloseSettingsButtonClick);
    }

    // Add event listener for the X icon in the top right corner of settings modal
    if (closeSettingsXButton) {
        closeSettingsXButton.addEventListener('click', handleCloseSettingsButtonClick);
    }

    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            toggleSidebar();
            // Remove focus to prevent the button from staying highlighted
            sidebarToggle.blur();
        });

        // Add touch event handlers to prevent highlight on mobile
        sidebarToggle.addEventListener('touchstart', (e) => {
            // Prevent default touch highlight
            e.preventDefault();
        }, { passive: false });

        sidebarToggle.addEventListener('touchend', (e) => {
            // Prevent default behavior that might cause highlight
            e.preventDefault();
            // Call toggle function
            toggleSidebar();
            // Remove focus
            sidebarToggle.blur();
        }, { passive: false });
    }

    // Close sidebar button
    if (closeSidebarButton) {
        closeSidebarButton.addEventListener('click', toggleSidebar);
    }

    // Close sidebar when clicking outside on mobile or desktop
    document.addEventListener('click', function(e) {
        // Skip this event handler if the target is an input, textarea, or form control
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'SELECT' ||
            e.target.closest('form') !== null) {
            return;
        }

        // Skip this event handler if the target is a modal close button
        if (e.target.closest('#close-about') ||
            e.target.closest('#close-settings') ||
            e.target.closest('#close-settings-x') ||
            e.target.closest('.modal-close-btn')) {
            return;
        }

        // Don't handle sidebar clicks if any modal is visible
        const anyModalVisible = document.querySelector('.modal-container:not(.hidden)') ||
                              (settingsModal && settingsModal.style.display === 'flex');
        if (anyModalVisible) {
            return;
        }

        handleSidebarOutsideClick(e);
    });

    // Prevent multiple rapid touch events
    let lastTouchTime = 0;
    
    // Also handle touch events for mobile and tablets
    document.addEventListener('touchend', function(e) {
        // Prevent rapid-fire touch events
        const now = Date.now();
        if (now - lastTouchTime < 100) {
            return;
        }
        lastTouchTime = now;
        
        // Debug logging removed
        // Only process if this is a simple tap (not scrolling or other complex gestures)
        if (e.changedTouches && e.changedTouches.length === 1) {
            // Get the element at the touch position for more accurate detection
            const touch = e.changedTouches[0];
            const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);

            // Skip for form inputs, buttons, and interactive elements
            if (elementAtTouch && (
                elementAtTouch.tagName === 'INPUT' ||
                elementAtTouch.tagName === 'TEXTAREA' ||
                elementAtTouch.tagName === 'SELECT' ||
                elementAtTouch.tagName === 'BUTTON' ||
                elementAtTouch.closest('form') !== null ||
                elementAtTouch.closest('button') !== null ||
                elementAtTouch.closest('.menu-item') !== null ||
                elementAtTouch.closest('#chat-history') !== null ||
                elementAtTouch.closest('#sidebar') !== null ||
                elementAtTouch.closest('#close-about') ||
                elementAtTouch.closest('#close-settings') ||
                elementAtTouch.closest('#close-settings-x') ||
                elementAtTouch.closest('.modal-close-btn'))) {
                return;
            }

            // Don't handle sidebar clicks if any modal is visible
            const anyModalVisible = document.querySelector('.modal-container:not(.hidden)') ||
                                  (settingsModal && settingsModal.style.display === 'flex');
            if (anyModalVisible) {
                return;
            }

            // Check if we're tapping on the sidebar overlay directly
            if (elementAtTouch && elementAtTouch.id === 'sidebar-overlay') {
                // If tapping directly on the overlay, use toggleSidebar for consistency
                toggleSidebar();
                return;
            }

            // Otherwise, use the standard outside click handler
            handleSidebarOutsideClick(e);
        }
    }, { passive: false });

    // Handle window resize
    window.addEventListener('resize', handleWindowResize);

    // Add focus/blur event listeners to the window to track focus state
    // This helps with the regenerate button issue
    window.addEventListener('focus', () => {
        debugLog('Window gained focus');
        document.body.classList.remove('window-blurred');
        document.body.classList.add('window-focused');
    });

    window.addEventListener('blur', () => {
        debugLog('Window lost focus');
        document.body.classList.remove('window-focused');
        document.body.classList.add('window-blurred');
    });

    // Set initial focus state
    if (document.hasFocus()) {
        document.body.classList.add('window-focused');
    } else {
        document.body.classList.add('window-blurred');
    }

    // Confirmation action button
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', handleConfirmAction);
    }

    // Cancel action button
    if (cancelActionButton) {
        cancelActionButton.addEventListener('click', hideConfirmationModal);
    }

    // Help button
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            // Close the sidebar first
            closeSidebar();
            
            // Also close the options container
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.classList.add('hidden');
                optionsContainer.classList.remove('animate-fade-in');
            }

            // Then open the Help modal
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.remove('hidden');
                const modalContent = helpModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.add('animate-modal-in');

                    // Reset scroll position to top
                    const scrollableContent = helpModal.querySelector('.overflow-y-auto');
                    if (scrollableContent) {
                        scrollableContent.scrollTop = 0;
                    }

                    setTimeout(() => {
                        modalContent.classList.remove('animate-modal-in');
                    }, 300);
                }
            }
        });
    }

    // What's New button
    if (whatsNewButton) {
        whatsNewButton.addEventListener('click', () => {
            // Close the sidebar with smooth transition
            if (sidebar) {
                // Add the slide-out animation class
                sidebar.classList.add('animate-slide-out');
                sidebar.classList.remove('animate-slide-in');

                // Also close the options container
                const optionsContainer = document.getElementById('options-container');
                if (optionsContainer) {
                    optionsContainer.classList.add('hidden');
                    optionsContainer.classList.remove('animate-fade-in');
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

                // Remove the sidebar overlay with fade effect
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                    // Wait for overlay fade transition
                    setTimeout(() => {
                        sidebarOverlay.classList.add('hidden');
                    }, 300);
                }

                // Close the sidebar and show the What's New modal
                closeSidebar();
                
                // Show the What's New modal after sidebar is closed
                setTimeout(() => {
                    // Show the What's New modal, forcing it to show even if already seen
                    showWhatsNewModal(true);
                }, 100); // Small delay for a smoother transition
            } else {
                // If sidebar doesn't exist, just show the modal
                showWhatsNewModal(true);
            }
        });
    }

    // New chat header button
    if (newChatHeaderButton) {
        newChatHeaderButton.addEventListener('click', handleNewChatButtonClick);

        // Add touch event handlers to prevent highlight on mobile
        newChatHeaderButton.addEventListener('touchstart', (e) => {
            // Prevent default touch highlight
            e.preventDefault();
        }, { passive: false });

        newChatHeaderButton.addEventListener('touchend', (e) => {
            // Prevent default behavior that might cause highlight
            e.preventDefault();
            // Trigger new chat functionality
            handleNewChatButtonClick();
        }, { passive: false });

        // Remove focus to prevent the button from staying highlighted
        newChatHeaderButton.addEventListener('click', () => {
            if (newChatHeaderButton) {
                newChatHeaderButton.blur();
            }
        });
    }

    // About button
    if (aboutButton) {
        // Remove any existing event listeners to prevent duplicates
        const newAboutButton = aboutButton.cloneNode(true);
        aboutButton.parentNode.replaceChild(newAboutButton, aboutButton);

        // Update the reference in the imported DOM elements
        window.aboutButton = newAboutButton;

        // Add the event listener to the new button
        newAboutButton.addEventListener('click', () => {
            debugLog('About button clicked');
            // Close the sidebar first
            closeSidebar();
            
            // Also close the options container
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.classList.add('hidden');
                optionsContainer.classList.remove('animate-fade-in');
            }

            // Then open the About modal
            const aboutModal = document.getElementById('about-modal');
            if (aboutModal) {
                aboutModal.classList.remove('hidden');
                const modalContent = aboutModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.add('animate-modal-in');
                    setTimeout(() => {
                        modalContent.classList.remove('animate-modal-in');
                    }, 300);
                }
            }
        });
        debugLog('About button event handler attached during initialization');
    }

    // Options button for mobile view
    const optionsBtn = document.getElementById('options-btn');
    const optionsContainer = document.getElementById('options-container');
    if (optionsBtn && optionsContainer) {
        // Remove any existing event listeners to prevent duplicates
        const newOptionsBtn = optionsBtn.cloneNode(true);
        optionsBtn.parentNode.replaceChild(newOptionsBtn, optionsBtn);

        // Add the event listener to the new button
        newOptionsBtn.addEventListener('click', handleOptionsButtonClick);
        debugLog('Options button event handler attached during initialization');
    }

    // Stop button
    if (stopButton) {
        // Remove any existing event listeners to prevent duplicates
        const newStopButton = stopButton.cloneNode(true);
        stopButton.parentNode.replaceChild(newStopButton, stopButton);

        // Add a more robust handler that ensures the UI is reset, especially for first message
        newStopButton.addEventListener('click', (e) => {
            e.preventDefault();
            debugLog('Stop button clicked');

            // Force UI reset regardless of abort success
            const sendBtn = document.getElementById('send-button');
            const stopBtn = document.getElementById('stop-button');

            if (stopBtn && !stopBtn.classList.contains('hidden')) {
                // Abort the generation through the chat service module
                import('./chat-service.js').then(module => {
                    if (typeof module.abortGeneration === 'function') {
                        module.abortGeneration();
                    } else {
                        // Fallback if function not available
                        abortGeneration();
                    }
                    
                    // Double-check UI state after a short delay to ensure it's reset
                    setTimeout(() => {
                        if (stopBtn && !stopBtn.classList.contains('hidden')) {
                            debugLog('Force resetting UI state after stop');
                            stopBtn.classList.add('hidden');
                            if (sendBtn) {
                                sendBtn.classList.remove('hidden');
                            }
                            hideLoadingIndicator();
                        }
                        
                        // Ensure abort controller is nullified
                        if (typeof module.setAbortController === 'function') {
                            module.setAbortController(null);
                        }
                    }, 100);
                }).catch(error => {
                    console.error('Error importing chat-service module:', error);
                    // Fallback to standard abort function
                    abortGeneration();
                    
                    // Force UI reset
                    setTimeout(() => {
                        stopBtn.classList.add('hidden');
                        if (sendBtn) sendBtn.classList.remove('hidden');
                        hideLoadingIndicator();
                    }, 100);
                });
            }
        });
        debugLog('Enhanced stop button event handler attached');
    }

    // Hide context menus when clicking outside
    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }

        // For send context menu, keep it open if the click is inside the menu OR the send button
        // Only dismiss when clicking elsewhere on the screen
        if (sendContextMenu && sendContextMenu.style.display === 'block') {
            // Get the send button element
            const sendButtonElement = document.getElementById('send-button');

            // Check if the click is outside both the menu and the send button
            if (!sendContextMenu.contains(e.target) &&
                (!sendButtonElement || !sendButtonElement.contains(e.target))) {
                hideSendContextMenu();
                debugLog('Send context menu hidden by outside click');
            } else {
                debugLog('Click inside menu or send button - keeping menu open');
            }
        }
    });

    // Copy text button
    if (copyTextButton) {
        copyTextButton.addEventListener('click', handleCopyText);
    }

    // Regenerate text button
    if (regenerateTextButton) {
        regenerateTextButton.addEventListener('click', handleRegenerateText);
    }

    // Exit button
    if (exitButton) {
        exitButton.addEventListener('click', () => {
            setActionToPerform('exit');
            showConfirmationModal('Are you sure you want to exit the application?');
        });
    }

    // Refresh button
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshButtonClick);

        // Add touch event handlers to prevent highlight on mobile
        refreshButton.addEventListener('touchstart', (e) => {
            // Prevent default touch highlight
            e.preventDefault();
        }, { passive: false });

        refreshButton.addEventListener('touchend', (e) => {
            // Prevent default behavior that might cause highlight
            e.preventDefault();
            // Call refresh function
            handleRefreshButtonClick();
            // Remove focus
            refreshButton.blur();
        }, { passive: false });
    }

    // Model toggle button
    if (modelToggleButton) {
        modelToggleButton.addEventListener('click', handleModelToggleButtonClick);

        // Add touch event handlers to prevent highlight on mobile
        modelToggleButton.addEventListener('touchstart', (e) => {
            // Prevent default touch highlight
            e.preventDefault();
        }, { passive: false });

        modelToggleButton.addEventListener('touchend', (e) => {
            // Prevent default behavior that might cause highlight
            e.preventDefault();
            // Call toggle function
            handleModelToggleButtonClick();
            // Remove focus
            modelToggleButton.blur();
        }, { passive: false });
    }

    // Model button in sidebar
    if (modelButton) {
        // Remove any existing event listeners to prevent duplicates
        const newModelButton = modelButton.cloneNode(true);
        modelButton.parentNode.replaceChild(newModelButton, modelButton);

        // Add the event listener to the new button
        newModelButton.addEventListener('click', () => {
            debugLog('Model button clicked');
            // Close the sidebar first
            closeSidebar();
            
            // Also close the options container
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) {
                optionsContainer.classList.add('hidden');
                optionsContainer.classList.remove('animate-fade-in');
            }

            // Then open the Model modal
            showModelModal();
        });
        debugLog('Model button event handler attached during initialization');
    }


    // Settings icon button in header
    if (settingsIconButton) {
        settingsIconButton.addEventListener('click', handleSettingsButtonClick);

        // Add touch event handlers to prevent highlight on mobile
        settingsIconButton.addEventListener('touchstart', (e) => {
            // Prevent default touch highlight
            e.preventDefault();
        }, { passive: false });

        settingsIconButton.addEventListener('touchend', (e) => {
            // Prevent default behavior that might cause highlight
            e.preventDefault();
            // Call settings function
            handleSettingsButtonClick();
            // Remove focus
            settingsIconButton.blur();
        }, { passive: false });
    }

    // Function to hide the send context menu
    const hideSendContextMenu = () => {
        if (sendContextMenu) {
            // Add a fade-out animation class
            sendContextMenu.classList.add('menu-fade-out');

            // After animation completes, hide the menu and remove the animation class
            setTimeout(() => {
                sendContextMenu.style.display = 'none';
                sendContextMenu.classList.remove('menu-fade-out');

                // Remove any active touch classes when hiding menu
                const menuButtons = sendContextMenu.querySelectorAll('button');
                menuButtons.forEach(button => {
                    button.classList.remove('touch-active');
                });
            }, 150); // Match with CSS animation duration

            // Reset the long-press flag
            window.isSendButtonLongPressInProgress = false;
        }
    };

    // New topic menu button in the send context menu
    if (newTopicMenuButton) {
        // Add touch feedback for mobile devices
        newTopicMenuButton.addEventListener('touchstart', () => {
            newTopicMenuButton.classList.add('touch-active');
        }, { passive: true });

        newTopicMenuButton.addEventListener('touchend', () => {
            // The touch-active class will be removed when the menu is hidden
        }, { passive: true });

        newTopicMenuButton.addEventListener('touchcancel', () => {
            newTopicMenuButton.classList.remove('touch-active');
        }, { passive: true });

        newTopicMenuButton.addEventListener('click', () => {
            // Only add a topic boundary if we have messages in the current chat
            if (chatHistoryData[currentChatId]) {
                // Check if chat data is in the new format (object with messages array)
                const messages = Array.isArray(chatHistoryData[currentChatId])
                    ? chatHistoryData[currentChatId]
                    : chatHistoryData[currentChatId].messages;

                // Only add topic boundary if there are messages
                if (messages && messages.length > 0) {
                    addTopicBoundary();
                    debugLog('Added topic boundary');
                } else {
                    debugLog('No messages in chat, topic boundary not added');
                }
            }

            // Always hide the context menu after clicking, even if no action was taken
            hideSendContextMenu();
        });
    }

    // Scroll to bottom menu button in the send context menu
    if (scrollToBottomMenuButton && messagesContainer) {
        // Add touch feedback for mobile devices
        scrollToBottomMenuButton.addEventListener('touchstart', () => {
            scrollToBottomMenuButton.classList.add('touch-active');
        }, { passive: true });

        scrollToBottomMenuButton.addEventListener('touchend', () => {
            // The touch-active class will be removed when the menu is hidden
        }, { passive: true });

        scrollToBottomMenuButton.addEventListener('touchcancel', () => {
            scrollToBottomMenuButton.classList.remove('touch-active');
        }, { passive: true });

        scrollToBottomMenuButton.addEventListener('click', () => {
            debugLog('Scroll to bottom menu button clicked');

            // Use manual scroll function for menu button too
            scrollToBottomManual(messagesContainer);

            // Hide the context menu after clicking
            hideSendContextMenu();
        });
    }

    // Floating scroll to bottom button
    const scrollToBottomButton = document.getElementById('scroll-to-bottom');
    if (scrollToBottomButton && messagesContainer) {
        scrollToBottomButton.addEventListener('click', () => {
            debugLog('Floating scroll to bottom button clicked');
            scrollToBottomManual(messagesContainer);
        });
    }

    // Paperclip button in the input field
    const paperclipButton = document.getElementById('paperclip-button');
    const fileUploadInput = document.getElementById('file-upload-input');
    if (paperclipButton && fileUploadInput) {
        // Click handler for desktop
        paperclipButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            fileUploadInput.click();
            debugLog('Paperclip button clicked, opening file selector');

            // Remove auto-scroll when clicking paperclip button
        });

        // Improved touch event handling for mobile
        paperclipButton.addEventListener('touchstart', (e) => {
            // Add a visual indicator that the button is being pressed
            paperclipButton.classList.add('active');

            // Remove auto-scroll when tapping paperclip button
        }, { passive: true });

        paperclipButton.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default to avoid any conflicts
            e.stopPropagation(); // Prevent event bubbling

            // Remove the active class
            paperclipButton.classList.remove('active');

            // Get the element at the touch position to ensure we're still on the button
            const touch = e.changedTouches[0];
            const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);

            // Only trigger if we're still on the paperclip button or its children
            if (elementAtTouch === paperclipButton || paperclipButton.contains(elementAtTouch)) {
                fileUploadInput.click();
                debugLog('Paperclip button touched, opening file selector');
            }
        }, { passive: false });

        // Handle touch cancel event
        paperclipButton.addEventListener('touchcancel', () => {
            paperclipButton.classList.remove('active');
        }, { passive: true });
    }

    // Send button long-press handling
    if (sendButton) {
        let sendButtonLongPressTimer;
        let longPressTriggered = false; // Flag to track if long-press was triggered

        // Function to show the send context menu
        const showSendContextMenu = (e) => {
            if (sendContextMenu) {
                // Set the flags to indicate long-press was triggered
                longPressTriggered = true;
                window.isSendButtonLongPressInProgress = true;

                // Log for debugging
                debugLog('Send context menu triggered by long press');

                // Position the menu above the send button
                const rect = sendButton.getBoundingClientRect();
                const menuWidth = 180; // Match the width in CSS

                // Calculate position to center the menu above the button
                const left = rect.left + (rect.width / 2) - (menuWidth / 2);
                const top = rect.top - 10; // Add a small gap

                // Ensure the menu stays within the viewport
                const adjustedLeft = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));

                sendContextMenu.style.display = 'block';
                sendContextMenu.style.left = `${adjustedLeft}px`;
                sendContextMenu.style.top = `${top - sendContextMenu.offsetHeight}px`;

                // Prevent default and stop propagation to avoid any conflicts
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Helper function to check if an element is the send button or one of its children
        // Enhanced for touchscreen use with more robust checking
        const isSendButtonOrChild = (element) => {
            if (!element) return false;

            // Direct match
            if (element === sendButton) return true;

            // Check if it's a child or grandchild
            if (element.parentElement === sendButton) return true;
            if (element.parentElement?.parentElement === sendButton) return true;

            // For touchscreens, also check by ID and classes
            if (element.id === 'send-button') return true;

            // Check if it's the icon or text inside the button
            if (element.tagName === 'I' && element.closest('#send-button')) return true;
            if (element.tagName === 'SPAN' && element.closest('#send-button')) return true;

            return false;
        };

        // Function to add visual feedback during long-press
        const addLongPressEffect = () => {
            // Remove any existing animation first to ensure it starts fresh
            sendButton.classList.remove('long-press-active');

            // Force a reflow to restart the animation
            void sendButton.offsetWidth;

            // Add the class to start the animation
            sendButton.classList.add('long-press-active');

            // Ensure the button's overflow is set to hidden to contain the animation
            sendButton.style.overflow = 'hidden';

            // Log for debugging
            debugLog('Added long-press visual effect');
        };

        // Function to remove visual feedback
        const removeLongPressEffect = () => {
            sendButton.classList.remove('long-press-active');
            // Reset the overflow property
            sendButton.style.overflow = '';
            debugLog('Removed long-press visual effect');
        };

        // Handle right-click to show context menu as an alternative to long-press
        document.addEventListener('contextmenu', (e) => {
            // Check if the target is the send button or one of its children
            if (isSendButtonOrChild(e.target)) {
                // If long-press already triggered the menu, just prevent default
                if (longPressTriggered) {
                    e.preventDefault();
                    // Reset the flag
                    longPressTriggered = false;
                    return;
                }

                // Otherwise, show the context menu on right-click as well
                e.preventDefault();
                showSendContextMenu(e);

                // Log for debugging
                debugLog('Send context menu triggered by right-click on ' + e.target.tagName);
            }
        });

        // Touch events optimized for touchscreen devices
        document.addEventListener('touchstart', (e) => {
            // Check if the target is the send button or one of its children
            if (isSendButtonOrChild(e.target)) {
                // Prevent any default behavior that might interfere
                e.preventDefault();

                // Start visual feedback immediately with enhanced effect for touchscreens
                addLongPressEffect();

                // Set the flag to indicate a potential long-press is starting
                window.isSendButtonLongPressInProgress = true;

                // Remove auto-scroll during long press

                // Log for debugging
                debugLog('Send button touchstart - long press detection started on ' + e.target.tagName);

                // Use a longer timer for touchscreens to avoid accidental triggers
                // Increased to 1.3 seconds as requested by the user
                sendButtonLongPressTimer = setTimeout(() => {
                    showSendContextMenu(e);
                    // Add haptic feedback if available (vibration API)
                    if (navigator.vibrate) {
                        navigator.vibrate(50); // Short vibration for feedback
                    }
                }, 1300); // 1.3 seconds (1 additional second from the original 300ms)
            }
        }, { passive: false }); // passive: false is important to allow preventDefault

        document.addEventListener('touchend', (e) => {
            // Check if the context menu is visible and the touch is outside of both the menu and the send button
            if (sendContextMenu && sendContextMenu.style.display === 'block') {
                const touch = e.changedTouches[0];
                const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);

                // Only hide the menu if the touch ended outside both the menu AND the send button
                if (!sendContextMenu.contains(elementAtTouch) && !isSendButtonOrChild(elementAtTouch)) {
                    hideSendContextMenu();
                    debugLog('Send context menu hidden by outside touch');
                    e.preventDefault(); // Prevent any default behavior
                    return;
                }
            }

            // Only handle if the target is the send button or one of its children
            if (isSendButtonOrChild(e.target)) {
                // Get the element at the touch position to ensure we're handling the right element
                const touch = e.changedTouches[0];
                const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);

                // Remove visual feedback
                removeLongPressEffect();

                // Log for debugging
                debugLog('Send button touchend - checking if long press completed');

                // If the menu is already visible, keep it visible and just prevent default
                if (sendContextMenu && sendContextMenu.style.display === 'block') {
                    debugLog('Context menu is visible, keeping it open after send button release');
                    e.preventDefault(); // Prevent default to avoid any conflicts
                    e.stopPropagation(); // Stop propagation to prevent other handlers
                } else {
                    // If this was a short tap (not a long press), submit the form
                    if (isSendButtonOrChild(elementAtTouch) && !longPressTriggered) {
                        debugLog('Send button tapped - submitting form');
                        // Don't prevent default - allow the click event to fire
                        // This will allow the form to be submitted

                        // Check if there's a message or files attached
                        const messageContent = userInput.value.trim();
                        const hasUploadedFiles = getUploadedFiles && getUploadedFiles().length > 0;

                        // Submit the form if there's a message OR files are attached
                        if (messageContent !== '' || hasUploadedFiles) {
                            debugLog(`Submitting form with ${messageContent ? 'message' : 'no message'} and ${hasUploadedFiles ? 'files' : 'no files'}`);
                            // Remove focus from the input field
                            userInput.blur();
                            // Small delay to ensure the click event has time to fire
                            setTimeout(() => {
                                // Create a proper submit event that bubbles and is cancelable
                                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                                chatForm.dispatchEvent(submitEvent);
                            }, 10);
                        }
                    }

                    // Only clear the long-press flag if the menu is not visible
                    setTimeout(() => {
                        // Only reset flags if menu is not visible
                        if (!sendContextMenu || sendContextMenu.style.display !== 'block') {
                            window.isSendButtonLongPressInProgress = false;
                            longPressTriggered = false;
                            debugLog('Long press flag cleared after touchend');
                        }
                    }, 50);
                }

                // Always clear the timer to prevent the menu from appearing after release
                if (sendButtonLongPressTimer) {
                    clearTimeout(sendButtonLongPressTimer);
                    sendButtonLongPressTimer = null;
                }
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            // Only handle if the target is the send button or one of its children
            if (isSendButtonOrChild(e.target)) {
                // Get the element at the current touch position
                const touch = e.changedTouches[0];
                const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);

                // If we've moved away from the send button, cancel the long press
                if (!isSendButtonOrChild(elementAtTouch)) {
                    // Remove visual feedback
                    removeLongPressEffect();

                    if (sendButtonLongPressTimer) {
                        clearTimeout(sendButtonLongPressTimer);
                        sendButtonLongPressTimer = null;
                        debugLog('Long press timer cleared due to touchmove outside button');
                    }

                    // Clear the long-press flag
                    window.isSendButtonLongPressInProgress = false;
                }
            }
        }, { passive: true });

        // Add a direct click handler for the Send button
        // This ensures the button works even if touch events have issues
        sendButton.addEventListener('click', (e) => {
            // If the context menu is visible, prevent the click from submitting the form
            if (sendContextMenu && sendContextMenu.style.display === 'block') {
                debugLog('Send button clicked while context menu is open - preventing form submission');
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Only handle the click if it's not part of a long press
            if (!window.isSendButtonLongPressInProgress) {
                debugLog('Send button clicked - normal click detected');

                // Check if there's a message or files attached
                const messageContent = userInput.value.trim();
                const hasUploadedFiles = getUploadedFiles && getUploadedFiles().length > 0;

                // Only prevent default if we don't want to submit (no message or files)
                if (!messageContent && !hasUploadedFiles) {
                    debugLog('No message or files - not submitting form');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                debugLog(`Click submitting form with ${messageContent ? 'message' : 'no message'} and ${hasUploadedFiles ? 'files' : 'no files'}`);

                // Remove focus from the input field
                userInput.blur();

                // Remove auto-scroll when clicking send button

                // Let the form submit naturally by not preventing default
            }
        });
    }

    // Add global event listener for regenerate buttons
    if (messagesContainer) {
        messagesContainer.addEventListener('click', handleRegenerateButtonClick);
        messagesContainer.addEventListener('click', handleEditButtonClick);
        messagesContainer.addEventListener('click', handleDeleteButtonClick);
        messagesContainer.addEventListener('click', handleTTSButtonClick);
    }

    // Initialize reset app button
    initializeResetAppButton();
    
    // Force re-initialization of reset app button after other components are loaded
    setTimeout(() => {
        initializeResetAppButton();
    }, 500);

    // Initialize scroll event for messages container
    if (messagesContainer) {
        // Add scroll event to detect when user has scrolled up
        messagesContainer.addEventListener('scroll', () => {
            handleScroll(messagesContainer);
        });

        // Force a check of scroll position after a short delay
        setTimeout(() => {
            if (messagesContainer.scrollHeight > messagesContainer.clientHeight) {
                handleScroll(messagesContainer);
            }
        }, 500);
    }

    // Import/Export group button
    if (importExportGroupButton && importExportContainer) {
        // Make sure it starts collapsed
        importExportContainer.classList.add('hidden');
        importExportContainer.classList.remove('animate-fade-in');

        // Add or update the caret icon if it doesn't exist
        let caretIcon = importExportGroupButton.querySelector('.fa-caret-up');
        if (caretIcon) {
            caretIcon.classList.remove('fa-caret-up');
            caretIcon.classList.add('fa-caret-down');
        } else {
            caretIcon = importExportGroupButton.querySelector('.fa-caret-down');
            if (!caretIcon) {
                // If no caret icon exists, add one
                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = '<i class="fas fa-caret-down"></i>';
                importExportGroupButton.appendChild(iconSpan);
            }
        }

        // Remove any existing event listeners to prevent duplicates
        const newImportExportGroupButton = importExportGroupButton.cloneNode(true);
        importExportGroupButton.parentNode.replaceChild(newImportExportGroupButton, importExportGroupButton);

        // Add click event listener to the new button
        document.getElementById('import-export-group-btn').addEventListener('click', toggleImportExportContainer);
    }
}

/**
 * Handles chat form submission
 * @param {Event} e - The form submission event
 */
async function handleChatFormSubmit(e) {
    e.preventDefault();

    // Use a static flag to prevent multiple submissions while processing
    if (handleChatFormSubmit.isSubmitting) {
        return;
    }

    // Set the flag to prevent multiple submissions
    handleChatFormSubmit.isSubmitting = true;

    try {
        const message = userInput.value.trim();

        console.log('=== IMAGE GEN DEBUG ===');
        console.log('Message:', message);

        // Check if this is an image generation command
        const { parseImageCommand } = await import('./image-generation-service.js');
        const { getImageGenEnabled } = await import('./settings-manager.js');
        const imageCommand = parseImageCommand(message);

        console.log('Parsed image command:', imageCommand);
        console.log('Image gen enabled:', getImageGenEnabled());

        if (imageCommand && imageCommand.isImageCommand) {
            console.log('Processing image generation command with prompt:', imageCommand.prompt);

            // Check if image generation is enabled
            if (!getImageGenEnabled()) {
                // Show error message
                appendMessage('error', 'Image generation is disabled. Please enable it in Settings.');
                // Reset the flag before returning
                handleChatFormSubmit.isSubmitting = false;
                return;
            }

            try {
                // Hide welcome message
                hideWelcomeMessage();

                // Show the user's message in chat
                console.log('Appending user message to chat...');
                appendMessage('user', message);

                // Clear the input field immediately after message is sent
                userInput.value = '';
                const singleLineHeight = 52;
                userInput.style.height = singleLineHeight + 'px';
                userInput.style.overflowY = 'hidden';

                // Handle image generation
                console.log('Calling handleImageGeneration...');
                await handleImageGeneration(imageCommand.prompt);
            } catch (error) {
                debugError('Error in image generation:', error);
                appendMessage('error', `Image generation failed: ${error.message}`);
            } finally {
                // Reset the flag after image generation
                handleChatFormSubmit.isSubmitting = false;
            }

            return;
        }

        // Process local files if any
        let fileContents = [];
        const uploadedFiles = getUploadedFiles();

        // Check if we have files but no message
        const hasUploadedFiles = uploadedFiles && uploadedFiles.length > 0;


        // If there's no message and no files, don't do anything
        if (!message && !hasUploadedFiles) {
            return;
        }

        // If we're already generating text, don't start a new generation
        if (isGeneratingText()) {
            debugLog('Text generation already in progress, ignoring new submission');
            return;
        }

        hideWelcomeMessage();

        // Always add the user message to the UI first
        appendMessage('user', message, hasUploadedFiles ? uploadedFiles : null);

        // Trigger native ad check (if on Android)
        if (typeof AndroidAds !== 'undefined' && AndroidAds.onMessageSent) {
            try {
                AndroidAds.onMessageSent();
            } catch (error) {
                console.log('Ad trigger failed:', error);
            }
        }

        // Add the user message to chat history immediately
        // This ensures the message exists in history even if generation is cancelled
        try {
            await addUserMessageToHistory(message, hasUploadedFiles ? uploadedFiles : []);
        } catch (error) {
            debugError('Error adding user message to history:', error);
        }

        // Clear the input field and reset height
        userInput.value = '';
        // Reset to single line height (52px) to match the initialized state
        const singleLineHeight = 52;
        userInput.style.height = singleLineHeight + 'px';
        userInput.style.overflowY = 'hidden';

        // Create a new abort controller for this request
        // Important: ensure any existing controller is aborted and released first
        import('./chat-service.js').then(module => {
            if (typeof module.setAbortController === 'function') {
                // Create a new abort controller for this request
                const controller = new AbortController();
                module.setAbortController(controller);
                
                // Show loading indicator and toggle to stop button
                showLoadingIndicator();
                toggleSendStopButton();
                
                // Process files if any
                processFilesAndGenerateResponse();
            }
        }).catch(error => {
            console.error('Error importing chat-service module:', error);
            // Fall back to basic processing if import fails
            showLoadingIndicator();
            toggleSendStopButton();
            processFilesAndGenerateResponse();
        });
        
        // Define the function to process files and generate response
        async function processFilesAndGenerateResponse() {
            try {
                if (hasUploadedFiles) {
                    debugLog(`Processing ${uploadedFiles.length} uploaded files`);
                    // console.log(`Processing file uploads: ${uploadedFiles.map(f => f.name).join(', ')}`);

                    try {
                        fileContents = await uploadFilesToLMStudio(uploadedFiles);
                        debugLog(`Processed ${fileContents.length} files for LM Studio`);
                        console.log(`File content results: ${fileContents.map(f => `${f.name}: ${f.content ? f.content.length : 0} chars`).join(', ')}`);
                    } catch (error) {
                        console.error("Error processing files:", error);
                        appendMessage('error', `Failed to process files: ${error.message}`);

                        // Make sure to reset UI state in case of error
                        hideLoadingIndicator();
                        toggleSendStopButton();
                        return; // Stop further processing
                    }

                    // Files remain visible in preview until manually removed
                }

                // Generate AI response with the files
                await generateAIResponse(message, fileContents);
            } catch (error) {
                debugError('Error in file processing or AI response generation:', error);
                console.error("Chat submission error:", error);
                appendMessage('error', `An error occurred: ${error.message}`);

                // Make sure to reset UI state in case of error
                hideLoadingIndicator();
                toggleSendStopButton();
            }
        }
    } catch (error) {
        debugError('Error in chat submission:', error);
        console.error("Chat submission error:", error);
        appendMessage('error', `An error occurred: ${error.message}`);

        // Make sure to reset UI state in case of error
        hideLoadingIndicator();
        toggleSendStopButton();
    } finally {
        // Reset the submission flag regardless of success or error
        handleChatFormSubmit.isSubmitting = false;
    }
}

/**
 * Handles settings button click
 */
function handleSettingsButtonClick() {
    // Remove sidebar click handler while modal is open
    document.body.removeEventListener('click', handleSidebarOutsideClick);

    // Close the sidebar regardless of screen size
    closeSidebar();
    
    // Also close the options container
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.classList.add('hidden');
        optionsContainer.classList.remove('animate-fade-in');
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

    // Ensure the welcome message is hidden when settings modal is shown
    if (welcomeMessage && welcomeMessage.style.display !== 'none') {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.visibility = 'hidden';
    }
    
    // Use the centralized settings modal manager
    showSettingsModal();

    // Remove focus to prevent the button from staying highlighted
    if (settingsIconButton) {
        settingsIconButton.blur();
    }
    if (settingsButton) {
        settingsButton.blur();
    }
}

/**
 * Handles close settings button click
 */
function handleCloseSettingsButtonClick() {
    // Check for IP/Port validation errors before closing
    const serverIpInput = document.getElementById('server-ip');
    const serverPortInput = document.getElementById('server-port');
    
    if (serverIpInput && serverPortInput) {
        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();
        
        // If either field has content but not both, prevent closing
        if ((ip && !port) || (!ip && port)) {
            // Trigger validation to show error message
            const changeEvent = new Event('change', { bubbles: true });
            if (ip && !port) {
                serverPortInput.dispatchEvent(changeEvent);
            } else {
                serverIpInput.dispatchEvent(changeEvent);
            }
            return; // Don't close the modal
        }
    }

    // Use IP/Port confirmation modal to intercept changes
    interceptIpPortChanges(() => {
        // This callback will be executed after user confirms or if no changes detected
        
        // Immediately prevent any sidebar interactions
        document.body.removeEventListener('click', handleSidebarOutsideClick);

        // Use the centralized settings modal manager
        hideSettingsModal();

        // Re-attach the sidebar click handler after a short delay
        setTimeout(() => {
            document.addEventListener('click', handleSidebarOutsideClick);
        }, 400); // Slightly longer delay to ensure modal is fully hidden

        // If there are no messages, show the welcome message again
        if (messagesContainer && messagesContainer.children.length === 0) {
            showWelcomeMessage();
        }
    });
}

/**
 * Handles clicking outside the sidebar
 * @param {Event} e - The click event or touch event
 */
function handleSidebarOutsideClick(e) {
    // First check if any modal is currently visible - don't react if a modal is open
    const settingsModalVisible = settingsModal &&
        (!settingsModal.classList.contains('hidden') ||
         settingsModal.style.display === 'flex' ||
         settingsModal.style.visibility === 'visible');

    // Don't toggle sidebar if settings modal is visible
    if (settingsModalVisible) {
        return;
    }

    // Check for other open modals by class
    const otherModalsVisible = document.querySelector('.modal-container:not(.hidden)');
    if (otherModalsVisible) {
        return;
    }

    // Get the actual target element - for touch events, use the element at touch position
    let targetElement = e.target;

    // For touch events, get the element at the touch position
    if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const elementAtTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elementAtTouch) {
            targetElement = elementAtTouch;
        }
    }

    // Only proceed if sidebar exists and is currently active/visible
    if (sidebar &&
        !sidebar.classList.contains('hidden') &&
        (sidebar.classList.contains('active') || window.innerWidth <= 1024) && // Increased to include tablets
        !targetElement.closest('#sidebar') &&
        !targetElement.closest('#sidebar-toggle') &&
        !targetElement.closest('#user-input') &&
        !targetElement.closest('#chat-form') &&
        !targetElement.closest('#messages') &&
        !targetElement.closest('#chat-container') &&
        !targetElement.closest('#model-toggle-button') &&
        !targetElement.closest('#settings-icon-button') &&
        !targetElement.closest('#refresh-button') &&
        !targetElement.closest('.app-title') &&
        !targetElement.closest('header') &&
        !targetElement.closest('#loaded-model')) {


        // Use toggleSidebar (same as X button) for consistent behavior
        toggleSidebar();
    }
}

/**
 * Handles window resize
 */
function handleWindowResize() {
    // Keep sidebar hidden on both mobile and desktop unless explicitly opened
    // This ensures consistent behavior across screen sizes
    if (sidebar && !sidebar.classList.contains('active')) {
        sidebar.classList.add('hidden');
    }

    // Update chat history scrolling behavior when window is resized
    import('./ui-manager.js').then(module => {
        if (typeof module.updateChatHistoryScroll === 'function') {
            module.updateChatHistoryScroll();
        }
    });
}

/**
 * Handles confirmation action button click
 */
function handleConfirmAction() {
    const action = getActionToPerform();

    // Ensure the confirmation modal is visible on top of any other modals
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.style.zIndex = '1060'; // Ensure it's on top
    }

    if (action === 'clearAllChats') {
        // Make sure to hide the confirmation modal before clearing chats
        hideConfirmationModal();
        clearAllChats();
    } else if (action === 'deleteChat') {
        deleteChatHistory(getChatToDelete());
        hideConfirmationModal();
    } else if (action === 'exit') {
        closeApplication();
        hideConfirmationModal();
    } else if (action === 'resetApp') {
        console.log('RESET APP: Confirmation button clicked, executing reset...');
        // Make sure to hide the confirmation modal before resetting the app
        hideConfirmationModal();
        resetApp();
        console.log('RESET APP: Reset function called');
    } else {
        // Default case - just hide the modal
        hideConfirmationModal();
    }
}

/**
 * Handles options button click
 */
function handleOptionsButtonClick() {
    const optionsContainer = document.getElementById('options-container');
    const optionsButton = document.getElementById('options-btn');

    // Log the current state for debugging
    debugLog('Options container state before toggle:', {
        hasHiddenClass: optionsContainer.classList.contains('hidden'),
        hasAnimateClass: optionsContainer.classList.contains('animate-fade-in'),
        display: optionsContainer.style.display,
        visibility: optionsContainer.style.visibility
    });

    if (optionsContainer.classList.contains('animate-fade-in')) {
        // Closing the options container
        optionsContainer.classList.remove('animate-fade-in');
        optionsButton.classList.remove('active');
        // Add a small delay before adding the hidden class
        setTimeout(() => {
            optionsContainer.classList.add('hidden');
            debugLog('Options container hidden');
        }, 300); // Match the transition duration
    } else {
        // Opening the options container
        optionsContainer.classList.remove('hidden');
        optionsButton.classList.add('active');
        // Small delay to ensure the hidden class is fully removed
        setTimeout(() => {
            optionsContainer.classList.add('animate-fade-in');
            debugLog('Options container shown');

            // Ensure all buttons in the options container have their event handlers
            // 1. About button
            const aboutButton = document.getElementById('about-btn');
            if (aboutButton) {
                // Remove any existing event listeners to prevent duplicates
                const newAboutButton = aboutButton.cloneNode(true);
                aboutButton.parentNode.replaceChild(newAboutButton, aboutButton);

                // Add the event listener to the new button
                newAboutButton.addEventListener('click', () => {
                    // Close the sidebar first
                    closeSidebar();
                    
                    // Also close the options container
                    const optionsContainer = document.getElementById('options-container');
                    if (optionsContainer) {
                        optionsContainer.classList.add('hidden');
                        optionsContainer.classList.remove('animate-fade-in');
                        optionsButton.classList.remove('active');
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

                    // Then open the About modal
                    const aboutModal = document.getElementById('about-modal');
                    if (aboutModal) {
                        aboutModal.classList.remove('hidden');
                        const modalContent = aboutModal.querySelector('.modal-content');
                        if (modalContent) {
                            modalContent.classList.add('animate-modal-in');
                            setTimeout(() => {
                                modalContent.classList.remove('animate-modal-in');
                            }, 300);
                        }
                    }
                });
                debugLog('About button event handler reattached');
            }

            // Import/Export group button
            const importExportGroupButton = document.getElementById('import-export-group-btn');
            const importExportContainer = document.getElementById('import-export-container');

            if (importExportGroupButton && importExportContainer) {
                // Remove any existing event listeners to prevent duplicates
                const newImportExportGroupButton = importExportGroupButton.cloneNode(true);
                importExportGroupButton.parentNode.replaceChild(newImportExportGroupButton, importExportGroupButton);

                // Add the event listener to the new button
                newImportExportGroupButton.addEventListener('click', toggleImportExportContainer);
                debugLog('Import/Export group button event handler reattached');
            }

            // 2. Export Chats button
            const exportChatsButton = document.getElementById('export-chats-btn');
            if (exportChatsButton) {
                // Remove any existing event listeners to prevent duplicates
                const newExportChatsButton = exportChatsButton.cloneNode(true);
                exportChatsButton.parentNode.replaceChild(newExportChatsButton, exportChatsButton);

                // Add the event listener to the new button
                newExportChatsButton.addEventListener('click', () => {
                    // Close the sidebar first
                    closeSidebarExport();

                    // Show the export confirmation modal
                    import('./ui-manager.js').then(module => {
                        module.showExportConfirmationModal();

                        // Re-attach event listeners to the export confirmation buttons
                        const confirmExportBtn = document.getElementById('confirm-export');
                        const cancelExportBtn = document.getElementById('cancel-export');

                        if (confirmExportBtn) {
                            // Remove any existing event listeners to prevent duplicates
                            const newConfirmExportBtn = confirmExportBtn.cloneNode(true);
                            confirmExportBtn.parentNode.replaceChild(newConfirmExportBtn, confirmExportBtn);

                            // Add the event listener to the new button
                            newConfirmExportBtn.addEventListener('click', () => {
                                // Hide the confirmation modal
                                module.hideExportConfirmationModal();
                                // Perform the export
                                import('./export-import.js').then(exportModule => {
                                    exportModule.exportChats();
                                });
                            });
                            debugLog('Confirm Export button event handler attached from sidebar handler');
                        }

                        if (cancelExportBtn) {
                            // Remove any existing event listeners to prevent duplicates
                            const newCancelExportBtn = cancelExportBtn.cloneNode(true);
                            cancelExportBtn.parentNode.replaceChild(newCancelExportBtn, cancelExportBtn);

                            // Add the event listener to the new button
                            newCancelExportBtn.addEventListener('click', () => {
                                module.hideExportConfirmationModal();
                            });
                            debugLog('Cancel Export button event handler attached from sidebar handler');
                        }
                    });
                });
                debugLog('Export Chats button event handler reattached');
            }

            // 3. Import Chats button
            const importChatsButton = document.getElementById('import-chats-btn');
            const importChatsInput = document.getElementById('import-chats-input');
            if (importChatsButton && importChatsInput) {
                // Remove any existing event listeners to prevent duplicates
                const newImportChatsButton = importChatsButton.cloneNode(true);
                importChatsButton.parentNode.replaceChild(newImportChatsButton, importChatsButton);

                // Add the event listener to the new button
                newImportChatsButton.addEventListener('click', () => {
                    // Close the sidebar first
                    closeSidebarExport();

                    // Trigger the file input
                    importChatsInput.click();
                });
                debugLog('Import Chats button event handler reattached');
            }

            // 4. Model button
            // Note: Model button handling is done elsewhere
        }, 10);
    }
}

/**
 * Handles copy text button click
 */
function handleCopyText() {
    const selectedText = getSelectedText();
    if (selectedText) {
        copyToClipboard(selectedText)
            .then(() => {
                debugLog('Text copied to clipboard');
                contextMenu.style.display = 'none';
            })
            .catch(err => {
                debugError('Error copying text: ', err);
                contextMenu.style.display = 'none';
                // Could show a toast notification here if needed
            });
    }
}

// Track context menu regenerate clicks
let contextMenuRegenerateClickCount = 0;
let contextMenuRegenerateTimer = null;

/**
 * Handles regenerate text button click
 */
async function handleRegenerateText() {
    const selectedMessageElement = getSelectedMessageElement();
    if (!selectedMessageElement) return;

    // Check if it's an AI message
    if (selectedMessageElement.classList.contains('ai')) {
        // Check if we're already generating text
        if (isGeneratingText()) {
            debugLog('Already generating text, ignoring regeneration request');
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
            return;
        }

        // Increment click counter for context menu regenerate
        contextMenuRegenerateClickCount++;

        // Clear any existing timer
        if (contextMenuRegenerateTimer) {
            clearTimeout(contextMenuRegenerateTimer);
        }

        // Reset click counter after 2 seconds
        contextMenuRegenerateTimer = setTimeout(() => {
            contextMenuRegenerateClickCount = 0;
        }, 2000);

        debugLog(`Context menu regenerate clicked (${contextMenuRegenerateClickCount} times)`);

        // Add a visual indicator that we registered the click
        if (regenerateTextButton) {
            regenerateTextButton.classList.add('clicked');
            setTimeout(() => {
                regenerateTextButton.classList.remove('clicked');
            }, 300);
        }

        // Force focus management - more aggressive approach
        // First, blur any active element
        if (document.activeElement) {
            document.activeElement.blur();
        }

        // Force focus on document body
        document.body.focus();

        // Remove focus from any buttons
        if (regenerateTextButton) {
            regenerateTextButton.blur();
        }

        // Force window focus via a dummy input element
        const dummyInput = document.createElement('input');
        dummyInput.style.position = 'absolute';
        dummyInput.style.opacity = '0';
        dummyInput.style.height = '1px';
        dummyInput.style.width = '1px';
        dummyInput.style.zIndex = '-1000';
        document.body.appendChild(dummyInput);
        dummyInput.focus();
        dummyInput.blur();
        document.body.removeChild(dummyInput);

        // Dispatch a synthetic focus event on window
        try {
            window.dispatchEvent(new Event('focus'));
        } catch (e) {
            debugLog('Error dispatching synthetic focus event:', e);
        }

        debugLog('Applied aggressive focus management for context menu regeneration');

        // Apply browser-specific workarounds
        if ((currentBrowser === 'chrome' && contextMenuRegenerateClickCount >= 2) ||
            (currentBrowser === 'brave-or-edge' && contextMenuRegenerateClickCount >= 3) ||
            contextMenuRegenerateClickCount >= 5) {

            debugLog(`Multiple context menu clicks detected (${contextMenuRegenerateClickCount}), applying ${currentBrowser} specific workarounds`);

            // Force a layout recalculation
            document.body.style.zoom = '0.99999';
            setTimeout(() => {
                document.body.style.zoom = '1';
            }, 5);

            // Force a redraw of the message element
            selectedMessageElement.style.opacity = '0.99';
            void selectedMessageElement.offsetHeight; // Force reflow
            selectedMessageElement.style.opacity = '1';

            // For Chrome/Brave, add additional workarounds
            if (currentBrowser === 'chrome' || currentBrowser === 'brave-or-edge') {
                // Create a temporary overlay to force a repaint
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.01)';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '9999';
                document.body.appendChild(overlay);

                // Remove after a short delay
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 50);

                // Force focus on the window
                window.focus();
            }
        }

        try {
            debugLog('Starting regeneration from contextual menu');

            // Hide the context menu
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }

            // Regenerate the last response using the regenerateLastResponse function
            import('./chat-service.js').then(module => {
                // Longer delay for Chrome/Brave to ensure focus events have been processed
                // Use a variable delay based on click count
                const delay = contextMenuRegenerateClickCount > 3 ? 50 : 20;

                setTimeout(() => {
                    // For Chrome/Brave with multiple clicks, use the retry parameter
                    if ((currentBrowser === 'chrome' || currentBrowser === 'brave-or-edge') && contextMenuRegenerateClickCount > 3) {
                        debugLog('Using retry parameter for context menu regeneration due to multiple clicks');
                        module.regenerateLastResponse(true); // Pass true for isRetry
                    } else {
                        // Double-check we're not already generating before proceeding
                        if (!isGeneratingText()) {
                            module.regenerateLastResponse();
                        } else {
                            debugLog('Generation already started, skipping duplicate call');
                        }
                    }
                }, delay);
            });
        } catch (error) {
            debugError('Error regenerating text:', error);
            appendMessage('error', 'An error occurred while regenerating text: ' + error.message);
        }
    } else if (selectedMessageElement.classList.contains('user')) {
        try {
            // For user messages, we need to regenerate the AI response that came after this message
            debugLog('Regenerating AI response for selected user message');

            // Find the last user message
            const currentMessages = Array.isArray(chatHistoryData[currentChatId]) ?
                chatHistoryData[currentChatId] :
                chatHistoryData[currentChatId].messages;

            // Find the index of this user message
            const selectedContent = selectedMessageElement.querySelector('.message-content').textContent;
            let selectedUserMessageIndex = -1;

            for (let i = 0; i < currentMessages.length; i++) {
                if (currentMessages[i].role === 'user' && currentMessages[i].content.trim() === selectedContent.trim()) {
                    selectedUserMessageIndex = i;
                    break;
                }
            }

            if (selectedUserMessageIndex === -1) {
                debugError('Could not find selected user message in chat history');
                appendMessage('error', 'An error occurred while regenerating response. Could not find the message in history.');
                return;
            }

            const selectedUserMessage = currentMessages[selectedUserMessageIndex];

            // Check if this user message has file attachments
            let fileContents = [];
            if (!Array.isArray(chatHistoryData[currentChatId])) {
                if (selectedUserMessage.files && selectedUserMessage.files.length > 0) {
                    fileContents = selectedUserMessage.files;
                    debugLog(`Found ${fileContents.length} file attachments for message regeneration`);
                }
            }

            // Hide the context menu
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }

            // Regenerate the AI response
            await generateAIResponse(selectedUserMessage.content, fileContents);
        } catch (error) {
            debugError('Error generating response:', error);
            appendMessage('error', 'An error occurred while generating a response: ' + error.message);
        }
    }
}

/**
 * Handles refresh button click
 */
function handleRefreshButtonClick() {
    debugLog('Refresh button clicked');
    // Add visual feedback
    refreshButton.classList.add('animate-spin');
    // Disable the button to prevent multiple clicks
    refreshButton.disabled = true;

    // Remove focus to prevent the button from staying highlighted
    refreshButton.blur();

    // Perform a full page refresh, equivalent to browser refresh
    window.location.reload();
}

/**
 * Handles model toggle button click
 */
function handleModelToggleButtonClick() {
    debugLog('Model toggle button clicked - Opening model modal');

    // Import the model-manager module to show the model modal
    import('./model-manager.js').then(module => {
        module.showModelModal();
    }).catch(error => {
        debugError('Error importing model-manager.js:', error);
    });
}

// Browser detection for applying specific fixes
function detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.indexOf('chrome') > -1) {
        if (userAgent.indexOf('brave') > -1 || userAgent.indexOf('edg') > -1) {
            return 'brave-or-edge';
        }
        return 'chrome';
    } else if (userAgent.indexOf('firefox') > -1) {
        return 'firefox';
    } else if (userAgent.indexOf('safari') > -1) {
        return 'safari';
    }
    return 'unknown';
}

// Get current browser
const currentBrowser = detectBrowser();
debugLog('Detected browser:', currentBrowser);

// Track regenerate button click count for handling browser-specific issues
let regenerateClickCount = 0;
let regenerateClickTimer = null;

/**
 * Handles click on the regenerate button
 * @param {Event} e - The click event
 */
async function handleRegenerateButtonClick(e) {
    // Check if the click is directly on the regenerate button or its icon
    const target = e.target.closest('.regenerate-btn');
    if (!target) return; // Not a regenerate button

    e.stopPropagation(); // Prevent event from bubbling up and triggering sidebar
    e.preventDefault();

    // Check if we're already generating text
    if (isGeneratingText()) {
        debugLog('Already generating text, ignoring regeneration request');
        return;
    }

    // Increment click counter for this button
    regenerateClickCount++;

    // Clear any existing timer
    if (regenerateClickTimer) {
        clearTimeout(regenerateClickTimer);
    }

    // Reset click counter after 2 seconds
    regenerateClickTimer = setTimeout(() => {
        regenerateClickCount = 0;
    }, 2000);

    // Add a data attribute to track clicks on this specific button
    const currentClicks = parseInt(target.dataset.clickCount || '0') + 1;
    target.dataset.clickCount = currentClicks;

    debugLog(`Regenerate button clicked (${regenerateClickCount} times, this button: ${currentClicks} times)`);

    // Add a visual indicator that we registered the click
    target.classList.add('clicked');
    setTimeout(() => {
        target.classList.remove('clicked');
    }, 300);

    // Force focus management - more aggressive approach
    // First, blur any active element
    if (document.activeElement) {
        document.activeElement.blur();
    }

    // Force focus on document body
    document.body.focus();

    // Remove focus from the regenerate button to prevent it staying highlighted
    target.blur();

    // Force window focus via a dummy input element
    const dummyInput = document.createElement('input');
    dummyInput.style.position = 'absolute';
    dummyInput.style.opacity = '0';
    dummyInput.style.height = '1px';
    dummyInput.style.width = '1px';
    dummyInput.style.zIndex = '-1000';
    document.body.appendChild(dummyInput);
    dummyInput.focus();
    dummyInput.blur();
    document.body.removeChild(dummyInput);

    // Dispatch a synthetic focus event on window
    try {
        window.dispatchEvent(new Event('focus'));
    } catch (e) {
        debugLog('Error dispatching synthetic focus event:', e);
    }

    debugLog('Applied aggressive focus management for regeneration');

    // Apply browser-specific workarounds
    if ((currentBrowser === 'chrome' && regenerateClickCount >= 2) ||
        (currentBrowser === 'brave-or-edge' && regenerateClickCount >= 3) ||
        regenerateClickCount >= 5) {

        debugLog(`Multiple clicks detected (${regenerateClickCount}), applying ${currentBrowser} specific workarounds`);

        // Force a layout recalculation
        document.body.style.zoom = '0.99999';
        setTimeout(() => {
            document.body.style.zoom = '1';
        }, 5);

        // Force a redraw of the button
        target.style.display = 'none';
        void target.offsetHeight; // Force reflow
        target.style.display = 'flex';

        // For Chrome/Brave, add additional workarounds
        if (currentBrowser === 'chrome' || currentBrowser === 'brave-or-edge') {
            // Create a temporary overlay to force a repaint
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.01)';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '9999';
            document.body.appendChild(overlay);

            // Remove after a short delay
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 50);

            // Force focus on the window
            window.focus();
        }
    }

    try {
        debugLog('Starting regeneration from regenerate button');

        // Use the regenerateLastResponse function from chat-service
        import('./chat-service.js').then(module => {
            // Longer delay for Chrome/Brave to ensure focus events have been processed
            // Use a variable delay based on click count
            const delay = regenerateClickCount > 3 ? 50 : 20;

            setTimeout(() => {
                // For Chrome/Brave with multiple clicks, use the retry parameter
                if ((currentBrowser === 'chrome' || currentBrowser === 'brave-or-edge') && regenerateClickCount > 3) {
                    debugLog('Using retry parameter for regeneration due to multiple clicks');
                    module.regenerateLastResponse(true); // Pass true for isRetry
                } else {
                    // Double-check we're not already generating before proceeding
                    if (!isGeneratingText()) {
                        module.regenerateLastResponse();
                    } else {
                        debugLog('Generation already started, skipping duplicate call');
                    }
                }
            }, delay);
        });
    } catch (error) {
        debugError('Error during regeneration:', error);
        appendMessage('error', 'An error occurred during regeneration: ' + error.message);
        hideLoadingIndicator();
        toggleSendStopButton();
    }
}

/**
 * Handles click on the edit button for user messages
 * @param {Event} e - The click event
 */
function handleEditButtonClick(e) {
    const target = e.target.closest('.edit-btn');
    if (!target) return; // Not an edit button

    // Find the message content container
    const messageElement = target.closest('.user');
    if (!messageElement) return;

    const contentContainer = messageElement.querySelector('.message-content');
    if (!contentContainer) return;

    // Get the message controls container that contains the edit button
    const controlsContainer = messageElement.querySelector('.message-controls');
    if (!controlsContainer) return;

    // Hide the edit button during editing
    controlsContainer.style.display = 'none';

    // Get the original content
    const originalContent = messageElement.originalContent || contentContainer.textContent;

    // Store the original HTML content to restore if cancelled
    const originalHTML = contentContainer.innerHTML;

    // Store and lock the current width of the message bubble
    // But ensure a minimum width for comfortable editing
    const currentWidth = messageElement.offsetWidth;
    const minEditWidth = 300; // Minimum width needed for buttons and comfortable editing
    const editWidth = Math.max(currentWidth, minEditWidth);

    messageElement.style.width = editWidth + 'px';
    messageElement.style.minWidth = editWidth + 'px';
    messageElement.style.maxWidth = editWidth + 'px';

    // Create textarea with original content that matches the text style
    const textarea = document.createElement('textarea');
    textarea.classList.add('edit-textarea');
    textarea.value = originalContent;
    textarea.style.cssText = `
        width: 100%;
        background: transparent;
        color: inherit;
        border: none;
        outline: none;
        resize: none;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        padding: 0;
        margin: 0;
        overflow: hidden;
        word-wrap: break-word;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        box-sizing: border-box;
    `;

    // Auto-resize textarea to match content
    const autoResize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', autoResize);

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('edit-buttons-container', 'flex', 'gap-2', 'mt-3');

    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.classList.add('edit-cancel-btn', 'bg-gray-600', 'text-white', 'rounded-md', 'px-3', 'py-1.5', 'text-xs', 'hover:bg-gray-700', 'transition-colors');
    cancelButton.textContent = 'Cancel';

    // Create save button
    const saveButton = document.createElement('button');
    saveButton.classList.add('edit-resend-btn', 'bg-red-600', 'text-white', 'rounded-md', 'px-3', 'py-1.5', 'text-xs', 'transition-colors');
    saveButton.textContent = 'Resend';
    saveButton.addEventListener('mouseenter', () => {
        saveButton.style.backgroundColor = '#c0392b';
    });
    saveButton.addEventListener('mouseleave', () => {
        saveButton.style.backgroundColor = '#dc2626';
    });

    // Add buttons to container
    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(saveButton);

    // Replace content with textarea and add buttons
    contentContainer.innerHTML = '';
    contentContainer.appendChild(textarea);
    contentContainer.appendChild(buttonsContainer);

    // Add editing class to message element
    messageElement.classList.add('editing-mode');

    // Set initial height and focus
    autoResize();
    textarea.focus();

    // Cancel button handler
    cancelButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up and triggering sidebar
        // Restore original content
        contentContainer.innerHTML = originalHTML;
        // Remove editing mode class
        messageElement.classList.remove('editing-mode');
        // Restore original width
        messageElement.style.width = '';
        messageElement.style.minWidth = '';
        messageElement.style.maxWidth = '';
        // Show the edit button again
        controlsContainer.style.display = '';
    });

    // Save button handler
    saveButton.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent event from bubbling up and triggering sidebar
        const editedMessage = textarea.value.trim();
        if (!editedMessage) return;

        // Get message index to find where to truncate the conversation
        const messageElements = Array.from(messagesContainer.children);
        const messageIndex = messageElements.indexOf(messageElement);

        if (messageIndex !== -1) {
            // Update the content in the UI
            contentContainer.innerHTML = sanitizeInput(editedMessage);
            messageElement.originalContent = editedMessage;

            // Remove editing mode class
            messageElement.classList.remove('editing-mode');
            // Restore original width
            messageElement.style.width = '';
            messageElement.style.minWidth = '';
            messageElement.style.maxWidth = '';
            // Show the edit button again
            controlsContainer.style.display = '';

            // Remove all subsequent messages (both in UI and chatHistoryData)
            // With chronological order, we need to remove all messages after the selected message
            // First, find all messages that come after the current one
            const messagesToRemove = [];
            const allMessages = Array.from(messagesContainer.children);
            for (let i = messageIndex + 1; i < allMessages.length; i++) {
                messagesToRemove.push(allMessages[i]);
            }

            // Then remove them from the DOM
            messagesToRemove.forEach(msg => messagesContainer.removeChild(msg));

            try {
                // Find the index of the original user message in chat history
                const chatData = chatHistoryData[currentChatId];
                if (!chatData) {
                    debugError('No chat data found for current chat ID');
                    appendMessage('error', 'An error occurred while processing your edited message. Chat data not found.');
                    return;
                }

                // Get the messages array (handle both old and new format)
                const messages = Array.isArray(chatData) ? chatData : chatData.messages;
                if (!messages || messages.length === 0) {
                    debugError('No messages found in chat history');
                    appendMessage('error', 'An error occurred while processing your edited message. No message history found.');
                    return;
                }

                const currentChat = [...messages];

                // Count user messages in the UI up to the edited message
                const userMessagesBeforeEdit = Array.from(messagesContainer.children)
                    .slice(0, messageIndex + 1)
                    .filter(el => el.classList.contains('user')).length;

                // Find all user message indices in the chat history
                const userMessageIndices = currentChat
                    .map((msg, index) => msg.role === 'user' ? index : -1)
                    .filter(index => index !== -1);

                // Get the nth user message (where n is userMessagesBeforeEdit)
                const userMessageIndex = userMessageIndices[userMessagesBeforeEdit - 1];

                if (userMessageIndex !== undefined) {
                    // Update the user message content directly in the current chat
                    if (Array.isArray(chatData)) {
                        // Old format
                        chatHistoryData[currentChatId][userMessageIndex].content = editedMessage;
                        // Keep only chat history up to this user message
                        chatHistoryData[currentChatId] = chatHistoryData[currentChatId].slice(0, userMessageIndex + 1);
                    } else {
                        // New format
                        chatHistoryData[currentChatId].messages[userMessageIndex].content = editedMessage;
                        // Keep only chat history up to this user message
                        chatHistoryData[currentChatId].messages = chatHistoryData[currentChatId].messages.slice(0, userMessageIndex + 1);
                    }

                    // Save the updated chat history
                    saveChatHistory();

                    // Generate new response with edited message
                    showLoadingIndicator();
                    toggleSendStopButton();

                    abortController = new AbortController();
                    setAbortController(abortController);

                    // Check if this is an image generation command
                    const { parseImageCommand } = await import('./image-generation-service.js');
                    const imageCommand = parseImageCommand(editedMessage);

                    if (imageCommand && imageCommand.isImageCommand) {
                        // This is an image generation command - handle it specially
                        console.log('Edited message is an image command');

                        // Hide loading and reset button
                        hideLoadingIndicator();
                        toggleSendStopButton();

                        // Handle image generation
                        await handleImageGeneration(imageCommand.prompt);

                        // Update chat history UI
                        updateChatHistoryUI();
                    } else {
                        // Regular message - generate AI response
                        // Check if the user message has any file attachments
                        let fileContents = [];
                        if (!Array.isArray(chatData)) {
                            const userMessage = chatData.messages[userMessageIndex];
                            if (userMessage && userMessage.files && userMessage.files.length > 0) {
                                fileContents = userMessage.files;
                                debugLog(`Preserving ${fileContents.length} file attachments when regenerating edited message`);
                            }
                        }

                        // Generate AI response to the edited message with any file attachments
                        await generateAIResponse(editedMessage, fileContents);

                        // Update chat history UI
                        updateChatHistoryUI();
                    }
                } else {
                    debugError('Could not find corresponding user message in chat history');
                    appendMessage('error', 'An error occurred while processing your edited message. Could not find the message in history.');
                }
            } catch (error) {
                debugError('Error generating response:', error);
                appendMessage('error', 'An error occurred while generating a response to your edited message: ' + (error.message || 'Unknown error'));
                hideLoadingIndicator();
                toggleSendStopButton();

                // Restore the chat history to its previous state if possible
                try {
                    loadChatHistory();
                    updateChatHistoryUI();
                } catch (restoreError) {
                    debugError('Failed to restore chat history:', restoreError);
                }
            } finally {
                abortController = null;
            }
        }
    });
}

/**
 * Handles click on the delete button for user messages
 * @param {Event} e - The click event
 */
function handleDeleteButtonClick(e) {
    const target = e.target.closest('.delete-btn');
    if (!target) return; // Not a delete button

    // Find the message element
    const messageElement = target.closest('.user');
    if (!messageElement) return;

    // Get message index
    const messageElements = Array.from(messagesContainer.children);
    const messageIndex = messageElements.indexOf(messageElement);

    if (messageIndex === -1) return;

    // Show confirmation modal
    const deleteModal = document.getElementById('delete-message-modal');
    const confirmBtn = document.getElementById('confirm-delete-message');
    const cancelBtn = document.getElementById('cancel-delete-message');

    if (!deleteModal || !confirmBtn || !cancelBtn) return;

    // Show the modal
    deleteModal.classList.remove('hidden');
    deleteModal.classList.add('flex');

    // Handle confirmation
    const handleConfirm = () => {
        // Hide modal
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');

        // Clean up listeners
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);

        deleteMessage(messageElement, messageElements, messageIndex);
    };

    // Handle cancellation
    const handleCancel = () => {
        // Hide modal
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');

        // Clean up listeners
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    // Add event listeners
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

/**
 * Deletes a user message and all subsequent messages
 * @param {HTMLElement} messageElement - The message element to delete
 * @param {Array} messageElements - All message elements
 * @param {number} messageIndex - Index of the message to delete
 */
function deleteMessage(messageElement, messageElements, messageIndex) {
    try {
        // Remove only the message element from DOM
        messageElement.remove();

        // Update chat history in storage
        if (currentChatId && chatHistoryData[currentChatId]) {
            const chatData = chatHistoryData[currentChatId];
            const messages = Array.isArray(chatData) ? chatData : chatData.messages;

            if (messages && messages.length > 0) {
                // Count user messages in UI up to the deleted message
                const userMessagesBeforeDelete = messageElements
                    .slice(0, messageIndex + 1)
                    .filter(el => el.classList.contains('user')).length;

                // Find the user message index in chat history
                const userMessageIndices = messages
                    .map((msg, index) => msg.role === 'user' ? index : -1)
                    .filter(index => index !== -1);

                const userMessageIndex = userMessageIndices[userMessagesBeforeDelete - 1];

                if (userMessageIndex !== undefined) {
                    // Remove only this specific message from chat history
                    if (Array.isArray(chatData)) {
                        chatHistoryData[currentChatId].splice(userMessageIndex, 1);
                    } else {
                        chatData.messages.splice(userMessageIndex, 1);
                    }

                    // Save to storage
                    saveChatHistory();
                    updateChatHistoryUI();
                }
            }
        }
    } catch (error) {
        debugError('Failed to delete message:', error);
        appendMessage('error', 'An error occurred while deleting the message.');
    }
}

/**
 * Handles TTS (text-to-speech) button clicks
 */
async function handleTTSButtonClick(e) {
    const target = e.target.closest('.tts-btn');
    if (!target) return; // Not a TTS button

    e.stopPropagation();
    e.preventDefault();

    // Import TTS functions
    const { getTTSEnabled } = await import('./settings-manager.js');

    // Check if TTS is enabled
    if (!getTTSEnabled()) {
        debugLog('TTS is disabled, ignoring click');
        return;
    }

    // Find the message element
    const messageElement = target.closest('.ai');
    if (!messageElement) return;

    // Get the message text
    const messageContentElement = messageElement.querySelector('.message-content');
    if (!messageContentElement) return;

    // Extract text content, excluding thinking sections
    let textToSpeak = '';
    const visibleAfterThinkElement = messageContentElement.querySelector('.visible-after-think');

    if (visibleAfterThinkElement && visibleAfterThinkElement.textContent.trim()) {
        textToSpeak = visibleAfterThinkElement.textContent.trim();
    } else {
        // Get text from message content, excluding thinking indicators
        const clonedContent = messageContentElement.cloneNode(true);
        const thinkingIndicator = clonedContent.querySelector('.thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
        textToSpeak = clonedContent.textContent.trim();
    }

    // If we still have no text, try from originalContent
    if (!textToSpeak && messageElement.originalContent) {
        const originalContent = messageElement.originalContent;
        // Remove thinking tags
        textToSpeak = originalContent
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/g, '')
            .trim();
    }

    if (!textToSpeak) {
        debugLog('No text to speak');
        target.innerHTML = '<i class="fas fa-times"></i>';
        target.title = 'No text';
        setTimeout(() => {
            target.innerHTML = '<i class="fas fa-volume-up"></i>';
            target.title = 'Listen to this message';
        }, 1500);
        return;
    }

    // Store original button state
    const originalHTML = target.innerHTML;
    const wasPlaying = target.dataset.isPlaying === 'true';

    // If already playing, stop
    if (wasPlaying && target.dataset.audioElement) {
        const audioElement = window[target.dataset.audioElement];
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            delete window[target.dataset.audioElement];
        }
        target.dataset.isPlaying = 'false';
        target.innerHTML = '<i class="fas fa-volume-up"></i>';
        target.title = 'Listen to this message';
        // Reset button styling
        target.style.color = '';
        target.style.backgroundColor = '';
        target.style.borderColor = '';
        return;
    }

    try {
        // Show loading state with clear visual feedback
        target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        target.title = 'Generating audio...';
        target.disabled = true;
        // Add visual indicator that it's processing
        target.style.opacity = '0.8';
        target.style.cursor = 'wait';

        // Import TTS API functions
        const { synthesizeSpeech } = await import('./api-service.js');
        const { getTTSVoice, getLightThemeEnabled } = await import('./settings-manager.js');

        // Get voice preference and theme
        const voice = getTTSVoice();
        const isLightTheme = getLightThemeEnabled();

        // Synthesize speech
        const audioBlob = await synthesizeSpeech(textToSpeak, voice);

        // Create audio element
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Store reference to audio element
        const audioRefName = `tts_audio_${target.dataset.messageId}`;
        window[audioRefName] = audio;
        target.dataset.audioElement = audioRefName;
        target.dataset.isPlaying = 'true';

        // Reset opacity and cursor
        target.style.opacity = '';
        target.style.cursor = '';

        // Update button to show playing state with theme-aware styling
        // In dark mode, use white stop icon for better visibility
        if (isLightTheme) {
            target.innerHTML = '<i class="fas fa-stop"></i>';
            target.title = 'Stop audio';
            target.style.color = '#ef4444'; // Red color for stop in light theme
        } else {
            target.innerHTML = '<i class="fas fa-stop"></i>';
            target.title = 'Stop audio';
            target.style.color = '#ffffff'; // White color for stop in dark theme
            target.style.backgroundColor = '#ef4444'; // Red background in dark mode
            target.style.borderColor = '#ef4444';
        }
        target.disabled = false;

        // Handle audio end
        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
            delete window[audioRefName];
            target.dataset.isPlaying = 'false';
            target.innerHTML = '<i class="fas fa-volume-up"></i>';
            target.title = 'Listen to this message';
            // Reset button styling
            target.style.color = '';
            target.style.backgroundColor = '';
            target.style.borderColor = '';
        });

        // Handle audio error
        audio.addEventListener('error', (err) => {
            debugError('Audio playback error:', err);
            URL.revokeObjectURL(audioUrl);
            delete window[audioRefName];
            target.dataset.isPlaying = 'false';
            target.innerHTML = '<i class="fas fa-times"></i>';
            target.title = 'Audio error';
            target.disabled = false;
            // Reset button styling
            target.style.color = '';
            target.style.backgroundColor = '';
            target.style.borderColor = '';
            target.style.opacity = '';
            target.style.cursor = '';
            setTimeout(() => {
                target.innerHTML = originalHTML;
                target.title = 'Listen to this message';
            }, 2000);
        });

        // Play audio
        await audio.play();

    } catch (error) {
        debugError('TTS error:', error);
        target.innerHTML = '<i class="fas fa-times"></i>';
        target.title = 'Failed to generate audio';
        target.disabled = false;
        // Reset button styling
        target.style.opacity = '';
        target.style.cursor = '';
        target.style.color = '';
        target.style.backgroundColor = '';
        target.style.borderColor = '';
        setTimeout(() => {
            target.innerHTML = originalHTML;
            target.title = 'Listen to this message';
        }, 2000);
    }
}

/**
 * Toggles the visibility of the import/export container
 */
function toggleImportExportContainer() {
    if (importExportContainer) {
        // Toggle visibility with smooth animation
        if (importExportContainer.classList.contains('hidden')) {
            // Show the container with smooth animation
            importExportContainer.classList.remove('hidden');
            // Use a small delay to ensure the transition works properly
            setTimeout(() => {
                importExportContainer.classList.add('animate-fade-in');
            }, 10);

            // Change the caret icon to up with animation
            const caretIcon = importExportGroupButton.querySelector('.fa-caret-down');
            if (caretIcon) {
                caretIcon.classList.add('fa-caret-up');
                caretIcon.classList.remove('fa-caret-down');
            }
        } else {
            // Hide the container with smooth animation
            importExportContainer.classList.remove('animate-fade-in');

            // Wait for animation to complete before hiding
            setTimeout(() => {
                importExportContainer.classList.add('hidden');
            }, 300);

            // Change the caret icon back to down with animation
            const caretIcon = importExportGroupButton.querySelector('.fa-caret-up');
            if (caretIcon) {
                caretIcon.classList.remove('fa-caret-up');
                caretIcon.classList.add('fa-caret-down');
            }
        }
    }
}

/**
 * Handles new chat button click
 */
function handleNewChatButtonClick() {
    debugLog('New chat button clicked');

    // Show interstitial ad (if on Android)
    if (typeof AndroidAds !== 'undefined' && AndroidAds.showInterstitial) {
        try {
            AndroidAds.showInterstitial();
        } catch (error) {
            console.log('Interstitial ad trigger failed:', error);
        }
    }

    // Close the sidebar first
    closeSidebar();

    // Also close the options container
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.classList.add('hidden');
        optionsContainer.classList.remove('animate-fade-in');
    }

    // Create a new chat
    createNewChat();

    // Remove focus to prevent the button from staying highlighted
    if (newChatHeaderButton) {
        newChatHeaderButton.blur();
    }
}

/**
 * Handles image generation from a text prompt
 * @param {string} prompt - The text prompt for image generation
 */
async function handleImageGeneration(prompt) {
    console.log('handleImageGeneration called with prompt:', prompt);

    try {
        console.log('Hiding welcome message...');
        hideWelcomeMessage();

        // Disable input field and send button during image generation
        const sendButton = document.getElementById('send-button');
        if (userInput) {
            userInput.disabled = true;
            userInput.style.opacity = '0.5';
            userInput.style.cursor = 'not-allowed';
        }
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'not-allowed';
        }

        // Check for inappropriate content in the prompt
        const inappropriateKeywords = [
            'nude', 'naked', 'nsfw', 'sex', 'sexual', 'porn', 'pornographic', 'xxx',
            'erotic', 'explicit', 'adult', 'topless', 'underwear', 'lingerie',
            'provocative', 'seductive', 'intimate', 'sensual', 'arousing'
        ];

        const lowerPrompt = prompt.toLowerCase();
        const containsInappropriate = inappropriateKeywords.some(keyword =>
            lowerPrompt.includes(keyword)
        );

        if (containsInappropriate) {
            console.log('Inappropriate content detected in prompt');
            appendMessage('error', '⚠️ Unable to generate this image. Please try generating something else. Keep prompts appropriate and family-friendly.');
            return;
        }

        // Don't append user message here - it's already shown in the chat from handleChatFormSubmit

        // Show loading indicator for image generation
        const loadingMessageId = `image-loading-${Date.now()}`;
        console.log('Creating loading message with ID:', loadingMessageId);

        // Create loading message element directly
        const loadingMessageElement = document.createElement('div');
        loadingMessageElement.id = loadingMessageId;
        loadingMessageElement.classList.add('ai', 'animate-fade-in', 'mb-4', 'p-4', 'rounded-lg');

        const loadingContent = document.createElement('div');
        loadingContent.classList.add('message-content', 'flex', 'items-center', 'gap-2', 'text-gray-400');
        loadingContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating image...</span>';

        loadingMessageElement.appendChild(loadingContent);

        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.appendChild(loadingMessageElement);
            console.log('Loading message appended');
        }

        // Generate the image
        console.log('Importing generateImage function...');
        const { generateImage } = await import('./image-generation-service.js');
        console.log('Calling generateImage...');
        const imageUrls = await generateImage(prompt);
        console.log('Image URLs received:', imageUrls);

        // Remove loading message
        const loadingElement = document.getElementById(loadingMessageId);
        if (loadingElement) {
            console.log('Removing loading message...');
            loadingElement.remove();
        } else {
            console.log('Loading element not found:', loadingMessageId);
        }

        // Add the generated image to the chat (use blob URL for display)
        console.log('Appending generated image...');
        appendGeneratedImage(imageUrls.blobUrl, imageUrls.pollinationsUrl, prompt);

        // Save to chat history with the Pollinations URL (not blob URL)
        console.log('Saving image to chat history...');
        const { getChatHistoryData, getCurrentChatId, saveChatHistory } = await import('./chat-service.js');
        const chatHistoryData = getChatHistoryData();
        const currentChatId = getCurrentChatId();

        // Initialize chat data structure if it doesn't exist
        if (!chatHistoryData[currentChatId]) {
            console.log('Initializing chat history data for current chat');
            chatHistoryData[currentChatId] = {
                messages: [],
                title: null
            };
        }

        // If the chat data is still in the old format (just an array), convert it
        if (Array.isArray(chatHistoryData[currentChatId])) {
            const oldMessages = chatHistoryData[currentChatId];
            const oldTitle = oldMessages.title ? oldMessages.title : null;
            chatHistoryData[currentChatId] = {
                messages: oldMessages,
                title: oldTitle
            };
        }

        // Add the image message
        chatHistoryData[currentChatId].messages.push({
            role: 'assistant',
            content: `[IMAGE:${imageUrls.pollinationsUrl}]`
        });

        // Set title to "Image Generated" if this is the first message in the chat
        if (chatHistoryData[currentChatId].messages.length === 2) { // User message + AI image = 2
            chatHistoryData[currentChatId].title = 'Image Generated';
            console.log('Set chat title to "Image Generated"');
        }

        saveChatHistory();
        console.log('Image saved to chat history');

        // Update chat history UI
        const { updateChatHistoryUI } = await import('./chat-service.js');
        updateChatHistoryUI();

        // Scroll to bottom
        scrollToBottom();

        console.log('Image generated successfully:', imageUrls);
    } catch (error) {
        console.error('Error generating image:', error);
        appendMessage('error', `Failed to generate image: ${error.message}`);
    } finally {
        // Re-enable input field and send button after image generation completes or fails
        const sendButton = document.getElementById('send-button');
        if (userInput) {
            userInput.disabled = false;
            userInput.style.opacity = '';
            userInput.style.cursor = '';
        }
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.style.opacity = '';
            sendButton.style.cursor = '';
        }
    }
}

/**
 * Appends a generated image to the chat with preview and actions
 * @param {string} displayUrl - The URL for displaying the image (blob URL)
 * @param {string} pollinationsUrl - The original Pollinations URL for downloading/saving
 * @param {string} prompt - The original prompt used to generate the image
 */
function appendGeneratedImage(displayUrl, pollinationsUrl, prompt) {
    console.log('appendGeneratedImage called');
    console.log('Display URL:', displayUrl);
    console.log('Pollinations URL:', pollinationsUrl);
    console.log('Prompt:', prompt);

    // Create the message element directly to avoid HTML sanitization
    const messageElement = document.createElement('div');
    messageElement.classList.add('ai', 'animate-fade-in', 'mb-4', 'p-4', 'rounded-lg');

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('message-content');

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('generated-image-container', 'mb-4');

    // Create image element (use blob URL for immediate display)
    const img = document.createElement('img');
    img.src = displayUrl;
    img.alt = `Generated: ${prompt}`;
    img.className = 'generated-image-preview rounded-lg cursor-pointer shadow-lg max-w-full';
    img.style.cssText = 'max-width: 400px; max-height: 400px; object-fit: contain;';
    // Use Pollinations URL for modal viewing (so it persists)
    img.onclick = () => openImageModal(pollinationsUrl, prompt);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-2 mt-2';

    // Create download button (use Pollinations URL for download)
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'image-action-btn flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all';
    downloadBtn.style.cssText = 'background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid rgba(75, 85, 99, 0.3);';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>Save Image';
    downloadBtn.onclick = () => downloadGeneratedImage(pollinationsUrl, prompt);

    // Assemble the elements
    buttonContainer.appendChild(downloadBtn);
    imageContainer.appendChild(img);
    imageContainer.appendChild(buttonContainer);
    contentContainer.appendChild(imageContainer);
    messageElement.appendChild(contentContainer);

    // Append to messages container
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.appendChild(messageElement);
        console.log('Image message appended to DOM successfully');
    } else {
        console.error('Messages container not found!');
    }
}

/**
 * Opens the image in a modal for full-size viewing
 * @param {string} imageUrl - The URL of the image to display
 * @param {string} prompt - The prompt used to generate the image
 */
window.openImageModal = function(imageUrl, prompt) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center hidden';
        modal.style.cssText = 'cursor: pointer; z-index: 99999; position: fixed; top: 0; left: 0; right: 0; bottom: 0;';
        modal.innerHTML = `
            <div class="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center" style="z-index: 100000;">
                <img id="modal-image" src="" alt="" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl">
                <div class="mt-4 flex gap-3">
                    <button id="modal-download-btn"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all"
                            style="background: linear-gradient(to right, #2563eb, #1d4ed8); border: 1px solid #1d4ed8;">
                        <i class="fas fa-download"></i>Download
                    </button>
                    <button id="modal-close-btn"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                            style="background: rgba(55, 65, 81, 0.8); color: white; border: 1px solid rgba(75, 85, 99, 0.6);">
                        <i class="fas fa-times"></i>Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal when clicking on background
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Close button
        const closeBtn = document.getElementById('modal-close-btn');
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.classList.add('hidden');
        });

        // Download button
        const downloadBtn = document.getElementById('modal-download-btn');
        downloadBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const img = document.getElementById('modal-image');
            const prompt = img.getAttribute('data-prompt');
            await downloadGeneratedImage(img.src, prompt);
        });
    }

    // Set the image and show modal
    const modalImage = document.getElementById('modal-image');
    modalImage.src = imageUrl;
    modalImage.alt = `Generated: ${prompt}`;
    modalImage.setAttribute('data-prompt', prompt);
    modal.classList.remove('hidden');
};

/**
 * Downloads a generated image
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} prompt - The prompt used to generate the image
 */
window.downloadGeneratedImage = async function(imageUrl, prompt) {
    try {
        const { downloadImage } = await import('./image-generation-service.js');

        // Create a filename from the prompt (sanitize it)
        const sanitizedPrompt = prompt
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50);

        const filename = `image-${sanitizedPrompt}-${Date.now()}.jpg`;

        await downloadImage(imageUrl, filename);

        debugLog('Image downloaded:', filename);
    } catch (error) {
        debugError('Error downloading image:', error);
        alert('Failed to download image. Please try again.');
    }
};