// Import the checkAndShowWelcomeMessage function
import { checkAndShowWelcomeMessage } from './ui-manager.js';
import { getLightThemeEnabled } from './settings-manager.js';

// Variables to store the external URL to be opened if confirmed
let pendingExternalUrl = null;

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
    if (button.id === 'cancel-external-site') {
        if (isLightTheme) {
            circle.style.backgroundColor = 'rgba(30, 41, 59, 0.1)'; // slate-800 with low opacity for light theme
        } else {
            circle.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // white with low opacity for dark theme
        }
    } else {
        // For confirm button
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

// Function to create and inject the external site confirmation modal
function createExternalSiteModal() {
    // Check if the modal already exists
    if (document.getElementById('external-site-modal')) {
        return;
    }
    
    // Check current theme
    const isLightTheme = getLightThemeEnabled();
    
    // Create the modal element
    const modalHTML = `
    <div id="external-site-modal" class="fixed inset-0 ${isLightTheme ? 'bg-slate-500 bg-opacity-50' : 'bg-black bg-opacity-70'} flex items-center justify-center hidden animate-fade-in z-[1060]" aria-labelledby="external-site-title" role="dialog" aria-modal="true">
        <div class="relative p-6 rounded-lg w-96 max-w-[90%] shadow-xl mx-auto my-auto border ${isLightTheme ? 'border-blue-500/40' : 'border-blue-500/30'}" 
            style="background: ${isLightTheme ? 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' : 'linear-gradient(to bottom, #0f172a, #0c1836)'}; 
                  color: ${isLightTheme ? '#1e293b' : 'var(--text-primary)'}; 
                  box-shadow: ${isLightTheme ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(59, 130, 246, 0.15)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(59, 130, 246, 0.2)'}"
        >
            <!-- Subtle glow effect -->
            <div class="absolute -inset-0.5 ${isLightTheme ? 'bg-blue-500/10' : 'bg-blue-500/20'} rounded-lg blur-sm -z-10"></div>
            <div class="absolute -inset-1 ${isLightTheme ? 'bg-blue-400/5' : 'bg-blue-500/5'} rounded-lg blur-md -z-20"></div>
            
            <h2 id="external-site-title" class="text-xl font-bold mb-4 flex items-center modal-title">
                <i class="fas fa-external-link-alt mr-2 ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}"></i>Leaving LMSA
            </h2>
            <div id="external-site-message" class="${isLightTheme ? 'mb-5 p-3 bg-blue-50 rounded-lg text-slate-700' : 'mb-5 p-3 bg-blue-900/20 rounded-lg text-gray-200'}">
                You are about to leave the LMSA app and visit an external website. Once you leave, you will no longer be covered by the <span class="${isLightTheme ? 'text-blue-700 font-medium' : 'text-blue-300 font-medium'}">LMSA Privacy Policy</span>, but instead by the privacy policy of the site you are visiting.
            </div>
            <div class="flex justify-end space-x-4">
                <button id="cancel-external-site" class="external-site-btn rounded-lg px-4 py-2 border ${isLightTheme ? 'hover:bg-slate-200 hover:border-slate-400 active:bg-slate-300' : 'border-gray-600 hover:border-gray-500 active:bg-gray-700'} focus:outline-none transition-all duration-300 ease-in-out active:scale-95 active:shadow-inner relative overflow-hidden" 
                    style="background-color: ${isLightTheme ? '#f1f5f9' : 'var(--bg-tertiary)'}; 
                           color: ${isLightTheme ? '#334155' : 'var(--text-primary)'}; 
                           border-color: ${isLightTheme ? '#cbd5e1' : 'rgba(75, 85, 99, 0.6)'};
                           -webkit-tap-highlight-color: transparent;">
                    <span class="relative z-10">Cancel</span>
                </button>
                <button id="confirm-external-site" class="external-site-btn ${isLightTheme ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-600 active:to-blue-500' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-700 active:from-blue-700 active:to-blue-800'} text-white rounded-lg px-4 py-2 border focus:outline-none transition-all duration-300 ease-in-out shadow-md active:shadow-inner active:scale-95 relative overflow-hidden" 
                    style="background: ${isLightTheme ? 'linear-gradient(to right, #2563eb, #3b82f6)' : 'linear-gradient(to right, #2563eb, #1d4ed8)'};
                           border-color: ${isLightTheme ? '#3b82f6' : '#1d4ed8'};
                           -webkit-tap-highlight-color: transparent;">
                    <span class="relative z-10">Continue</span>
                </button>
            </div>
        </div>
    </div>
    `;
    
    // Append the modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    const externalSiteModal = document.getElementById('external-site-modal');
    const cancelButton = document.getElementById('cancel-external-site');
    const confirmButton = document.getElementById('confirm-external-site');
    
    // Add ripple effect to buttons
    const buttons = externalSiteModal.querySelectorAll('.external-site-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', createRippleEffect);
        button.addEventListener('mousedown', createRippleEffect);
        button.hasRippleEffect = true;
    });
    
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            hideExternalSiteModal();
            // Reset the pending URL
            pendingExternalUrl = null;
        });
    }
    
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            hideExternalSiteModal();
            // Open the external URL if it was set
            if (pendingExternalUrl) {
                window.open(pendingExternalUrl, '_blank');
                pendingExternalUrl = null;
            }
        });
    }
    
    // Close modal when clicking outside
    if (externalSiteModal) {
        externalSiteModal.addEventListener('click', (e) => {
            if (e.target === externalSiteModal) {
                hideExternalSiteModal();
                pendingExternalUrl = null;
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && externalSiteModal && !externalSiteModal.classList.contains('hidden')) {
            hideExternalSiteModal();
            pendingExternalUrl = null;
        }
    });
    
    // Apply correct theme to the newly created modal
    updateExternalSiteModalTheme();
}

// Function to show the external site confirmation modal
export function showExternalSiteModal(url) {
    const externalSiteModal = document.getElementById('external-site-modal');
    if (!externalSiteModal) {
        createExternalSiteModal();
    }
    
    // Store the URL to be opened if confirmed
    pendingExternalUrl = url;
    
    // Get the modal again in case it was just created
    const modal = document.getElementById('external-site-modal');
    if (modal) {
        // Update backdrop color based on theme
        const isLightTheme = getLightThemeEnabled();
        if (isLightTheme) {
            modal.classList.remove('bg-black', 'bg-opacity-70');
            modal.classList.add('bg-slate-500', 'bg-opacity-50');
        } else {
            modal.classList.remove('bg-slate-500', 'bg-opacity-50');
            modal.classList.add('bg-black', 'bg-opacity-70');
        }
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Add CSS for ripple effect if not already present
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                    z-index: 0;
                }
                
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Function to hide the external site confirmation modal
export function hideExternalSiteModal() {
    const externalSiteModal = document.getElementById('external-site-modal');
    if (externalSiteModal) {
        externalSiteModal.classList.add('hidden');
        externalSiteModal.style.display = 'none';
        
        // Check if welcome message should be shown
        checkAndShowWelcomeMessage();
    }
}

// Function to update the theme when it changes
export function updateExternalSiteModalTheme() {
    const externalSiteModal = document.getElementById('external-site-modal');
    if (externalSiteModal) {
        const modalContent = externalSiteModal.querySelector('div:first-child');
        const messageBox = document.getElementById('external-site-message');
        const cancelButton = document.getElementById('cancel-external-site');
        const confirmButton = document.getElementById('confirm-external-site');
        const titleElement = document.getElementById('external-site-title');
        const isLightTheme = getLightThemeEnabled();

        if (modalContent) {
            if (isLightTheme) {
                // Light theme styling
                modalContent.style.background = 'linear-gradient(to bottom, #f8fafc, #f1f5f9)';
                modalContent.style.color = '#1e293b'; // slate-800
                modalContent.style.borderColor = 'rgba(59, 130, 246, 0.4)'; // blue-500/40
                modalContent.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 15px rgba(59, 130, 246, 0.15)';
            } else {
                // Dark theme styling
                modalContent.style.background = 'linear-gradient(to bottom, #0f172a, #0c1836)';
                modalContent.style.color = 'var(--text-primary)';
                modalContent.style.borderColor = 'rgba(59, 130, 246, 0.3)'; // blue-500/30
                modalContent.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(59, 130, 246, 0.2)';
            }
            
            // Make sure glow effects exist
            const glowEffects = modalContent.querySelectorAll('[class*="blur-"]');
            if (glowEffects.length < 2) {
                // Add glow effects if they don't exist
                const innerGlow = document.createElement('div');
                innerGlow.className = 'absolute -inset-0.5 bg-blue-500/20 rounded-lg blur-sm -z-10';
                
                const outerGlow = document.createElement('div');
                outerGlow.className = 'absolute -inset-1 bg-blue-500/5 rounded-lg blur-md -z-20';
                
                modalContent.prepend(outerGlow);
                modalContent.prepend(innerGlow);
            }

            // Update glow effects based on theme
            if (glowEffects.length >= 2) {
                if (isLightTheme) {
                    glowEffects[0].className = 'absolute -inset-0.5 bg-blue-500/10 rounded-lg blur-sm -z-10';
                    glowEffects[1].className = 'absolute -inset-1 bg-blue-400/5 rounded-lg blur-md -z-20';
                } else {
                    glowEffects[0].className = 'absolute -inset-0.5 bg-blue-500/20 rounded-lg blur-sm -z-10';
                    glowEffects[1].className = 'absolute -inset-1 bg-blue-500/5 rounded-lg blur-md -z-20';
                }
            }
        }

        if (titleElement) {
            // Update title icon color based on theme
            const icon = titleElement.querySelector('i');
            if (icon) {
                icon.className = isLightTheme ? 
                    'fas fa-external-link-alt mr-2 text-blue-600' : 
                    'fas fa-external-link-alt mr-2 text-blue-400';
            }
        }
        
        if (messageBox) {
            // Ensure message box has correct styling based on theme
            if (isLightTheme) {
                messageBox.className = 'mb-5 p-3 bg-blue-50 rounded-lg text-slate-700';
                
                // Make sure the LMSA Privacy Policy text is highlighted appropriately for light theme
                const messageText = messageBox.innerHTML;
                if (!messageText.includes('<span class="text-blue-700 font-medium">') && 
                    messageText.includes('<span class="text-blue-300 font-medium">')) {
                    messageBox.innerHTML = messageText.replace(
                        '<span class="text-blue-300 font-medium">LMSA Privacy Policy</span>', 
                        '<span class="text-blue-700 font-medium">LMSA Privacy Policy</span>'
                    );
                }
            } else {
                messageBox.className = 'mb-5 p-3 bg-blue-900/20 rounded-lg text-gray-200';
                
                // Make sure the LMSA Privacy Policy text is highlighted appropriately for dark theme
                const messageText = messageBox.innerHTML;
                if (!messageText.includes('<span class="text-blue-300 font-medium">') && 
                    messageText.includes('<span class="text-blue-700 font-medium">')) {
                    messageBox.innerHTML = messageText.replace(
                        '<span class="text-blue-700 font-medium">LMSA Privacy Policy</span>', 
                        '<span class="text-blue-300 font-medium">LMSA Privacy Policy</span>'
                    );
                }
            }
        }

        if (cancelButton) {
            // Update cancel button styling based on theme
            if (isLightTheme) {
                cancelButton.style.backgroundColor = '#f1f5f9'; // bg-slate-100
                cancelButton.style.color = '#334155'; // text-slate-700
                cancelButton.style.borderColor = '#cbd5e1'; // border-slate-300
                cancelButton.className = 'external-site-btn rounded-lg px-4 py-2 border hover:bg-slate-200 hover:border-slate-400 focus:outline-none transition-all duration-300 ease-in-out active:bg-slate-300 active:scale-95 active:shadow-inner relative overflow-hidden';
            } else {
                cancelButton.style.backgroundColor = 'var(--bg-tertiary)';
                cancelButton.style.color = 'var(--text-primary)';
                cancelButton.style.borderColor = 'rgba(75, 85, 99, 0.6)'; // gray-600
                cancelButton.className = 'external-site-btn rounded-lg px-4 py-2 border border-gray-600 hover:border-gray-500 focus:outline-none transition-all duration-300 ease-in-out active:bg-gray-700 active:scale-95 active:shadow-inner relative overflow-hidden';
            }
            cancelButton.style.webkitTapHighlightColor = 'transparent';
            
            // Ensure the button has the proper span element for the ripple effect
            if (!cancelButton.querySelector('span.relative.z-10')) {
                // Save the text
                const buttonText = cancelButton.textContent.trim();
                // Clear inner HTML
                cancelButton.innerHTML = '';
                // Add properly structured span
                const span = document.createElement('span');
                span.className = 'relative z-10';
                span.textContent = buttonText;
                cancelButton.appendChild(span);
            }
            
            // Make sure ripple event listeners are attached
            if (!cancelButton.hasRippleEffect) {
                cancelButton.addEventListener('touchstart', createRippleEffect);
                cancelButton.addEventListener('mousedown', createRippleEffect);
                cancelButton.hasRippleEffect = true;
            }
        }
        
        if (confirmButton) {
            // Ensure the confirm button has the gradient background based on theme
            if (isLightTheme) {
                confirmButton.style.background = 'linear-gradient(to right, #2563eb, #3b82f6)';
                confirmButton.style.borderColor = '#3b82f6'; // border-blue-500
                confirmButton.className = 'external-site-btn bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg px-4 py-2 hover:from-blue-500 hover:to-blue-400 border focus:outline-none transition-all duration-300 ease-in-out shadow-md active:from-blue-600 active:to-blue-500 active:shadow-inner active:scale-95 relative overflow-hidden';
            } else {
                confirmButton.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                confirmButton.style.borderColor = '#1d4ed8'; // border-blue-700
                confirmButton.className = 'external-site-btn bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-2 hover:from-blue-500 hover:to-blue-600 border border-blue-700 focus:outline-none transition-all duration-300 ease-in-out shadow-md active:from-blue-700 active:to-blue-800 active:shadow-inner active:scale-95 relative overflow-hidden';
            }
            confirmButton.style.webkitTapHighlightColor = 'transparent';
            
            // Ensure the button has the proper span element for the ripple effect
            if (!confirmButton.querySelector('span.relative.z-10')) {
                // Save the text
                const buttonText = confirmButton.textContent.trim();
                // Clear inner HTML
                confirmButton.innerHTML = '';
                // Add properly structured span
                const span = document.createElement('span');
                span.className = 'relative z-10';
                span.textContent = buttonText;
                confirmButton.appendChild(span);
            }
            
            // Make sure ripple event listeners are attached
            if (!confirmButton.hasRippleEffect) {
                confirmButton.addEventListener('touchstart', createRippleEffect);
                confirmButton.addEventListener('mousedown', createRippleEffect);
                confirmButton.hasRippleEffect = true;
            }
        }
        
        // Ensure the ripple style element is in the document
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                    z-index: 0;
                }
                
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createExternalSiteModal();
});

// Listen for theme changes
document.addEventListener('themeChanged', () => {
    updateExternalSiteModalTheme();
    
    // Also update backdrop if modal is currently visible
    const modal = document.getElementById('external-site-modal');
    if (modal && !modal.classList.contains('hidden')) {
        const isLightTheme = getLightThemeEnabled();
        if (isLightTheme) {
            modal.classList.remove('bg-black', 'bg-opacity-70');
            modal.classList.add('bg-slate-500', 'bg-opacity-50');
        } else {
            modal.classList.remove('bg-slate-500', 'bg-opacity-50');
            modal.classList.add('bg-black', 'bg-opacity-70');
        }
    }
});