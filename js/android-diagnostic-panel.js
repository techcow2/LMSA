// Android Diagnostic Panel
// User-facing interface for checking crash prevention status

import { runAndroidCrashTests, quickHealthCheck } from './android-crash-test.js';
import { getCrashPreventionStatus } from './android-crash-prevention.js';
import { getLightThemeEnabled } from './settings-manager.js';

/**
 * Create and show the Android diagnostic panel
 */
export function showAndroidDiagnosticPanel() {
    // Remove existing panel if present
    const existingPanel = document.getElementById('android-diagnostic-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    const panel = createDiagnosticPanel();
    document.body.appendChild(panel);
    
    // Auto-update status
    updatePanelStatus();
    
    return panel;
}

/**
 * Create the diagnostic panel HTML
 */
function createDiagnosticPanel() {
    const panel = document.createElement('div');
    panel.id = 'android-diagnostic-panel';
    panel.innerHTML = `
        <div class="diagnostic-overlay">
            <div class="diagnostic-modal">
                <div class="diagnostic-header">
                    <h3>🛡️ Android Crash Prevention Diagnostics</h3>
                    <button class="close-btn" onclick="this.closest('#android-diagnostic-panel').remove()">&times;</button>
                </div>
                
                <div class="diagnostic-content">
                    <div class="status-section">
                        <h4>System Status</h4>
                        <div id="system-status" class="status-grid">
                            <div class="status-item">
                                <span class="status-label">Android Version:</span>
                                <span id="android-version" class="status-value">Detecting...</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">WebView Environment:</span>
                                <span id="webview-status" class="status-value">Detecting...</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Crash Prevention:</span>
                                <span id="crash-prevention-status" class="status-value">Checking...</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Risk Level:</span>
                                <span id="risk-level" class="status-value">Assessing...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="actions-section">
                        <h4>Diagnostic Actions</h4>
                        <div class="action-buttons">
                            <button id="quick-check-btn" class="diagnostic-btn primary">
                                🔍 Quick Health Check
                            </button>
                            <button id="full-test-btn" class="diagnostic-btn secondary">
                                🧪 Run Full Test Suite
                            </button>
                            <button id="refresh-status-btn" class="diagnostic-btn tertiary">
                                🔄 Refresh Status
                            </button>
                        </div>
                    </div>
                    
                    <div class="results-section">
                        <h4>Test Results</h4>
                        <div id="test-results" class="results-container">
                            <p class="no-results">No tests run yet. Click a button above to start diagnostics.</p>
                        </div>
                    </div>
                    
                    <div class="recommendations-section">
                        <h4>Recommendations</h4>
                        <div id="recommendations" class="recommendations-container">
                            <p class="loading">Analyzing system...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    const styles = document.createElement('style');
    const isLightTheme = getLightThemeEnabled();
    
    styles.textContent = `
        #android-diagnostic-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .diagnostic-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            touch-action: manipulation;
        }
        
        .diagnostic-modal {
            background: ${isLightTheme ? '#ffffff' : '#1e293b'};
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            border: ${isLightTheme ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'};
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
        }
        
        .diagnostic-header {
            padding: 20px 24px;
            border-bottom: 1px solid ${isLightTheme ? '#e5e5e5' : 'rgba(255, 255, 255, 0.1)'};
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .diagnostic-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: white;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .diagnostic-content {
            padding: 24px;
        }
        
        .diagnostic-content h4 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: ${isLightTheme ? '#333' : '#e0e0e0'};
        }
        
        .status-section {
            margin-bottom: 32px;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        
        .status-item {
            padding: 16px;
            background: ${isLightTheme ? '#f8f9fa' : '#2c3e50'};
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .status-label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: ${isLightTheme ? '#666' : '#bdc3c7'};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .status-value {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: ${isLightTheme ? '#333' : '#e0e0e0'};
        }
        
        .status-value.success {
            color: #28a745;
        }
        
        .status-value.warning {
            color: #ffc107;
        }
        
        .status-value.error {
            color: #dc3545;
        }
        
        .actions-section {
            margin-bottom: 32px;
        }
        
        .action-buttons {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .diagnostic-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .diagnostic-btn.primary {
            background: #667eea;
            color: white;
        }
        
        .diagnostic-btn.primary:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }
        
        .diagnostic-btn.secondary {
            background: #28a745;
            color: white;
        }
        
        .diagnostic-btn.secondary:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .diagnostic-btn.tertiary {
            background: #6c757d;
            color: white;
        }
        
        .diagnostic-btn.tertiary:hover {
            background: #5a6268;
            transform: translateY(-1px);
        }
        
        .diagnostic-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .results-section, .recommendations-section {
            margin-bottom: 24px;
        }
        
        .results-container, .recommendations-container {
            background: ${isLightTheme ? '#f8f9fa' : '#2c3e50'};
            border-radius: 8px;
            padding: 16px;
            min-height: 60px;
        }
        
        .no-results, .loading {
            color: ${isLightTheme ? '#666' : '#bdc3c7'};
            font-style: italic;
            text-align: center;
        }
        
        .test-result {
            margin-bottom: 12px;
            padding: 12px;
            background: ${isLightTheme ? 'white' : '#34495e'};
            border-radius: 6px;
            border-left: 4px solid #ddd;
        }
        
        .test-result.pass {
            border-left-color: #28a745;
        }
        
        .test-result.warn {
            border-left-color: #ffc107;
        }
        
        .test-result.fail {
            border-left-color: #dc3545;
        }
        
        .test-result-header {
            font-weight: 600;
            margin-bottom: 4px;
            color: ${isLightTheme ? '#333' : '#e0e0e0'};
        }
        
        .test-result-details {
            font-size: 13px;
            color: ${isLightTheme ? '#666' : '#bdc3c7'};
        }
        
        .recommendation {
            margin-bottom: 12px;
            padding: 12px;
            background: ${isLightTheme ? 'white' : '#34495e'};
            border-radius: 6px;
            border-left: 4px solid #17a2b8;
        }
        
        .recommendation-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: ${isLightTheme ? '#333' : '#e0e0e0'};
        }
        
        .recommendation-text {
            font-size: 13px;
            color: ${isLightTheme ? '#666' : '#bdc3c7'};
        }
        
        @media (max-width: 600px) {
            .diagnostic-modal {
                margin: 10px;
                max-height: 95vh;
            }
            
            .diagnostic-content {
                padding: 16px;
            }
            
            .action-buttons {
                flex-direction: column;
            }
            
            .diagnostic-btn {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    
    panel.appendChild(styles);
    
    // Add event listeners
    setTimeout(() => {
        addEventListeners(panel);
    }, 100);
    
    return panel;
}

/**
 * Add event listeners to the panel
 */
function addEventListeners(panel) {
    const quickCheckBtn = panel.querySelector('#quick-check-btn');
    const fullTestBtn = panel.querySelector('#full-test-btn');
    const refreshStatusBtn = panel.querySelector('#refresh-status-btn');
    const overlay = panel.querySelector('.diagnostic-overlay');
    const modal = panel.querySelector('.diagnostic-modal');
    
    quickCheckBtn.addEventListener('click', () => {
        runQuickCheck();
    });
    
    fullTestBtn.addEventListener('click', () => {
        runFullTests();
    });
    
    refreshStatusBtn.addEventListener('click', () => {
        updatePanelStatus();
    });
    
    // Handle overlay clicks to close modal, but prevent event bubbling from modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            panel.remove();
        }
    });
    
    // Prevent modal clicks from bubbling to overlay
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Prevent touch events on modal from bubbling to overlay
    modal.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });
    
    modal.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    });
    
    modal.addEventListener('touchend', (e) => {
        e.stopPropagation();
    });
}

/**
 * Update the panel status information
 */
function updatePanelStatus() {
    const status = getCrashPreventionStatus();
    
    // Update Android version
    const androidVersionEl = document.getElementById('android-version');
    if (androidVersionEl) {
        if (status.androidVersion > 0) {
            androidVersionEl.textContent = `Android ${status.androidVersion}`;
            androidVersionEl.className = 'status-value success';
        } else {
            androidVersionEl.textContent = 'Not Android';
            androidVersionEl.className = 'status-value';
        }
    }
    
    // Update WebView status
    const webviewStatusEl = document.getElementById('webview-status');
    if (webviewStatusEl) {
        if (status.isWebView) {
            webviewStatusEl.textContent = 'Yes';
            webviewStatusEl.className = 'status-value warning';
        } else {
            webviewStatusEl.textContent = 'No';
            webviewStatusEl.className = 'status-value';
        }
    }
    
    // Update crash prevention status
    const crashPreventionEl = document.getElementById('crash-prevention-status');
    if (crashPreventionEl) {
        if (status.crashPreventionActive) {
            crashPreventionEl.textContent = 'Active';
            crashPreventionEl.className = 'status-value success';
        } else {
            crashPreventionEl.textContent = 'Inactive';
            crashPreventionEl.className = 'status-value';
        }
    }
    
    // Update risk level
    const riskLevelEl = document.getElementById('risk-level');
    if (riskLevelEl) {
        if (status.proneToAppCompatCrashes) {
            riskLevelEl.textContent = 'High Risk';
            riskLevelEl.className = 'status-value error';
        } else if (status.isAndroid13Plus) {
            riskLevelEl.textContent = 'Medium Risk';
            riskLevelEl.className = 'status-value warning';
        } else {
            riskLevelEl.textContent = 'Low Risk';
            riskLevelEl.className = 'status-value success';
        }
    }
    
    // Update recommendations
    updateRecommendations(status);
}

/**
 * Run quick health check
 */
function runQuickCheck() {
    const resultsContainer = document.getElementById('test-results');
    const quickCheckBtn = document.getElementById('quick-check-btn');
    
    if (quickCheckBtn) {
        quickCheckBtn.disabled = true;
        quickCheckBtn.textContent = '🔍 Running...';
    }
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p class="loading">Running quick health check...</p>';
    }
    
    setTimeout(() => {
        const status = quickHealthCheck();
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="test-result ${status.crashPreventionActive ? 'pass' : 'warn'}">
                    <div class="test-result-header">
                        ${status.crashPreventionActive ? '✅' : '⚠️'} Quick Health Check
                    </div>
                    <div class="test-result-details">
                        Android ${status.androidVersion}, WebView: ${status.isWebView ? 'Yes' : 'No'}, 
                        Crash Prevention: ${status.crashPreventionActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
            `;
        }
        
        if (quickCheckBtn) {
            quickCheckBtn.disabled = false;
            quickCheckBtn.textContent = '🔍 Quick Health Check';
        }
    }, 1000);
}

/**
 * Run full test suite
 */
function runFullTests() {
    const resultsContainer = document.getElementById('test-results');
    const fullTestBtn = document.getElementById('full-test-btn');
    
    if (fullTestBtn) {
        fullTestBtn.disabled = true;
        fullTestBtn.textContent = '🧪 Running Tests...';
    }
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p class="loading">Running comprehensive test suite...</p>';
    }
    
    setTimeout(() => {
        const results = runAndroidCrashTests();
        
        if (resultsContainer) {
            let html = '';
            
            results.tests.forEach(test => {
                const statusClass = test.status.toLowerCase();
                const icon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
                
                html += `
                    <div class="test-result ${statusClass}">
                        <div class="test-result-header">
                            ${icon} ${test.name}
                        </div>
                        <div class="test-result-details">
                            ${test.details}
                        </div>
                    </div>
                `;
            });
            
            html += `
                <div class="test-summary">
                    <strong>Summary:</strong> ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings
                </div>
            `;
            
            resultsContainer.innerHTML = html;
        }
        
        if (fullTestBtn) {
            fullTestBtn.disabled = false;
            fullTestBtn.textContent = '🧪 Run Full Test Suite';
        }
    }, 2000);
}

/**
 * Update recommendations based on status
 */
function updateRecommendations(status) {
    const recommendationsContainer = document.getElementById('recommendations');
    if (!recommendationsContainer) return;
    
    let recommendations = [];
    
    if (status.proneToAppCompatCrashes && !status.crashPreventionActive) {
        recommendations.push({
            title: 'Critical: Enable Crash Prevention',
            text: 'Your device is prone to androidx.appcompat crashes. Crash prevention should be enabled automatically.'
        });
    }
    
    if (status.isAndroid13Plus && status.isWebView) {
        recommendations.push({
            title: 'Android 13+ WebView Detected',
            text: 'Enhanced crash prevention measures are active. Avoid long-pressing text and multi-touch gestures.'
        });
    }
    
    if (!status.isWebView && status.androidVersion > 0) {
        recommendations.push({
            title: 'Standard Browser Environment',
            text: 'You are using a standard browser. Crash prevention is not needed but performance optimizations are still active.'
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            title: 'System Looks Good',
            text: 'No specific recommendations at this time. The system appears to be running optimally.'
        });
    }
    
    let html = '';
    recommendations.forEach(rec => {
        html += `
            <div class="recommendation">
                <div class="recommendation-title">${rec.title}</div>
                <div class="recommendation-text">${rec.text}</div>
            </div>
        `;
    });
    
    recommendationsContainer.innerHTML = html;
}

/**
 * Add diagnostic menu item to the sidebar
 */
export function addDiagnosticMenuItem() {
    // Find the Options section in the sidebar
    const optionsSection = document.querySelector('.sidebar-section.collapsible .collapsible-content');
    if (!optionsSection) {
        console.warn('Options section not found in sidebar');
        return null;
    }
    
    // Check if diagnostic menu item already exists
    const existingItem = document.getElementById('android-diagnostic-btn');
    if (existingItem) {
        return existingItem;
    }
    
    // Create the diagnostic menu item
    const diagnosticMenuItem = document.createElement('button');
    diagnosticMenuItem.id = 'android-diagnostic-btn';
    diagnosticMenuItem.className = 'menu-item w-full text-left';
    diagnosticMenuItem.innerHTML = `
        <i class="fas fa-shield-alt"></i>
        Android Diagnostics
    `;
    diagnosticMenuItem.title = 'Android Crash Prevention Diagnostics';
    
    // Add click event listener
    diagnosticMenuItem.addEventListener('click', () => {
        showAndroidDiagnosticPanel();
        // Close sidebar after opening diagnostic panel
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            const closeSidebarEvent = new Event('click');
            const closeSidebarBtn = document.getElementById('close-sidebar');
            if (closeSidebarBtn) {
                closeSidebarBtn.dispatchEvent(closeSidebarEvent);
            }
        }
    });
    
    // Insert the diagnostic menu item after the Privacy Settings button
    const privacySettingsBtn = document.getElementById('privacy-settings-btn');
    if (privacySettingsBtn) {
        privacySettingsBtn.parentNode.insertBefore(diagnosticMenuItem, privacySettingsBtn.nextSibling);
    } else {
        // Fallback: add at the end of the options section
        optionsSection.appendChild(diagnosticMenuItem);
    }
    
    return diagnosticMenuItem;
}

/**
 * Check if diagnostic menu item should be shown
 */
export function shouldShowDiagnosticMenuItem() {
    // Only show on Android devices or in development mode
    const isAndroid = navigator.userAgent.toLowerCase().includes('android');
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    return isAndroid || isDevelopment;
}

/**
 * Initialize diagnostic menu item if needed
 */
export function initializeDiagnosticMenuItem() {
    if (shouldShowDiagnosticMenuItem()) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    addDiagnosticMenuItem();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                addDiagnosticMenuItem();
            }, 1000);
        }
    }
}

// Auto-initialize diagnostic menu item
if (typeof window !== 'undefined') {
    initializeDiagnosticMenuItem();
}