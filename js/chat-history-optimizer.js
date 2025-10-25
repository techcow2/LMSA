// Chat History Optimizer
// Implements compression and pagination to reduce memory usage

import { debugLog, debugError } from './utils.js';

class ChatHistoryOptimizer {
    constructor() {
        this.compressionThreshold = 100; // Messages per chat before compression
        this.maxMessagesInMemory = 50; // Maximum messages to keep in memory per chat
        this.compressionRatio = 0.7; // Target compression ratio
        this.compressedChats = new Map(); // Store compressed chat data
        this.activeChats = new Set(); // Track recently accessed chats
        this.maxActiveChatCount = 10; // Maximum number of active chats to keep uncompressed
    }
    
    /**
     * Optimize chat history data for memory efficiency
     * @param {Object} chatHistoryData - Original chat history data
     * @returns {Object} - Optimized chat history data
     */
    optimizeChatHistory(chatHistoryData) {
        const optimizedData = {};
        
        for (const [chatId, chatData] of Object.entries(chatHistoryData)) {
            optimizedData[chatId] = this.optimizeChat(chatId, chatData);
        }
        
        // Clean up old compressed data
        this.cleanupOldCompressedData(Object.keys(chatHistoryData));
        
        return optimizedData;
    }
    
    /**
     * Optimize a single chat
     * @param {string} chatId - Chat ID
     * @param {Object} chatData - Chat data
     * @returns {Object} - Optimized chat data
     */
    optimizeChat(chatId, chatData) {
        if (!chatData || !chatData.messages) {
            return chatData;
        }
        
        const messageCount = chatData.messages.length;
        
        // If chat is small, don't optimize
        if (messageCount <= this.maxMessagesInMemory) {
            return chatData;
        }
        
        // Mark as active if recently accessed
        if (this.activeChats.has(chatId) && this.activeChats.size <= this.maxActiveChatCount) {
            return chatData;
        }
        
        // Apply pagination - keep only recent messages in memory
        const recentMessages = chatData.messages.slice(-this.maxMessagesInMemory);
        const olderMessages = chatData.messages.slice(0, -this.maxMessagesInMemory);
        
        // Compress older messages
        if (olderMessages.length > 0) {
            const compressedOlderMessages = this.compressMessages(olderMessages);
            this.compressedChats.set(`${chatId}_older`, compressedOlderMessages);
        }
        
        debugLog(`Optimized chat ${chatId}: ${messageCount} messages -> ${recentMessages.length} in memory`);
        
        return {
            ...chatData,
            messages: recentMessages,
            hasCompressedHistory: olderMessages.length > 0,
            totalMessageCount: messageCount
        };
    }
    
    /**
     * Compress messages using various techniques
     * @param {Array} messages - Messages to compress
     * @returns {string} - Compressed message data
     */
    compressMessages(messages) {
        try {
            // Remove redundant data and compress content
            const compressedMessages = messages.map(msg => {
                const compressed = {
                    role: msg.role,
                    content: this.compressContent(msg.content),
                    timestamp: msg.timestamp
                };
                
                // Only include non-default properties
                if (msg.has_files) compressed.has_files = msg.has_files;
                if (msg.isTopicBoundary) compressed.isTopicBoundary = msg.isTopicBoundary;
                
                return compressed;
            });
            
            // Use JSON compression with minimal formatting
            const jsonString = JSON.stringify(compressedMessages);
            
            // Simple compression using built-in compression if available
            if (typeof CompressionStream !== 'undefined') {
                return this.compressString(jsonString);
            }
            
            return jsonString;
        } catch (error) {
            debugError('Error compressing messages:', error);
            return JSON.stringify(messages);
        }
    }
    
    /**
     * Compress message content
     * @param {string} content - Message content
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
        
        // Compress code blocks
        compressed = compressed.replace(/```[\s\S]*?```/g, (match) => {
            return match.replace(/\s+/g, ' ').replace(/\n\s*/g, '\n');
        });
        
        // Remove HTML comments
        compressed = compressed.replace(/<!--[\s\S]*?-->/g, '');
        
        return compressed;
    }
    
    /**
     * Compress a string using built-in compression
     * @param {string} str - String to compress
     * @returns {Promise<string>} - Compressed string
     */
    async compressString(str) {
        try {
            const encoder = new TextEncoder();
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(encoder.encode(str));
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                compressed.set(chunk, offset);
                offset += chunk.length;
            }
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode(...compressed));
        } catch (error) {
            debugError('Error compressing string:', error);
            return str;
        }
    }
    
    /**
     * Decompress messages
     * @param {string} compressedData - Compressed message data
     * @returns {Array} - Decompressed messages
     */
    async decompressMessages(compressedData) {
        try {
            let jsonString = compressedData;
            
            // Check if data is base64 compressed
            if (this.isBase64(compressedData)) {
                jsonString = await this.decompressString(compressedData);
            }
            
            return JSON.parse(jsonString);
        } catch (error) {
            debugError('Error decompressing messages:', error);
            return [];
        }
    }
    
    /**
     * Decompress a string
     * @param {string} compressedStr - Compressed string
     * @returns {Promise<string>} - Decompressed string
     */
    async decompressString(compressedStr) {
        try {
            const compressed = Uint8Array.from(atob(compressedStr), c => c.charCodeAt(0));
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(compressed);
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                decompressed.set(chunk, offset);
                offset += chunk.length;
            }
            
            const decoder = new TextDecoder();
            return decoder.decode(decompressed);
        } catch (error) {
            debugError('Error decompressing string:', error);
            return compressedStr;
        }
    }
    
    /**
     * Check if string is base64 encoded
     * @param {string} str - String to check
     * @returns {boolean} - True if base64
     */
    isBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get full chat history including compressed messages
     * @param {string} chatId - Chat ID
     * @param {Object} chatData - Current chat data
     * @returns {Promise<Object>} - Full chat data
     */
    async getFullChatHistory(chatId, chatData) {
        if (!chatData.hasCompressedHistory) {
            return chatData;
        }
        
        const compressedKey = `${chatId}_older`;
        const compressedData = this.compressedChats.get(compressedKey);
        
        if (!compressedData) {
            return chatData;
        }
        
        try {
            const olderMessages = await this.decompressMessages(compressedData);
            
            return {
                ...chatData,
                messages: [...olderMessages, ...chatData.messages],
                hasCompressedHistory: false
            };
        } catch (error) {
            debugError('Error getting full chat history:', error);
            return chatData;
        }
    }
    
    /**
     * Mark a chat as active (recently accessed)
     * @param {string} chatId - Chat ID
     */
    markChatAsActive(chatId) {
        this.activeChats.add(chatId);
        
        // Limit active chat count
        if (this.activeChats.size > this.maxActiveChatCount) {
            const oldestChat = this.activeChats.values().next().value;
            this.activeChats.delete(oldestChat);
        }
    }
    
    /**
     * Clean up old compressed data
     * @param {Array} currentChatIds - Current chat IDs
     */
    cleanupOldCompressedData(currentChatIds) {
        const keysToDelete = [];
        
        for (const key of this.compressedChats.keys()) {
            const chatId = key.replace('_older', '');
            if (!currentChatIds.includes(chatId)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.compressedChats.delete(key);
        });
        
        if (keysToDelete.length > 0) {
            debugLog(`Cleaned up ${keysToDelete.length} old compressed chat entries`);
        }
    }
    
    /**
     * Get memory usage statistics
     * @returns {Object} - Memory usage stats
     */
    getMemoryStats() {
        const compressedCount = this.compressedChats.size;
        const activeCount = this.activeChats.size;
        
        let compressedSize = 0;
        for (const data of this.compressedChats.values()) {
            compressedSize += data.length;
        }
        
        return {
            compressedChats: compressedCount,
            activeChats: activeCount,
            compressedDataSize: compressedSize,
            estimatedMemorySaved: compressedSize * (1 - this.compressionRatio)
        };
    }
    
    /**
     * Clear all compressed data
     */
    clearAll() {
        this.compressedChats.clear();
        this.activeChats.clear();
        debugLog('Cleared all compressed chat data');
    }
}

// Export singleton instance
export const chatHistoryOptimizer = new ChatHistoryOptimizer();

// Export class for testing
export { ChatHistoryOptimizer }; 