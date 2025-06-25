// Performance diagnostics utility for AdMob environments
import { detectAdMobEnvironment, getDevicePerformanceLevel } from './performance-utils.js';

/**
 * Performance diagnostics class for monitoring app performance
 */
class PerformanceDiagnostics {
    constructor() {
        this.isAdMobEnv = detectAdMobEnvironment();
        this.performanceLevel = getDevicePerformanceLevel();
        this.metrics = {
            memoryUsage: [],
            frameRates: [],
            loadTimes: [],
            errors: []
        };
        this.startTime = performance.now();
        this.isMonitoring = false;
    }

    /**
     * Starts performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        console.log('Starting performance diagnostics...');
        console.log(`Environment: ${this.isAdMobEnv ? 'AdMob WebView' : 'Regular Browser'}`);
        console.log(`Performance Level: ${this.performanceLevel}`);

        // Monitor memory usage
        if ('memory' in performance) {
            this.memoryMonitor = setInterval(() => {
                const memInfo = performance.memory;
                const usage = {
                    used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
                    timestamp: performance.now()
                };
                usage.percentage = Math.round((usage.used / usage.limit) * 100);
                this.metrics.memoryUsage.push(usage);

                // Keep only last 20 measurements
                if (this.metrics.memoryUsage.length > 20) {
                    this.metrics.memoryUsage.shift();
                }

                // Warn if memory usage is high
                if (usage.percentage > 80) {
                    console.warn(`High memory usage detected: ${usage.percentage}%`);
                }
            }, 5000);
        }

        // Monitor frame rate
        let lastFrameTime = performance.now();
        let frameCount = 0;
        
        const measureFrameRate = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime - lastFrameTime >= 1000) {
                const fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime));
                this.metrics.frameRates.push({
                    fps: fps,
                    timestamp: currentTime
                });
                
                // Keep only last 10 measurements
                if (this.metrics.frameRates.length > 10) {
                    this.metrics.frameRates.shift();
                }
                
                // Warn if FPS is too low
                if (fps < 15) {
                    console.warn(`Low frame rate detected: ${fps} FPS`);
                }
                
                frameCount = 0;
                lastFrameTime = currentTime;
            }
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFrameRate);
            }
        };
        
        requestAnimationFrame(measureFrameRate);

        // Monitor error rates
        this.originalErrorHandler = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            this.metrics.errors.push({
                message: message,
                source: source,
                line: lineno,
                column: colno,
                timestamp: performance.now()
            });

            // Keep only last 50 errors
            if (this.metrics.errors.length > 50) {
                this.metrics.errors.shift();
            }

            if (this.originalErrorHandler) {
                return this.originalErrorHandler(message, source, lineno, colno, error);
            }
        };

        // Monitor resource loading times
        this.resourceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 1000) { // Only track resources that take more than 1 second
                    this.metrics.loadTimes.push({
                        name: entry.name,
                        duration: Math.round(entry.duration),
                        type: entry.initiatorType,
                        timestamp: entry.startTime
                    });
                }
            });
        });
        this.resourceObserver.observe({ entryTypes: ['resource'] });
    }

    /**
     * Stops performance monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;

        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
        }

        if (this.resourceObserver) {
            this.resourceObserver.disconnect();
        }

        window.onerror = this.originalErrorHandler;
        console.log('Performance diagnostics stopped');
    }

    /**
     * Generates a performance report
     * @returns {Object} Performance report object
     */
    generateReport() {
        const currentTime = performance.now();
        const totalTime = currentTime - this.startTime;

        // Calculate averages
        const avgMemoryUsage = this.metrics.memoryUsage.length > 0
            ? Math.round(this.metrics.memoryUsage.reduce((sum, m) => sum + m.percentage, 0) / this.metrics.memoryUsage.length)
            : 0;

        const avgFrameRate = this.metrics.frameRates.length > 0
            ? Math.round(this.metrics.frameRates.reduce((sum, f) => sum + f.fps, 0) / this.metrics.frameRates.length)
            : 0;

        // Get recent memory usage
        const recentMemory = this.metrics.memoryUsage.slice(-5);
        const currentMemory = recentMemory.length > 0 ? recentMemory[recentMemory.length - 1] : null;

        // Count errors in last 5 minutes
        const recentErrors = this.metrics.errors.filter(e => 
            currentTime - e.timestamp < 300000
        ).length;

        // Find slowest resources
        const slowestResources = this.metrics.loadTimes
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);

        const report = {
            environment: {
                isAdMobWebView: this.isAdMobEnv,
                performanceLevel: this.performanceLevel,
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                deviceMemory: navigator.deviceMemory || 'unknown',
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
            },
            performance: {
                sessionDuration: Math.round(totalTime / 1000),
                averageMemoryUsage: avgMemoryUsage,
                currentMemoryUsage: currentMemory ? `${currentMemory.used}MB (${currentMemory.percentage}%)` : 'unknown',
                averageFrameRate: avgFrameRate,
                recentErrors: recentErrors,
                totalErrors: this.metrics.errors.length
            },
            resources: {
                slowestLoads: slowestResources
            },
            recommendations: this.getRecommendations(avgMemoryUsage, avgFrameRate, recentErrors)
        };

        return report;
    }

    /**
     * Gets performance recommendations based on metrics
     * @param {number} avgMemory - Average memory usage percentage
     * @param {number} avgFps - Average frame rate
     * @param {number} errorCount - Recent error count
     * @returns {Array} Array of recommendations
     */
    getRecommendations(avgMemory, avgFps, errorCount) {
        const recommendations = [];

        if (avgMemory > 70) {
            recommendations.push('High memory usage detected. Consider clearing chat history or reducing opened features.');
        }

        if (avgFps < 20) {
            recommendations.push('Low frame rate detected. Disable animations or use simpler visual themes.');
        }

        if (errorCount > 5) {
            recommendations.push('Multiple errors detected. Check console for details and consider refreshing the page.');
        }

        if (this.isAdMobEnv) {
            recommendations.push('AdMob environment detected. Consider using minimal themes and disabling non-essential features.');
        }

        if (this.performanceLevel === 'low') {
            recommendations.push('Low-end device detected. Use emergency performance mode if experiencing issues.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Performance appears to be optimal for this environment.');
        }

        return recommendations;
    }

    /**
     * Logs the performance report to console
     */
    logReport() {
        const report = this.generateReport();
        
        console.group('🔍 Performance Diagnostics Report');
        console.log('Environment:', report.environment);
        console.log('Performance Metrics:', report.performance);
        console.log('Resource Loading:', report.resources);
        console.log('Recommendations:', report.recommendations);
        console.groupEnd();

        return report;
    }

    /**
     * Exports report as JSON string for sharing
     * @returns {string} JSON string of the report
     */
    exportReport() {
        const report = this.generateReport();
        return JSON.stringify(report, null, 2);
    }
}

// Create global instance
window.performanceDiagnostics = new PerformanceDiagnostics();

// Auto-start monitoring in AdMob environments or low-performance devices
if (window.performanceDiagnostics.isAdMobEnv || window.performanceDiagnostics.performanceLevel === 'low') {
    window.performanceDiagnostics.startMonitoring();
    console.log('🔍 Performance diagnostics auto-started due to environment');
}

// Add console commands for manual use
console.log('📊 Performance Diagnostics Available:');
console.log('- window.performanceDiagnostics.startMonitoring() - Start monitoring');
console.log('- window.performanceDiagnostics.stopMonitoring() - Stop monitoring');
console.log('- window.performanceDiagnostics.logReport() - Show performance report');
console.log('- window.performanceDiagnostics.exportReport() - Export report as JSON');

export { PerformanceDiagnostics }; 