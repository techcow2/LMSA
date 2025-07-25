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
import { handleScroll, setDebugEnabled, wasRefreshDueToCodeGeneration, getLastActiveChatId, clearRefreshDueToCodeGenerationFlag, detectKeyboard } from './utils.js';
import { initializeExportImport } from './export-import.js';
import { initializeModelManager } from './model-manager.js';
import { initializeWhatsNew } from './whats-new.js';
import { initializeSettingsModal } from './settings-modal-manager.js';
import { initializeCharacterManager } from './character-manager.js';
import { initializeCharacterGallery } from './character-gallery.js';
import { memoryManager } from './memory-manager.js';
import { messageCache } from './message-cache.js';
import { chatHistoryOptimizer } from './chat-history-optimizer.js';

import { updateConfirmationModalTheme, updateExportImportModalsTheme } from '../confirmation-modal-fix.js';

/**
 * Initializes the application
 */
async function initializeApp() {
    // Disable debug logging by default
    setDebugEnabled(false);

    console.log('Starting LMSA...');

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
    
    // Initialize keyboard detection for Android API 35 compatibility
    detectKeyboard();
    
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
