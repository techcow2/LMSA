// Debug Configuration for LMSA
// Controls logging verbosity across the application

/**
 * Debug Configuration
 * Set DEBUG_MODE to false to hide most console logs
 */
export const DEBUG_CONFIG = {
    // Main debug flag - set to false to hide most logs
    DEBUG_MODE: false,
    
    // Specific module debug flags (only used if DEBUG_MODE is true)
    MODULES: {
        LOADING_MANAGER: false,
        FILE_UPLOAD: false,
        MOBILE_DETECTION: false,
        MODEL_MANAGER: false,
        EXPORT_IMPORT: false
    }
};

/**
 * Debug logger that respects configuration
 */
export const debugLog = {
    log: (module, ...args) => {
        if (DEBUG_CONFIG.DEBUG_MODE && DEBUG_CONFIG.MODULES[module]) {
            console.log(...args);
        }
    },
    
    warn: (module, ...args) => {
        if (DEBUG_CONFIG.DEBUG_MODE && DEBUG_CONFIG.MODULES[module]) {
            console.warn(...args);
        }
    },
    
    error: (module, ...args) => {
        // Always show errors regardless of debug mode
        console.error(...args);
    },
    
    // General purpose debug log (respects main DEBUG_MODE flag)
    debug: (...args) => {
        if (DEBUG_CONFIG.DEBUG_MODE) {
            console.log(...args);
        }
    }
};