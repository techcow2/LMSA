// Model Manager for handling model-related functionality
import {
    modelModal,
    closeModelButton,
    currentModelDisplay,
    availableModelsList,
    refreshModelsButton,
    fullModelNameModal,
    closeFullModelNameButton,
    fullModelNameDisplay,
    modelHeaderIcon,
    modelLoadingModal,
    modelLoadingTitle,
    modelLoadingName,
    modelLoadingStatus
} from './dom-elements.js';
import { fetchAvailableModels, getAvailableModels, isServerRunning, loadModel as apiLoadModel } from './api-service.js';
import { checkAndShowWelcomeMessage } from './ui-manager.js';

// Flag to track if a model is actually loaded
let isModelLoaded = false;
// Flag to track if a model is currently loading
let isModelLoading = false;
// Store all available models
let allAvailableModels = [];
// Current server connection info
let currentServerIp = '';
let currentServerPort = '';
// Store current model full name
let currentModelFullName = '';

/**
 * Initializes the model manager
 */
export function initializeModelManager() {
    // Add event listeners
    if (closeModelButton) {
        closeModelButton.addEventListener('click', closeModelModal);
    }

    if (refreshModelsButton) {
        refreshModelsButton.addEventListener('click', refreshModels);
    }

    if (closeFullModelNameButton) {
        closeFullModelNameButton.addEventListener('click', closeFullModelNameModal);
    }

    // The model header icon doesn't exist when this function runs
    // We'll add the event listener dynamically when the modal is shown
}

/**
 * Shows the model modal
 */
export function showModelModal() {
    // Debug the current startup state
    console.log('showModelModal called, isInitialStartup:', window.isInitialStartup);

    if (modelModal) {
        // Force showing the modal regardless of startup state
        modelModal.classList.remove('hidden');
        const modalContent = modelModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }

        // Show loading state first
        if (currentModelDisplay) {
            currentModelDisplay.textContent = 'Loading...';
        }

        if (availableModelsList) {
            availableModelsList.innerHTML = `
                <div class="animate-pulse flex space-x-4">
                    <div class="flex-1 space-y-3 py-1">
                        <div class="h-4 bg-darkTertiary rounded w-3/4"></div>
                        <div class="h-4 bg-darkTertiary rounded w-1/2"></div>
                        <div class="h-4 bg-darkTertiary rounded w-5/6"></div>
                    </div>
                </div>
            `;
        }

        // Model header icon is now just decorative (info icon) - no click handler needed

        // Show mobile instructions on smartphones
        showMobileInstructionsIfNeeded();

        // Load model information
        loadModelInformation();
    } else {
        console.error('Model modal element not found');
    }
}

/**
 * Closes the model modal
 */
export function closeModelModal() {
    if (modelModal) {
        const modalContent = modelModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-out');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-out');
                modelModal.classList.add('hidden');

                // Check if welcome message should be shown
                checkAndShowWelcomeMessage();
            }, 300);
        } else {
            modelModal.classList.add('hidden');

            // Check if welcome message should be shown
            checkAndShowWelcomeMessage();
        }
    }
}

/**
 * Loads model information
 */
async function loadModelInformation() {
    try {
        // When opening the model modal, temporarily set isInitialStartup to true
        // This prevents auto-loading of models when checking availability
        const originalStartupFlag = window.isInitialStartup;
        window.isInitialStartup = true;

        // Check if server is running
        if (!(await isServerRunning())) {
            displayServerError();
            // Restore the original flag value
            window.isInitialStartup = originalStartupFlag;
            return;
        }

        // Fetch all models from the server
        const serverIp = document.getElementById('server-ip')?.value.trim() || '';
        const serverPort = document.getElementById('server-port')?.value.trim() || '';

        // Store current server info for API calls
        currentServerIp = serverIp;
        currentServerPort = serverPort;

        if (!serverIp || !serverPort) {
            displayServerError();
            // Restore the original flag value
            window.isInitialStartup = originalStartupFlag;
            return;
        }

        // Fetch model info
        try {
            console.log('Loading model information from server...');
            // Use the API service to fetch models
            const modelData = await fetchAvailableModels();

            // Restore the original flag value now that we've fetched models
            window.isInitialStartup = originalStartupFlag;

            if (!modelData || modelData.length === 0) {
                console.log('No models returned from API');
                displayNoModelsAvailable();
                return;
            }

            // Store full model data for later use
            allAvailableModels = modelData;
            console.log('All available models:', allAvailableModels);

            // Determine which model is actually loaded - use a single source of truth
            // Priority: 1. Global variable, 2. API service loaded models
            let currentlyLoadedModelId = null;

            if (window.currentLoadedModel) {
                console.log('Using global currentLoadedModel variable:', window.currentLoadedModel);
                // Verify if this model exists in the available models list
                const foundModel = allAvailableModels.find(model => model.id === window.currentLoadedModel);
                if (foundModel) {
                    console.log('Confirmed model exists in available models list');
                    currentlyLoadedModelId = window.currentLoadedModel;
                } else {
                    console.log('Global currentLoadedModel not found in available models list');
                    // Clear invalid global model reference
                    window.currentLoadedModel = null;
                }
            }

            if (!currentlyLoadedModelId) {
                // Check API service as fallback
                const loadedModels = getAvailableModels();
                console.log('Currently loaded models according to API:', loadedModels);

                if (loadedModels.length > 0) {
                    currentlyLoadedModelId = loadedModels[0];
                    console.log('Using model from API service:', currentlyLoadedModelId);

                    // Verify this model exists in our list
                    const loadedModelInfo = allAvailableModels.find(model => model.id === currentlyLoadedModelId);
                    if (!loadedModelInfo) {
                        console.log('API-reported model not found in available models list');
                    }
                }
            }

            // Now update the UI with consistent model information
            if (currentlyLoadedModelId) {
                // A model is loaded
                isModelLoaded = true;

                // Update the global variable to maintain consistency
                window.currentLoadedModel = currentlyLoadedModelId;

                // Update both displays with the SAME model ID
                displayCurrentModel(currentlyLoadedModelId);
                displayAvailableModels(allAvailableModels, currentlyLoadedModelId);
            } else if (modelData.length > 0) {
                // Models exist but none are loaded
                console.log('Models available but none loaded');
                isModelLoaded = false;
                window.currentLoadedModel = null;
                displayNoModelsLoaded();
                displayPotentialModels(allAvailableModels);
            } else {
                // No models available
                console.log('No models available');
                isModelLoaded = false;
                window.currentLoadedModel = null;
                displayNoModelsAvailable();
            }
        } catch (error) {
            console.error('Error fetching model information:', error);
            displayServerError();
        }
    } catch (error) {
        console.error('Error loading model information:', error);
        displayServerError();
    }
}

/**
 * Refreshes the model list
 */
async function refreshModels() {
    // If a model is currently loading, don't allow refresh
    if (isModelLoading) {
        console.log('Model loading in progress, ignoring refresh request');
        return;
    }

    // Show loading state
    if (currentModelDisplay) {
        currentModelDisplay.textContent = 'Loading...';
    }

    if (availableModelsList) {
        availableModelsList.innerHTML = `
            <div class="animate-pulse flex space-x-4">
                <div class="flex-1 space-y-3 py-1">
                    <div class="h-4 bg-darkTertiary rounded w-3/4"></div>
                    <div class="h-4 bg-darkTertiary rounded w-1/2"></div>
                    <div class="h-4 bg-darkTertiary rounded w-5/6"></div>
                </div>
            </div>
        `;
    }

    // Add visual feedback to the refresh button if it exists
    if (refreshModelsButton) {
        refreshModelsButton.disabled = true;
        refreshModelsButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
    }

    try {
        // When refreshing models, temporarily set isInitialStartup to true
        // This prevents auto-loading of models when checking availability
        const originalStartupFlag = window.isInitialStartup;
        window.isInitialStartup = true;

        // Get updated model information
        await loadModelInformation();

        // Restore original flag
        window.isInitialStartup = originalStartupFlag;
    } catch (error) {
        console.error('Error refreshing models:', error);
        displayServerError();
    } finally {
        // Reset the refresh button if it exists
        if (refreshModelsButton) {
            refreshModelsButton.disabled = false;
            refreshModelsButton.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh Models';
        }
    }
}

/**
 * Standalone function to update the model display without full refresh
 * @param {string} modelId - The ID of the newly loaded model
 */
async function updateModelDisplay(modelId) {
    try {
        // When updating model display, temporarily set isInitialStartup to true
        // This prevents auto-loading of models when checking availability
        const originalStartupFlag = window.isInitialStartup;
        window.isInitialStartup = true;

        // Use the API service to get updated model information
        await fetchAvailableModels(true); // Skip fallback methods when updating display

        // Restore original flag
        window.isInitialStartup = originalStartupFlag;

        // Update the UI to show the loaded model
        if (currentModelDisplay) {
            // First priority: use the explicitly provided modelId
            // Second priority: use the global window.currentLoadedModel variable
            // Third priority: use the API's getAvailableModels() function

            let displayModelId = null;

            if (modelId) {
                displayModelId = modelId;
                console.log('Using explicitly provided modelId:', displayModelId);
            } else if (window.currentLoadedModel) {
                displayModelId = window.currentLoadedModel;
                console.log('Using global currentLoadedModel variable:', displayModelId);
            } else {
                const availableModels = getAvailableModels();
                if (availableModels.length > 0) {
                    displayModelId = availableModels[0];
                    console.log('Using first available model from API:', displayModelId);
                }
            }

            if (displayModelId) {
                // Model is loaded, update the UI
                isModelLoaded = true;

                // Set the global current model to maintain consistency
                window.currentLoadedModel = displayModelId;

                // Update both the header and list with the SAME model ID
                displayCurrentModel(displayModelId);

                // Refresh the available models in the list, using the same model ID we just set in the header
                if (allAvailableModels.length > 0) {
                    displayAvailableModels(allAvailableModels, displayModelId);
                }

                // Update the current banner if it exists
                import('./api-service.js').then(apiService => {
                    apiService.updateLoadedModelDisplay(displayModelId);
                }).catch(error => {
                    console.error('Error updating model display:', error);
                });
            } else {
                // No model is loaded, show the appropriate message
                isModelLoaded = false;
                displayNoModelsLoaded();

                // Don't automatically hide the banner as it would clear window.currentLoadedModel
                // Just visually hide the banner without affecting the global state
                if (loadedModelDisplay) {
                    loadedModelDisplay.classList.add('hidden');
                    loadedModelDisplay.textContent = 'No model loaded';
                    loadedModelDisplay.dataset.hasLoadedModel = 'false';
                }
            }
        }
    } catch (error) {
        console.error('Error updating model display:', error);
    }
}

/**
 * Loads a model in LM Studio
 * @param {string} modelId - ID of the model to load
 */
async function loadModel(modelId) {
    try {
        // If a model is already loading, prevent loading another one
        if (isModelLoading) {
            console.log('Model already loading, ignoring request to load another model');
            return false;
        }

        // Set loading flag to true
        isModelLoading = true;

        // Show the loading modal with the model name
        showModelLoadingModal(modelId);

        // Disable all load buttons in the modal
        disableLoadButtons();

        // Show loading indicator in the model list
        const modelElement = document.getElementById(`model-${modelId}`);
        if (modelElement) {
            const actionSpan = modelElement.querySelector('.model-action');
            if (actionSpan) {
                actionSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }
        }

        // Update current model display to show switching status
        if (currentModelDisplay) {
            currentModelDisplay.innerHTML = `
                <div class="flex items-center text-yellow-500">
                    <i class="fas fa-spinner fa-spin mr-2 flex-shrink-0"></i>
                    <span class="truncate">Switching to: ${modelId}</span>
                </div>
            `;
        }

        console.log(`Requesting to load model: ${modelId}`);

        // Use the API service to load the model
        const success = await apiLoadModel(modelId);

        if (!success) {
            console.log(`Failed to load model: ${modelId}`);
            
            // Hide the loading modal
            hideModelLoadingModal();
            
            showActionError(modelId, 'Failed to load');

            // Restore the current model display to previous state
            await updateModelDisplay(null);

            // Set loading flag back to false
            isModelLoading = false;

            // Re-enable all load buttons
            enableLoadButtons();

            return false;
        }

        console.log(`Successfully loaded model: ${modelId}`);

        // Update global variable immediately to ensure consistency
        window.currentLoadedModel = modelId;

        // Update the UI with the newly loaded model
        await updateModelDisplay(modelId);

        // Hide the loading modal after successful load
        hideModelLoadingModal();

        // Set loading flag back to false
        isModelLoading = false;

        // Re-enable all load buttons
        enableLoadButtons();

        return true;
    } catch (error) {
        console.error('Error loading model:', error);
        
        // Hide the loading modal on error
        hideModelLoadingModal();
        
        showActionError(modelId, 'Failed to load');

        // Restore the current model display
        await updateModelDisplay(null);

        // Set loading flag back to false
        isModelLoading = false;

        // Re-enable all load buttons
        enableLoadButtons();

        return false;
    }
}

/**
 * Disables all load buttons in the modal
 */
function disableLoadButtons() {
    const loadButtons = availableModelsList.querySelectorAll('.load-model-btn');
    loadButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
        button.classList.remove('hover:bg-blue-700');
    });
}

/**
 * Enables all load buttons in the modal
 */
function enableLoadButtons() {
    const loadButtons = availableModelsList.querySelectorAll('.load-model-btn');
    loadButtons.forEach(button => {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
        button.classList.add('hover:bg-blue-700');
    });
}

/**
 * Shows an error message for a model action
 * @param {string} modelId - ID of the model that had an error
 * @param {string} errorMsg - Error message to display
 */
function showActionError(modelId, errorMsg) {
    const modelElement = document.getElementById(`model-${modelId}`);
    if (modelElement) {
        const actionSpan = modelElement.querySelector('.model-action');
        if (actionSpan) {
            actionSpan.innerHTML = `<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> ${errorMsg}</span>`;

            // Reset after a delay
            setTimeout(() => {
                // Get the latest loaded model from the API
                const loadedModels = getAvailableModels();
                const isLoaded = loadedModels.includes(modelId);

                if (isLoaded) {
                    actionSpan.innerHTML = '<span class="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Loaded</span>';
                } else {
                    actionSpan.innerHTML = '<button class="load-model-btn bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors duration-300 flex items-center"><i class="fas fa-play mr-1"></i>Load</button>';

                    // Re-attach the event listener
                    const loadButton = actionSpan.querySelector('.load-model-btn');
                    if (loadButton) {
                        loadButton.addEventListener('click', async (e) => {
                            e.preventDefault();
                            await loadModel(modelId);
                        });
                    }
                }
            }, 3000);
        }
    }
}

/**
 * Displays the current model
 * @param {string} modelName - Name of the current model
 */
function displayCurrentModel(modelName) {
    if (currentModelDisplay) {
        // Store the full model name for the modal
        currentModelFullName = modelName;

        currentModelDisplay.innerHTML = `
            <div class="flex items-center">
                <div class="model-icon bg-green-500/20 text-green-400 loaded mr-3" id="current-model-icon" title="Click to see full model name">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="model-name font-medium" title="${modelName}">${modelName}</div>
                </div>
            </div>
        `;

        // Add click event to the model icon
        const currentModelIcon = document.getElementById('current-model-icon');
        if (currentModelIcon) {
            console.log('Setting up click handler for current model icon');
            currentModelIcon.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Current model icon clicked');
                showFullModelNameModal();
            };
        }

        // Add click event to the model name
        const currentModelName = currentModelDisplay.querySelector('.model-name');
        if (currentModelName) {
            console.log('Setting up click handler for current model name');
            currentModelName.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Current model name clicked');
                showFullModelNameModal();
            };
            // Add cursor pointer to indicate it's clickable
            currentModelName.style.cursor = 'pointer';
        }
    }
}

/**
 * Displays all available models
 * @param {Object[]} models - Array of model objects
 * @param {string} loadedModelId - ID of the currently loaded model
 */
function displayAvailableModels(models, loadedModelId) {
    if (availableModelsList) {
        if (models.length === 0) {
            availableModelsList.innerHTML = `
                <div class="p-4 bg-darkBg/70 rounded-xl text-gray-400 border border-white/5 flex items-center">
                    <i class="fas fa-info-circle mr-3 text-blue-400"></i>
                    <span>No models available</span>
                </div>
            `;
            return;
        }

        // Clear the list
        availableModelsList.innerHTML = '';

        // Add a section title
        const titleElement = document.createElement('div');
        titleElement.className = 'mb-4 pb-2 border-b border-white/10 flex items-center';
        titleElement.innerHTML = `
            <div class="icon-wrapper mr-3 flex items-center justify-center rounded-full bg-purple-500/20 w-8 h-8 text-purple-400 shadow-md">
                <i class="fas fa-list-ul text-sm"></i>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-blue-400">Available Models</h3>
                <p class="text-gray-400 text-sm">Click "Load" to switch to a different model</p>
            </div>
        `;
        availableModelsList.appendChild(titleElement);

        // IMPORTANT: Use the SAME loadedModelId that was passed in to ensure consistency between
        // the "Currently loaded model" header and the model marked as loaded in the list
        const currentLoadedModelId = loadedModelId;

        // Log for debugging
        console.log('Displaying models with loaded model ID:', currentLoadedModelId);

        // Add each model to the list
        models.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.id = `model-${model.id}`;
            modelElement.className = 'p-4 bg-darkBg/70 rounded-xl text-white mb-3 border border-white/5 transition-all duration-300 hover:border-blue-500/30 hover:shadow-md';

            const isCurrentModel = model.id === currentLoadedModelId;

            modelElement.className = 'model-item';
            modelElement.innerHTML = `
                <div class="model-icon ${isCurrentModel ? 'bg-green-500/20 text-green-400 loaded' : 'bg-blue-500/20 text-blue-400'}" data-model-id="${model.id}" title="Click to see full model name">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="model-content">
                    <div class="model-name" title="${model.id}">${model.id}</div>
                </div>
                <div class="model-actions">
                    ${isCurrentModel ?
                        '<span class="model-loaded"><i class="fas fa-check-circle"></i>Loaded</span>' :
                        '<button class="load-model-btn"><i class="fas fa-plug"></i>Load</button>'
                    }
                </div>
            `;

            availableModelsList.appendChild(modelElement);

            // Add event listener to the load button if this is not the current model
            if (!isCurrentModel) {
                const loadButton = modelElement.querySelector('.load-model-btn');
                if (loadButton) {
                    loadButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await loadModel(model.id);
                    });

                    // If a model is currently loading, disable this button
                    if (isModelLoading) {
                        loadButton.disabled = true;
                        loadButton.classList.add('opacity-50', 'cursor-not-allowed');
                        loadButton.classList.remove('hover:from-blue-600', 'hover:to-blue-700');
                    }
                }
            }

            // Add event listener to the model icon to show full model name
            const modelIcon = modelElement.querySelector('.model-icon');
            if (modelIcon) {
                console.log('Setting up click handler for model icon:', model.id);
                modelIcon.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Model icon clicked:', model.id);
                    currentModelFullName = model.id;
                    showFullModelNameModal();
                };
            }

            // Add event listener to the model name to show full model name
            const modelName = modelElement.querySelector('.model-name');
            if (modelName) {
                console.log('Setting up click handler for model name:', model.id);
                modelName.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Model name clicked:', model.id);
                    currentModelFullName = model.id;
                    showFullModelNameModal();
                };
                // Add cursor pointer to indicate it's clickable
                modelName.style.cursor = 'pointer';
            }
        });
    }
}

/**
 * Displays potential models that are available but not loaded
 * @param {Object[]} models - Array of model objects
 */
function displayPotentialModels(models) {
    if (availableModelsList) {
        if (models.length === 0) {
            availableModelsList.innerHTML = `
                <div class="p-4 bg-darkBg/70 rounded-xl text-gray-400 border border-white/5 flex items-center">
                    <i class="fas fa-info-circle mr-3 text-blue-400"></i>
                    <span>No models available</span>
                </div>
            `;
            return;
        }

        // Clear the list
        availableModelsList.innerHTML = '';

        // Add a note about models needing to be loaded
        const noteElement = document.createElement('div');
        noteElement.className = 'p-4 mb-5 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 shadow-md';
        noteElement.innerHTML = `
            <div class="flex items-start">
                <div class="icon-wrapper mr-3 flex-shrink-0 flex items-center justify-center rounded-full bg-yellow-500/20 w-8 h-8 text-yellow-400 shadow-sm">
                    <i class="fas fa-exclamation-triangle text-sm"></i>
                </div>
                <p class="text-yellow-300 text-sm">No model is currently loaded. Click "Load" on any model below to start using it.</p>
            </div>
        `;
        availableModelsList.appendChild(noteElement);

        // Add a section title
        const titleElement = document.createElement('div');
        titleElement.className = 'mb-4 pb-2 border-b border-white/10 flex items-center';
        titleElement.innerHTML = `
            <div class="icon-wrapper mr-3 flex items-center justify-center rounded-full bg-purple-500/20 w-8 h-8 text-purple-400 shadow-md">
                <i class="fas fa-list-ul text-sm"></i>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-blue-400">Available Models</h3>
                <p class="text-gray-400 text-sm">Select a model to load it</p>
            </div>
        `;
        availableModelsList.appendChild(titleElement);

        // Add each model to the list
        models.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.id = `model-${model.id}`;
            modelElement.className = 'p-4 bg-darkBg/70 rounded-xl text-white mb-3 border border-white/5 transition-all duration-300 hover:border-blue-500/30 hover:shadow-md';

            modelElement.className = 'model-item';
            modelElement.innerHTML = `
                <div class="model-icon bg-blue-500/20 text-blue-400" data-model-id="${model.id}" title="Click to see full model name">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="model-content">
                    <div class="model-name" title="${model.id}">${model.id}</div>
                </div>
                <div class="model-actions">
                    <button class="load-model-btn"><i class="fas fa-plug"></i>Load</button>
                </div>
            `;

            availableModelsList.appendChild(modelElement);

            // Add event listener to the load button
            const loadButton = modelElement.querySelector('.load-model-btn');
            if (loadButton) {
                loadButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await loadModel(model.id);
                });

                // If a model is currently loading, disable this button
                if (isModelLoading) {
                    loadButton.disabled = true;
                    loadButton.classList.add('opacity-50', 'cursor-not-allowed');
                    loadButton.classList.remove('hover:from-blue-600', 'hover:to-blue-700');
                }
            }

            // Add event listener to the model icon to show full model name
            const modelIcon = modelElement.querySelector('.model-icon');
            if (modelIcon) {
                console.log('Setting up click handler for potential model icon:', model.id);
                modelIcon.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Potential model icon clicked:', model.id);
                    currentModelFullName = model.id;
                    showFullModelNameModal();
                };
            }

            // Add event listener to the model name to show full model name
            const modelName = modelElement.querySelector('.model-name');
            if (modelName) {
                console.log('Setting up click handler for potential model name:', model.id);
                modelName.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Potential model name clicked:', model.id);
                    currentModelFullName = model.id;
                    showFullModelNameModal();
                };
                // Add cursor pointer to indicate it's clickable
                modelName.style.cursor = 'pointer';
            }
        });
    }
}

/**
 * Displays a message when no models are available
 */
function displayNoModelsAvailable() {
    if (currentModelDisplay) {
        currentModelDisplay.innerHTML = `
            <div class="flex items-center">
                <div class="icon-wrapper mr-3 flex-shrink-0 flex items-center justify-center rounded-full bg-yellow-500/20 w-8 h-8 text-yellow-400 shadow-md">
                    <i class="fas fa-exclamation-triangle text-sm"></i>
                </div>
                <div class="flex-1 min-w-0 current-model-name-container">
                    <span class="break-words current-model-name">No models available</span>
                </div>
            </div>
        `;


    }
}

/**
 * Displays a message when models are available but not loaded
 */
function displayNoModelsLoaded() {
    if (currentModelDisplay) {
        currentModelDisplay.innerHTML = `
            <div class="flex items-center">
                <div class="icon-wrapper mr-3 flex-shrink-0 flex items-center justify-center rounded-full bg-yellow-500/20 w-8 h-8 text-yellow-400 shadow-md">
                    <i class="fas fa-exclamation-triangle text-sm"></i>
                </div>
                <div class="flex-1 min-w-0 current-model-name-container">
                    <span class="break-words current-model-name">No model loaded - select a model below to load it</span>
                </div>
            </div>
        `;


    }
}

/**
 * Displays a server error message
 */
function displayServerError() {
    if (currentModelDisplay) {
        currentModelDisplay.innerHTML = `
            <div class="flex items-center">
                <div class="icon-wrapper mr-3 flex-shrink-0 flex items-center justify-center rounded-full bg-red-500/20 w-8 h-8 text-red-400 shadow-md">
                    <i class="fas fa-exclamation-circle text-sm"></i>
                </div>
                <div class="flex-1 min-w-0 current-model-name-container">
                    <span class="break-words current-model-name">Server not responding</span>
                </div>
            </div>
        `;


    }

    if (availableModelsList) {
        availableModelsList.innerHTML = `
            <div class="p-5 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 shadow-md">
                <div class="flex items-start mb-3">
                    <div class="icon-wrapper mr-3 flex-shrink-0 flex items-center justify-center rounded-full bg-red-500/20 w-8 h-8 text-red-400 shadow-md">
                        <i class="fas fa-exclamation-circle text-sm"></i>
                    </div>
                    <div>
                        <p class="text-red-400 font-medium">Connection Error</p>
                        <p class="text-gray-300 text-sm mt-1">Unable to connect to the LM Studio server. Please check:</p>
                    </div>
                </div>
                <ul class="list-none pl-11 mt-3 space-y-2 text-gray-300 text-sm">
                    <li class="flex items-center"><i class="fas fa-circle text-[6px] text-gray-500 mr-2"></i> LM Studio is running and the server is started</li>
                    <li class="flex items-center"><i class="fas fa-circle text-[6px] text-gray-500 mr-2"></i> The correct IP address and port are set in Settings</li>
                    <li class="flex items-center"><i class="fas fa-circle text-[6px] text-gray-500 mr-2"></i> "CORS" and "Serve on local network" are enabled in LM Studio</li>
                </ul>
            </div>
        `;
    }
}

/**
 * Shows the full model name modal
 */
function showFullModelNameModal() {
    console.log('Showing full model name modal with:', currentModelFullName);
    
    if (fullModelNameModal && fullModelNameDisplay) {
        // Set the model name text
        fullModelNameDisplay.textContent = currentModelFullName;
        
        // Show the modal
        fullModelNameModal.classList.remove('hidden');
        
        // Add fade in animation
        const modalContent = fullModelNameModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('animate-modal-in');
            setTimeout(() => {
                modalContent.classList.remove('animate-modal-in');
            }, 300);
        }
    } else {
        console.error('Full model name modal element not found in the DOM');
    }
}

/**
 * Closes the full model name modal
 */
function closeFullModelNameModal() {
    if (fullModelNameModal) {
        fullModelNameModal.classList.add('hidden');
    }
}

/**
 * Shows the model loading modal with animations
 * @param {string} modelName - Name of the model being loaded
 */
function showModelLoadingModal(modelName) {
    if (!modelLoadingModal) {
        console.error('Model loading modal element not found');
        return;
    }

    // Set the model name
    if (modelLoadingName) {
        modelLoadingName.textContent = modelName;
    }

    // Reset loading status
    if (modelLoadingStatus) {
        modelLoadingStatus.innerHTML = 'Initializing<span class="loading-dots">...</span>';
    }

    // Show the modal with fade-in animation
    modelLoadingModal.classList.remove('hidden');
    
    // Start the status animation cycle
    startLoadingStatusAnimation();
    
    console.log(`Showing loading modal for model: ${modelName}`);
}

/**
 * Hides the model loading modal
 */
function hideModelLoadingModal() {
    if (!modelLoadingModal) {
        console.error('Model loading modal element not found');
        return;
    }

    // Stop any ongoing animations
    stopLoadingStatusAnimation();

    // Hide the modal with fade-out animation
    modelLoadingModal.classList.add('hidden');
    
    console.log('Hiding loading modal');
}

/**
 * Updates the loading status text with different messages
 */
let loadingStatusInterval;
const loadingMessages = [
    'Initializing<span class="loading-dots">...</span>',
    'Loading model files<span class="loading-dots">...</span>',
    'Preparing neural network<span class="loading-dots">...</span>',
    'Optimizing for your system<span class="loading-dots">...</span>',
    'Almost ready<span class="loading-dots">...</span>'
];
let currentMessageIndex = 0;

function startLoadingStatusAnimation() {
    if (!modelLoadingStatus) return;
    
    // Clear any existing interval
    if (loadingStatusInterval) {
        clearInterval(loadingStatusInterval);
    }
    
    // Reset message index
    currentMessageIndex = 0;
    
    // Update status every 2 seconds
    loadingStatusInterval = setInterval(() => {
        currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
        modelLoadingStatus.innerHTML = loadingMessages[currentMessageIndex];
    }, 2000);
}

function stopLoadingStatusAnimation() {
    if (loadingStatusInterval) {
        clearInterval(loadingStatusInterval);
        loadingStatusInterval = null;
    }
}



/**
 * Shows mobile instructions if the user is on a smartphone
 */
function showMobileInstructionsIfNeeded() {
    const mobileInstructions = document.getElementById('mobile-instructions');
    if (mobileInstructions) {
        // Check if user is on a smartphone (767px or below)
        const isSmartphone = window.innerWidth <= 767;

        if (isSmartphone) {
            mobileInstructions.classList.remove('hidden');
            console.log('Showing mobile instructions for smartphone user');
        } else {
            mobileInstructions.classList.add('hidden');
            console.log('Hiding mobile instructions for tablet/desktop user');
        }
    }
}