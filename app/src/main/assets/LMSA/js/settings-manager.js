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
let autoScrollEnabled = false; // Auto-scroll to bottom during LLM streaming
let reasoningTimeout = 300; // Default 5 minutes for reasoning models (in seconds)
let defaultModelId = null; // Default model to auto-select when models load
let selectedTTSVoice = null; // Selected TTS voice name

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
 * Loads the auto-scroll setting from localStorage
 */
export function loadAutoScrollSetting() {
    const autoScrollCheckbox = document.getElementById('auto-scroll');
    if (autoScrollCheckbox) {
        const savedAutoScroll = localStorage.getItem('autoScrollEnabled');
        if (savedAutoScroll === 'true') {
            autoScrollCheckbox.checked = true;
            autoScrollEnabled = true;
        } else {
            autoScrollCheckbox.checked = false;
            autoScrollEnabled = false;
        }

        // Add event listener for the checkbox
        autoScrollCheckbox.addEventListener('change', saveAutoScrollSetting);
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
 * Saves the auto-scroll setting to localStorage
 */
export function saveAutoScrollSetting() {
    const autoScrollCheckbox = document.getElementById('auto-scroll');
    if (autoScrollCheckbox) {
        autoScrollEnabled = autoScrollCheckbox.checked;
        localStorage.setItem('autoScrollEnabled', autoScrollEnabled);
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
 * Format a voice name and locale into a user-friendly display name
 * @param {Object} voice - The voice object with name, locale, quality, gender, and isNetworkConnectionRequired
 * @returns {string} - User-friendly formatted name
 */
function formatVoiceName(voice) {
    // Mapping of locale codes to readable language/region names
    const localeMap = {
        'en-US': 'English (United States)',
        'en-GB': 'English (United Kingdom)',
        'en-AU': 'English (Australia)',
        'en-CA': 'English (Canada)',
        'en-IN': 'English (India)',
        'en-ZA': 'English (South Africa)',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'es-US': 'Spanish (United States)',
        'es-AR': 'Spanish (Argentina)',
        'fr-FR': 'French (France)',
        'fr-CA': 'French (Canada)',
        'de-DE': 'German (Germany)',
        'de-AT': 'German (Austria)',
        'it-IT': 'Italian (Italy)',
        'pt-BR': 'Portuguese (Brazil)',
        'pt-PT': 'Portuguese (Portugal)',
        'ru-RU': 'Russian',
        'ja-JP': 'Japanese',
        'ko-KR': 'Korean',
        'zh-CN': 'Chinese (Simplified)',
        'zh-TW': 'Chinese (Traditional)',
        'zh-HK': 'Chinese (Hong Kong)',
        'ar-SA': 'Arabic (Saudi Arabia)',
        'ar-EG': 'Arabic (Egypt)',
        'hi-IN': 'Hindi (India)',
        'nl-NL': 'Dutch (Netherlands)',
        'nl-BE': 'Dutch (Belgium)',
        'pl-PL': 'Polish',
        'tr-TR': 'Turkish',
        'sv-SE': 'Swedish',
        'da-DK': 'Danish',
        'fi-FI': 'Finnish',
        'no-NO': 'Norwegian',
        'cs-CZ': 'Czech',
        'hu-HU': 'Hungarian',
        'ro-RO': 'Romanian',
        'th-TH': 'Thai',
        'vi-VN': 'Vietnamese',
        'id-ID': 'Indonesian',
        'ms-MY': 'Malay',
        'fil-PH': 'Filipino',
        'uk-UA': 'Ukrainian',
        'el-GR': 'Greek',
        'he-IL': 'Hebrew',
        'bn-IN': 'Bengali (India)',
        'ta-IN': 'Tamil (India)',
        'te-IN': 'Telugu (India)',
        'ml-IN': 'Malayalam (India)',
        'mr-IN': 'Marathi (India)',
        'gu-IN': 'Gujarati (India)',
        'kn-IN': 'Kannada (India)'
    };

    // Normalize the locale (handle both "en_US" and "en-US" formats)
    const normalizedLocale = voice.locale.replace('_', '-');

    // Get the readable locale name
    let localeName = localeMap[normalizedLocale];

    // If not in the map, try to create a readable name from the locale
    if (!localeName) {
        const parts = normalizedLocale.split('-');
        if (parts.length >= 2) {
            const langCode = parts[0].toLowerCase();
            const countryCode = parts[1].toUpperCase();

            // Language name mapping
            const langNames = {
                'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
                'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                'nl': 'Dutch', 'pl': 'Polish', 'tr': 'Turkish', 'sv': 'Swedish',
                'da': 'Danish', 'fi': 'Finnish', 'no': 'Norwegian', 'cs': 'Czech',
                'hu': 'Hungarian', 'ro': 'Romanian', 'th': 'Thai', 'vi': 'Vietnamese',
                'id': 'Indonesian', 'ms': 'Malay', 'uk': 'Ukrainian', 'el': 'Greek',
                'he': 'Hebrew', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu',
                'ml': 'Malayalam', 'mr': 'Marathi', 'gu': 'Gujarati', 'kn': 'Kannada'
            };

            localeName = langNames[langCode] ? `${langNames[langCode]} (${countryCode})` : normalizedLocale;
        } else {
            localeName = normalizedLocale;
        }
    }

    // Build the display name
    let displayName = localeName;

    // Add gender if available
    if (voice.gender) {
        const genderCapitalized = voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1);
        displayName += ` - ${genderCapitalized}`;
    }

    // Add quality/connection indicator
    if (voice.isNetworkConnectionRequired) {
        displayName += ' (Network)';
    } else if (voice.quality === 'Very High' || voice.quality === 'High') {
        displayName += ' (Local)';
    }

    return displayName;
}

/**
 * Initialize TTS voice selection
 */
export async function initializeTTSVoiceSelection() {
    const voiceSelect = document.getElementById('tts-voice-select');
    if (!voiceSelect) {
        debugLog('TTS voice select element not found');
        return;
    }

    try {
        // Load available voices from TTS service
        if (window.TTSService) {
            const voices = await window.TTSService.getAvailableVoices();

            // Clear the loading option
            voiceSelect.innerHTML = '';

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Default Voice';
            voiceSelect.appendChild(defaultOption);

            // Group voices by language for better organization
            const voicesByLanguage = {};
            voices.forEach(voice => {
                const langCode = voice.locale.split('-')[0]; // Get base language code
                if (!voicesByLanguage[langCode]) {
                    voicesByLanguage[langCode] = [];
                }
                voicesByLanguage[langCode].push(voice);
            });

            // Sort language groups and add voices
            Object.keys(voicesByLanguage).sort().forEach(langCode => {
                const languageVoices = voicesByLanguage[langCode];

                // Sort voices within each language group
                languageVoices.sort((a, b) => {
                    // Prioritize local voices over network voices
                    if (a.quality === 'High' && b.quality !== 'High') return -1;
                    if (a.quality !== 'High' && b.quality === 'High') return 1;
                    return a.locale.localeCompare(b.locale);
                });

                // Add each voice with formatted name
                languageVoices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.name;
                    option.textContent = formatVoiceName(voice);

                    // Add data attributes for debugging and reference
                    option.setAttribute('data-voice-technical-name', voice.name);
                    option.setAttribute('data-voice-locale', voice.locale);
                    option.setAttribute('data-voice-gender', voice.gender || '');

                    voiceSelect.appendChild(option);
                });
            });

            // Load saved voice preference
            const savedVoice = localStorage.getItem('ttsVoice');
            if (savedVoice) {
                selectedTTSVoice = savedVoice;
                voiceSelect.value = savedVoice;

                // Apply the saved voice to the TTS service
                await window.TTSService.setVoice(savedVoice);
            }

            // Add change event listener to save voice selection
            voiceSelect.addEventListener('change', async (e) => {
                const voiceName = e.target.value;
                selectedTTSVoice = voiceName;

                if (voiceName) {
                    localStorage.setItem('ttsVoice', voiceName);
                    await window.TTSService.setVoice(voiceName);
                    debugLog('TTS voice set to:', voiceName);
                } else {
                    localStorage.removeItem('ttsVoice');
                    debugLog('TTS voice reset to default');
                }
            });

            debugLog('TTS voice selection initialized with', voices.length, 'voices');
        } else {
            debugLog('TTSService not available');
        }
    } catch (error) {
        console.error('Error initializing TTS voice selection:', error);
        voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
    }
}

/**
 * Get selected TTS voice
 */
export function getSelectedTTSVoice() {
    return selectedTTSVoice;
}

/**
 * Set selected TTS voice
 */
export async function setSelectedTTSVoice(voiceName) {
    selectedTTSVoice = voiceName;
    if (voiceName) {
        localStorage.setItem('ttsVoice', voiceName);
        if (window.TTSService) {
            await window.TTSService.setVoice(voiceName);
        }
    } else {
        localStorage.removeItem('ttsVoice');
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
    loadAutoScrollSetting();
    loadThemeSetting();
    loadReasoningTimeoutSetting();
    loadDefaultModelSetting();
    // TTS voice selection will be initialized separately when settings modal opens
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
 * Gets the current auto-scroll setting
 * @returns {boolean} - The current auto-scroll value
 */
export function getAutoScrollEnabled() {
    return autoScrollEnabled;
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
