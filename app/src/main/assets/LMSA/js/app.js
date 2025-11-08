// Main application entry point
// This file has been refactored into a modular structure
// All functionality is now imported from the js/ directory


// Import age verification system first (must be loaded before anything else)
import './age-verification.js';

// Import terms acceptance system (loads after age verification)
import { initializeTermsAcceptance, hasAcceptedCurrentTerms } from './terms-acceptance.js';

// Import the main module which initializes everything
import './main.js';

// Add event listeners for the sidebar overlay
document.addEventListener('DOMContentLoaded', function() {
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        // Click event for desktop
        sidebarOverlay.addEventListener('click', function() {
            // Import the toggleSidebar function dynamically
            import('./ui-manager.js').then(module => {
                module.toggleSidebar();
            });
        });

        // Touch event for tablets and mobile
        sidebarOverlay.addEventListener('touchend', function(e) {
            e.preventDefault(); // Prevent any default behavior
            // Import the toggleSidebar function dynamically
            import('./ui-manager.js').then(module => {
                module.toggleSidebar();
            });
        }, { passive: false });
    }
});
