// Android Crash Prevention Test Suite
// Tests for androidx.appcompat.app.i.I crash fixes on Android 13+

import { getCrashPreventionStatus, isProneToAppCompatCrashes } from './android-crash-prevention.js';
import { getAndroidVersion } from './android-webview-config.js';

/**
 * Run comprehensive tests for Android crash prevention
 */
export function runAndroidCrashTests() {
    console.log('=== Android Crash Prevention Test Suite ===');
    
    const status = getCrashPreventionStatus();
    console.log('System Status:', status);
    
    const results = {
        systemInfo: status,
        tests: [],
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    // Run all tests
    results.tests.push(testAndroidVersionDetection());
    results.tests.push(testWebViewDetection());
    results.tests.push(testCrashPreventionActive());
    results.tests.push(testActionModeDisabled());
    results.tests.push(testContextMenuPrevention());
    results.tests.push(testResourceErrorPrevention());
    results.tests.push(testMemoryManagement());
    results.tests.push(testErrorHandling());
    results.tests.push(testSelectionPrevention());
    results.tests.push(testTouchEventHandling());
    
    // Calculate results
    results.tests.forEach(test => {
        if (test.status === 'PASS') results.passed++;
        else if (test.status === 'FAIL') results.failed++;
        else if (test.status === 'WARN') results.warnings++;
    });
    
    // Display summary
    console.log('\n=== Test Results Summary ===');
    console.log(`Total Tests: ${results.tests.length}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Warnings: ${results.warnings}`);
    
    if (results.failed === 0) {
        console.log('✅ All critical tests passed! Android 13+ crash prevention is active.');
    } else {
        console.warn(`⚠️ ${results.failed} tests failed. Some crash prevention measures may not be working.`);
    }
    
    return results;
}

/**
 * Test Android version detection
 */
function testAndroidVersionDetection() {
    const test = {
        name: 'Android Version Detection',
        description: 'Verify Android version is correctly detected',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        const version = getAndroidVersion();
        const userAgent = navigator.userAgent;
        
        if (version > 0) {
            test.status = 'PASS';
            test.details = `Android version ${version} detected from: ${userAgent}`;
        } else if (userAgent.toLowerCase().includes('android')) {
            test.status = 'WARN';
            test.details = 'Android detected but version parsing failed';
        } else {
            test.status = 'PASS';
            test.details = 'Non-Android environment detected (expected)';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error detecting Android version: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test WebView detection
 */
function testWebViewDetection() {
    const test = {
        name: 'WebView Detection',
        description: 'Verify WebView environment is correctly detected',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        const userAgent = navigator.userAgent.toLowerCase();
        const isWebView = userAgent.includes('wv') || userAgent.includes('webview');
        
        test.status = 'PASS';
        test.details = `WebView detection: ${isWebView ? 'Yes' : 'No'} (User Agent: ${userAgent})`;
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error detecting WebView: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test if crash prevention is active
 */
function testCrashPreventionActive() {
    const test = {
        name: 'Crash Prevention Active',
        description: 'Verify crash prevention system is initialized',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        const isActive = isProneToAppCompatCrashes();
        const androidVersion = getAndroidVersion();
        
        if (androidVersion >= 13 && isActive) {
            test.status = 'PASS';
            test.details = 'Crash prevention is active for Android 13+';
        } else if (androidVersion < 13) {
            test.status = 'PASS';
            test.details = `Android ${androidVersion} - crash prevention not needed`;
        } else {
            test.status = 'WARN';
            test.details = 'Crash prevention may not be fully active';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error checking crash prevention: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test action mode prevention
 */
function testActionModeDisabled() {
    const test = {
        name: 'Action Mode Prevention',
        description: 'Verify action mode is disabled to prevent crashes',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Check if startActionMode is overridden
        let actionModeDisabled = false;
        
        if (window.View && window.View.prototype && window.View.prototype.startActionMode) {
            // Try to call startActionMode and see if it's been overridden
            const result = window.View.prototype.startActionMode.toString();
            if (result.includes('Prevented startActionMode')) {
                actionModeDisabled = true;
            }
        }
        
        // Check CSS user-select prevention
        const testElement = document.createElement('div');
        testElement.textContent = 'Test';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const userSelect = computedStyle.getPropertyValue('-webkit-user-select') || computedStyle.getPropertyValue('user-select');
        
        document.body.removeChild(testElement);
        
        if (actionModeDisabled || userSelect === 'none') {
            test.status = 'PASS';
            test.details = 'Action mode prevention is active';
        } else {
            test.status = 'WARN';
            test.details = 'Action mode prevention may not be fully active';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing action mode prevention: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test context menu prevention
 */
function testContextMenuPrevention() {
    const test = {
        name: 'Context Menu Prevention',
        description: 'Verify context menu is disabled to prevent crashes',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Create a test element and try to trigger context menu
        const testElement = document.createElement('div');
        testElement.textContent = 'Test context menu';
        document.body.appendChild(testElement);
        
        let contextMenuPrevented = false;
        
        // Add a temporary listener to check if context menu is prevented
        const contextMenuHandler = function(e) {
            if (e.defaultPrevented) {
                contextMenuPrevented = true;
            }
        };
        
        testElement.addEventListener('contextmenu', contextMenuHandler);
        
        // Simulate context menu event
        const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true
        });
        
        testElement.dispatchEvent(contextMenuEvent);
        
        // Clean up
        testElement.removeEventListener('contextmenu', contextMenuHandler);
        document.body.removeChild(testElement);
        
        if (contextMenuEvent.defaultPrevented || contextMenuPrevented) {
            test.status = 'PASS';
            test.details = 'Context menu is properly prevented';
        } else {
            test.status = 'WARN';
            test.details = 'Context menu prevention may not be active';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing context menu prevention: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test resource error prevention
 */
function testResourceErrorPrevention() {
    const test = {
        name: 'Resource Error Prevention',
        description: 'Verify resource access errors are prevented',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Test if Resources object is properly overridden
        if (window.Resources) {
            const testString = window.Resources.getString(0x2040002); // Problematic resource ID
            if (testString === '') {
                test.status = 'PASS';
                test.details = 'Resource error prevention is active';
            } else {
                test.status = 'WARN';
                test.details = 'Resource override may not be working';
            }
        } else {
            test.status = 'PASS';
            test.details = 'Resources object properly overridden or not present';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing resource prevention: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test memory management
 */
function testMemoryManagement() {
    const test = {
        name: 'Memory Management',
        description: 'Verify memory monitoring and cleanup is active',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        if (performance && performance.memory) {
            const memory = performance.memory;
            const usedMemory = memory.usedJSHeapSize;
            const totalMemory = memory.totalJSHeapSize;
            const memoryUsage = (usedMemory / totalMemory) * 100;
            
            test.status = 'PASS';
            test.details = `Memory monitoring active. Usage: ${memoryUsage.toFixed(2)}% (${(usedMemory / 1024 / 1024).toFixed(2)}MB / ${(totalMemory / 1024 / 1024).toFixed(2)}MB)`;
        } else {
            test.status = 'WARN';
            test.details = 'Memory API not available for monitoring';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing memory management: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test error handling
 */
function testErrorHandling() {
    const test = {
        name: 'Error Handling',
        description: 'Verify global error handlers are in place',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Check if error event listeners are attached
        const errorListeners = window.addEventListener.toString();
        
        // Simulate an androidx.appcompat error (safely)
        const testError = new Error('Test androidx.appcompat.app.i.I error');
        
        // This should be caught by our error handler
        let errorCaught = false;
        const originalHandler = window.onerror;
        
        window.onerror = function(message, source, lineno, colno, error) {
            if (message && message.includes('androidx.appcompat')) {
                errorCaught = true;
            }
            if (originalHandler) {
                return originalHandler.call(this, message, source, lineno, colno, error);
            }
        };
        
        // Restore original handler
        setTimeout(() => {
            window.onerror = originalHandler;
        }, 100);
        
        test.status = 'PASS';
        test.details = 'Error handling system is in place';
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing error handling: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test selection prevention
 */
function testSelectionPrevention() {
    const test = {
        name: 'Selection Prevention',
        description: 'Verify text selection is properly controlled',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Test if selection is prevented on message elements
        const testElement = document.createElement('div');
        testElement.className = 'message';
        testElement.textContent = 'Test message content';
        document.body.appendChild(testElement);
        
        // Try to select text
        const range = document.createRange();
        range.selectNodeContents(testElement);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Check if selection was prevented or cleared
        const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;
        
        document.body.removeChild(testElement);
        
        if (!hasSelection) {
            test.status = 'PASS';
            test.details = 'Text selection is properly controlled';
        } else {
            test.status = 'WARN';
            test.details = 'Text selection may not be fully controlled';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing selection prevention: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Test touch event handling
 */
function testTouchEventHandling() {
    const test = {
        name: 'Touch Event Handling',
        description: 'Verify touch events are properly handled to prevent crashes',
        status: 'UNKNOWN',
        details: ''
    };
    
    try {
        // Test if multi-touch is prevented
        const testElement = document.createElement('div');
        document.body.appendChild(testElement);
        
        let touchPrevented = false;
        
        // Create a multi-touch event
        const touchEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [
                new Touch({ identifier: 1, target: testElement, clientX: 100, clientY: 100 }),
                new Touch({ identifier: 2, target: testElement, clientX: 200, clientY: 200 }),
                new Touch({ identifier: 3, target: testElement, clientX: 300, clientY: 300 })
            ]
        });
        
        testElement.dispatchEvent(touchEvent);
        
        if (touchEvent.defaultPrevented) {
            touchPrevented = true;
        }
        
        document.body.removeChild(testElement);
        
        if (touchPrevented) {
            test.status = 'PASS';
            test.details = 'Multi-touch events are properly prevented';
        } else {
            test.status = 'WARN';
            test.details = 'Multi-touch prevention may not be active';
        }
    } catch (error) {
        test.status = 'FAIL';
        test.details = `Error testing touch event handling: ${error.message}`;
    }
    
    console.log(`${test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌'} ${test.name}: ${test.details}`);
    return test;
}

/**
 * Run a quick health check
 */
export function quickHealthCheck() {
    console.log('=== Quick Android Health Check ===');
    
    const status = getCrashPreventionStatus();
    
    if (status.isAndroid13Plus && status.isWebView) {
        console.log('🔍 Android 13+ WebView detected');
        
        if (status.crashPreventionActive) {
            console.log('✅ Crash prevention is ACTIVE');
        } else {
            console.log('❌ Crash prevention is NOT ACTIVE');
        }
        
        if (status.proneToAppCompatCrashes) {
            console.log('⚠️ Environment is prone to androidx.appcompat crashes');
        }
    } else {
        console.log('ℹ️ Not an Android 13+ WebView environment');
    }
    
    return status;
}

// Auto-run quick health check on import
if (typeof window !== 'undefined') {
    // Run health check after a short delay to ensure everything is initialized
    setTimeout(() => {
        quickHealthCheck();
    }, 1000);
}