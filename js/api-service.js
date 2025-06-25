// API Service for handling server communication
import { serverIpInput, serverPortInput, loadedModelDisplay } from './dom-elements.js';
import { getLightThemeEnabled } from './settings-manager.js';

let API_URL = '';
let availableModels = [];

// Add global model tracking declaration to make TypeScript/linting happy
// window.currentLoadedModel tracks the currently loaded model name
// Add a flag to track if this is the initial startup
window.isInitialStartup = true;

/**
 * Updates the server URL based on IP and port inputs
 */
export function updateServerUrl() {
    const ip = serverIpInput.value.trim();
    const port = serverPortInput.value.trim();

    if (ip && port) {
        API_URL = `http://${ip}:${port}/v1/chat/completions`;
        localStorage.setItem('serverIp', ip);
        localStorage.setItem('serverPort', port);
        fetchAvailableModels();
    }
}

/**
 * Fetches available models from the server
 * @returns {Promise<Array>} - Array of available model objects
 */
export async function fetchAvailableModels() {
    try {
        if (!serverIpInput || !serverPortInput) {
            console.error('Server IP or port input elements not found');
            return [];
        }

        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();

        if (!ip || !port) {
            console.error('Server IP or port is empty');
            return [];
        }

        // Add a timeout to the fetch request to prevent long waits
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            const modelsResponse = await fetch(`http://${ip}:${port}/v1/models`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!modelsResponse.ok) {
                console.error('Failed to fetch models, server returned:', modelsResponse.status, modelsResponse.statusText);
                availableModels = []; // Ensure availableModels is empty
                if (loadedModelDisplay) {
                    loadedModelDisplay.classList.add('hidden');
                }
                return [];
            }

            const data = await modelsResponse.json();
            console.log('Raw API response from /v1/models:', data);

            if (!data || !data.data || !Array.isArray(data.data)) {
                console.error('Invalid response format from server:', data);
                availableModels = []; // Ensure availableModels is empty
                if (loadedModelDisplay) {
                    loadedModelDisplay.classList.add('hidden');
                }
                return [];
            }

            const modelsList = data.data;
            console.log('Models list from API:', modelsList);

            // Try to determine which model is loaded through multiple methods

            // Method 1: Look for status flags in the API response directly - add more possible attributes to check
            let loadedModelInfo = modelsList.find(model =>
                model.ready === true ||
                model.loaded === true ||
                model.active === true ||
                model.current === true ||
                model.status === 'loaded' ||
                model.status === 'ready' ||
                model.state === 'loaded' ||
                model.state === 'ready' ||
                model.status === 'active' ||
                model.state === 'active'
            );

            // Method 2: If no model is marked as loaded, check if we can get info via a different endpoint
            if (!loadedModelInfo) {
                try {
                    // Try different endpoints that LM Studio might use
                    const endpoints = [
                        '/v1/internal/model/info',
                        '/v1/model/info',
                        '/v1/models/info',
                        '/v1/models/current'
                    ];

                    for (const endpoint of endpoints) {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 2000); // shorter timeout for info endpoints

                            const modelInfoResponse = await fetch(`http://${ip}:${port}${endpoint}`, {
                                method: 'GET',
                                signal: controller.signal
                            }).catch(() => {
                                // Silently catch network errors
                                return { ok: false };
                            });

                            clearTimeout(timeoutId);

                            if (modelInfoResponse.ok) {
                                const modelInfo = await modelInfoResponse.json();
                                console.log(`Model info from ${endpoint}:`, modelInfo);

                                if (modelInfo && modelInfo.id) {
                                    // Find the matching model in our list
                                    loadedModelInfo = modelsList.find(model => model.id === modelInfo.id);
                                    if (loadedModelInfo) {
                                        console.log('Found loaded model through info endpoint:', loadedModelInfo.id);
                                        break;
                                    }
                                }
                            } else {
                                // Don't log errors for expected 400 responses
                                console.log(`Endpoint ${endpoint} not available or returned non-OK response`);
                            }
                        } catch (endpointError) {
                            // Don't log the full error, just note that it wasn't available
                            console.log(`Endpoint ${endpoint} not supported by this LM Studio version`);
                        }
                    }
                } catch (infoError) {
                    console.log('Info endpoints not available or no model loaded:', infoError);
                }
            }

            // Method 3: If we still couldn't detect a loaded model, try making a simple completion request
            // This will help detect if a model is actually loaded even if the API doesn't report it
            if (!loadedModelInfo && modelsList.length > 0) {
                try {
                    console.log('Trying to detect loaded model via completion API...');
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const chatResponse = await fetch(`http://${ip}:${port}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [
                                { role: 'system', content: 'You are a helpful assistant.' },
                                { role: 'user', content: 'test' }
                            ],
                            max_tokens: 1,
                            stream: false
                        }),
                        signal: controller.signal
                    }).catch(() => {
                        return { ok: false };
                    });

                    clearTimeout(timeoutId);

                    if (chatResponse.ok) {
                        const result = await chatResponse.json();
                        console.log('Completion API response:', result);

                        if (result && result.model) {
                            console.log('Found model ID from completion API:', result.model);
                            // Find this model in our list
                            loadedModelInfo = modelsList.find(model => model.id === result.model);
                            if (!loadedModelInfo && modelsList.length > 0) {
                                // If we can't find the exact model but know one is loaded, use the first one
                                console.log('Model from completion API not in list, assuming first model');
                                loadedModelInfo = modelsList[0];
                            }
                        }
                    } else {
                        console.log('Completion API not available or no model loaded');
                    }
                } catch (completionError) {
                    console.log('Error checking completion API:', completionError);
                }
            }

            // Method 4: Use the previously stored model if it's in the list
            if (!loadedModelInfo && window.currentLoadedModel) {
                const matchingModel = modelsList.find(model => model.id === window.currentLoadedModel);
                if (matchingModel) {
                    console.log('Using previously stored loaded model:', window.currentLoadedModel);
                    loadedModelInfo = matchingModel;
                }
            }

            if (loadedModelInfo) {
                // We found a loaded model
                console.log('Found loaded model:', loadedModelInfo.id);
                availableModels = [loadedModelInfo.id];

                // Store the loaded model name in a global variable for easy access
                window.currentLoadedModel = loadedModelInfo.id;
                console.log('Set global currentLoadedModel to:', loadedModelInfo.id);

                // Check saved banner visibility preference before showing
                const modelBannerVisible = localStorage.getItem('modelBannerVisible');

                if (modelBannerVisible !== 'false') {
                    // Only show the banner if it wasn't explicitly hidden by the user
                    updateLoadedModelDisplay(loadedModelInfo.id);

                    // Ensure the model banner is visible
                    if (loadedModelDisplay) {
                        loadedModelDisplay.classList.remove('hidden');
                    }
                } else {
                    console.log('Model banner was previously hidden by user, keeping it hidden');
                    // Still update the model name but keep it hidden
                    if (loadedModelDisplay) {
                        loadedModelDisplay.textContent = `Loaded Model: ${loadedModelInfo.id}`;
                        hideLoadedModelDisplay(false); // Don't save the state again
                    }
                }
            } else {
                // No loaded model found in the API response
                console.log('No loaded model found after all detection methods');
                availableModels = []; // No model is truly loaded
                window.currentLoadedModel = null; // Clear the global variable
                console.log('Cleared global currentLoadedModel');

                // Check if the banner was manually shown by the user
                const manuallyShown = loadedModelDisplay &&
                                    (loadedModelDisplay.dataset.manuallyShown === 'true');

                // Check if the banner was shown recently (within the last 10 seconds)
                const manuallyShownAt = localStorage.getItem('modelBannerManuallyShownAt');
                const recentlyShown = manuallyShownAt &&
                                    (Date.now() - parseInt(manuallyShownAt)) < 10000; // 10 seconds

                // Only hide the model banner if it wasn't manually shown by user
                if (!manuallyShown && !recentlyShown) {
                    hideLoadedModelDisplay();
                } else {
                    console.log('Banner was manually shown by user, keeping it visible even with no model loaded');
                    // If the banner is already showing, make sure it still shows "No model loaded"
                    if (loadedModelDisplay && !loadedModelDisplay.classList.contains('hidden')) {
                        loadedModelDisplay.textContent = 'No model loaded';
                        loadedModelDisplay.dataset.hasLoadedModel = 'false';
                    }
                }
            }

            // Return the full model data for UI display
            return modelsList;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('Error fetching models:', fetchError);
            availableModels = []; // Ensure availableModels is empty
            if (loadedModelDisplay) {
                loadedModelDisplay.classList.add('hidden');
            }
            return [];
        }
    } catch (error) {
        console.error('Unexpected error in fetchAvailableModels:', error);
        availableModels = []; // Ensure availableModels is empty
        if (loadedModelDisplay) {
            loadedModelDisplay.classList.add('hidden');
        }
        return [];
    }
}

/**
 * Updates the loaded model display
 * @param {string} modelName - The name of the loaded model
 * @param {boolean} forceShow - Whether to force showing the banner regardless of settings (no longer used)
 */
export function updateLoadedModelDisplay(modelName, forceShow = false) {
    if (loadedModelDisplay) {
        // Always update global variable with current model name
        window.currentLoadedModel = modelName;

        // Update the text content (even though it's hidden)
        loadedModelDisplay.textContent = `Loaded Model: ${modelName}`;

        // Set data attribute to indicate a model is loaded
        loadedModelDisplay.dataset.hasLoadedModel = 'true';

        // Banner is always hidden now, so we don't need to show it
        // Just ensure the CSS variable is set to 0
        document.documentElement.style.setProperty('--loaded-model-height', '0px');

        // Update welcome message position (with banner hidden)
        import('./ui-manager.js').then(module => {
            // Check if welcome message is visible before adjusting its position
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                module.ensureWelcomeMessagePosition();
            }
        });
    }
}

/**
 * Hides the loaded model display
 */
export function hideLoadedModelDisplay(saveState = true) {
    if (loadedModelDisplay) {
        // Set the hidden properties
        loadedModelDisplay.style.maxHeight = '0';
        loadedModelDisplay.style.opacity = '0';
        loadedModelDisplay.style.transform = 'translateY(-100%)';
        loadedModelDisplay.style.visibility = 'hidden';

        // Add the hidden class
        loadedModelDisplay.classList.add('hidden');

        // Hide the wrapper
        const modelWrapper = document.getElementById('loaded-model-wrapper');
        if (modelWrapper) {
            modelWrapper.style.display = 'none';
            // Reset the CSS variable to 0
            document.documentElement.style.setProperty('--loaded-model-height', '0px');
        }

        // Always store banner state as hidden
        localStorage.setItem('modelBannerVisible', 'false');

        // Update welcome message position
        import('./ui-manager.js').then(module => {
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage && welcomeMessage.style.display !== 'none') {
                module.ensureWelcomeMessagePosition();
            }
        });

        // Don't clear the global model variable when hiding the banner
        // This ensures the models modal still recognizes the loaded model even when the banner is hidden
    }
}

/**
 * Checks if the server is running
 * @returns {Promise<boolean>} - True if server is running, false otherwise
 */
export async function isServerRunning() {
    try {
        if (!serverIpInput || !serverPortInput) {
            console.error('Server IP or port input elements not found');
            return false;
        }

        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();

        if (!ip || !port) {
            console.error('Server IP or port is empty');
            return false;
        }

        // Add a timeout to the fetch request to prevent long waits
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            const response = await fetch(`http://${ip}:${port}/v1/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('Error checking server status:', fetchError);
            return false;
        }
    } catch (error) {
        console.error('Unexpected error in isServerRunning:', error);
        return false;
    }
}

/**
 * Try different known LM Studio API endpoints for an operation
 * @param {string} ip - Server IP
 * @param {string} port - Server port
 * @param {string} operation - Operation name for logging
 * @param {Array} endpoints - Array of endpoint objects with path and method
 * @param {Object} requestData - Request data to send
 * @returns {Promise<boolean>} - True if any endpoint succeeds
 */
async function tryEndpoints(ip, port, operation, endpoints, requestData = null) {
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying ${operation} with endpoint: ${endpoint.path}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            };

            // Always include a body for POST/PUT methods, even if it's an empty object
            if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
                options.body = JSON.stringify(requestData || {});
            }

            const response = await fetch(`http://${ip}:${port}${endpoint.path}`, options)
                .catch(err => {
                    console.log(`Network error with ${endpoint.path}: ${err.name === 'AbortError' ? 'timeout' : 'connection failed'}`);
                    return { ok: false };
                });

            clearTimeout(timeoutId);

            if (response.ok) {
                console.log(`${operation} successful with endpoint: ${endpoint.path}`);
                return true;
            } else if (response.status) {
                console.log(`${operation} failed with endpoint ${endpoint.path}: HTTP ${response.status}`);
            } else {
                console.log(`${operation} failed with endpoint ${endpoint.path}: Network error`);
            }
        } catch (error) {
            console.log(`Error trying ${endpoint.path} for ${operation}: ${error.message || 'Unknown error'}`);
        }
    }

    return false;
}

/**
 * Wait for a model to be loaded (with timeout)
 * @param {string} ip - Server IP
 * @param {string} port - Server port
 * @param {string} modelId - Model ID to check
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<boolean>} - True if model is loaded
 */
async function waitForModelLoad(ip, port, modelId, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            console.log(`Checking if model is loaded (attempt ${attempt + 1}/${maxAttempts})...`);

            // Make a simple test completion to see if the model responds
            const testResponse = await fetch(`http://${ip}:${port}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: 'test' }
                    ],
                    max_tokens: 1,
                    stream: false
                }),
                timeout: 2000
            });

            if (testResponse.ok) {
                            // Read the completed text - this confirms the model is actually loaded
            const response = await testResponse.json();
            console.log(`Model ${modelId} is now loaded and responding:`, response);

            // Store the current loaded model in a global variable for easy access
            window.currentLoadedModel = modelId;

            return true;
            }
        } catch (error) {
            console.log(`Model not loaded yet, waiting...`, error);
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`Model ${modelId} failed to load after ${maxAttempts} attempts`);
    return false;
}

/**
 * Force load a model in LM Studio
 * This bypasses the API endpoints and uses the completion API itself
 * @param {string} ip - Server IP
 * @param {string} port - Server port
 * @param {string} modelId - Model ID to load
 * @returns {Promise<boolean>} - True if successful
 */
async function forceLoadModel(ip, port, modelId) {
    try {
        console.log(`Force loading model ${modelId} via completion API...`);

        // Make a special completion request that forces model loading
        // The long prompt forces LM Studio to fully load the model
        const response = await fetch(`http://${ip}:${port}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant. Please respond with a single word: "LOADED" to indicate you are working properly.'
                    },
                    {
                        role: 'user',
                        content: 'Please respond with exactly one word: "LOADED". This is to verify you are working correctly.'
                    }
                ],
                temperature: 0.1,
                max_tokens: 10,
                stream: false
            }),
            timeout: 60000 // Long timeout to give the model time to load
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`Force load response:`, result);
            return true;
        } else {
            console.error(`Force load failed with status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Error during force load:`, error);
        return false;
    }
}

/**
 * Loads a model in LM Studio
 * @param {string} modelId - The ID of the model to load
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function loadModel(modelId) {
    try {
        if (!serverIpInput || !serverPortInput) {
            console.error('Server IP or port input elements not found');
            return false;
        }

        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();

        if (!ip || !port) {
            console.error('Server IP or port is empty');
            return false;
        }

        console.log(`Attempting to load model: ${modelId}`);

        // Try the direct model loading approach first
        // Some LM Studio versions have direct APIs
        const loadEndpoints = [
            { path: '/v1/internal/model/load', method: 'POST' },
            { path: '/v1/model/load', method: 'POST' },
            { path: '/v1/models/load', method: 'POST' },
            { path: `/v1/models/${modelId}/load`, method: 'POST' }
        ];

        const requestData = { model_id: modelId };
        const directSuccess = await tryEndpoints(ip, port, 'Load model', loadEndpoints, requestData);

        // If the endpoint call succeeds, verify the model is actually loaded by making a test request
        if (directSuccess) {
            console.log(`API endpoint reported success, verifying model is actually loaded...`);
            const verified = await waitForModelLoad(ip, port, modelId, 5);

            if (verified) {
                console.log(`Successfully verified ${modelId} is loaded via endpoint method`);
                await fetchAvailableModels();
                return true;
            } else {
                console.log(`API endpoint succeeded but model is not actually loaded, trying force load...`);
            }
        }

        // If direct loading failed or verification failed, use the force load method
        // This is the most reliable method to make LM Studio actually switch models
        const forceSuccess = await forceLoadModel(ip, port, modelId);

        if (forceSuccess) {
            console.log(`Successfully loaded ${modelId} via force load method`);
            await fetchAvailableModels();
            return true;
        }

        console.error(`All methods failed to load model ${modelId}`);
        return false;
    } catch (error) {
        console.error('Error loading model:', error);
        return false;
    }
}

/**
 * Ejects (unloads) the current model from LM Studio
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function ejectModel() {
    try {
        if (!serverIpInput || !serverPortInput) {
            console.error('Server IP or port input elements not found');
            return false;
        }

        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();

        if (!ip || !port) {
            console.error('Server IP or port is empty');
            return false;
        }

        console.log('Attempting to eject model');

        // Try all known eject model endpoints
        const ejectEndpoints = [
            { path: '/v1/internal/model/unload', method: 'POST' },
            { path: '/v1/model/unload', method: 'POST' },
            { path: '/v1/models/unload', method: 'POST' }
        ];

        // Try the endpoints with an empty request body
        let success = await tryEndpoints(ip, port, 'Eject model', ejectEndpoints, {});

        // If direct API methods fail, try to determine the currently loaded model ID
        // and use a different approach
        if (!success) {
            console.log('Standard eject endpoints failed, trying to identify current model...');

            try {
                // Get the current models list to find which one is loaded
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const modelsResponse = await fetch(`http://${ip}:${port}/v1/models`, {
                    signal: controller.signal
                }).catch(() => {
                    return { ok: false };
                });

                clearTimeout(timeoutId);

                if (modelsResponse.ok) {
                    const data = await modelsResponse.json();
                    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
                        // Try to find which model is loaded
                        const loadedModel = data.data.find(model =>
                            model.ready === true ||
                            model.loaded === true ||
                            model.status === 'loaded' ||
                            model.status === 'ready' ||
                            model.state === 'loaded' ||
                            model.state === 'ready'
                        );

                        if (loadedModel) {
                            console.log(`Found loaded model: ${loadedModel.id}, trying model-specific eject...`);

                            // Try model-specific unload endpoints
                            const modelSpecificEndpoints = [
                                { path: `/v1/models/${loadedModel.id}/unload`, method: 'POST' }
                            ];

                            success = await tryEndpoints(ip, port, 'Model-specific eject', modelSpecificEndpoints, {});
                        } else {
                            console.log('No loaded model found in models list');
                        }
                    } else {
                        console.log('Invalid or empty models response:', data);
                    }
                } else {
                    console.log('Failed to fetch models for model-specific ejection');
                }
            } catch (modelCheckError) {
                console.log('Error checking for loaded model:', modelCheckError.message || 'Unknown error');
            }
        }

        if (success) {
            console.log('Successfully ejected model');
            // Clear the available models list and hide the model display
            availableModels = [];
            // This is where we SHOULD clear the global variable as the model is actually being ejected
            window.currentLoadedModel = null;

            // Since we're actually ejecting the model, we need to update the UI
            // Call hideLoadedModelDisplay but prevent it from clearing currentLoadedModel again
            if (loadedModelDisplay) {
                loadedModelDisplay.classList.add('hidden');
                loadedModelDisplay.dataset.hasLoadedModel = 'false';
            }

            // Verify the model was actually ejected
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchAvailableModels();

            return true;
        } else {
            console.log('All eject endpoints failed - the model may still be loaded');

            // Force a refresh of the models list to update the UI regardless
            await fetchAvailableModels();

            return false;
        }
    } catch (error) {
        console.log('Error in ejectModel:', error.message || 'Unknown error');

        // Try to refresh the models list to at least update the UI
        try {
            await fetchAvailableModels();
        } catch (refreshError) {
            console.log('Failed to refresh models after eject error');
        }

        return false;
    }
}

/**
 * Gets the API URL
 * @returns {string} - The current API URL
 */
export function getApiUrl() {
    if (!API_URL && serverIpInput && serverPortInput) {
        const ip = serverIpInput.value.trim();
        const port = serverPortInput.value.trim();

        if (ip && port) {
            API_URL = `http://${ip}:${port}/v1/chat/completions`;
            console.log('API URL was not set, creating from inputs:', API_URL);
        }
    }

    return API_URL;
}

/**
 * Gets the available models
 * @returns {Array} - Array of available model IDs
 */
export function getAvailableModels() {
    // Since availableModels contains string IDs, not objects, just return the array directly
    return [...availableModels]; // Return a copy of the array
}

/**
 * Loads saved server settings from localStorage
 */
export function loadServerSettings() {
    const savedIp = localStorage.getItem('serverIp');
    const savedPort = localStorage.getItem('serverPort');

    if (serverIpInput && serverPortInput) {
        if (savedIp) serverIpInput.value = savedIp;
        if (savedPort) serverPortInput.value = savedPort;

        if (savedIp && savedPort) {
            API_URL = `http://${savedIp}:${savedPort}/v1/chat/completions`;
            // Fetch models after setting the API URL, but set a flag to indicate this is the initial load
            window.isInitialStartup = true;
            setTimeout(() => fetchAvailableModels(), 500);
            // Reset the flag after a delay to allow for normal operation later
            setTimeout(() => {
                window.isInitialStartup = false;
            }, 2000);
        }

        // Add event listeners for IP and port inputs
        serverIpInput.addEventListener('change', updateServerUrl);
        serverPortInput.addEventListener('change', updateServerUrl);

        // Apply to both input fields
        [serverIpInput, serverPortInput].forEach(input => {
            // Remove any inline styles to allow CSS variables to work
            input.style.removeProperty('background-color');
            input.style.removeProperty('color');

            // Add classes to ensure proper styling
            input.classList.add('theme-aware-input');
        });
    }
}
