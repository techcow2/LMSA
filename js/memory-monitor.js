// Memory Monitor
// Provides memory usage statistics and optimization controls

import { memoryManager } from './memory-manager.js';
import { messageCache } from './message-cache.js';
import { chatHistoryOptimizer } from './chat-history-optimizer.js';
import { debugLog } from './utils.js';

class MemoryMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.statsHistory = [];
        this.maxHistoryLength = 50;
        this.lastCleanupTime = 0;
        this.cleanupCooldown = 30000; // 30 seconds between cleanups
        
        // Platform-specific settings
        this.isAndroidWebView = this.detectAndroidWebView();
        this.isMobile = this.detectMobile();
        
        // Adjust thresholds based on platform
        this.memoryThresholds = this.getMemoryThresholds();
    }
    
    /**
     * Detect if running in Android WebView
     * @returns {boolean}
     */
    detectAndroidWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android') && 
               (userAgent.includes('wv') || userAgent.includes('webview'));
    }
    
    /**
     * Detect if running on mobile device
     * @returns {boolean}
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Get platform-specific memory thresholds
     * @returns {Object}
     */
    getMemoryThresholds() {
        if (this.isAndroidWebView) {
            return {
                cleanup: 100,    // 100MB for Android WebView
                warning: 150,    // 150MB warning
                critical: 200    // 200MB critical
            };
        } else if (this.isMobile) {
            return {
                cleanup: 150,    // 150MB for other mobile
                warning: 250,    // 250MB warning
                critical: 300    // 300MB critical
            };
        } else {
            return {
                cleanup: 250,    // 250MB for desktop
                warning: 400,    // 400MB warning
                critical: 500    // 500MB critical
            };
        }
    }
    
    /**
     * Get comprehensive memory statistics
     * @returns {Object} - Memory statistics
     */
    getMemoryStats() {
        const stats = {
            timestamp: Date.now(),
            browser: this.getBrowserMemoryStats(),
            memoryManager: memoryManager.getMemoryStats(),
            messageCache: messageCache.getStats(),
            chatHistoryOptimizer: chatHistoryOptimizer.getMemoryStats(),
            localStorage: this.getLocalStorageStats(),
            domElements: this.getDOMStats()
        };
        
        // Calculate total estimated memory usage
        stats.totalEstimated = this.calculateTotalMemoryUsage(stats);
        
        return stats;
    }
    
    /**
     * Get browser memory statistics
     * @returns {Object} - Browser memory stats
     */
    getBrowserMemoryStats() {
        const stats = {
            available: false,
            jsHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
            usagePercentage: 0
        };
        
        if ('memory' in performance) {
            const memInfo = performance.memory;
            stats.available = true;
            stats.jsHeapSize = memInfo.usedJSHeapSize;
            stats.totalJSHeapSize = memInfo.totalJSHeapSize;
            stats.jsHeapSizeLimit = memInfo.jsHeapSizeLimit;
            stats.usagePercentage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        }
        
        return stats;
    }
    
    /**
     * Get localStorage statistics
     * @returns {Object} - localStorage stats
     */
    getLocalStorageStats() {
        const stats = {
            totalSize: 0,
            itemCount: 0,
            chatHistorySize: 0,
            settingsSize: 0,
            charactersSize: 0,
            otherSize: 0
        };
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = key.length + (value ? value.length : 0);
                
                stats.totalSize += size;
                stats.itemCount++;
                
                if (key.includes('chatHistory')) {
                    stats.chatHistorySize += size;
                } else if (key.includes('settings') || key.includes('temperature') || key.includes('systemPrompt')) {
                    stats.settingsSize += size;
                } else if (key.includes('charactersData')) {
                    stats.charactersSize += size;
                } else {
                    stats.otherSize += size;
                }
            }
        } catch (error) {
            debugLog('Error calculating localStorage stats:', error);
        }
        
        return stats;
    }
    
    /**
     * Get DOM statistics
     * @returns {Object} - DOM stats
     */
    getDOMStats() {
        const stats = {
            totalElements: document.querySelectorAll('*').length,
            messageElements: document.querySelectorAll('.message').length,
            imageElements: document.querySelectorAll('img').length,
            scriptElements: document.querySelectorAll('script').length,
            styleElements: document.querySelectorAll('style, link[rel="stylesheet"]').length
        };
        
        return stats;
    }
    
    /**
     * Calculate total estimated memory usage
     * @param {Object} stats - Memory statistics
     * @returns {number} - Total estimated memory in bytes
     */
    calculateTotalMemoryUsage(stats) {
        let total = 0;
        
        // Browser memory (if available)
        if (stats.browser.available) {
            total += stats.browser.jsHeapSize;
        }
        
        // Message cache
        total += stats.messageCache.memoryUsage || 0;
        
        // Chat history optimizer
        total += stats.chatHistoryOptimizer.compressedDataSize || 0;
        
        // localStorage (rough estimate)
        total += stats.localStorage.totalSize * 2; // UTF-16 encoding
        
        return total;
    }
    
    /**
     * Start monitoring memory usage
     * @param {number} interval - Monitoring interval in milliseconds
     */
    startMonitoring(interval = 5000) {
        if (this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            const stats = this.getMemoryStats();
            this.addStatsToHistory(stats);
            this.checkMemoryThresholds(stats);
        }, interval);
        
        debugLog('Memory monitoring started');
    }
    
    /**
     * Stop monitoring memory usage
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        debugLog('Memory monitoring stopped');
    }
    
    /**
     * Add stats to history
     * @param {Object} stats - Memory statistics
     */
    addStatsToHistory(stats) {
        this.statsHistory.push(stats);
        
        // Limit history length
        if (this.statsHistory.length > this.maxHistoryLength) {
            this.statsHistory.shift();
        }
    }
    
    /**
     * Check memory thresholds and trigger optimizations
     * @param {Object} stats - Memory statistics
     */
    checkMemoryThresholds(stats) {
        const totalMB = stats.totalEstimated / (1024 * 1024);
        
        // Trigger cleanup if memory usage is high
        if (totalMB > this.memoryThresholds.cleanup) {
            debugLog(`High memory usage detected: ${totalMB.toFixed(1)}MB (threshold: ${this.memoryThresholds.cleanup}MB)`);
            this.triggerMemoryOptimization();
        }
        
        // Warn if memory usage is very high
        if (totalMB > this.memoryThresholds.warning) {
            console.warn(`High memory usage: ${totalMB.toFixed(1)}MB (warning threshold: ${this.memoryThresholds.warning}MB) - consider refreshing the page`);
        }
        
        // Critical memory usage
        if (totalMB > this.memoryThresholds.critical) {
            console.error(`Critical memory usage: ${totalMB.toFixed(1)}MB - immediate action required`);
        }
    }
    
    /**
     * Trigger memory optimization
     */
    triggerMemoryOptimization() {
        debugLog('Triggering memory optimization...');
        
        // Force memory manager cleanup
        memoryManager.performCleanup();
        
        // Clean up message cache
        const cacheStats = messageCache.getStats();
        if (cacheStats.memoryUtilization > 70) {
            messageCache.performCleanup();
        }
        
        // Force garbage collection if available
        memoryManager.forceGarbageCollection();
        
        debugLog('Memory optimization completed');
    }
    
    /**
     * Get memory usage trend
     * @returns {Object} - Memory trend information
     */
    getMemoryTrend() {
        if (this.statsHistory.length < 2) {
            return { trend: 'unknown', change: 0 };
        }
        
        const recent = this.statsHistory.slice(-5); // Last 5 measurements
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        const change = last.totalEstimated - first.totalEstimated;
        const changePercent = (change / first.totalEstimated) * 100;
        
        let trend = 'stable';
        if (changePercent > 5) {
            trend = 'increasing';
        } else if (changePercent < -5) {
            trend = 'decreasing';
        }
        
        return {
            trend,
            change,
            changePercent,
            timeSpan: last.timestamp - first.timestamp
        };
    }
    
    /**
     * Generate memory report
     * @returns {Object} - Comprehensive memory report
     */
    generateReport() {
        const stats = this.getMemoryStats();
        const trend = this.getMemoryTrend();
        
        const report = {
            timestamp: Date.now(),
            summary: {
                totalMemoryMB: (stats.totalEstimated / (1024 * 1024)).toFixed(1),
                browserMemoryMB: stats.browser.available ? 
                    (stats.browser.jsHeapSize / (1024 * 1024)).toFixed(1) : 'N/A',
                memoryTrend: trend.trend,
                optimizationLevel: this.getOptimizationLevel(stats)
            },
            breakdown: {
                messageCache: {
                    sizeMB: (stats.messageCache.memoryUsage / (1024 * 1024)).toFixed(1),
                    utilization: stats.messageCache.memoryUtilization.toFixed(1) + '%',
                    cacheSize: stats.messageCache.cacheSize
                },
                localStorage: {
                    sizeMB: (stats.localStorage.totalSize / (1024 * 1024)).toFixed(1),
                    chatHistoryMB: (stats.localStorage.chatHistorySize / (1024 * 1024)).toFixed(1),
                    itemCount: stats.localStorage.itemCount
                },
                chatOptimizer: {
                    compressedChats: stats.chatHistoryOptimizer.compressedChats,
                    activeChats: stats.chatHistoryOptimizer.activeChats,
                    memorySavedMB: (stats.chatHistoryOptimizer.estimatedMemorySaved / (1024 * 1024)).toFixed(1)
                },
                dom: {
                    totalElements: stats.domElements.totalElements,
                    messageElements: stats.domElements.messageElements,
                    imageElements: stats.domElements.imageElements
                }
            },
            recommendations: this.generateRecommendations(stats)
        };
        
        return report;
    }
    
    /**
     * Get optimization level
     * @param {Object} stats - Memory statistics
     * @returns {string} - Optimization level
     */
    getOptimizationLevel(stats) {
        const totalMB = stats.totalEstimated / (1024 * 1024);
        const thresholds = this.memoryThresholds;
        
        if (totalMB < thresholds.cleanup * 0.5) return 'excellent';
        if (totalMB < thresholds.cleanup * 0.8) return 'good';
        if (totalMB < thresholds.cleanup) return 'moderate';
        if (totalMB < thresholds.warning) return 'poor';
        return 'critical';
    }
    
    /**
     * Generate optimization recommendations
     * @param {Object} stats - Memory statistics
     * @returns {Array} - Array of recommendations
     */
    generateRecommendations(stats) {
        const recommendations = [];
        const totalMB = stats.totalEstimated / (1024 * 1024);
        const thresholds = this.memoryThresholds;
        
        // Platform-specific recommendations
        if (this.isAndroidWebView) {
            if (totalMB > thresholds.cleanup * 0.8) {
                recommendations.push('Android WebView: Consider clearing chat history or refreshing to optimize memory');
            }
            if (stats.domElements.messageElements > 50) {
                recommendations.push('Android WebView: Many messages loaded - scroll to trigger virtualization');
            }
        } else {
            if (totalMB > thresholds.warning) {
                recommendations.push('Consider refreshing the page to reset memory usage');
            }
        }
        
        if (stats.messageCache.memoryUtilization > (this.isAndroidWebView ? 60 : 80)) {
            recommendations.push('Message cache utilization high - older messages will be automatically cleaned up');
        }
        
        const storageThreshold = this.isAndroidWebView ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (stats.localStorage.totalSize > storageThreshold) {
            recommendations.push('Local storage is large - consider exporting and clearing old chat history');
        }
        
        const domThreshold = this.isAndroidWebView ? 50 : 100;
        if (stats.domElements.messageElements > domThreshold) {
            recommendations.push('Message virtualization is helping optimize display performance');
        }
        
        // Skip compression recommendations for Android WebView (performance impact)
        if (!this.isAndroidWebView && stats.chatHistoryOptimizer.compressedChats === 0 && stats.localStorage.chatHistorySize > 1024 * 1024) {
            recommendations.push('Chat history could benefit from compression optimization');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Memory usage is optimized - no action needed');
        }
        
        return recommendations;
    }
    
    /**
     * Export memory statistics
     * @returns {string} - JSON string of memory data
     */
    exportStats() {
        const exportData = {
            timestamp: Date.now(),
            currentStats: this.getMemoryStats(),
            history: this.statsHistory,
            report: this.generateReport()
        };
        
        return JSON.stringify(exportData, null, 2);
    }
}

// Create and export singleton instance
export const memoryMonitor = new MemoryMonitor();

// Export class for testing
export { MemoryMonitor };

// Auto-start monitoring with platform-specific intervals
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode with platform-specific intervals
    const interval = memoryMonitor.isAndroidWebView ? 30000 : 10000; // 30s for Android WebView, 10s for others
    memoryMonitor.startMonitoring(interval);
} else {
    // Production mode with conservative intervals
    const interval = memoryMonitor.isAndroidWebView ? 60000 : 30000; // 60s for Android WebView, 30s for others
    memoryMonitor.startMonitoring(interval);
}