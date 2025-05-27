/**
 * Direct inclusion of marked.js to avoid any module system conflicts
 */
(function() {
    // Create a script element
    var script = document.createElement('script');
    
    // Set up the load event
    script.onload = function() {
        console.log('Marked library loaded successfully');
        // Initialize code that depends on marked
        if (window.initializeMarkdownRendering) {
            window.initializeMarkdownRendering();
        }
    };
    
    script.onerror = function(e) {
        console.error('Failed to load marked.js', e);
    };
    
    // Use the browser bundle that doesn't use AMD/CommonJS
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    
    // Add a timestamp to prevent caching
    script.src += '?_=' + new Date().getTime();
    
    // Use defer to ensure it loads after Monaco but doesn't block rendering
    script.defer = true;
    
    // Add the script to the document
    document.head.appendChild(script);
})(); 