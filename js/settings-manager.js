// Settings Manager for handling application settings
import { systemPromptInput, hideThinkingCheckbox, autoGenerateTitlesCheckbox, themeToggleCheckbox } from './dom-elements.js';
import { applyThinkingVisibility, refreshAllMessages } from './ui-manager.js';
import { debugLog } from './utils.js';

// Default system prompt is empty unless user explicitly sets one
const DEFAULT_SYSTEM_PROMPT = '';

let systemPrompt = DEFAULT_SYSTEM_PROMPT;
let isUserCreatedSystemPrompt = false; // Flag to track if the system prompt was created by the user
let temperature = 0.3;
let hideThinking = false;
let autoGenerateTitles = false;
let lightThemeEnabled = false;
let reasoningTimeout = 300; // Default 5 minutes for reasoning models (in seconds)
let defaultModelId = null; // Default model to auto-select when models load

/**
 * Initializes temperature settings
 */
export function initializeTemperature() {
    const temperatureInput = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperature-value');
    const temperatureLock = document.getElementById('temperature-lock');

    if (temperatureInput && temperatureValue && temperatureLock) {
        // Add comprehensive event prevention for disabled state
        const preventInteractionWhenDisabled = (e) => {
            if (temperatureInput.disabled) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        };

        // Block all interaction events when disabled
        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'touchmove', 'keydown', 'keyup', 'focus'].forEach(eventType => {
            temperatureInput.addEventListener(eventType, preventInteractionWhenDisabled, { capture: true, passive: false });
        });

        temperatureInput.addEventListener('input', (e) => {
            // Prevent processing input events when slider is disabled
            if (temperatureInput.disabled) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            const inputValue = temperatureInput.value;
            const parsedValue = parseFloat(inputValue);

            if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 2.0 && /^\d*\.?\d{0,1}$/.test(inputValue)) {
                temperature = parsedValue;
                temperatureValue.textContent = temperature.toFixed(1);
                localStorage.setItem('temperature', temperature);
            } else {
                temperatureInput.value = temperature.toFixed(1);
            }
        });

        // Track lock state explicitly to avoid browser confusion
        let isLocked = true; // Start locked
        
        // Event prevention for when locked
        const preventSliderInteraction = (e) => {
            if (isLocked) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        };
        
        // Add comprehensive event blocking
        ['mousedown', 'mouseup', 'mousemove', 'click', 'touchstart', 'touchend', 'touchmove', 'input', 'change'].forEach(eventType => {
            temperatureInput.addEventListener(eventType, preventSliderInteraction, { capture: true, passive: false });
        });
        
        // Helper function to apply locked state
        const applyLockedState = () => {
            temperatureInput.disabled = true;
            temperatureInput.style.pointerEvents = 'none';
            temperatureInput.style.cursor = 'not-allowed';
            temperatureInput.style.opacity = '0.6';
            temperatureInput.style.background = '#6b7280';
            temperatureInput.setAttribute('readonly', 'true');
            temperatureLock.innerHTML = '<i class="fas fa-lock text-red-400"></i>';
            temperatureLock.title = 'Temperature is locked (click to unlock)';
        };
        
        // Helper function to apply unlocked state
        const applyUnlockedState = () => {
            temperatureInput.disabled = false;
            temperatureInput.style.pointerEvents = 'auto';
            temperatureInput.style.cursor = 'pointer';
            temperatureInput.style.opacity = '';
            temperatureInput.style.background = '';
            temperatureInput.removeAttribute('readonly');
            temperatureLock.innerHTML = '<i class="fas fa-unlock text-green-400"></i>';
            temperatureLock.title = 'Temperature is unlocked (click to lock)';
        };

        // Add event listener
        temperatureLock.addEventListener('click', () => {
            if (isLocked) {
                // Currently locked, unlock it
                isLocked = false;
                applyUnlockedState();
            } else {
                // Currently unlocked, lock it
                isLocked = true;
                applyLockedState();
            }
            
            // Force a repaint
            temperatureInput.offsetHeight;
        });

        // Load saved temperature
        const savedTemperature = localStorage.getItem('temperature');
        if (savedTemperature) {
            const parsedTemperature = parseFloat(savedTemperature);
            if (!isNaN(parsedTemperature) && parsedTemperature >= 0 && parsedTemperature <= 2.0) {
                temperatureInput.value = parsedTemperature.toFixed(1);
                temperature = parsedTemperature;
                temperatureValue.textContent = temperature.toFixed(1);
            } else {
                // If saved temperature is invalid, set to default
                temperatureInput.value = '0.3';
                temperature = 0.3;
                temperatureValue.textContent = '0.3';
            }
        } else {
            // Set default temperature to 0.3
            temperatureInput.value = '0.3';
            temperature = 0.3;
            temperatureValue.textContent = '0.3';
        }

        // Apply initial locked state after value is set
        setTimeout(() => {
            applyLockedState();
            // Force a repaint to ensure styles are applied
            temperatureInput.offsetHeight;
        }, 50); // Longer delay to ensure DOM is fully ready
    }
}

/**
 * Initializes system prompt settings
 */
export function initializeSystemPrompt() {
    if (systemPromptInput) {
        // Get the display element
        const systemPromptDisplay = document.getElementById('system-prompt-display');

        // Set up event listeners for both the original textarea and the display element
        systemPromptInput.addEventListener('change', () => {
            systemPrompt = systemPromptInput.value;

            // Mark the system prompt as user-created when explicitly set
            isUserCreatedSystemPrompt = true;
            // Save both the prompt and the flag
            localStorage.setItem('systemPrompt', systemPrompt);
            localStorage.setItem('isUserCreatedSystemPrompt', 'true');
            debugLog('Saved user-created system prompt:', systemPrompt);

            // Sync the display element if it exists
            if (systemPromptDisplay) {
                systemPromptDisplay.textContent = systemPrompt;
            }
        });


        // Load saved system prompt
        const savedPrompt = localStorage.getItem('systemPrompt');
        const savedIsUserCreated = localStorage.getItem('isUserCreatedSystemPrompt') === 'true';

        debugLog('Loading system prompt - Saved prompt:', savedPrompt);
        debugLog('Is user-created:', savedIsUserCreated);

        if (savedPrompt && savedPrompt.trim() !== '') {
            // If we have a saved prompt, always load it
            systemPromptInput.value = savedPrompt;
            systemPrompt = savedPrompt;
            // Keep track of whether this is user-created
            isUserCreatedSystemPrompt = savedIsUserCreated;

            debugLog('Loaded system prompt:', systemPrompt, 'User-created:', isUserCreatedSystemPrompt);

            // Update the display element if it exists
            if (systemPromptDisplay) {
                systemPromptDisplay.textContent = savedPrompt;
            }

            // If the prompt is user-created, make sure the flag is set properly
            if (savedIsUserCreated) {
                localStorage.setItem('isUserCreatedSystemPrompt', 'true');
            }
        } else {
            // Use the default prompt if none is saved
            systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
            systemPrompt = DEFAULT_SYSTEM_PROMPT;
            isUserCreatedSystemPrompt = false;
            localStorage.setItem('systemPrompt', DEFAULT_SYSTEM_PROMPT);
            localStorage.removeItem('isUserCreatedSystemPrompt');

            // Update the display element if it exists
            if (systemPromptDisplay) {
                systemPromptDisplay.textContent = DEFAULT_SYSTEM_PROMPT;
            }

            debugLog('Using default system prompt');
        }

        // Force update any CodeMirror editor that might be showing the system prompt
        if (window.systemPromptEditor && typeof window.systemPromptEditor.setValue === 'function') {
            window.systemPromptEditor.setValue(systemPrompt);
        }
    }
}

/**
 * Loads the hide thinking setting from localStorage
 */
export function loadHideThinkingSetting() {
    if (hideThinkingCheckbox) {
        const savedHideThinking = localStorage.getItem('hideThinking');
        if (savedHideThinking === 'true') {
            hideThinkingCheckbox.checked = true;
            hideThinking = true;
        } else {
            hideThinkingCheckbox.checked = false;
            hideThinking = false;
        }
        applyThinkingVisibility();

        // After loading settings, ensure removal of any visible think tags
        if (hideThinking) {
            setTimeout(() => {
                removeVisibleThinkTags();
            }, 100);
        }

        // Add event listener for the checkbox
        hideThinkingCheckbox.addEventListener('change', saveHideThinkingSetting);
    }
}

/**
 * Saves the hide thinking setting to localStorage
 */
export function saveHideThinkingSetting() {
    if (hideThinkingCheckbox) {
        hideThinking = hideThinkingCheckbox.checked;
        localStorage.setItem('hideThinking', hideThinking);
        applyThinkingVisibility();
        refreshAllMessages(); // Refresh all messages when setting changes

        if (hideThinking) {
            removeVisibleThinkTags(); // Remove any visible think tags

            // Find all thinking indicators and automatically show content after </think> tags
            const thinkingIndicators = document.querySelectorAll('.thinking-indicator');
            thinkingIndicators.forEach(indicator => {
                // Call toggleThinkingVisibility with null to automatically show content after </think> tags
                if (window.toggleThinkingVisibility) {
                    window.toggleThinkingVisibility(null);
                }
            });
        }
    }
}

/**
 * Removes visible think tags from messages
 */
export function removeVisibleThinkTags() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    const allParagraphs = messagesContainer.querySelectorAll('p');

    allParagraphs.forEach(p => {
        // Check if paragraph contains raw think tags
        if (p.innerHTML.includes('&lt;think&gt;') && p.innerHTML.includes('&lt;/think&gt;')) {
            // Only remove the content between think tags, preserve content after </think>
            let content = p.innerHTML;

            // Extract content after the last </think> tag
            const afterThinkMatch = content.match(/&lt;\/think&gt;([\s\S]*)$/);
            let afterThinkContent = '';

            if (afterThinkMatch && afterThinkMatch[1]) {
                afterThinkContent = afterThinkMatch[1];
            }

            // Remove the think tags and their content
            content = content.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/g, '');

            // If there was content after the </think> tag, wrap it in a visible div
            if (afterThinkContent.trim() !== '') {
                content = `<div class="visible-after-think" style="display: block !important; visibility: visible !important; opacity: 1 !important;">${afterThinkContent}</div>`;
            }

            // If the paragraph only contained think tags and nothing else, hide it
            if (content.trim() === '') {
                p.style.display = 'none';
            } else {
                p.innerHTML = content;
                p.style.display = ''; // Ensure paragraph is visible if it has content
            }
        }

        // In case the literal tags got through
        if (p.innerHTML.includes('<think>') && p.innerHTML.includes('</think>')) {
            // Only remove the content between think tags, preserve content after </think>
            let content = p.innerHTML;

            // Extract content after the last </think> tag
            const afterThinkMatch = content.match(/<\/think>([\s\S]*)$/);
            let afterThinkContent = '';

            if (afterThinkMatch && afterThinkMatch[1]) {
                afterThinkContent = afterThinkMatch[1];
            }

            // Remove the think tags and their content
            content = content.replace(/<think>[\s\S]*?<\/think>/g, '');

            // If there was content after the </think> tag, wrap it in a visible div
            if (afterThinkContent.trim() !== '') {
                content = `<div class="visible-after-think" style="display: block !important; visibility: visible !important; opacity: 1 !important;">${afterThinkContent}</div>`;
            }

            // If the paragraph only contained think tags and nothing else, hide it
            if (content.trim() === '') {
                p.style.display = 'none';
            } else {
                p.innerHTML = content;
                p.style.display = ''; // Ensure paragraph is visible if it has content
            }
        }
    });
}

/**
 * Loads the auto-generate titles setting from localStorage
 */
export function loadAutoGenerateTitlesSetting() {
    if (autoGenerateTitlesCheckbox) {
        const savedAutoGenerateTitles = localStorage.getItem('autoGenerateTitles');
        if (savedAutoGenerateTitles === 'true') {
            autoGenerateTitlesCheckbox.checked = true;
            autoGenerateTitles = true;
        } else {
            autoGenerateTitlesCheckbox.checked = false;
            autoGenerateTitles = false;
        }

        // Add event listener for the checkbox
        autoGenerateTitlesCheckbox.addEventListener('change', saveAutoGenerateTitlesSetting);
    }
}

/**
 * Saves the auto-generate titles setting to localStorage
 */
export function saveAutoGenerateTitlesSetting() {
    if (autoGenerateTitlesCheckbox) {
        autoGenerateTitles = autoGenerateTitlesCheckbox.checked;
        localStorage.setItem('autoGenerateTitles', autoGenerateTitles);
    }
}



/**
 * Loads the theme setting from localStorage
 */
export function loadThemeSetting() {
    const savedTheme = localStorage.getItem('lightThemeEnabled');

    // Set the theme based on saved preference
    if (savedTheme === 'true') {
        lightThemeEnabled = true;
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark');
        document.body.classList.remove('custom-dark-mode'); // Remove custom-dark-mode class for light theme
    } else {
        lightThemeEnabled = false;
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark');
        document.body.classList.add('custom-dark-mode'); // Ensure custom-dark-mode class is present for dark theme
    }

    // Update the settings modal toggle if it exists
    if (themeToggleCheckbox) {
        themeToggleCheckbox.checked = lightThemeEnabled;

        // Change the icon to match the theme
        const themeIcon = document.querySelector('label[for="theme-toggle"] i');
        if (themeIcon) {
            if (lightThemeEnabled) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }

        // Add event listener for the checkbox
        themeToggleCheckbox.addEventListener('change', saveThemeSetting);
    }

    // Update the welcome screen toggle if it exists
    const welcomeToggle = document.getElementById('welcome-toggle');
    if (welcomeToggle) {
        welcomeToggle.checked = lightThemeEnabled;
    }

    // Dispatch a custom event to notify other components about the initial theme
    const themeChangedEvent = new CustomEvent('themeChanged', {
        detail: { lightThemeEnabled }
    });
    document.dispatchEvent(themeChangedEvent);
}

/**
 * Saves the theme setting to localStorage
 */
export function saveThemeSetting() {
    if (themeToggleCheckbox) {
        lightThemeEnabled = themeToggleCheckbox.checked;
        localStorage.setItem('lightThemeEnabled', lightThemeEnabled);

        if (lightThemeEnabled) {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark');
            document.body.classList.remove('custom-dark-mode'); // Remove custom-dark-mode class for light theme
            // Change the icon to sun when light theme is enabled
            const themeIcon = document.querySelector('label[for="theme-toggle"] i');
            if (themeIcon) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark');
            document.body.classList.add('custom-dark-mode'); // Add custom-dark-mode class for dark theme
            // Change the icon to moon when dark theme is enabled
            const themeIcon = document.querySelector('label[for="theme-toggle"] i');
            if (themeIcon) {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }

        // Update the welcome screen toggle if it exists
        const welcomeToggle = document.getElementById('welcome-toggle');
        if (welcomeToggle) {
            welcomeToggle.checked = lightThemeEnabled;
        }

        // Force refresh of sidebar styles
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // Temporarily hide and show sidebar to force style recalculation
            const originalDisplay = sidebar.style.display;
            sidebar.style.display = 'none';
            sidebar.offsetHeight; // Force reflow
            sidebar.style.display = originalDisplay;
        }

        // Dispatch a custom event to notify other components about the theme change
        const themeChangedEvent = new CustomEvent('themeChanged', {
            detail: { lightThemeEnabled }
        });
        document.dispatchEvent(themeChangedEvent);
    }
}

/**
 * Gets the current theme setting
 * @returns {boolean} - True if light theme is enabled, false otherwise
 */
export function getLightThemeEnabled() {
    return lightThemeEnabled;
}

/**
 * Gets the current reasoning timeout setting
 * @returns {number} - Timeout in seconds for reasoning models
 */
export function getReasoningTimeout() {
    return reasoningTimeout;
}

/**
 * Sets the reasoning timeout setting
 * @param {number} timeout - Timeout in seconds for reasoning models
 */
export function setReasoningTimeout(timeout) {
    if (timeout && timeout > 0) {
        reasoningTimeout = timeout;
        localStorage.setItem('reasoningTimeout', reasoningTimeout);
    }
}

/**
 * Loads the reasoning timeout setting from localStorage
 */
export function loadReasoningTimeoutSetting() {
    const savedTimeout = localStorage.getItem('reasoningTimeout');
    if (savedTimeout) {
        const parsedTimeout = parseInt(savedTimeout);
        if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
            reasoningTimeout = parsedTimeout;
        }
    }
}

/**
 * Loads all settings
 */
export function loadSettings() {
    initializeSystemPrompt();
    initializeTemperature();
    loadHideThinkingSetting();
    loadAutoGenerateTitlesSetting();
    loadThemeSetting();
    loadReasoningTimeoutSetting();
    loadDefaultModelSetting();

    // Add event listener for the welcome screen toggle
    const welcomeToggle = document.getElementById('welcome-toggle');
    if (welcomeToggle) {
        // Add event listener for the checkbox itself
        welcomeToggle.addEventListener('change', () => {
            applyWelcomeThemeToggle();
        });

        // Also add click handlers for the icons and container to improve usability
        const darkIcon = document.querySelector('#welcome-theme-toggle .dark-icon');
        const lightIcon = document.querySelector('#welcome-theme-toggle .light-icon');
        const toggleContainer = document.querySelector('#welcome-theme-toggle .toggle-container');

        if (darkIcon) {
            darkIcon.addEventListener('click', () => {
                welcomeToggle.checked = false;
                applyWelcomeThemeToggle();
            });
        }

        if (lightIcon) {
            lightIcon.addEventListener('click', () => {
                welcomeToggle.checked = true;
                applyWelcomeThemeToggle();
            });
        }

        if (toggleContainer) {
            toggleContainer.addEventListener('click', () => {
                welcomeToggle.checked = !welcomeToggle.checked;
                applyWelcomeThemeToggle();
            });
        }
    }

    // Function to apply theme changes from welcome toggle
    function applyWelcomeThemeToggle() {
        // Update the main theme toggle in settings to keep them in sync
        if (themeToggleCheckbox) {
            themeToggleCheckbox.checked = welcomeToggle.checked;
            // Trigger the save function to apply the theme change
            saveThemeSetting();
        } else {
            // If the main toggle isn't available, apply the theme directly
            lightThemeEnabled = welcomeToggle.checked;
            localStorage.setItem('lightThemeEnabled', lightThemeEnabled);

            if (lightThemeEnabled) {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark');
                document.body.classList.remove('custom-dark-mode');
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark');
                document.body.classList.add('custom-dark-mode');
            }

            // Dispatch theme changed event
            const themeChangedEvent = new CustomEvent('themeChanged', {
                detail: { lightThemeEnabled }
            });
            document.dispatchEvent(themeChangedEvent);
        }
    }
}

/**
 * Gets the current system prompt
 * @returns {string} - The current system prompt
 */
export function getSystemPrompt() {
    return systemPrompt;
}

/**
 * Sets the system prompt
 * @param {string} prompt - The new system prompt
 */
export function setSystemPrompt(prompt) {
    debugLog('Setting system prompt to:', prompt);

    // Set the system prompt
    systemPrompt = prompt;

    // Mark as user-created when explicitly set
    isUserCreatedSystemPrompt = true;
    localStorage.setItem('isUserCreatedSystemPrompt', 'true');

    // Always save the current system prompt
    localStorage.setItem('systemPrompt', systemPrompt);

    debugLog('System prompt saved. User-created:', isUserCreatedSystemPrompt);

    // Update the system prompt input if it exists
    if (systemPromptInput) {
        systemPromptInput.value = systemPrompt;

        // Trigger the change event to ensure all listeners are notified
        // But don't dispatch the event as it would trigger the change handler
        // which would overwrite our isUserCreatedSystemPrompt setting
        // Instead, just update the UI directly
    }

    // Update the system prompt display if it exists
    const systemPromptDisplay = document.getElementById('system-prompt-display');
    if (systemPromptDisplay) {
        systemPromptDisplay.textContent = systemPrompt;
    }

    // Update the system prompt preview if it exists
    const systemPromptPreview = document.getElementById('system-prompt-preview');
    const placeholderSpan = document.getElementById('prompt-placeholder');
    if (systemPromptPreview) {
        if (systemPrompt && systemPrompt.trim()) {
            // If there's content, show it in the preview
            systemPromptPreview.textContent = systemPrompt;
            // Hide the placeholder
            if (placeholderSpan) {
                placeholderSpan.style.display = 'none';
            }
        } else {
            // If empty, clear the preview and show placeholder
            if (placeholderSpan) {
                systemPromptPreview.innerHTML = '';
                systemPromptPreview.appendChild(placeholderSpan);
                placeholderSpan.style.display = '';
            } else {
                systemPromptPreview.textContent = '';
            }
        }
    }

    // Force update any CodeMirror editor that might be showing the system prompt
    if (window.systemPromptEditor && typeof window.systemPromptEditor.setValue === 'function') {
        window.systemPromptEditor.setValue(systemPrompt);
    }
}

/**
 * Checks if a system prompt is explicitly set by the user or if a character is active
 * @returns {boolean} - True if a system prompt is set or a character is active, false otherwise
 */
export function isSystemPromptSet() {
    // Character functionality has been removed - only check if system prompt exists
    
    // Log the current state for debugging
    debugLog('isSystemPromptSet check - systemPrompt:', systemPrompt);

    // Return true if the system prompt is not empty
    return systemPrompt !== '';
}

/**
 * Gets the current temperature setting
 * @returns {number} - The current temperature value
 */
export function getTemperature() {
    return temperature;
}

/**
 * Gets the current hide thinking setting
 * @returns {boolean} - The current hide thinking value
 */
export function getHideThinking() {
    return hideThinking;
}

/**
 * Gets the current auto-generate titles setting
 * @returns {boolean} - The current auto-generate titles value
 */
export function getAutoGenerateTitles() {
    return autoGenerateTitles;
}



/**
 * Checks if the current system prompt was created by the user
 * @returns {boolean} - True if the system prompt was created by the user, false otherwise
 */
export function isUserCreatedPrompt() {
    return isUserCreatedSystemPrompt;
}

/**
 * Gets the default model ID
 * @returns {string|null} - The default model ID or null if not set
 */
export function getDefaultModelId() {
    return defaultModelId;
}

/**
 * Sets the default model ID
 * @param {string|null} modelId - The model ID to set as default, or null to clear
 */
export function setDefaultModelId(modelId) {
    defaultModelId = modelId;
    if (modelId) {
        localStorage.setItem('defaultModelId', modelId);
        debugLog('Default model set to:', modelId);
    } else {
        localStorage.removeItem('defaultModelId');
        debugLog('Default model cleared');
    }
}

/**
 * Loads the default model setting from localStorage
 */
export function loadDefaultModelSetting() {
    const savedDefaultModel = localStorage.getItem('defaultModelId');
    if (savedDefaultModel) {
        defaultModelId = savedDefaultModel;
        debugLog('Loaded default model:', defaultModelId);
    } else {
        defaultModelId = null;
        debugLog('No default model set');
    }
}
