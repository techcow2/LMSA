import { getLightThemeEnabled } from './settings-manager.js';
import { debugLog } from './utils.js';

let modalCreated = false;
let resolvePromise = null;

// Function to create ripple effect
function createRippleEffect(event) {
    const button = event.currentTarget;
    const isLightTheme = getLightThemeEnabled();

    // Remove any existing ripples first
    const existingRipples = button.querySelectorAll('.ripple');
    existingRipples.forEach(ripple => {
        if (ripple.parentNode === button) {
            button.removeChild(ripple);
        }
    });

    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    // Get position relative to the button
    let x, y;
    if (event.type === 'touchstart' && event.touches && event.touches[0]) {
        const rect = button.getBoundingClientRect();
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
    } else {
        x = event.offsetX;
        y = event.offsetY;
    }

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x - radius}px`;
    circle.style.top = `${y - radius}px`;
    circle.classList.add('ripple');

    // Determine ripple color based on button type and theme
    if (button.id === 'tts-privacy-decline') {
        if (isLightTheme) {
            circle.style.backgroundColor = 'rgba(30, 41, 59, 0.1)'; // slate-800 with low opacity for light theme
        } else {
            circle.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // white with low opacity for dark theme
        }
    } else {
        // For accept button
        circle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; // white with higher opacity for both themes
    }

    button.appendChild(circle);

    // Remove the ripple effect after animation completes
    setTimeout(() => {
        if (circle.parentNode === button) {
            button.removeChild(circle);
        }
    }, 600);
}

export function createTTSPrivacyModal() {
    if (modalCreated) {
        debugLog('TTS Privacy Modal already created');
        return;
    }

    const isLightTheme = getLightThemeEnabled();

    const modalHTML = `
    <div id="tts-privacy-modal" class="fixed inset-0 ${isLightTheme ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-70'} flex items-center justify-center hidden animate-fade-in" style="z-index: 1200; pointer-events: auto;" aria-labelledby="tts-privacy-title" role="dialog" aria-modal="true">
        <div class="relative p-6 rounded-lg w-[500px] max-w-[90%] shadow-xl mx-auto my-auto border ${isLightTheme ? 'border-amber-500/40' : 'border-amber-500/30'}"
            style="background: ${isLightTheme ? 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' : 'linear-gradient(to bottom, #0f172a, #0c1836)'};
                  color: ${isLightTheme ? '#1e293b' : 'var(--text-primary)'};
                  box-shadow: ${isLightTheme ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(245, 158, 11, 0.15)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(245, 158, 11, 0.2)'};
                  pointer-events: auto;">
            <!-- Subtle glow effect -->
            <div class="absolute -inset-0.5 ${isLightTheme ? 'bg-amber-500/10' : 'bg-amber-500/20'} rounded-lg blur-sm" style="z-index: -10; pointer-events: none;"></div>
            <div class="absolute -inset-1 ${isLightTheme ? 'bg-amber-400/5' : 'bg-amber-500/5'} rounded-lg blur-md" style="z-index: -20; pointer-events: none;"></div>

            <h2 id="tts-privacy-title" class="text-xl font-bold mb-4 flex items-center modal-title">
                <i class="fas fa-exclamation-triangle mr-2 ${isLightTheme ? 'text-amber-600' : 'text-amber-400'}"></i>Privacy Notice
            </h2>

            <div class="${isLightTheme ? 'mb-5 p-4 bg-amber-50 rounded-lg text-slate-700' : 'mb-5 p-4 bg-amber-900/20 rounded-lg text-gray-200'}">
                <p class="mb-3">By enabling Text-to-Speech, you acknowledge that:</p>
                <ul class="list-disc pl-5 space-y-2 mb-3">
                    <li>
                        <strong class="${isLightTheme ? 'text-amber-700' : 'text-amber-300'}">LLM responses will be sent to a third-party API</strong> to generate audio.
                    </li>
                    <li>
                        Your responses will <strong class="${isLightTheme ? 'text-amber-700' : 'text-amber-300'}">no longer be 100% local</strong> to your computer and mobile device.
                    </li>
                    <li>
                        Response data will be shared with the third-party text-to-speech service.
                    </li>
                </ul>
                <p class="${isLightTheme ? 'text-slate-600' : 'text-gray-300'}">
                    This feature is <strong>optional</strong> and can be disabled at any time in Settings. <a href="https://pollinations.ai/terms" target="_blank" class="${isLightTheme ? 'text-blue-600 hover:text-blue-500' : 'text-blue-400 hover:text-blue-300'} underline">See terms of service</a>.
                </p>
            </div>

            <div class="flex justify-end space-x-4">
                <button id="tts-privacy-decline" class="tts-privacy-btn rounded-lg px-4 py-2 border ${isLightTheme ? 'hover:bg-slate-200 hover:border-slate-400 active:bg-slate-300' : 'border-gray-600 hover:border-gray-500 active:bg-gray-700'} focus:outline-none transition-all duration-300 ease-in-out active:scale-95 active:shadow-inner relative overflow-hidden"
                    style="background-color: ${isLightTheme ? '#f1f5f9' : 'var(--bg-tertiary)'};
                           color: ${isLightTheme ? '#334155' : 'var(--text-primary)'};
                           border-color: ${isLightTheme ? '#cbd5e1' : 'rgba(75, 85, 99, 0.6)'};
                           -webkit-tap-highlight-color: transparent;
                           pointer-events: auto;
                           cursor: pointer;">
                    <span class="relative" style="z-index: 10;">Decline</span>
                </button>
                <button id="tts-privacy-accept" class="tts-privacy-btn ${isLightTheme ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-600 active:to-blue-500' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-700 active:from-blue-700 active:to-blue-800'} text-white rounded-lg px-4 py-2 border focus:outline-none transition-all duration-300 ease-in-out shadow-md active:shadow-inner active:scale-95 relative overflow-hidden"
                    style="background: ${isLightTheme ? 'linear-gradient(to right, #2563eb, #3b82f6)' : 'linear-gradient(to right, #2563eb, #1d4ed8)'};
                           border-color: ${isLightTheme ? '#3b82f6' : '#1d4ed8'};
                           -webkit-tap-highlight-color: transparent;
                           pointer-events: auto;
                           cursor: pointer;">
                    <span class="relative" style="z-index: 10;">Accept & Enable</span>
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalCreated = true;

    // Add event listeners
    setupEventListeners();

    // Add ripple CSS if not already present
    if (!document.getElementById('tts-ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'tts-ripple-styles';
        style.textContent = `
            .ripple {
                position: absolute;
                border-radius: 50%;
                transform: scale(0);
                animation: ripple-animation 0.6s ease-out;
                pointer-events: none;
            }

            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    debugLog('TTS Privacy Modal created');
}

function setupEventListeners() {
    const modal = document.getElementById('tts-privacy-modal');
    const acceptButton = document.getElementById('tts-privacy-accept');
    const declineButton = document.getElementById('tts-privacy-decline');

    // Add ripple effect to buttons
    const buttons = modal.querySelectorAll('.tts-privacy-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', createRippleEffect);
        button.addEventListener('mousedown', createRippleEffect);
        button.hasRippleEffect = true;
    });

    if (acceptButton) {
        acceptButton.addEventListener('click', async () => {
            if (resolvePromise) {
                resolvePromise(true);
                resolvePromise = null;
            }
            hideTTSPrivacyModal();

            // Show the confirmation modal after accepting privacy notice
            try {
                const { showTTSConfirmationModal } = await import('./tts-confirmation-modal.js');
                await showTTSConfirmationModal();
            } catch (error) {
                debugLog('Error showing TTS confirmation modal:', error);
            }
        });
    }

    if (declineButton) {
        declineButton.addEventListener('click', () => {
            if (resolvePromise) {
                resolvePromise(false);
                resolvePromise = null;
            }
            hideTTSPrivacyModal();
        });
    }

    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (resolvePromise) {
                    resolvePromise(false);
                    resolvePromise = null;
                }
                hideTTSPrivacyModal();
            }
        });
    }
}

export function showTTSPrivacyModal() {
    return new Promise((resolve) => {
        if (!modalCreated) {
            createTTSPrivacyModal();
        }

        resolvePromise = resolve;

        const modal = document.getElementById('tts-privacy-modal');
        if (modal) {
            modal.classList.remove('hidden');
            debugLog('TTS Privacy Modal shown');
        }
    });
}

export function hideTTSPrivacyModal() {
    const modal = document.getElementById('tts-privacy-modal');
    if (modal) {
        modal.classList.add('hidden');
        debugLog('TTS Privacy Modal hidden');
    }
}

export function updateTTSPrivacyModalTheme() {
    if (!modalCreated) return;

    const isLightTheme = getLightThemeEnabled();
    const modal = document.getElementById('tts-privacy-modal');

    if (!modal) return;

    // Recreate the modal with updated theme
    modal.remove();
    modalCreated = false;
    createTTSPrivacyModal();

    debugLog('TTS Privacy Modal theme updated');
}

// Listen for theme changes
document.addEventListener('themeChanged', updateTTSPrivacyModalTheme);
