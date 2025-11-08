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
// File preview touch handler removed
import { handleScroll, setDebugEnabled, wasRefreshDueToCodeGeneration, getLastActiveChatId, clearRefreshDueToCodeGenerationFlag, isAndroidWebView } from './utils.js';
import { initializeExportImport } from './export-import.js';
import { initializeModelManager } from './model-manager.js';
import { initializeWhatsNew } from './whats-new.js';
import { initializeSettingsModal } from './settings-modal-manager.js';
import { initializeIpPortConfirmationModal } from './ip-port-confirmation-modal.js';

import { memoryManager } from './memory-manager.js';
import { messageCache } from './message-cache.js';
import { chatHistoryOptimizer } from './chat-history-optimizer.js';

import { updateConfirmationModalTheme, updateExportImportModalsTheme } from './confirmation-modal-fix.js';
import { memoryLeakDetector, MemoryUtils } from './memory-leak-detector.js';
import { performanceMonitor, animationOptimizer } from './performance-optimizer.js';
// Import help.js to ensure help modal buttons work immediately
import './help.js';
// Import about.js to ensure about modal buttons work immediately
import './about.js';

// Android WebView keyboard overlap fix
let initialViewportHeight = window.innerHeight;
let androidKeyboardHeight = 0;

// Import age verification and terms acceptance for checking
import { hasAcceptedCurrentTerms } from './terms-acceptance.js';
import { hasVerifiedAge } from './age-verification.js';

/**
 * Initializes the application
 */
export async function initializeApp() {
    // Wait for age verification and terms acceptance check before proceeding
    if (!hasVerifiedAge()) {
        console.log('Age not verified, skipping app initialization');
        return;
    }

    if (!hasAcceptedCurrentTerms()) {
        console.log('Terms not accepted, skipping app initialization');
        return;
    }

    // Disable debug logging by default
    setDebugEnabled(false);


    // Initialize Android WebView keyboard fix
    initializeAndroidKeyboardFix();

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

    // Load critical settings first
    loadServerSettings(); // This will also fetch available models
    loadSettings();
    loadChatHistory();

    // Check if refresh was triggered by code generation
    if (wasRefreshDueToCodeGeneration()) {

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

            // Force immediate scroll
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    // Make sure file upload is initialized before other components
    // This ensures file upload handlers are ready when event handlers are set up
    try {
        initializeFileUpload();
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
    // File preview touch handler removed
    // File upload already initialized above
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
    initializeIpPortConfirmationModal();
    
    // Pre-initialize TTS service to prevent double-tap issues
    try {
        if (window.TTSService && !window.TTSService.isInitialized()) {
            console.log('Pre-initializing TTS service...');
            await window.TTSService.initialize();
        }
    } catch (error) {
        console.error('Error pre-initializing TTS service:', error);
    }
    

    
    // Initialize saved system prompts functionality
    try {
        const { initializeSavedSystemPrompts } = await import('./saved-system-prompts.js');
        initializeSavedSystemPrompts();
    } catch (error) {
        console.error('Error initializing saved system prompts:', error);
    }
    
    initializeExportImport();
    initializeWhatsNew();
    
    updateConfirmationModalTheme();
    updateExportImportModalsTheme();

    // Initialize scroll button state - ensure it's hidden on startup
    const messagesContainer = document.getElementById('messages');
    const scrollButton = document.getElementById('scroll-to-bottom');

    if (scrollButton) {
        // Explicitly hide the button on startup
        scrollButton.classList.remove('visible', 'show');
        scrollButton.classList.add('hidden');
        // Remove any inline styles that might interfere with CSS classes
        scrollButton.style.opacity = '';
        scrollButton.style.visibility = '';
        scrollButton.style.pointerEvents = '';
    }

    if (messagesContainer) {
        // Optimized: Immediate scroll for better performance
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        handleScroll(messagesContainer);

        // Optimized: Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            handleScroll(messagesContainer);
        });
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
    // Register cleanup callbacks for memory management
    memoryManager.registerCleanupCallback(() => {
        // Clean up message cache
        const cacheStats = messageCache.getStats();
        if (cacheStats.memoryUtilization > 80) {
            messageCache.performCleanup();
        }
    });
    
    memoryManager.registerCleanupCallback(() => {
        // Clean up chat history optimizer
        const memoryStats = chatHistoryOptimizer.getMemoryStats();
        if (memoryStats.compressedDataSize > 10 * 1024 * 1024) { // 10MB
            chatHistoryOptimizer.cleanupOldCompressedData([]);
        }
    });

    // Initialize performance optimizations
    performanceMonitor.trackDOMUpdate();
    
    

    // Add performance monitoring to window for debugging
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        window.performanceMonitor = performanceMonitor;
        window.memoryUtils = MemoryUtils;
        window.animationOptimizer = animationOptimizer;
        
        // Log performance summary every 30 seconds in development
        const performanceInterval = setInterval(() => {
            console.log('Performance Summary:', performanceMonitor.getMetrics());
            const leaks = MemoryUtils.checkForLeaks();
            if (leaks) {
                console.warn('Memory leaks detected:', leaks);
            }
        }, 30000);
        
        // Stop performance monitoring after 5 minutes to prevent long-term memory leaks
        setTimeout(() => {
            clearInterval(performanceInterval);
            console.log('Performance monitoring stopped');
            
        }, 5 * 60 * 1000);
        
    }
}

/**
 * Initializes the model banner state - always hidden
 */
function initializeModelBannerState() {
    const loadedModelDisplay = document.getElementById('loaded-model');
    const modelWrapper = document.getElementById('loaded-model-wrapper');

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

/**
 * Initializes Android WebView keyboard fix
 * This function handles the issue where the Android keyboard overlaps content
 * instead of pushing it up in WebView environments
 */
function initializeAndroidKeyboardFix() {
    // Only apply fix for Android WebView
    if (!isAndroidWebView()) {
        return;
    }
    
    // Use VisualViewport API for better keyboard handling
    if (window.visualViewport) {
        const viewport = window.visualViewport;
        
        // Handle viewport resize events
        const handleViewportChange = () => {
            // Calculate the keyboard height
            const currentViewportHeight = viewport.height * viewport.scale;
            const keyboardHeight = window.innerHeight - currentViewportHeight;
            
            // Get the chat form element
            const chatForm = document.getElementById('chat-form');
            
            if (keyboardHeight > 100) {
                // Keyboard is visible - adjust layout
                document.body.classList.add('keyboard-visible');
                
                // Scroll to input field
                const userInput = document.getElementById('user-input');
                if (userInput) {
                    setTimeout(() => {
                        userInput.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }, 100);
                }
            } else {
                // Keyboard is hidden - reset layout
                document.body.classList.remove('keyboard-visible');
            }
        };
        
        // Add event listener for viewport changes
        viewport.addEventListener('resize', handleViewportChange);
        
        // Also handle window resize for additional safety
        window.addEventListener('resize', () => {
            // Update initial height when window resizes
        });
    } else {
        // Fallback for older Android WebViews without VisualViewport API
        let initialHeight = window.innerHeight;
        
        window.addEventListener('resize', function() {
            const currentHeight = window.innerHeight;
            const heightDifference = initialHeight - currentHeight;
            
            // Keyboard is likely visible if height changed by more than 100px
            if (Math.abs(heightDifference) > 100) {
                if (heightDifference > 0) {
                    // Keyboard likely visible
                    document.body.classList.add('keyboard-visible');
                    
                    // Scroll to input if it exists
                    const userInput = document.getElementById('user-input');
                    if (userInput) {
                        setTimeout(() => {
                            userInput.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center'
                            });
                        }, 100);
                    }
                } else {
                    // Keyboard is hidden
                    document.body.classList.remove('keyboard-visible');
                }
            }
        });
    }
}

// Initialize the application when the DOM is loaded, age is verified, and terms are accepted
document.addEventListener('DOMContentLoaded', function() {
    // Make initializeApp globally available
    window.initializeApp = initializeApp;

    // Check age verification and terms acceptance first, then initialize app if both pass
    if (hasVerifiedAge() && hasAcceptedCurrentTerms()) {
        initializeApp();
    } else {
        if (!hasVerifiedAge()) {
            console.log('Age not verified - app initialization paused until age verification is complete');
        } else {
            console.log('Terms not accepted - app initialization paused until terms are accepted');
        }
    }
});