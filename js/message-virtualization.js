// Message Virtualization System
// Only renders visible messages in the DOM to reduce memory usage

import { messagesContainer } from './dom-elements.js';
import { appendMessage } from './ui-manager.js';
import { debugLog } from './utils.js';

class MessageVirtualizer {
    constructor() {
        this.messages = [];
        this.visibleRange = { start: 0, end: 0 };
        this.messageHeight = 100; // Estimated message height
        this.containerHeight = 0;
        this.scrollTop = 0;
        this.overscan = 3; // Number of messages to render outside visible area
        this.messageElements = new Map(); // Cache for rendered message elements
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        this.setupScrollListener();
        this.setupResizeObserver();
    }
    
    /**
     * Set the messages to virtualize
     * @param {Array} messages - Array of message objects
     */
    setMessages(messages) {
        this.messages = messages;
        this.updateVisibleRange();
        this.renderVisibleMessages();
    }
    
    /**
     * Add a new message to the virtualized list
     * @param {Object} message - Message object
     */
    addMessage(message) {
        this.messages.push(message);
        this.updateVisibleRange();
        this.renderVisibleMessages();
        this.scrollToBottom();
    }
    
    /**
     * Update the visible range based on scroll position
     */
    updateVisibleRange() {
        if (!messagesContainer) return;
        
        this.containerHeight = messagesContainer.clientHeight;
        this.scrollTop = messagesContainer.scrollTop;
        
        const startIndex = Math.floor(this.scrollTop / this.messageHeight);
        const endIndex = Math.ceil((this.scrollTop + this.containerHeight) / this.messageHeight);
        
        // Add overscan
        this.visibleRange = {
            start: Math.max(0, startIndex - this.overscan),
            end: Math.min(this.messages.length, endIndex + this.overscan)
        };
        
        debugLog(`Visible range: ${this.visibleRange.start} - ${this.visibleRange.end}`);
    }
    
    /**
     * Render only the visible messages
     */
    renderVisibleMessages() {
        if (!messagesContainer) return;
        
        // Clear existing messages
        messagesContainer.innerHTML = '';
        
        // Create spacer for messages above visible area
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${this.visibleRange.start * this.messageHeight}px`;
        messagesContainer.appendChild(topSpacer);
        
        // Render visible messages
        for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
            if (i < this.messages.length) {
                const message = this.messages[i];
                this.renderMessage(message, i);
            }
        }
        
        // Create spacer for messages below visible area
        const bottomSpacer = document.createElement('div');
        const remainingMessages = this.messages.length - this.visibleRange.end;
        bottomSpacer.style.height = `${remainingMessages * this.messageHeight}px`;
        messagesContainer.appendChild(bottomSpacer);
        
        // Clean up cached elements outside visible range
        this.cleanupCache();
    }
    
    /**
     * Render a single message
     * @param {Object} message - Message object
     * @param {number} index - Message index
     */
    renderMessage(message, index) {
        // Check if we have a cached element
        let messageElement = this.messageElements.get(index);
        
        if (!messageElement) {
            // Create new message element
            messageElement = this.createMessageElement(message);
            this.messageElements.set(index, messageElement);
        }
        
        messagesContainer.appendChild(messageElement);
    }
    
    /**
     * Create a message element
     * @param {Object} message - Message object
     * @returns {HTMLElement} - Message element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        
        // Create message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = message.content;
        
        messageDiv.appendChild(contentDiv);
        
        // Add timestamp if available
        if (message.timestamp) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'message-timestamp';
            timestampDiv.textContent = new Date(message.timestamp).toLocaleTimeString();
            messageDiv.appendChild(timestampDiv);
        }
        
        return messageDiv;
    }
    
    /**
     * Clean up cached elements outside visible range
     */
    cleanupCache() {
        const keysToDelete = [];
        
        for (const [index] of this.messageElements) {
            if (index < this.visibleRange.start - this.overscan || 
                index >= this.visibleRange.end + this.overscan) {
                keysToDelete.push(index);
            }
        }
        
        keysToDelete.forEach(key => {
            this.messageElements.delete(key);
        });
        
        debugLog(`Cleaned up ${keysToDelete.length} cached message elements`);
    }
    
    /**
     * Setup scroll listener for virtualization
     */
    setupScrollListener() {
        if (!messagesContainer) return;
        
        messagesContainer.addEventListener('scroll', () => {
            this.isScrolling = true;
            
            // Clear previous timeout
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            
            // Update visible range immediately for smooth scrolling
            this.updateVisibleRange();
            
            // Debounce rendering for performance
            this.scrollTimeout = setTimeout(() => {
                this.renderVisibleMessages();
                this.isScrolling = false;
            }, 16); // ~60fps
        });
    }
    
    /**
     * Setup resize observer to handle container size changes
     */
    setupResizeObserver() {
        if (!messagesContainer || !window.ResizeObserver) return;
        
        const resizeObserver = new ResizeObserver(() => {
            this.updateVisibleRange();
            this.renderVisibleMessages();
        });
        
        resizeObserver.observe(messagesContainer);
    }
    
    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        if (!messagesContainer) return;
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Get total message count
     * @returns {number} - Total number of messages
     */
    getMessageCount() {
        return this.messages.length;
    }
    
    /**
     * Clear all messages
     */
    clear() {
        this.messages = [];
        this.messageElements.clear();
        this.visibleRange = { start: 0, end: 0 };
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }
    
    /**
     * Update message height estimate based on actual rendered messages
     */
    updateMessageHeight() {
        if (!messagesContainer) return;
        
        const messageElements = messagesContainer.querySelectorAll('.message');
        if (messageElements.length > 0) {
            let totalHeight = 0;
            messageElements.forEach(el => {
                totalHeight += el.offsetHeight;
            });
            
            this.messageHeight = Math.max(50, totalHeight / messageElements.length);
            debugLog(`Updated message height estimate: ${this.messageHeight}px`);
        }
    }
    
    /**
     * Force refresh of all visible messages
     */
    refresh() {
        this.messageElements.clear();
        this.updateVisibleRange();
        this.renderVisibleMessages();
    }
}

// Export singleton instance
export const messageVirtualizer = new MessageVirtualizer();

// Export class for testing
export { MessageVirtualizer }; 