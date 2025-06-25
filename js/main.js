// Main entry point for the application
import { loadServerSettings, fetchAvailableModels } from './api-service.js';
import { loadSettings } from './settings-manager.js';
import { loadChatHistory, loadChat, chatHistoryData } from './chat-service.js';
import { initializeFileUpload } from './file-upload.js';
import { initializeEventHandlers } from './event-handlers.js';
import { hideLoadingIndicatorOnLoad, ensureWelcomeMessagePosition, initializeCollapsibleSections } from './ui-manager.js';
import { initializeTouchHandlers } from './touch-handlers.js';
import { initializeChatHistoryTouchHandler } from './chat-history-touch-handler.js';
import { initializeSettingsModalTouchHandler } from './settings-modal-touch-handler.js';
import { initializeSidebarTouchHandler } from './sidebar-touch-handler.js';
import { handleScroll, setDebugEnabled, wasRefreshDueToCodeGeneration, getLastActiveChatId, clearRefreshDueToCodeGenerationFlag } from './utils.js';
import { initializeExportImport } from './export-import.js';
import { initializeModelManager } from './model-manager.js';
import { initializeWhatsNew } from './whats-new.js';
import { initializeSettingsModal } from './settings-modal-manager.js';
import { initializeCharacterManager } from './character-manager.js';
import { initializeCharacterGallery } from './character-gallery.js';
import {
    setupLazyLoading,
    addHardwareAcceleration,
    getDevicePerformanceLevel,
    startMemoryMonitoring,
    progressiveComponentLoading,
    detectAdMobEnvironment,
    applyAdMobOptimizations,
    startAdaptivePerformanceMonitoring
} from './performance-utils.js';

import { updateConfirmationModalTheme, updateExportImportModalsTheme } from '../confirmation-modal-fix.js';

/**
 * Initializes the application with enhanced performance optimizations
 */
function initializeApp() {
    // Disable debug logging by default
    setDebugEnabled(false);

    console.log('Starting LMSA with enhanced performance optimizations...');

    // Detect device performance level first
    const performanceLevel = getDevicePerformanceLevel();
    const isAdMobEnvironment = detectAdMobEnvironment();
    console.log(`Detected device performance level: ${performanceLevel}`);
    
    // Apply AdMob-specific optimizations if needed
    if (isAdMobEnvironment) {
        applyAdMobOptimizations();
        startAdaptivePerformanceMonitoring();
    }

    // Start memory monitoring for automatic cleanup
    startMemoryMonitoring();

    // Initialize Monaco editor cleanup for memory management
    import('./monaco-performance.js').then(module => {
        module.setupMonacoCleanup();
    }).catch(error => {
        console.error('Error setting up Monaco cleanup:', error);
    });

    // Load performance diagnostics if in AdMob environment or low performance
    if (isAdMobEnvironment || performanceLevel === 'low') {
        import('./performance-diagnostics.js').catch(error => {
            console.error('Error loading performance diagnostics:', error);
        });
    }

    // Apply performance optimizations to key UI elements
    applyPerformanceOptimizations();

    // Initialize the model banner state based on localStorage
    initializeModelBannerState();

    // Ensure settings modal is hidden on startup
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('show');
    }

    // Ensure system prompt overlay is hidden on startup
    const systemPromptOverlay = document.getElementById('system-prompt-overlay');
    if (systemPromptOverlay) {
        systemPromptOverlay.classList.add('hidden');
        systemPromptOverlay.style.display = 'none';
    }

    // Ensure the About button is properly initialized
    const aboutButton = document.getElementById('about-btn');
    if (aboutButton) {
        console.log('About button found during initialization');
    }

    /**
     * Applies performance optimizations to key UI elements
     */
    function applyPerformanceOptimizations() {
        // Add hardware acceleration to scrollable containers
        const scrollableContainers = [
            document.getElementById('messages'),
            document.getElementById('chat-history'),
            document.getElementById('sidebar'),
            document.getElementById('settings-content-wrapper')
        ];

        scrollableContainers.forEach(container => {
            if (container) {
                addHardwareAcceleration(container);
            }
        });

        // Setup lazy loading for images
        setupLazyLoading('img[data-src]');

        // Add passive event listeners for better touch performance
        // This is handled by our touch handlers, but we ensure it's applied

        console.log('Performance optimizations applied');
    }

    // Load critical settings first
    loadServerSettings(); // This will also fetch available models
    loadSettings();
    loadChatHistory();

    // Check if refresh was triggered by code generation
    if (wasRefreshDueToCodeGeneration()) {
        console.log('Refresh was triggered by code generation, restoring previous chat');

        // Get the last active chat ID
        const lastActiveChatId = getLastActiveChatId();

        // Immediately clear the reload flag to prevent any future accidental reloads
        clearRefreshDueToCodeGenerationFlag();

        // Check if this is a first message reload (special optimization case)
        const isFirstMessageReload = localStorage.getItem('isFirstMessageReload') === 'true';
        localStorage.removeItem('isFirstMessageReload');

        if (lastActiveChatId && chatHistoryData && chatHistoryData[lastActiveChatId]) {
            // Load the chat immediately with no delay
            loadChat(lastActiveChatId, isFirstMessageReload);
            console.log('Restored previous chat:', lastActiveChatId);

            // Force immediate scroll
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } else {
            console.log('No valid chat ID found to restore');
        }
    }

    // Make sure file upload is initialized before other components
    // This ensures file upload handlers are ready when event handlers are set up
    try {
        console.log('Initializing file upload functionality...');
        initializeFileUpload();
        console.log('File upload initialization complete');
    } catch (error) {
        console.error('Error initializing file upload:', error);
    }

    hideLoadingIndicatorOnLoad();
    ensureWelcomeMessagePosition();

    // Initialize critical components first
    initializeEventHandlers();

    // Use progressive loading for non-critical components based on device performance
    // (performanceLevel already declared above)

    // Define component initialization functions in order of priority
    const componentInitializers = [
        // High priority - touch and interaction
        () => initializeTouchHandlers(),
        () => initializeChatHistoryTouchHandler(),
        () => initializeSettingsModalTouchHandler(),
        () => initializeSidebarTouchHandler(),

        // Medium priority - core functionality
        () => initializeFileUpload(),
        () => initializeModelManager(),
        () => initializeCollapsibleSections(),
        () => initializeSettingsModal(),

        // Lower priority - additional features
        () => initializeExportImport(),
        () => initializeWhatsNew(),
        () => initializeCharacterManager(),
        () => initializeCharacterGallery(),

        // Lowest priority - theme and visual enhancements
        () => updateConfirmationModalTheme(),
        () => updateExportImportModalsTheme()
    ];

    // Use progressive loading for better performance on slower devices
    progressiveComponentLoading(componentInitializers);

    // Initialize scroll button state - ensure it's hidden on startup
    const messagesContainer = document.getElementById('messages');
    const scrollButton = document.getElementById('scroll-to-bottom');

    if (scrollButton) {
        // Explicitly hide the button on startup
        scrollButton.classList.remove('visible', 'show');
        scrollButton.classList.add('hidden');
        scrollButton.style.opacity = '0';
        scrollButton.style.visibility = 'hidden';
        scrollButton.style.pointerEvents = 'none';
    }

    if (messagesContainer) {
        // Force the scroll position to bottom on startup
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            // Then check if the button should be shown (it should remain hidden on startup)
            handleScroll(messagesContainer);
        }, 100);

        // Add another check after a longer delay to ensure button state is correct
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            handleScroll(messagesContainer);
        }, 500);
    }

    // Add window resize event listener with debouncing for better performance
    let resizeTimer;
    window.addEventListener('resize', () => {
        // Clear the previous timer
        clearTimeout(resizeTimer);

        // Set a new timer to debounce the resize event
        resizeTimer = setTimeout(() => {
            // Handle welcome message positioning
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage && welcomeMessage.style.display === 'flex') {
                // Ensure welcome message position is updated when window is resized
                // This is especially important for small screens like iPhone SE (320x568)
                ensureWelcomeMessagePosition();

                // Additional fix for the icon container on resize
                const iconContainer = document.querySelector('.welcome-content .icon-container');
                if (iconContainer) {
                    // Ensure the icon container is visible after resize
                    iconContainer.style.position = 'relative';
                    iconContainer.style.zIndex = '10';
                    iconContainer.style.transform = 'translateY(0)';

                    // Fix for heart icon in footer on resize
                    const heartIcon = document.querySelector('#welcome-footer i.fa-heart');
                    if (heartIcon) {
                        heartIcon.style.fontSize = '0.7rem';
                        heartIcon.style.width = '0.7rem';
                        heartIcon.style.height = '0.7rem';
                        heartIcon.style.lineHeight = '0.7rem';
                        heartIcon.style.maxWidth = '0.7rem';
                        heartIcon.style.maxHeight = '0.7rem';

                        // Special case for 344x882 screens
                        if ((window.innerWidth >= 343 && window.innerWidth <= 345) &&
                            (window.innerHeight >= 880 && window.innerHeight <= 884)) {
                            heartIcon.style.fontSize = '0.65rem';
                            heartIcon.style.width = '0.65rem';
                            heartIcon.style.height = '0.65rem';
                        }

                        // Special case for 320x480 screens
                        if (window.innerWidth <= 320 && window.innerHeight <= 480) {
                            heartIcon.style.fontSize = '0.6rem';
                            heartIcon.style.width = '0.6rem';
                            heartIcon.style.height = '0.6rem';
                        }
                    }
                }
            }

            // Handle any other resize-related adjustments
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                // Recalculate scroll button visibility
                handleScroll(messagesContainer);
            }

            // Refresh Monaco editors if they exist
            if (typeof monaco !== 'undefined') {
                try {
                    const editors = monaco.editor.getEditors();
                    editors.forEach(editor => {
                        editor.layout();
                    });
                } catch (e) {
                    // Ignore errors if Monaco is not fully initialized
                }
            }
        }, 100); // 100ms debounce time for better performance
    });

    // Add event listener to hide loading indicator when the page loads
    window.addEventListener('load', hideLoadingIndicatorOnLoad);
}

/**
 * Initializes the model banner state - always hidden
 */
function initializeModelBannerState() {
    const loadedModelDisplay = document.getElementById('loaded-model');
    const modelWrapper = document.getElementById('loaded-model-wrapper');

    console.log('Initializing model banner state - always hidden');

    // Always hide the banner
    if (loadedModelDisplay && modelWrapper) {
        // Set the hidden properties
        loadedModelDisplay.style.maxHeight = '0';
        loadedModelDisplay.style.opacity = '0';
        loadedModelDisplay.style.transform = 'translateY(-100%)';
        loadedModelDisplay.style.visibility = 'hidden';
        loadedModelDisplay.classList.add('hidden');

        // Hide the wrapper
        modelWrapper.style.display = 'none';
        document.documentElement.style.setProperty('--loaded-model-height', '0px');

        // Add a class to the body to indicate the banner is hidden
        document.body.classList.add('model-banner-hidden-by-user');

        // Store the preference in localStorage
        localStorage.setItem('modelBannerVisible', 'false');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
