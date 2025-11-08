// Settings Modal Manager
// This module centralizes all settings modal functionality

import { settingsModal } from './dom-elements.js';
import { debugLog } from './utils.js';
import { checkAndShowWelcomeMessage } from './ui-manager.js';



/**
 * Shows the settings modal
 */
export async function showSettingsModal() {
    if (!settingsModal) return;

    debugLog('Opening settings modal');

    // Initialize TTS voice selection
    import('./settings-manager.js').then(module => {
        module.initializeTTSVoiceSelection().catch(error => {
            console.error('Error initializing TTS voice selection:', error);
        });
    });

    // Blur any active element to prevent keyboard from showing
    if (document.activeElement) {
        document.activeElement.blur();
    }

    // Add modal-open class to html and body to help with touch handling
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    // Reset the modal state to ensure it opens correctly
    resetModalState();

    // Initialize step indicators for the first step
    updateStepIndicators('connection');

    // Ensure any previous hide animation is canceled
    settingsModal.classList.remove('hide');

    // Remove hidden class first to start the transition
    settingsModal.classList.remove('hidden');

    // Prevent scrolling of the body
    document.body.style.overflow = 'hidden';

    // Ensure IP/Port containers are visible when modal is opened
    const connectionLabelContainer = document.querySelector('#settings-step-connection label.block.text-sm.font-medium');
    const urlInfoContainer = document.querySelector('#settings-step-connection p.text-xs.text-gray-300.mt-1');

    if (connectionLabelContainer) connectionLabelContainer.style.display = '';
    if (urlInfoContainer) urlInfoContainer.style.display = '';

    // Get both modal container and content and ensure styles don't conflict
    const modalContent = settingsModal.querySelector('.modal-content');
    
    // Clean up any inline styles on the modal container itself
    ['position', 'top', 'left', 'right', 'bottom', 'transform', 'width', 'height', 'margin', 'display', 'align-items', 'justify-content'].forEach(prop => {
        settingsModal.style.removeProperty(prop);
    });
    
    if (modalContent) {
        // Remove any inline styles that might be overriding our CSS
        ['background-color', 'position', 'z-index', 'opacity', 'transform', 'transition', 
         'width', 'max-width', 'height', 'max-height', 'top', 'left', 'right', 'bottom', 'margin'].forEach(prop => {
            modalContent.style.removeProperty(prop);
        });
        
        // Remove any mobile-specific classes that might conflict
        modalContent.classList.remove('mobile-modal');
    }



    // Add show class for animation
    settingsModal.classList.add('show');

    // Always use mobile/tablet stepped navigation for all device types
    {
            // Mobile/tablet view - show first step and its navigation buttons
            const connectionStep = document.getElementById('settings-step-connection');
            if (connectionStep) {
                connectionStep.classList.remove('hidden');
                connectionStep.classList.add('active');
            }

            // Make sure all other steps are hidden
            const promptStep = document.getElementById('settings-step-prompt');
            const optionsStep = document.getElementById('settings-step-options');
            const actionsStep = document.getElementById('settings-step-actions');

            [promptStep, optionsStep, actionsStep].forEach(step => {
                if (step) {
                    step.classList.add('hidden');
                    step.classList.remove('active', 'slide-in-right', 'slide-in-left');
                }
            });

            // Show connection step buttons
            const connectionButtons = document.getElementById('connection-step-buttons');
            const promptButtons = document.getElementById('prompt-step-buttons');
            const optionsButtons = document.getElementById('options-step-buttons');
            const actionsButtons = document.getElementById('actions-step-buttons');

            // Hide all button containers first
            [promptButtons, optionsButtons, actionsButtons].forEach(container => {
                if (container) {
                    container.classList.add('hidden');
                }
            });

        // Show connection buttons
        if (connectionButtons) {
            connectionButtons.classList.remove('hidden');
        }
    }
}

/**
 * Hides the settings modal
 */
export function hideSettingsModal() {
    if (!settingsModal) return;

    debugLog('Closing settings modal');

    // Get the modal content for animation
    const modalContent = settingsModal.querySelector('.modal-content');

    // Add hide class for animation
    settingsModal.classList.remove('show');
    settingsModal.classList.add('hide');

    // Remove modal-open class from html and body
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');

    // Re-enable scrolling
    document.body.style.overflow = 'auto';

    // Ensure IP/Port containers are visible when modal is closed
    const connectionLabelContainer = document.querySelector('#settings-step-connection label.block.text-sm.font-medium');
    const urlInfoContainer = document.querySelector('#settings-step-connection p.text-xs.text-gray-300.mt-1');

    if (connectionLabelContainer) connectionLabelContainer.style.display = '';
    if (urlInfoContainer) urlInfoContainer.style.display = '';

    // After animation completes, hide the modal
    setTimeout(() => {
        settingsModal.classList.add('hidden');

        // Reset the modal state for next opening
        resetModalState();

        // Reset any inline styles that might have been added
        if (modalContent) {
            ['opacity', 'transform', 'transition', 'position', 'top', 'left', 'right', 'bottom', 'width', 'max-width', 'height', 'max-height', 'margin'].forEach(prop => {
                modalContent.style.removeProperty(prop);
            });
            modalContent.classList.remove('mobile-modal');
        }
        
        // Also clean the modal container
        ['position', 'top', 'left', 'right', 'bottom', 'transform', 'width', 'height', 'margin', 'display', 'align-items', 'justify-content'].forEach(prop => {
            settingsModal.style.removeProperty(prop);
        });

        // Check if welcome message should be shown
        checkAndShowWelcomeMessage();
    }, 400);
}

/**
 * Updates the step indicators in the settings modal
 * @param {string} currentStep - The current active step ('connection', 'prompt', 'options', or 'actions')
 */
export function updateStepIndicators(currentStep) {
    // Get all step indicators
    const stepIndicators = {
        connection: document.getElementById('step-indicator-1'),
        prompt: document.getElementById('step-indicator-2'),
        options: document.getElementById('step-indicator-3'),
        actions: document.getElementById('step-indicator-4')
    };

    // Reset all indicators to gray
    Object.values(stepIndicators).forEach(indicator => {
        if (indicator) {
            indicator.classList.remove('bg-blue-500');
            indicator.classList.add('bg-gray-600');
        }
    });

    // Set the current step indicator to blue
    if (stepIndicators[currentStep]) {
        stepIndicators[currentStep].classList.remove('bg-gray-600');
        stepIndicators[currentStep].classList.add('bg-blue-500');
    }
}

/**
 * Initializes the settings modal navigation for mobile/tablet and desktop
 */
export function initializeSettingsModalNavigation() {
    // Get all step navigation buttons
    const toPromptBtn = document.getElementById('to-prompt-step-btn');
    const backToConnectionBtn = document.getElementById('back-to-connection-btn');
    const toOptionsBtn = document.getElementById('to-options-step-btn');
    const backToPromptBtn = document.getElementById('back-to-prompt-btn');
    const toActionsBtn = document.getElementById('to-actions-step-btn');
    const backToOptionsBtn = document.getElementById('back-to-options-btn');

    // Get all steps
    const steps = {
        connection: document.getElementById('settings-step-connection'),
        prompt: document.getElementById('settings-step-prompt'),
        options: document.getElementById('settings-step-options'),
        actions: document.getElementById('settings-step-actions')
    };

    // We'll handle desktop view directly in the steps

    // Function to show a specific step
    function showStep(stepName, direction = null) {
        // Get current active step
        const currentActiveStep = document.querySelector('.settings-step.active');
        const currentStepName = currentActiveStep ? currentActiveStep.getAttribute('data-step-name').toLowerCase() : '';

        // If navigating away from connection step, ensure IP/Port containers are visible
        if (currentStepName === 'connection' && stepName !== 'connection') {
            const connectionLabelContainer = document.querySelector('#settings-step-connection label.block.text-sm.font-medium');
            const urlInfoContainer = document.querySelector('#settings-step-connection p.text-xs.text-gray-300.mt-1');

            if (connectionLabelContainer) connectionLabelContainer.style.display = '';
            if (urlInfoContainer) urlInfoContainer.style.display = '';
        }

        // Always use stepped navigation regardless of screen size
        // Removed desktop-specific logic that showed all steps at once

        // For mobile/tablet view, show only the selected step
        // Hide all steps
        Object.values(steps).forEach(step => {
            if (step) {
                step.classList.add('hidden');
                step.classList.remove('active', 'slide-in-right', 'slide-in-left');
            }
        });

        // Show the requested step with animation
        if (steps[stepName]) {
            steps[stepName].classList.remove('hidden');
            steps[stepName].classList.add('active');

            if (direction === 'right') {
                steps[stepName].classList.add('slide-in-right');
            } else if (direction === 'left') {
                steps[stepName].classList.add('slide-in-left');
            }

            // Update navigation buttons visibility
            updateNavigationButtons(stepName);

            // Update step indicators
            updateStepIndicators(stepName);

            // Removed automatic focus on inputs to prevent mobile keyboard from appearing
            // This prevents the keyboard from automatically showing up on mobile devices
        }
    }

    // Function to update step indicators
    function updateStepIndicators(currentStep) {
        // Get all step indicators
        const stepIndicators = {
            connection: document.getElementById('step-indicator-1'),
            prompt: document.getElementById('step-indicator-2'),
            options: document.getElementById('step-indicator-3'),
            actions: document.getElementById('step-indicator-4')
        };

        // Reset all indicators to gray
        Object.values(stepIndicators).forEach(indicator => {
            if (indicator) {
                indicator.classList.remove('bg-blue-500');
                indicator.classList.add('bg-gray-600');
            }
        });

        // Set the current step indicator to blue
        if (stepIndicators[currentStep]) {
            stepIndicators[currentStep].classList.remove('bg-gray-600');
            stepIndicators[currentStep].classList.add('bg-blue-500');
        }
    }

    // Function to update navigation buttons visibility based on current step
    function updateNavigationButtons(currentStep) {
        // Get all navigation button containers
        const connectionButtons = document.getElementById('connection-step-buttons');
        const promptButtons = document.getElementById('prompt-step-buttons');
        const optionsButtons = document.getElementById('options-step-buttons');
        const actionsButtons = document.getElementById('actions-step-buttons');

        // Hide all button containers first
        [connectionButtons, promptButtons, optionsButtons, actionsButtons].forEach(container => {
            if (container) {
                container.classList.add('hidden');
            }
        });

        // Show the appropriate button container based on current step
        switch (currentStep) {
            case 'connection':
                if (connectionButtons) connectionButtons.classList.remove('hidden');
                break;
            case 'prompt':
                if (promptButtons) promptButtons.classList.remove('hidden');
                break;
            case 'options':
                if (optionsButtons) optionsButtons.classList.remove('hidden');
                break;
            case 'actions':
                if (actionsButtons) actionsButtons.classList.remove('hidden');
                break;
        }
    }

    // Add event listeners for navigation buttons with improved handling for tablets
    const addButtonEventListener = (button, stepName, direction) => {
        if (!button) return;

        // Remove any existing event listeners by cloning and replacing
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Function to handle navigation
        const navigateToStep = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Blur any active element to prevent keyboard from showing
            if (document.activeElement) {
                document.activeElement.blur();
            }

            debugLog(`Navigation to step: ${stepName}, direction: ${direction}`);
            showStep(stepName, direction);

            // Add a small delay to ensure the DOM updates before allowing next click
            disableNavigation();
            setTimeout(enableNavigation, 300);
        };

        // Add click event with proper handling
        newButton.addEventListener('click', navigateToStep);

        // Add touchstart event for better tablet support
        newButton.addEventListener('touchstart', (e) => {
            // Mark this element as touched to prevent duplicate events
            newButton.dataset.touched = 'true';
        }, { passive: true });

        // Add touchend event for better tablet support
        newButton.addEventListener('touchend', (e) => {
            // Only proceed if this was the element that received touchstart
            if (newButton.dataset.touched === 'true') {
                // Reset the touched state
                newButton.dataset.touched = 'false';
                navigateToStep(e);
            }
        }, { passive: false });

        // Add keyboard event for better accessibility
        newButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToStep(e);
            }
        });

        // Return the new button reference
        return newButton;
    };

    // Apply the improved event listeners to all navigation buttons
    addButtonEventListener(toPromptBtn, 'prompt', 'right');
    addButtonEventListener(backToConnectionBtn, 'connection', 'left');
    addButtonEventListener(toOptionsBtn, 'options', 'right');
    addButtonEventListener(backToPromptBtn, 'prompt', 'left');
    addButtonEventListener(toActionsBtn, 'actions', 'right');
    addButtonEventListener(backToOptionsBtn, 'options', 'left');

    // Initialize with stepped navigation for all screen sizes
    showStep('connection');

    // Handle window resize to toggle between mobile and desktop views
    window.addEventListener('resize', () => {
        const navButtons = document.getElementById('settings-navigation-buttons');
        
        // Clear any conflicting inline styles on resize
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            // Clean modal container styles
            ['position', 'top', 'left', 'right', 'bottom', 'transform', 'width', 'height', 'margin', 'display', 'align-items', 'justify-content'].forEach(prop => {
                settingsModal.style.removeProperty(prop);
            });
            
            const modalContent = settingsModal.querySelector('.modal-content');
            if (modalContent) {
                // Remove any inline styles that might interfere with CSS responsive design
                ['position', 'top', 'left', 'right', 'bottom', 'transform', 'width', 'max-width', 'height', 'max-height', 'margin'].forEach(prop => {
                    modalContent.style.removeProperty(prop);
                });
                modalContent.classList.remove('mobile-modal');
            }
        }

        // Always use stepped navigation regardless of screen size
        showStep('connection');

        // Show navigation buttons on all screen sizes
        if (navButtons) {
            navButtons.classList.remove('hidden');

            // Show only connection step buttons
            const connectionButtons = document.getElementById('connection-step-buttons');
            const promptButtons = document.getElementById('prompt-step-buttons');
            const optionsButtons = document.getElementById('options-step-buttons');
            const actionsButtons = document.getElementById('actions-step-buttons');

            // Hide all button containers first
            [promptButtons, optionsButtons, actionsButtons].forEach(container => {
                if (container) {
                    container.classList.add('hidden');
                }
            });

            // Show connection buttons
            if (connectionButtons) {
                connectionButtons.classList.remove('hidden');
            }
        }
    });
}

// Helper functions to disable/enable navigation
function disableNavigation() {
    // Disable all navigation buttons to prevent accidental navigation
    const navigationButtons = document.querySelectorAll('[id^="to-"], [id^="back-to-"]');
    navigationButtons.forEach(btn => {
        btn.setAttribute('disabled', 'true');
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
    });
}

function enableNavigation() {
    // Re-enable all navigation buttons
    const navigationButtons = document.querySelectorAll('[id^="to-"], [id^="back-to-"]');
    navigationButtons.forEach(btn => {
        btn.removeAttribute('disabled');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    });
}

/**
 * Resets the modal state to ensure it opens correctly next time
 */
function resetModalState() {
    // Get all steps
    const steps = {
        connection: document.getElementById('settings-step-connection'),
        prompt: document.getElementById('settings-step-prompt'),
        options: document.getElementById('settings-step-options'),
        actions: document.getElementById('settings-step-actions')
    };

    // Get all navigation button containers
    const connectionButtons = document.getElementById('connection-step-buttons');
    const promptButtons = document.getElementById('prompt-step-buttons');
    const optionsButtons = document.getElementById('options-step-buttons');
    const actionsButtons = document.getElementById('actions-step-buttons');

    // Ensure IP/Port containers are visible when modal is reopened
    const connectionLabelContainer = document.querySelector('#settings-step-connection label.block.text-sm.font-medium');
    const urlInfoContainer = document.querySelector('#settings-step-connection p.text-xs.text-gray-300.mt-1');

    if (connectionLabelContainer) connectionLabelContainer.style.display = '';
    if (urlInfoContainer) urlInfoContainer.style.display = '';

    // For mobile/tablet view, reset to first step
    if (window.innerWidth < 1024) {
        // Hide all steps except the first one
        Object.entries(steps).forEach(([key, step]) => {
            if (step) {
                if (key === 'connection') {
                    // First step should be visible
                    step.classList.remove('hidden');
                    step.classList.add('active');
                } else {
                    // Other steps should be hidden
                    step.classList.add('hidden');
                    step.classList.remove('active', 'slide-in-right', 'slide-in-left');
                }
            }
        });

        // Hide all button containers except the first one
        [promptButtons, optionsButtons, actionsButtons].forEach(container => {
            if (container) {
                container.classList.add('hidden');
            }
        });

        // Show connection buttons
        if (connectionButtons) {
            connectionButtons.classList.remove('hidden');
        }
    }
}

/**
 * Handles manual focus for input fields to prevent automatic keyboard popup on mobile
 */
function initializeManualInputFocus() {
    if (!settingsModal) return;

    // Function to set up input field focus handling
    const setupInputFocusHandling = () => {
        // Get all text input fields, textareas, and selects in the settings modal
        const textInputs = settingsModal.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="password"], textarea, select');

        // Find system prompt textarea specifically
        const systemPromptTextarea = document.getElementById('system-prompt');

        // Find IP and Port input fields specifically
        const serverIpInput = document.getElementById('server-ip');
        const serverPortInput = document.getElementById('server-port');

        // Find the containers that need to be hidden/shown
        const connectionLabelContainer = document.querySelector('#settings-step-connection label.block.text-sm.font-medium');
        const urlInfoContainer = document.querySelector('#settings-step-connection p.text-xs.text-gray-300.mt-1');

        // Add special handling for system prompt textarea
        if (systemPromptTextarea && !systemPromptTextarea.dataset.focusHandlerAttached) {
            systemPromptTextarea.dataset.focusHandlerAttached = 'true';

            // Handle both touchstart and mousedown events to capture all interactions
            ['touchstart', 'mousedown', 'focus'].forEach(eventType => {
                systemPromptTextarea.addEventListener(eventType, function(e) {
                    // Prevent default behavior for all events
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    // Disable navigation before showing keyboard
                    disableNavigation();

                    // Save current scroll positions
                    const modalScrollTop = this.closest('.settings-step').scrollTop;
                    const windowScrollTop = window.scrollY;

                    // Enable user interaction by adding the focus-enabled class
                    this.classList.add('focus-enabled');

                    // Focus the textarea after a very short delay
                    setTimeout(() => {
                        this.focus();

                        // Restore scroll positions to prevent jumps
                        this.closest('.settings-step').scrollTop = modalScrollTop;
                        window.scrollTo(0, windowScrollTop);
                    }, 10);
                }, { passive: false, capture: true });
            });

            // Re-enable navigation when focus is lost
            systemPromptTextarea.addEventListener('blur', function() {
                // Remove the focus-enabled class
                this.classList.remove('focus-enabled');

                // Re-enable navigation after a small delay
                setTimeout(enableNavigation, 300);
            }, { passive: false, capture: true });
        }

        // Add special handling for IP and Port input fields
        if (serverIpInput && serverPortInput && connectionLabelContainer && urlInfoContainer) {
            // Only add event listeners if they haven't been added before
            if (!serverIpInput.dataset.ipPortFocusHandlerAttached) {
                serverIpInput.dataset.ipPortFocusHandlerAttached = 'true';
                serverPortInput.dataset.ipPortFocusHandlerAttached = 'true';

                // Function to hide containers
                const hideContainers = () => {
                    connectionLabelContainer.style.display = 'none';
                    urlInfoContainer.style.display = 'none';
                };

                // Function to show containers
                const showContainers = () => {
                    connectionLabelContainer.style.display = '';
                    urlInfoContainer.style.display = '';
                };

                // Add focus event listeners to both inputs
                serverIpInput.addEventListener('focus', function(e) {
                    hideContainers();
                    // On mobile, scroll the input into view when keyboard appears
                    if (window.matchMedia('(max-width: 767px)').matches) {
                        setTimeout(() => {
                            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300); // Wait for keyboard to appear
                    }
                });
                
                serverPortInput.addEventListener('focus', function(e) {
                    hideContainers();
                    // On mobile, scroll the input into view when keyboard appears
                    if (window.matchMedia('(max-width: 767px)').matches) {
                        setTimeout(() => {
                            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300); // Wait for keyboard to appear
                    }
                });

                // Add click event listeners to ensure focus on mobile
                serverIpInput.addEventListener('click', function(e) {
                    this.focus();
                    hideContainers();
                });

                serverPortInput.addEventListener('click', function(e) {
                    this.focus();
                    hideContainers();
                });

                // Add blur event listeners to both inputs
                serverIpInput.addEventListener('blur', function(e) {
                    // Check if the button clicked flag is set
                    if (serverIpInput.dataset.buttonClicked === 'true' || serverPortInput.dataset.buttonClicked === 'true') {
                        // Reset the flag but don't show containers
                        serverIpInput.dataset.buttonClicked = 'false';
                        serverPortInput.dataset.buttonClicked = 'false';
                        return;
                    }

                    // Only show containers if the other input is not focused
                    if (document.activeElement !== serverPortInput) {
                        showContainers();
                    }
                });

                serverPortInput.addEventListener('blur', function(e) {
                    // Check if the button clicked flag is set
                    if (serverIpInput.dataset.buttonClicked === 'true' || serverPortInput.dataset.buttonClicked === 'true') {
                        // Reset the flag but don't show containers
                        serverIpInput.dataset.buttonClicked = 'false';
                        serverPortInput.dataset.buttonClicked = 'false';
                        return;
                    }

                    // Only show containers if the other input is not focused
                    if (document.activeElement !== serverIpInput) {
                        showContainers();
                    }
                });

                // Add special handling for the Apply Changes button
                const closeSettingsButton = document.getElementById('close-settings');
                if (closeSettingsButton) {
                    // Add mousedown event listener to ensure it captures the event before blur
                    closeSettingsButton.addEventListener('mousedown', function(e) {
                        // If either input is focused, prevent the containers from showing
                        if (document.activeElement === serverIpInput || document.activeElement === serverPortInput) {
                            // Set a flag to indicate we're handling a button click
                            serverIpInput.dataset.buttonClicked = 'true';
                            serverPortInput.dataset.buttonClicked = 'true';

                            // Don't show containers - they'll be shown when the modal is reopened
                        }
                    });

                    // Also handle touchstart for mobile devices
                    closeSettingsButton.addEventListener('touchstart', function(e) {
                        // If either input is focused, prevent the containers from showing
                        if (document.activeElement === serverIpInput || document.activeElement === serverPortInput) {
                            // Set a flag to indicate we're handling a button click
                            serverIpInput.dataset.buttonClicked = 'true';
                            serverPortInput.dataset.buttonClicked = 'true';

                            // Don't show containers - they'll be shown when the modal is reopened
                        }
                    });

                    // Add click event handler to ensure the button's click event is processed
                    closeSettingsButton.addEventListener('click', function(e) {
                        // If either input is focused, blur it to ensure the input's value is saved
                        if (document.activeElement === serverIpInput || document.activeElement === serverPortInput) {
                            document.activeElement.blur();

                            // Trigger the change event to ensure the value is saved
                            const event = new Event('change', { bubbles: true });
                            document.activeElement.dispatchEvent(event);
                        }
                    });
                }
            }
        }

        // Process all other input fields with standard handling
        textInputs.forEach(input => {
            // Skip if this input already has our custom handler
            if (input.dataset.focusHandlerAttached === 'true') return;

            // Skip the system prompt as it has special handling
            if (input.id === 'system-prompt') return;

            // Skip the IP and Port inputs as they have special handling
            if (input.id === 'server-ip' || input.id === 'server-port') return;

            // Skip checkboxes completely to ensure toggle switches work
            if (input.type === 'checkbox') return;

            // Mark this input as having our handler attached
            input.dataset.focusHandlerAttached = 'true';

            // Add click event to manually handle focus
            input.addEventListener('click', function(e) {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Add the focus-enabled class to allow focus
                this.classList.add('focus-enabled');

                // Use setTimeout to focus the element after adding the class
                setTimeout(() => {
                    this.focus();
                }, 10);

                // Set a timeout to remove the class after the user has finished interacting
                setTimeout(() => {
                    this.classList.remove('focus-enabled');
                }, 10000); // 10 seconds should be enough time for user input
            });

            // Add focus event listener for mobile scroll handling
            input.addEventListener('focus', function(e) {
                // On mobile, scroll the input into view when keyboard appears
                if (window.matchMedia('(max-width: 767px)').matches) {
                    setTimeout(() => {
                        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300); // Wait for keyboard to appear
                }
            });
        });
    };

    // Initial setup
    setupInputFocusHandling();

    // Also set up a mutation observer to handle dynamically added inputs
    const observer = new MutationObserver(setupInputFocusHandling);

    // Start observing the modal for DOM changes
    observer.observe(settingsModal, {
        childList: true,
        subtree: true
    });
}

/**
 * Initialize and handle the system prompt overlay editor
 */
function initializeSystemPromptOverlay() {
    // Get all elements
    const overlay = document.getElementById('system-prompt-overlay');
    const editButton = document.getElementById('edit-system-prompt-btn');
    const cancelButton = document.getElementById('cancel-system-prompt-edit');
    const saveButton = document.getElementById('save-system-prompt-edit');
    const closeButton = document.getElementById('close-system-prompt-overlay');
    const editor = document.getElementById('system-prompt-editor');
    const hiddenTextarea = document.getElementById('system-prompt');
    const previewDiv = document.getElementById('system-prompt-preview');
    const placeholderSpan = document.getElementById('prompt-placeholder');


    if (!overlay || !editButton || !cancelButton || !saveButton || !editor || !hiddenTextarea || !previewDiv) {
        debugLog('System prompt overlay elements not found');
        return;
    }

    // Ensure the overlay is hidden on initialization
    overlay.classList.add('hidden');
    overlay.style.display = 'none';



    // Function to detect mobile keyboard visibility with improved handling
    function setupMobileKeyboardDetection() {
        if (!window.matchMedia('(max-width: 480px)').matches) {
            return; // Only apply on mobile devices
        }

        let keyboardVisible = false;
        let initialViewportHeight = window.innerHeight;
        let resizeTimeout;

        function handleViewportChange() {
            // Clear any existing timeout
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            // Add a small delay to ensure we get the final viewport size
            resizeTimeout = setTimeout(() => {
                const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                const heightDifference = initialViewportHeight - currentHeight;

                // Consider keyboard visible if viewport height decreased by more than 150px
                const shouldShowKeyboard = heightDifference > 150;

                if (shouldShowKeyboard !== keyboardVisible) {
                    keyboardVisible = shouldShowKeyboard;

                    if (keyboardVisible) {
                        overlay.classList.add('keyboard-visible');
                        // Use the full available height without gaps
                        overlay.style.height = `${currentHeight}px`;
                        overlay.style.position = 'fixed';
                        overlay.style.top = '0';
                        overlay.style.left = '0';
                        overlay.style.right = '0';
                        overlay.style.bottom = 'auto';
                    } else {
                        overlay.classList.remove('keyboard-visible');
                        // Reset to default positioning
                        overlay.style.height = '';
                        overlay.style.position = '';
                        overlay.style.top = '';
                        overlay.style.left = '';
                        overlay.style.right = '';
                        overlay.style.bottom = '';
                    }
                }
            }, 100);
        }

        // Use Visual Viewport API if available (better for mobile)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
            // Fallback to window resize
            window.addEventListener('resize', handleViewportChange);
        }

        // Clean up function
        return function cleanup() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
            } else {
                window.removeEventListener('resize', handleViewportChange);
            }
        };
    }

    // Function to show the overlay
    function showOverlay() {
        // Copy content from hidden textarea to editor
        editor.value = hiddenTextarea.value || '';

        // Show the overlay with proper display flex for centering
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '2100'; // Ensure it's above the settings modal

            // Setup mobile keyboard detection
            const cleanupKeyboardDetection = setupMobileKeyboardDetection();

            // Store cleanup function for later use
            overlay._keyboardCleanup = cleanupKeyboardDetection;

        // Add a small delay to ensure smooth animation
        setTimeout(() => {
            // Focus the editor after the overlay is visible
            editor.focus();

                    // Add a class to indicate the overlay is active (for potential animations)
        overlay.classList.add('active');
    }, 50);

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Disable scrolling on body
    document.body.style.overflow = 'hidden';

        // Adjust textarea height based on content
        adjustTextareaHeight();
    }

    // Function to adjust textarea height based on content and screen size
    function adjustTextareaHeight() {
        // Set a minimum height based on screen size
        const viewportHeight = window.innerHeight;
        const isSmallScreen = viewportHeight < 600;

        // Calculate appropriate height (smaller on small screens)
        const baseHeight = isSmallScreen ? 120 : 200;

        // Set initial height
        editor.style.height = baseHeight + 'px';

        // Adjust based on content if needed (for when there's a lot of text)
        const contentHeight = editor.scrollHeight;
        const maxHeight = viewportHeight * 0.5; // Max 50% of viewport

        if (contentHeight > baseHeight && contentHeight < maxHeight) {
            editor.style.height = contentHeight + 'px';
        } else if (contentHeight > maxHeight) {
            editor.style.height = maxHeight + 'px';
        }
    }

    // Function to hide the overlay
    function hideOverlay() {
        // Remove active class first (for animations if needed)
        overlay.classList.remove('active');
        overlay.classList.remove('keyboard-visible');

        // Clean up keyboard detection
        if (overlay._keyboardCleanup) {
            overlay._keyboardCleanup();
            overlay._keyboardCleanup = null;
        }

        // Use a small timeout to allow for potential exit animations
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';

            // Reset any inline styles
            editor.style.height = '';
            overlay.style.height = '';
            overlay.style.position = '';
            overlay.style.top = '';
            overlay.style.left = '';
            overlay.style.right = '';
            overlay.style.bottom = '';
        }, 50);

        // Re-enable scrolling
        document.body.style.overflow = '';

        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyDown);
    }

    // Function to save the edited content
    function saveChanges() {
        // Save to hidden textarea
        hiddenTextarea.value = editor.value;

        // Mark this as a user-created prompt
        localStorage.setItem('isUserCreatedSystemPrompt', 'true');

        // Update the preview
        updatePreview();

        // Trigger change event on hidden textarea
        const event = new Event('change', { bubbles: true });
        hiddenTextarea.dispatchEvent(event);

        // Ensure the prompt is saved to localStorage
        localStorage.setItem('systemPrompt', editor.value);
        debugLog('Saved system prompt from editor:', editor.value);
        debugLog('isUserCreatedSystemPrompt:', localStorage.getItem('isUserCreatedSystemPrompt'));

        // Hide the overlay
        hideOverlay();
    }

    // Function to update the preview div
    function updatePreview() {
        const value = hiddenTextarea.value;

        if (value && value.trim()) {
            // If there's content, show it in the preview
            previewDiv.textContent = value;

            // Hide the placeholder
            if (placeholderSpan) {
                placeholderSpan.style.display = 'none';
            }
        } else {
            // If empty, clear the preview and show placeholder
            if (placeholderSpan) {
                // Set innerHTML directly to avoid any whitespace issues
                previewDiv.innerHTML = '';
                previewDiv.appendChild(placeholderSpan);
            } else {
                previewDiv.textContent = '';
            }
        }
    }

    // Initial setup - update preview based on current value
    updatePreview();

    // Setup event listeners
    editButton.addEventListener('click', function(e) {
        e.preventDefault();
        showOverlay();
    });

    cancelButton.addEventListener('click', function(e) {
        e.preventDefault();
        hideOverlay();
    });

    saveButton.addEventListener('click', function(e) {
        e.preventDefault();
        saveChanges();
    });

    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        hideOverlay();
    });

    // Handle ESC key to close modal
    function handleKeyDown(e) {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
            e.preventDefault();
            hideOverlay();
        }
    }

    // Handle backdrop click to close modal
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            hideOverlay();
        }
    });

    // Setup clear button event listener (the button is inside the overlay)
    const clearButton = document.getElementById('clear-system-prompt-btn');
    if (clearButton) {
        clearButton.addEventListener('click', function(e) {
            e.preventDefault();
            showClearSystemPromptModal();
        });
    }

    // Handle outside click to close overlay
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            hideOverlay();
        }
    });

    // Prevent bubbling from the edit dialog
    overlay.querySelector('.modal-content').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Update preview whenever the hidden textarea changes (from other code)
    hiddenTextarea.addEventListener('change', function() {
        updatePreview();
    });

    // Handle window resize to adjust textarea height
    window.addEventListener('resize', function() {
        // Only adjust if the overlay is visible
        if (!overlay.classList.contains('hidden')) {
            adjustTextareaHeight();
        }
    });

    // Handle escape key to close the overlay
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
            hideOverlay();
        }
    });
}

/**
 * Show the clear system prompt confirmation modal
 */
function showClearSystemPromptModal() {
    const modal = document.getElementById('clear-system-prompt-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '2200'; // Ensure it's above the system prompt overlay (2100)

        // Find the modal content and ensure it's also on top
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.zIndex = '2201'; // Higher than the modal background
        }
    }
}

/**
 * Hide the clear system prompt confirmation modal
 */
function hideClearSystemPromptModal() {
    const modal = document.getElementById('clear-system-prompt-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

/**
 * Clear the system prompt
 */
function clearSystemPrompt() {
    // Import the settings manager to use the setSystemPrompt function
    import('./settings-manager.js').then(module => {
        // Clear the system prompt by setting it to empty string
        module.setSystemPrompt('', false);

        // Update the UI elements
        const hiddenTextarea = document.getElementById('system-prompt');
        const previewDiv = document.getElementById('system-prompt-preview');
        const placeholderSpan = document.getElementById('prompt-placeholder');
        const editor = document.getElementById('system-prompt-editor');

        if (hiddenTextarea) {
            hiddenTextarea.value = '';
            // Trigger change event to update the preview
            const changeEvent = new Event('change', { bubbles: true });
            hiddenTextarea.dispatchEvent(changeEvent);
        }

        // Clear the editor as well
        if (editor) {
            editor.value = '';
        }

        // Update the preview to show placeholder (this should also be handled by the change event above)
        if (previewDiv && placeholderSpan) {
            previewDiv.innerHTML = '';
            previewDiv.appendChild(placeholderSpan);
            placeholderSpan.style.display = '';
        }

        // Clear localStorage
        localStorage.setItem('systemPrompt', '');
        localStorage.removeItem('isUserCreatedSystemPrompt');

        debugLog('System prompt cleared successfully');
    });

    // Hide the confirmation modal
    hideClearSystemPromptModal();

    // Also hide the system prompt overlay since the user is done
    const overlay = document.getElementById('system-prompt-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        // Use the existing hideOverlay function if available, or hide manually
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 100); // Small delay to let the confirmation modal close first
    }
}

/**
 * Initialize the clear system prompt modal
 */
function initializeClearSystemPromptModal() {
    const modal = document.getElementById('clear-system-prompt-modal');
    const cancelButton = document.getElementById('cancel-clear-system-prompt');
    const confirmButton = document.getElementById('confirm-clear-system-prompt');
    const closeButton = document.getElementById('close-clear-system-prompt-modal');

    if (!modal || !cancelButton || !confirmButton || !closeButton) {
        debugLog('Clear system prompt modal elements not found');
        return;
    }

    // Cancel button
    cancelButton.addEventListener('click', function(e) {
        e.preventDefault();
        hideClearSystemPromptModal();
    });

    // Close button (X)
    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        hideClearSystemPromptModal();
    });

    // Confirm button
    confirmButton.addEventListener('click', function(e) {
        e.preventDefault();
        clearSystemPrompt();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideClearSystemPromptModal();
        }
    });

    // Prevent bubbling from the modal content
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Handle escape key to close the modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideClearSystemPromptModal();
        }
    });
}

/**
 * Initializes the settings modal
 */
export function initializeSettingsModal() {
    debugLog('Initializing settings modal');

    // Close modal when clicking outside
    if (settingsModal) {
        settingsModal.addEventListener('click', function(e) {
            if (e.target === settingsModal) {
                hideSettingsModal();
            }
        });

        // Listen for theme changes to update the modal appearance
        document.addEventListener('themeChanged', function(e) {
            // The modal will automatically use the theme CSS variables
            // when it's opened next time, but if it's currently open,
            // we need to ensure it reflects the current theme
            if (!settingsModal.classList.contains('hidden')) {
                debugLog('Theme changed while settings modal is open, updating appearance');
                // The CSS variables will be applied automatically
                // Force a small repaint by toggling a class
                settingsModal.classList.add('theme-update');
                setTimeout(() => {
                    settingsModal.classList.remove('theme-update');
                }, 10);
            }
        });
    }

    // Initialize mobile navigation
    initializeSettingsModalNavigation();

    // Initialize manual input focus handling
    initializeManualInputFocus();

    // Initialize the system prompt overlay editor
    initializeSystemPromptOverlay();

    // Initialize the clear system prompt modal
    initializeClearSystemPromptModal();
}
