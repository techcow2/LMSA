/**
 * Custom loader for marked.js that completely bypasses module systems
 * This solves conflicts with RequireJS/AMD loaders
 */
(function() {
    // Use fetch to get the raw source
    fetch('https://cdn.jsdelivr.net/npm/marked@4.0.2/marked.min.js')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(sourceCode => {
            // Create a function that will run the code in the global scope
            // but without triggering AMD detection
            try {
                // Store original define and require
                var originalDefine = window.define;
                var originalRequire = window.require;
                
                // Temporarily remove define and require to prevent AMD detection
                window.define = undefined;
                window.require = undefined;
                
                // Set up a CommonJS-like environment
                var module = { exports: {} };
                var exports = module.exports;
                
                // Wrap the source code in a function that provides CommonJS context
                var executeMarked = new Function('module', 'exports', sourceCode);
                
                // Execute the code with mock CommonJS environment
                executeMarked(module, exports);
                
                // Assign marked to the global scope
                window.marked = module.exports;
                
                // Restore define and require
                window.define = originalDefine;
                window.require = originalRequire;
                
                console.log('Marked library loaded successfully (bypassing module systems)');
                
                // Initialize any code that depends on marked
                if (window.initializeMarkdownRendering) {
                    window.initializeMarkdownRendering();
                }
            } catch (error) {
                console.error('Error executing marked.js:', error);
            }
        })
        .catch(error => {
            console.error('Error loading marked.js:', error);
        });
})(); 