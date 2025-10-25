/**
 * Lazy loading of marked.js to reduce initial memory footprint
 */
(function() {
    let markedLoaded = false;
    let markedLoadPromise = null;
    
    // Create a function to lazy load marked when needed
    window.loadMarkedLibrary = function() {
        if (markedLoaded) {
            return Promise.resolve();
        }
        
        if (markedLoadPromise) {
            return markedLoadPromise;
        }
        
        markedLoadPromise = new Promise((resolve, reject) => {
            // Create a script element
            const script = document.createElement('script');
            
            // Set up the load event
            script.onload = function() {
                markedLoaded = true;
                console.log('Marked library loaded successfully (lazy-loaded)');
                // Initialize code that depends on marked
                if (window.initializeMarkdownRendering) {
                    window.initializeMarkdownRendering();
                }
                resolve();
            };
            
            script.onerror = function(e) {
                console.error('Failed to load marked.js', e);
                reject(e);
            };
            
            // Use the browser bundle that doesn't use AMD/CommonJS
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            
            // Use defer to ensure it loads after Monaco but doesn't block rendering
            script.defer = true;
            
            // Add the script to the document
            document.head.appendChild(script);
        });
        
        return markedLoadPromise;
    };
    
    // Don't load marked.js immediately - only when needed
    console.log('Marked.js configured for lazy loading');
})(); 