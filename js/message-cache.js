// Smart Message Cache
// Implements intelligent caching with memory limits and LRU eviction

import { debugLog, debugError } from './utils.js';

class MessageCache {
    constructor() {
        this.cache = new Map();
        this.accessTimes = new Map();
        this.maxCacheSize = 100; // Maximum number of cached message sets
        this.maxMemoryUsage = 50 * 1024 * 1024; // 50MB memory limit
        this.currentMemoryUsage = 0;
        this.compressionEnabled = true;
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        
        this.startCleanupTimer();
    }
    
    /**
     * Cache a set of messages
     * @param {string} key - Cache key (usually chat ID)
     * @param {Array} messages - Messages to cache
     * @param {Object} metadata - Additional metadata
     */
    set(key, messages, metadata = {}) {
        try {
            // Calculate memory usage
            const messageData = {
                messages: this.compressMessages(messages),
                metadata,
                timestamp: Date.now(),
                size: this.calculateSize(messages)
            };
            
            // Check if we need to evict items
            this.ensureMemoryLimit(messageData.size);
            
            // Store in cache
            this.cache.set(key, messageData);
            this.accessTimes.set(key, Date.now());
            this.currentMemoryUsage += messageData.size;
            
            debugLog(`Cached ${messages.length} messages for ${key}, size: ${messageData.size} bytes`);
        } catch (error) {
            debugError('Error caching messages:', error);
        }
    }
    
    /**
     * Get cached messages
     * @param {string} key - Cache key
     * @returns {Array|null} - Cached messages or null if not found
     */
    get(key) {
        try {
            const cached = this.cache.get(key);
            if (!cached) {
                return null;
            }
            
            // Update access time
            this.accessTimes.set(key, Date.now());
            
            // Decompress messages
            const messages = this.decompressMessages(cached.messages);
            
            debugLog(`Retrieved ${messages.length} messages from cache for ${key}`);
            return {
                messages,
                metadata: cached.metadata,
                timestamp: cached.timestamp
            };
        } catch (error) {
            debugError('Error retrieving cached messages:', error);
            return null;
        }
    }
    
    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} - True if key exists
     */
    has(key) {
        return this.cache.has(key);
    }
    
    /**
     * Remove item from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        const cached = this.cache.get(key);
        if (cached) {
            this.currentMemoryUsage -= cached.size;
            this.cache.delete(key);
            this.accessTimes.delete(key);
            debugLog(`Removed cached messages for ${key}`);
        }
    }
    
    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.currentMemoryUsage = 0;
        debugLog('Cleared all cached messages');
    }
    
    /**
     * Compress messages for storage
     * @param {Array} messages - Messages to compress
     * @returns {Array} - Compressed messages
     */
    compressMessages(messages) {
        if (!this.compressionEnabled || !messages || messages.length === 0) {
            return messages;
        }
        
        try {
            return messages.map(msg => {
                const compressed = {
                    r: msg.role,
                    c: this.compressContent(msg.content)
                };
                
                // Only include non-default properties
                if (msg.timestamp) compressed.t = msg.timestamp;
                if (msg.has_files) compressed.f = msg.has_files;
                if (msg.isTopicBoundary) compressed.b = msg.isTopicBoundary;
                
                return compressed;
            });
        } catch (error) {
            debugError('Error compressing messages:', error);
            return messages;
        }
    }
    
    /**
     * Decompress messages from storage
     * @param {Array} compressedMessages - Compressed messages
     * @returns {Array} - Decompressed messages
     */
    decompressMessages(compressedMessages) {
        if (!this.compressionEnabled || !compressedMessages || compressedMessages.length === 0) {
            return compressedMessages;
        }
        
        try {
            return compressedMessages.map(compressed => {
                // Check if already decompressed
                if (compressed.role && compressed.content) {
                    return compressed;
                }
                
                const message = {
                    role: compressed.r,
                    content: compressed.c
                };
                
                // Restore optional properties
                if (compressed.t) message.timestamp = compressed.t;
                if (compressed.f) message.has_files = compressed.f;
                if (compressed.b) message.isTopicBoundary = compressed.b;
                
                return message;
            });
        } catch (error) {
            debugError('Error decompressing messages:', error);
            return compressedMessages;
        }
    }
    
    /**
     * Compress message content
     * @param {string} content - Content to compress
     * @returns {string} - Compressed content
     */
    compressContent(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }
        
        // Remove excessive whitespace
        let compressed = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        
        // Compress repeated patterns
        compressed = compressed.replace(/(.{10,}?)\1{2,}/g, (match, pattern) => {
            const count = Math.floor(match.length / pattern.length);
            return `${pattern}[repeated ${count}x]`;
        });
        
        return compressed;
    }
    
    /**
     * Calculate memory usage of messages
     * @param {Array} messages - Messages to calculate size for
     * @returns {number} - Estimated size in bytes
     */
    calculateSize(messages) {
        if (!messages || messages.length === 0) {
            return 0;
        }
        
        try {
            const jsonString = JSON.stringify(messages);
            return jsonString.length * 2; // Rough estimate for UTF-16
        } catch (error) {
            debugError('Error calculating message size:', error);
            return messages.length * 1000; // Fallback estimate
        }
    }
    
    /**
     * Ensure memory usage stays within limits
     * @param {number} newItemSize - Size of new item being added
     */
    ensureMemoryLimit(newItemSize) {
        // Check if we need to free up memory
        while (this.currentMemoryUsage + newItemSize > this.maxMemoryUsage && this.cache.size > 0) {
            this.evictLeastRecentlyUsed();
        }
        
        // Also check cache size limit
        while (this.cache.size >= this.maxCacheSize) {
            this.evictLeastRecentlyUsed();
        }
    }
    
    /**
     * Evict least recently used item
     */
    evictLeastRecentlyUsed() {
        if (this.cache.size === 0) {
            return;
        }
        
        let lruKey = null;
        let lruTime = Date.now();
        
        for (const [key, time] of this.accessTimes) {
            if (time < lruTime) {
                lruTime = time;
                lruKey = key;
            }
        }
        
        if (lruKey) {
            const cached = this.cache.get(lruKey);
            if (cached) {
                this.currentMemoryUsage -= cached.size;
            }
            this.cache.delete(lruKey);
            this.accessTimes.delete(lruKey);
            debugLog(`Evicted LRU cache entry: ${lruKey}`);
        }
    }
    
    /**
     * Start periodic cleanup
     */
    startCleanupTimer() {
        setInterval(() => {
            this.performCleanup();
        }, this.cleanupInterval);
    }
    
    /**
     * Perform periodic cleanup
     */
    performCleanup() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        const keysToDelete = [];
        
        // Find expired entries
        for (const [key, cached] of this.cache) {
            if (now - cached.timestamp > maxAge) {
                keysToDelete.push(key);
            }
        }
        
        // Remove expired entries
        keysToDelete.forEach(key => {
            this.delete(key);
        });
        
        if (keysToDelete.length > 0) {
            debugLog(`Cleaned up ${keysToDelete.length} expired cache entries`);
        }
        
        // Force memory cleanup if usage is high
        if (this.currentMemoryUsage > this.maxMemoryUsage * 0.8) {
            const targetSize = this.maxMemoryUsage * 0.6;
            while (this.currentMemoryUsage > targetSize && this.cache.size > 0) {
                this.evictLeastRecentlyUsed();
            }
        }
    }
    
    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            memoryUsage: this.currentMemoryUsage,
            maxMemoryUsage: this.maxMemoryUsage,
            memoryUtilization: (this.currentMemoryUsage / this.maxMemoryUsage) * 100,
            compressionEnabled: this.compressionEnabled
        };
    }
    
    /**
     * Update cache configuration
     * @param {Object} config - Configuration options
     */
    updateConfig(config) {
        if (config.maxCacheSize !== undefined) {
            this.maxCacheSize = config.maxCacheSize;
        }
        if (config.maxMemoryUsage !== undefined) {
            this.maxMemoryUsage = config.maxMemoryUsage;
        }
        if (config.compressionEnabled !== undefined) {
            this.compressionEnabled = config.compressionEnabled;
        }
        
        // Ensure we're within new limits
        this.ensureMemoryLimit(0);
    }
    
    /**
     * Preload messages into cache
     * @param {string} key - Cache key
     * @param {Array} messages - Messages to preload
     * @param {number} priority - Priority level (higher = more important)
     */
    preload(key, messages, priority = 1) {
        if (this.has(key)) {
            return; // Already cached
        }
        
        // Add priority to metadata
        this.set(key, messages, { priority, preloaded: true });
    }
    
    /**
     * Get cache keys sorted by priority
     * @returns {Array} - Sorted cache keys
     */
    getKeysByPriority() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => {
            const priorityA = a[1].metadata.priority || 1;
            const priorityB = b[1].metadata.priority || 1;
            return priorityB - priorityA;
        });
        return entries.map(entry => entry[0]);
    }
}

// Export singleton instance
export const messageCache = new MessageCache();

// Export class for testing
export { MessageCache }; 