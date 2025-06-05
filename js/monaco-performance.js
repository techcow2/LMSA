// Monaco Editor performance optimizations for slower devices
import { getDevicePerformanceLevel } from './performance-utils.js';

/**
 * Gets optimized Monaco editor options based on device performance
 * @param {string} language - The programming language
 * @param {string} content - The code content
 * @returns {Object} - Optimized Monaco editor options
 */
export function getOptimizedMonacoOptions(language, content) {
    const performanceLevel = getDevicePerformanceLevel();
    
    // Base options for all devices
    const baseOptions = {
        value: content,
        language: language,
        readOnly: true,
        theme: 'vs-dark',
        lineNumbers: 'on',
        contextmenu: true,
        automaticLayout: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false
    };
    
    // Adaptive options based on device performance
    if (performanceLevel === 'low') {
        return {
            ...baseOptions,
            // Disable expensive features for low-end devices
            minimap: { enabled: false },
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            glyphMargin: false,
            renderLineHighlight: 'none',
            renderWhitespace: 'none',
            renderControlCharacters: false,
            renderIndentGuides: false,
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                verticalScrollbarSize: 0,
                horizontalScrollbarSize: 0
            },
            // Reduce rendering frequency
            smoothScrolling: false,
            cursorBlinking: 'solid',
            cursorSmoothCaretAnimation: false,
            // Disable hover and suggestions for better performance
            hover: { enabled: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            // Reduce validation and syntax highlighting
            validate: false,
            semanticHighlighting: { enabled: false }
        };
    } else if (performanceLevel === 'medium') {
        return {
            ...baseOptions,
            // Moderate optimizations for medium devices
            minimap: { enabled: false },
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 4,
            glyphMargin: false,
            renderLineHighlight: 'line',
            renderWhitespace: 'none',
            renderControlCharacters: false,
            renderIndentGuides: true,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8
            },
            smoothScrolling: false,
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: false,
            hover: { enabled: true, delay: 1000 },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off'
        };
    } else {
        // High-end devices get full features
        return {
            ...baseOptions,
            minimap: { enabled: false }, // Still disable minimap for code blocks
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 4,
            glyphMargin: true,
            renderLineHighlight: 'line',
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            renderIndentGuides: true,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12
            },
            smoothScrolling: true,
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: true,
            hover: { enabled: true, delay: 500 },
            quickSuggestions: false, // Still disabled for read-only code blocks
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off'
        };
    }
}

/**
 * Creates a Monaco editor with performance optimizations
 * @param {HTMLElement} container - The container element
 * @param {string} language - The programming language
 * @param {string} content - The code content
 * @returns {Promise<Object>} - The Monaco editor instance
 */
export async function createOptimizedMonacoEditor(container, language, content) {
    if (!window.monaco) {
        throw new Error('Monaco editor is not loaded');
    }
    
    const options = getOptimizedMonacoOptions(language, content);
    const performanceLevel = getDevicePerformanceLevel();
    
    try {
        // Create the editor with optimized options
        const editor = window.monaco.editor.create(container, options);
        
        // Add performance monitoring for low-end devices
        if (performanceLevel === 'low') {
            // Disable expensive features that might be enabled by default
            editor.updateOptions({
                renderValidationDecorations: 'off',
                renderLineHighlightOnlyWhenFocus: true
            });
            
            // Add a cleanup timer for unused editors
            setTimeout(() => {
                if (!container.isConnected) {
                    console.log('Disposing disconnected Monaco editor');
                    editor.dispose();
                }
            }, 30000); // Check after 30 seconds
        }
        
        console.log(`Created optimized Monaco editor for ${performanceLevel} performance device`);
        return editor;
        
    } catch (error) {
        console.error('Error creating Monaco editor:', error);
        throw error;
    }
}

/**
 * Batch processes Monaco editor creation to avoid overwhelming slower devices
 * @param {Array} editorConfigs - Array of editor configuration objects
 * @returns {Promise<Array>} - Array of created editors
 */
export async function batchCreateMonacoEditors(editorConfigs) {
    if (!editorConfigs || editorConfigs.length === 0) {
        return [];
    }
    
    const performanceLevel = getDevicePerformanceLevel();
    const batchSize = performanceLevel === 'low' ? 1 : performanceLevel === 'medium' ? 2 : 3;
    const delay = performanceLevel === 'low' ? 200 : performanceLevel === 'medium' ? 100 : 50;
    
    const editors = [];
    
    for (let i = 0; i < editorConfigs.length; i += batchSize) {
        const batch = editorConfigs.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(config => 
            createOptimizedMonacoEditor(config.container, config.language, config.content)
                .catch(error => {
                    console.error('Error creating editor in batch:', error);
                    return null;
                })
        );
        
        const batchResults = await Promise.all(batchPromises);
        editors.push(...batchResults.filter(editor => editor !== null));
        
        // Add delay between batches for slower devices
        if (i + batchSize < editorConfigs.length && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.log(`Batch created ${editors.length} Monaco editors for ${performanceLevel} performance device`);
    return editors;
}

/**
 * Disposes of Monaco editors that are no longer visible or needed
 */
export function cleanupMonacoEditors() {
    if (!window.monaco) return;
    
    try {
        const editors = window.monaco.editor.getEditors();
        let disposedCount = 0;
        
        editors.forEach(editor => {
            const container = editor.getContainerDomNode();
            
            // Check if editor is still connected to DOM and visible
            if (!container || !container.isConnected) {
                editor.dispose();
                disposedCount++;
            } else {
                // Check if editor is in viewport (for memory optimization)
                const rect = container.getBoundingClientRect();
                const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;
                
                if (!isVisible && getDevicePerformanceLevel() === 'low') {
                    // For low-end devices, dispose editors that are far from viewport
                    const distanceFromViewport = Math.min(
                        Math.abs(rect.bottom),
                        Math.abs(rect.top - window.innerHeight)
                    );
                    
                    if (distanceFromViewport > window.innerHeight * 2) {
                        editor.dispose();
                        disposedCount++;
                    }
                }
            }
        });
        
        if (disposedCount > 0) {
            console.log(`Cleaned up ${disposedCount} Monaco editors`);
        }
        
    } catch (error) {
        console.error('Error cleaning up Monaco editors:', error);
    }
}

/**
 * Sets up automatic Monaco editor cleanup for memory management
 */
export function setupMonacoCleanup() {
    const performanceLevel = getDevicePerformanceLevel();
    
    if (performanceLevel === 'low') {
        // More frequent cleanup for low-end devices
        setInterval(cleanupMonacoEditors, 30000); // Every 30 seconds
    } else if (performanceLevel === 'medium') {
        // Moderate cleanup for medium devices
        setInterval(cleanupMonacoEditors, 60000); // Every minute
    } else {
        // Less frequent cleanup for high-end devices
        setInterval(cleanupMonacoEditors, 120000); // Every 2 minutes
    }
    
    console.log(`Monaco cleanup scheduled for ${performanceLevel} performance device`);
}
