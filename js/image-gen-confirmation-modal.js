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

    // Determine ripple color based on theme
    circle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; // white with opacity for both themes

    button.appendChild(circle);

    // Remove the ripple effect after animation completes
    setTimeout(() => {
        if (circle.parentNode === button) {
            button.removeChild(circle);
        }
    }, 600);
}

export function createImageGenConfirmationModal() {
    if (modalCreated) {
        debugLog('Image Generation Confirmation Modal already created');
        return;
    }

    const isLightTheme = getLightThemeEnabled();

    const modalHTML = `
    <div id="image-gen-confirmation-modal" class="fixed inset-0 ${isLightTheme ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-70'} flex items-center justify-center hidden animate-fade-in" style="z-index: 1200; pointer-events: auto;" aria-labelledby="image-gen-confirmation-title" role="dialog" aria-modal="true">
        <div class="relative p-6 rounded-lg w-[500px] max-w-[90%] shadow-xl mx-auto my-auto border ${isLightTheme ? 'border-blue-500/40' : 'border-blue-500/30'}"
            style="background: ${isLightTheme ? 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' : 'linear-gradient(to bottom, #0f172a, #0c1836)'};
                  color: ${isLightTheme ? '#1e293b' : 'var(--text-primary)'};
                  box-shadow: ${isLightTheme ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(59, 130, 246, 0.15)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(59, 130, 246, 0.2)'};
                  pointer-events: auto;">
            <!-- Subtle glow effect -->
            <div class="absolute -inset-0.5 ${isLightTheme ? 'bg-blue-500/10' : 'bg-blue-500/20'} rounded-lg blur-sm" style="z-index: -10; pointer-events: none;"></div>
            <div class="absolute -inset-1 ${isLightTheme ? 'bg-blue-400/5' : 'bg-blue-500/5'} rounded-lg blur-md" style="z-index: -20; pointer-events: none;"></div>

            <h2 id="image-gen-confirmation-title" class="text-xl font-bold mb-4 flex items-center modal-title">
                <i class="fas fa-check-circle mr-2 ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}"></i>Image Generation Enabled
            </h2>

            <div class="${isLightTheme ? 'mb-5 p-4 bg-blue-50 rounded-lg text-slate-700' : 'mb-5 p-4 bg-blue-900/20 rounded-lg text-gray-200'}">
                <p class="mb-3">Image generation has been successfully enabled!</p>
                <p class="mb-3 font-semibold">To generate an image, send a message that begins with <span class="${isLightTheme ? 'bg-blue-100 px-2 py-1 rounded font-mono text-blue-800' : 'bg-blue-800 px-2 py-1 rounded font-mono text-blue-200'}">/image</span> followed by your description.</p>
                <div class="${isLightTheme ? 'bg-slate-100 p-3 rounded-md' : 'bg-gray-800 p-3 rounded-md'}">
                    <p class="font-mono text-sm mb-2">Example: <span class="${isLightTheme ? 'text-blue-600' : 'text-blue-400'}">/image a cute dog</span></p>
                    <p class="text-xs ${isLightTheme ? 'text-slate-600' : 'text-gray-400'}">Replace "a cute dog" with whatever image you want to generate.</p>
                </div>
            </div>

            <div class="flex justify-end">
                <button id="image-gen-confirmation-close" class="image-gen-confirmation-btn ${isLightTheme ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-600 active:to-blue-500' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-700 active:from-blue-700 active:to-blue-800'} text-white rounded-lg px-4 py-2 border focus:outline-none transition-all duration-300 ease-in-out shadow-md active:shadow-inner active:scale-95 relative overflow-hidden"
                    style="background: ${isLightTheme ? 'linear-gradient(to right, #2563eb, #3b82f6)' : 'linear-gradient(to right, #2563eb, #1d4ed8)'};
                           border-color: ${isLightTheme ? '#3b82f6' : '#1d4ed8'};
                           -webkit-tap-highlight-color: transparent;
                           pointer-events: auto;
                           cursor: pointer;">
                    <span class="relative" style="z-index: 10;">Got it!</span>
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
    if (!document.getElementById('image-gen-confirmation-ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'image-gen-confirmation-ripple-styles';
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

    debugLog('Image Generation Confirmation Modal created');
}

function setupEventListeners() {
    const modal = document.getElementById('image-gen-confirmation-modal');
    const closeButton = document.getElementById('image-gen-confirmation-close');

    // Add ripple effect to button
    const button = modal.querySelector('.image-gen-confirmation-btn');
    if (button) {
        button.addEventListener('touchstart', createRippleEffect);
        button.addEventListener('mousedown', createRippleEffect);
        button.hasRippleEffect = true;
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (resolvePromise) {
                resolvePromise(true);
                resolvePromise = null;
            }
            hideImageGenConfirmationModal();
        });
    }

    // Close on backdrop click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (resolvePromise) {
                    resolvePromise(true);
                    resolvePromise = null;
                }
                hideImageGenConfirmationModal();
            }
        });
    }
}

export function showImageGenConfirmationModal() {
    return new Promise((resolve) => {
        if (!modalCreated) {
            createImageGenConfirmationModal();
        }

        resolvePromise = resolve;

        const modal = document.getElementById('image-gen-confirmation-modal');
        if (modal) {
            modal.classList.remove('hidden');
            debugLog('Image Generation Confirmation Modal shown');
        }
    });
}

export function hideImageGenConfirmationModal() {
    const modal = document.getElementById('image-gen-confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
        debugLog('Image Generation Confirmation Modal hidden');
    }
}

export function updateImageGenConfirmationModalTheme() {
    if (!modalCreated) return;

    const isLightTheme = getLightThemeEnabled();
    const modal = document.getElementById('image-gen-confirmation-modal');

    if (!modal) return;

    // Recreate the modal with updated theme
    modal.remove();
    modalCreated = false;
    createImageGenConfirmationModal();

    debugLog('Image Generation Confirmation Modal theme updated');
}

// Listen for theme changes
document.addEventListener('themeChanged', updateImageGenConfirmationModalTheme);