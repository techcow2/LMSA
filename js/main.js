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
import { initializeFilePreviewTouchHandler } from './file-preview-touch-handler.js';
import { handleScroll, setDebugEnabled, wasRefreshDueToCodeGeneration, getLastActiveChatId, clearRefreshDueToCodeGenerationFlag } from './utils.js';
import { initializeExportImport } from './export-import.js';
import { initializeModelManager } from './model-manager.js';
import { initializeWhatsNew } from './whats-new.js';
import { initializeSettingsModal } from './settings-modal-manager.js';
import { initializeCharacterManager } from './character-manager.js';
import { initializeCharacterGallery } from './character-gallery.js';
import { memoryManager } from './memory-manager.js';
import { messageCache } from './message-cache.js';
import { chatHistoryOptimizer } from './chat-history-optimizer.js';
import { applyAndroidWebViewOptimizations, isAndroidWebView } from './android-webview-config.js';
import { initializeAndroidCrashPrevention, isProneToAppCompatCrashes } from './android-crash-prevention.js';
import { runAndroidCrashTests, quickHealthCheck } from './android-crash-test.js';
import { initializeDiagnosticMenuItem } from './android-diagnostic-panel.js';
import { initializeWebViewFlexFixes, startFlexMonitoring } from './webview-flex-fixes.js';

import { updateConfirmationModalTheme, updateExportImportModalsTheme } from '../confirmation-modal-fix.js';

/**
 * Initializes the application
 */
async function initializeApp() {
    // Disable debug logging by default
    setDebugEnabled(false);

    console.log('Starting LMSA...');
    
    // Apply Android WebView optimizations immediately for Android 13+ compatibility
    if (isAndroidWebView()) {
        console.log('Android WebView detected, applying compatibility optimizations...');
        try {
            // Initialize crash prevention system first (critical for Android 13+)
            if (isProneToAppCompatCrashes()) {
                console.log('Android 13+ detected, initializing crash prevention...');
                initializeAndroidCrashPrevention();
            }
            
            // Enhanced Android 13+ compatibility settings
            const android13Config = {
                memory: {
                    cleanupThreshold: 80,  // More aggressive cleanup for Android 13
                    warningThreshold: 120,
                    criticalThreshold: 150,
                    monitoringInterval: 45000, // More frequent monitoring
                    cleanupInterval: 90000,
                    disablePerformanceMonitoring: true,
                    disableDOMObserver: true,
                    reducedCleanupFrequency: true
                },
                performance: {
                    reduceAnimations: true,
                    simplifyUI: true,
                    disableHeavyEffects: true,
                    optimizeScrolling: true,
                    disableTransforms: true  // Critical for Android 13 stability
                },
                features: {
                    enableCompressionFeatures: false,
                    enableAdvancedCleanup: false,
                    disableContextMenu: true  // Prevents androidx.appcompat crashes
                }
            };
            
            applyAndroidWebViewOptimizations(android13Config);
            
            // Initialize WebView flex and layout fixes
            initializeWebViewFlexFixes();
            startFlexMonitoring();
            
            // Add Android 13 specific CSS fixes
            const android13Style = document.createElement('style');
            android13Style.textContent = `
                /* Android 13 WebView Compatibility Fixes */
                * {
                    -webkit-user-select: none !important;
                    -webkit-touch-callout: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
                
                /* Disable problematic CSS features that cause androidx.appcompat crashes */
                .message, .chat-item, .settings-item {
                    transform: none !important;
                    will-change: auto !important;
                    backface-visibility: visible !important;
                }
                
                /* Prevent context menu issues */
                input, textarea, [contenteditable] {
                    -webkit-user-select: text !important;
                }
                
                /* Optimize scrolling for Android 13 */
                .messages-container, #chat-history {
                    -webkit-overflow-scrolling: touch;
                    overflow-scrolling: touch;
                    scroll-behavior: auto !important;
                    overflow-anchor: none !important;
                    contain: layout style !important;
                }
                
                /* Additional Android 13+ stability fixes */
                .message-content {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(android13Style);
            
            console.log('Android WebView optimizations applied successfully');
        
        // Run diagnostic tests in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Development mode detected, running Android crash prevention tests...');
            setTimeout(() => {
                runAndroidCrashTests();
            }, 2000);
        } else {
            // Run quick health check in production
            setTimeout(() => {
                 quickHealthCheck();
             }, 1000);
         }
         
         // Initialize diagnostic menu item for Android devices
        initializeDiagnosticMenuItem();
        } catch (error) {
            console.error('Error applying Android WebView optimizations:', error);
        }
    }

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

    // Initialize components in a simpler order
    initializeTouchHandlers();
    initializeChatHistoryTouchHandler();
    initializeSettingsModalTouchHandler();
    initializeSidebarTouchHandler();
    initializeFilePreviewTouchHandler();
    
    initializeFileUpload();
    initializeModelManager();
    
    // Update file upload capabilities after model manager is initialized
    try {
        const { updateFileUploadCapabilities } = await import('./file-upload.js');
        await updateFileUploadCapabilities();
    } catch (error) {
        console.error('Error updating initial file upload capabilities:', error);
    }
    
    initializeCollapsibleSections();
    initializeSettingsModal();
    
    initializeExportImport();
    initializeWhatsNew();
    initializeCharacterManager();
    initializeCharacterGallery();
    
    updateConfirmationModalTheme();
    updateExportImportModalsTheme();

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

    // Add window resize event listener
    window.addEventListener('resize', () => {
        // Handle welcome message positioning
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage && welcomeMessage.style.display === 'flex') {
            ensureWelcomeMessagePosition();
        }
    });

    // Initialize memory optimizations
    console.log('Initializing memory optimizations...');
    
    // Register cleanup callbacks for memory management
    memoryManager.registerCleanupCallback(() => {
        // Clean up message cache
        const cacheStats = messageCache.getStats();
        if (cacheStats.memoryUtilization > 80) {
            console.log('High memory usage in message cache, performing cleanup');
            messageCache.performCleanup();
        }
    });
    
    memoryManager.registerCleanupCallback(() => {
        // Clean up chat history optimizer
        const memoryStats = chatHistoryOptimizer.getMemoryStats();
        if (memoryStats.compressedDataSize > 10 * 1024 * 1024) { // 10MB
            console.log('Large compressed data detected, performing cleanup');
            chatHistoryOptimizer.cleanupOldCompressedData([]);
        }
    });
    
    // Log memory optimization status
    console.log('Memory optimizations initialized:');
    console.log('- External libraries: Lazy loaded');
    console.log('- Message virtualization: Active');
    console.log('- Chat history optimization: Active');
    console.log('- Memory manager: Active');
    console.log('- Message cache: Active');
    console.log('- DOM element cache: Active');
    console.log('- Font optimization: Active');

    console.log('LMSA initialization complete');
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
