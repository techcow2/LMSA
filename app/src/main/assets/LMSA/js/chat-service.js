// Chat Service for handling chat functionality
import { messagesContainer, userInput, loadedModelDisplay } from './dom-elements.js';
import { appendMessage, showLoadingIndicator, hideLoadingIndicator, toggleSendStopButton, hideWelcomeMessage, showWelcomeMessage, toggleSidebar, showConfirmationModal, hideConfirmationModal, updateChatHistoryScroll } from './ui-manager.js';
import { getApiUrl, getAvailableModels, isServerRunning, fetchAvailableModels } from './api-service.js';
import { getSystemPrompt, getTemperature, isSystemPromptSet, getAutoGenerateTitles, isUserCreatedPrompt, getHideThinking, getReasoningTimeout, getAutoScrollEnabled } from './settings-manager.js';
import { sanitizeInput, basicSanitizeInput, initializeCodeMirror, scrollToBottom, handleScroll, debugLog, debugError, filterToEnglishCharacters, processCodeBlocks, decodeHtmlEntities, refreshAllCodeBlocks, containsCodeBlocks, containsCodeBlocksOutsideThinkTags, saveCurrentChatBeforeRefresh, removeThinkTags, hideScrollToBottomButton } from './utils.js';
import { setActionToPerform } from './shared-state.js';

let currentChatId = Date.now();
let chatHistoryData = {};
let isFirstMessage = true;
let chatToDelete = null;
let abortController = null;
let isGenerating = false;
let isNewTopic = false;
let isGeneratingTitle = false;

// Export state variables only
export {
    chatHistoryData,
    currentChatId,
    isNewTopic,
    isFirstMessage // Export as a value, not a function
};

// Function to set isFirstMessage
export function setIsFirstMessage(value) {
    isFirstMessage = value;
}

/**
 * Ensures isFirstMessage is properly initialized
 */
function ensureFirstMessageInitialized() {
    // This function makes sure the first message flag is properly set
    // It doesn't need to do anything if the flag is already initialized
    if (typeof isFirstMessage === 'undefined') {
        isFirstMessage = true;
    }
}

/**
 * Gets the currently selected model from the available models list
 * @returns {string} - The ID of the selected model
 */
function getSelectedModel() {
    const availableModels = getAvailableModels();
    // Return the first available model or a default value if none available
    return availableModels.length > 0 ? availableModels[0] : 'unknown_model';
}

/**
 * Gets the maximum tokens value from settings
 * @returns {number} - The maximum tokens value or 0 if not set
 */
function getMaxTokens() {
    // Try to get the value from localStorage
    const savedMaxTokens = localStorage.getItem('maxTokens');
    // Convert to number, use 0 if not set or invalid
    return savedMaxTokens ? parseInt(savedMaxTokens, 10) || 0 : 0;
}


/**
 * Checks if the server supports file uploads
 * @returns {boolean} - True if file uploads are supported
 */
function supportsFileUploads() {
    // This is a placeholder - implement actual detection logic if needed
    return false;
}

/**
 * Generates an AI response with retry logic for reasoning models
 * @param {string} userMessage - The user's message
 * @param {Array} fileContents - Optional array of file contents
 * @param {number} retryCount - Current retry attempt (internal use)
 */
async function generateAIResponseWithRetry(userMessage, fileContents = [], retryCount = 0) {
    const maxRetries = 2; // Allow up to 2 retries for reasoning models

    try {
        return await generateAIResponseInternal(userMessage, fileContents);
    } catch (error) {
        // Check if this is a timeout error and we haven't exceeded max retries
        if (error.message.includes('timed out') && retryCount < maxRetries) {
            debugLog(`Streaming timed out, attempting retry ${retryCount + 1}/${maxRetries}`);

            // Show user that we're retrying
            appendMessage('system', `Connection timed out during reasoning process. Retrying... (${retryCount + 1}/${maxRetries})`);

            // Wait a moment before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Retry with incremented count
            return await generateAIResponseWithRetry(userMessage, fileContents, retryCount + 1);
        } else {
            // Re-throw the error if it's not a timeout or we've exceeded retries
            throw error;
        }
    }
}

/**
 * Generates an AI response to a user message
 * @param {string} userMessage - The user's message
 * @param {Array} fileContents - Optional array of file contents
 */
export async function generateAIResponse(userMessage, fileContents = []) {
    return await generateAIResponseWithRetry(userMessage, fileContents);
}

/**
 * Internal function that performs the actual AI response generation
 * @param {string} userMessage - The user's message
 * @param {Array} fileContents - Optional array of file contents
 */
async function generateAIResponseInternal(userMessage, fileContents = []) {
    showLoadingIndicator();
    ensureFirstMessageInitialized();

    // Reset the flags
    isGenerating = true;

    // Create a new AbortController instance for this request
    abortController = new AbortController();
    const signal = abortController.signal;

    // Prepare variables for the AI message (will be created when first content arrives)
    let aiMessageElement = null;
    let contentContainer = null;

    let aiMessage = '';
    let hasCodeBlock = false; // Track if we detected a code block

    // Declare timeout variables outside try block to ensure they're accessible in finally block
    let streamingTimeoutId;
    let chunkTimeoutId;

    try {
        if (!(await isServerRunning())) {
            throw new Error('LM Studio server is not running');
        }

        // Get the latest available models
        const availableModels = getAvailableModels();

        if (availableModels.length === 0) {
            // Try to fetch models if none are available
            await fetchAvailableModels();

            // Get the updated list of models
            const updatedModels = getAvailableModels();

            if (updatedModels.length === 0) {
                throw new Error('No models available');
            }
        }

        // Get the selected model
        const selectedModel = getSelectedModel();

        // Create the messages array
        const messages = [];

        // Add the system prompt only if one is explicitly set by the user
        const systemPrompt = getSystemPrompt();
        if (systemPrompt && systemPrompt.trim() !== '') {
            messages.push({ role: 'system', content: systemPrompt });
        }
        // Note: No default system prompt is added to allow reasoning models to behave naturally


        // Add chat history from previous messages
        if (chatHistoryData[currentChatId]) {
            // Get the messages from the chat history
            const chatMessages = Array.isArray(chatHistoryData[currentChatId])
                ? chatHistoryData[currentChatId]
                : chatHistoryData[currentChatId].messages;

            // Add each message to the messages array
            for (const msg of chatMessages) {
                messages.push(msg);
            }
        }

        // If files are attached, enhance the last user message in the messages array
        // (which was already added to chat history and included above)
        if (fileContents && fileContents.length > 0 && messages.length > 0) {
            const lastMessageIndex = messages.length - 1;
            const lastMessage = messages[lastMessageIndex];

            // Only enhance if the last message is from the user
            if (lastMessage.role === 'user') {
                const fileCount = fileContents.length;
                const fileNames = fileContents.map(f => f.name).join(', ');
                const fileTypes = fileContents.map(f => {
                    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) return 'PDF';
                    if (f.type.includes('word') || f.name.toLowerCase().includes('doc')) return 'Word document';
                    if (f.type.includes('text')) return 'text file';
                    return 'document';
                });
                const uniqueFileTypes = [...new Set(fileTypes)].join(' and ');

                // Add clear context about attached files to the user message
                lastMessage.content = `[USER HAS ATTACHED ${fileCount} FILE(S): ${fileNames} - These are ${uniqueFileTypes}(s) that need to be analyzed]\n\n${lastMessage.content}`;
            }
        }

        // Add file contents as attachments or embedded in the message
        if (fileContents && fileContents.length > 0) {
            console.log('Processing file contents for AI request, count:', fileContents.length);
            // Check if this is a vision model that can handle images
            let isVisionModel = false;
            try {
                const { isVisionModel: checkVisionModel } = await import('./file-upload.js');
                isVisionModel = await checkVisionModel();
                console.log('Vision model check result:', isVisionModel);
            } catch (error) {
                console.error('Error checking vision model capability:', error);
            }

            // If the server supports file uploads, add them as attachments
            // Otherwise, we'll embed the file contents in the message
            if (supportsFileUploads()) {
                // Add files as attachments in the last user message
                const lastUserMessageIndex = messages.length - 1;
                messages[lastUserMessageIndex].file_ids = fileContents.map(file => file.id);
            } else if (isVisionModel) {
                // For vision models, use the proper content format with images
                const lastUserMessageIndex = messages.length - 1;
                const imageFiles = fileContents.filter(file => file.isImage);
                const nonImageFiles = fileContents.filter(file => !file.isImage);

                // Create content array starting with the text
                const content = [
                    {
                        type: "text",
                        text: messages[lastUserMessageIndex].content
                    }
                ];

                // Add images to the content array
                for (const imageFile of imageFiles) {
                    if (imageFile.content && imageFile.content.startsWith('data:')) {
                        // Handle WebP images by converting them to PNG if needed
                        let imageUrl = imageFile.content;
                        
                        // Check if this is a WebP image
                        if (imageFile.content.startsWith('data:image/webp')) {
                            try {
                                // Import the conversion function
                                const { convertWebPToPNG } = await import('./file-upload.js');
                                // Convert WebP to PNG for better compatibility
                                imageUrl = await convertWebPToPNG(imageFile.content);
                                console.log(`Converted WebP image ${imageFile.name} to PNG for API compatibility`);
                            } catch (conversionError) {
                                console.warn(`Failed to convert WebP image ${imageFile.name}, using original:`, conversionError);
                                // Fall back to original WebP if conversion fails
                                imageUrl = imageFile.content;
                            }
                        }
                        
                        // Validate and clean the base64 data URL
                        try {
                            const { validateBase64DataURL } = await import('./file-upload.js');
                            imageUrl = validateBase64DataURL(imageUrl);
                        } catch (validationError) {
                            console.warn(`Failed to validate base64 data URL for ${imageFile.name}:`, validationError);
                        }
                        
                        // Final validation before adding to request
                        if (!imageUrl || !imageUrl.startsWith('data:')) {
                            console.error(`Invalid image URL for ${imageFile.name}:`, imageUrl?.substring(0, 100));
                            continue; // Skip this image
                        }
                        
                        content.push({
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        });
                        console.log(`Added image to vision model request: ${imageFile.name} (${imageUrl.startsWith('data:image/png') ? 'PNG' : imageUrl.startsWith('data:image/webp') ? 'WebP' : 'other'} format, ${imageUrl.length} chars)`);
                    }
                }

                // Add non-image files as text if any
                if (nonImageFiles.length > 0) {
                    try {
                        const { prepareFilesForLLM } = await import('./file-upload.js');
                        const formattedFileContent = await prepareFilesForLLM(nonImageFiles);
                        
                        if (formattedFileContent.trim()) {
                            content[0].text += `\n\n${formattedFileContent}`;
                        }
                    } catch (importError) {
                        console.warn('Could not import prepareFilesForLLM for non-image files:', importError);
                    }
                }

                // Replace the content with the new format
                messages[lastUserMessageIndex].content = content;
                
                console.log(`Vision model message prepared with ${imageFiles.length} image(s) and ${nonImageFiles.length} text file(s)`);
            } else {
                // For non-vision models, embed all file contents as text
                const lastUserMessageIndex = messages.length - 1;
                
                // Import the prepareFilesForLLM function to format files properly
                try {
                    const { prepareFilesForLLM } = await import('./file-upload.js');
                    const formattedFileContent = await prepareFilesForLLM(fileContents);
                    
                    // Log the formatted content length for debugging
                    console.log(`Formatted file content length: ${formattedFileContent.length} characters`);
                    
                    // Append the properly formatted file contents to the user message
                    messages[lastUserMessageIndex].content += `\n\n${formattedFileContent}`;
                } catch (importError) {
                    console.warn('Could not import prepareFilesForLLM, using fallback formatting:', importError);
                    
                    // Fallback to simple formatting with length limits
                    let fileContent = '';
                    
                    for (const file of fileContents) {
                        // Conservative length limit for safety
                        const maxLength = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 25000 : 40000;
                        
                        let content = file.content;
                        if (content.length > maxLength) {
                            content = content.substring(0, maxLength) + `\n\n[Content truncated. Original length: ${file.content.length} characters]`;
                        }
                        
                        fileContent += `\n\nFile: ${file.name}\n\`\`\`\n${content}\n\`\`\`\n`;
                    }
                    
                    console.log(`Fallback formatted file content length: ${fileContent.length} characters`);
                    messages[lastUserMessageIndex].content += fileContent;
                }
            }
        }

        // Create request body
        const requestBody = {
            model: getSelectedModel(),
            messages: messages,
            temperature: getTemperature(),
            stream: true,
        };

        // Add max_tokens only if it's set to a valid value
        const maxTokens = getMaxTokens();
        if (maxTokens > 0) {
            requestBody.max_tokens = maxTokens;
        }

        console.log('Preparing to send API request...');
        console.log('Request body messages count:', requestBody.messages.length);
        console.log('Last message structure:', JSON.stringify(requestBody.messages[requestBody.messages.length - 1], null, 2).substring(0, 500));
        debugLog('Sending API request with body:', requestBody);

        // Create decoder for handling streamed UTF-8 data
        const decoder = new TextDecoder('utf-8');
        let incompleteChunk = new Uint8Array();

        // Determine the API URL based on server type
        const apiUrl = getApiUrl();

        // Monaco Editor removed - no need to track initialization
        // to avoid unnecessary repeated initializations during streaming
        let hasInitializedCodeBlocks = false;

        // Create a timeout for the streaming response (configurable for reasoning models)
        const streamingTimeoutMs = getReasoningTimeout() * 1000; // Convert seconds to milliseconds

        // Create a promise that rejects after the timeout
        const timeoutPromise = new Promise((_, reject) => {
            streamingTimeoutId = setTimeout(() => {
                if (abortController) {
                    abortController.abort();
                }
                reject(new Error('Streaming response timed out. This may happen with reasoning models during long thinking processes. Please try again.'));
            }, streamingTimeoutMs);
        });

        // Send the request to the API with timeout protection
        console.log('Sending fetch request to:', apiUrl);
        const fetchPromise = fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        // Race between fetch and timeout
        console.log('Waiting for API response...');
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        console.log('Received response, status:', response.status, response.statusText);

        if (!response.ok) {
            console.error('API request failed with status:', response.status, response.statusText);
            let errorText;
            try {
                const errorData = await response.json();
                console.error('Error data from API:', errorData);
                errorText = errorData.error || errorData.message || `HTTP Error: ${response.status} ${response.statusText}`;
            } catch (jsonError) {
                console.error('Failed to parse error response:', jsonError);
                errorText = `HTTP Error: ${response.status} ${response.statusText}`;
            }

            console.error('Throwing error:', errorText);
            throw new Error(errorText);
        }

        const reader = response.body.getReader();

        // Clear the initial timeout since we got a response
        if (streamingTimeoutId) {
            clearTimeout(streamingTimeoutId);
        }

        // Track streaming progress for reasoning models
        let lastChunkTime = Date.now();
        let isInThinkingProcess = false;
        let thinkingStartTime = null;
        
        // Streaming progress tracking for reasoning models

        // Create a new timeout for the streaming process (reset on each chunk)
        const resetChunkTimeout = () => {
            if (chunkTimeoutId) {
                clearTimeout(chunkTimeoutId);
            }
            // 2 minutes timeout between chunks (reasoning models may pause during thinking)
            chunkTimeoutId = setTimeout(() => {
                debugLog('No data received for 2 minutes, aborting stream');
                if (abortController) {
                    abortController.abort();
                }
            }, 120000); // 2 minutes
        };

        resetChunkTimeout();

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                // Clear chunk timeout when stream is complete
                if (chunkTimeoutId) {
                    clearTimeout(chunkTimeoutId);
                }
                
                // Immediately terminate the connection when done is true
                if (abortController) {
                    debugLog('Terminating connection as stream is complete');
                    try {
                        // Store reference and clear global reference immediately
                        const controller = abortController;
                        abortController = null;
                        
                        // Abort the controller to ensure connection is closed
                        controller.abort();
                        
                        // Force UI state reset immediately
                        hideLoadingIndicator();
                        const stopButton = document.getElementById('stop-button');
                        if (stopButton && !stopButton.classList.contains('hidden')) {
                            toggleSendStopButton();
                        }
                    } catch (abortError) {
                        debugLog('Error when closing connection:', abortError);
                    }
                }
                
                break;
            }

            // Reset timeout since we received data
            lastChunkTime = Date.now();
            resetChunkTimeout();

            // If we have an incomplete chunk from a previous iteration, combine it with the new value
            let processedChunk;
            if (incompleteChunk.length > 0) {
                // Combine the incomplete chunk with the new chunk
                processedChunk = new Uint8Array(incompleteChunk.length + value.length);
                processedChunk.set(incompleteChunk);
                processedChunk.set(value, incompleteChunk.length);
                // Reset the incomplete chunk
                incompleteChunk = new Uint8Array();
            } else {
                processedChunk = value;
            }

            // Try to decode the chunk as UTF-8
            let chunkText;
            try {
                // Decode the chunk, keeping incomplete sequences in the buffer
                chunkText = decoder.decode(processedChunk, { stream: true });
            } catch (e) {
                // If decoding fails, store the chunk for the next iteration
                incompleteChunk = processedChunk;
                debugLog('UTF-8 decoding error, storing chunk for next iteration:', e);
                continue;
            }

            // Handle the data stream based on format (OpenAI, Anthropic, etc.)
            if (chunkText.startsWith('data: ')) {
                // This is an OpenAI/LM Studio-style event stream (Server-Sent Events)
                const lines = chunkText.split('\n');

                for (const line of lines) {
                    // Skip empty lines and initial keep-alive messages
                    if (!line.trim() || line === 'data: [DONE]' || line === 'data: ') {
                        continue;
                    }

                    // Only process lines that start with 'data: '
                    if (line.startsWith('data: ')) {
                        try {
                            // Extract the data portion
                            const jsonData = line.substring(6);
                            const data = JSON.parse(jsonData);

                            // Check if this is a valid chunk with content
                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                const delta = data.choices[0].delta;

                                // Add content if it exists in this chunk
                                if (delta.content) {
                                    // Create the AI message bubble on first content arrival
                                    if (!aiMessageElement) {
                                        aiMessageElement = appendMessage('ai', '');
                                        contentContainer = aiMessageElement.querySelector('.message-content');
                                        
                                        // If we couldn't find a container, log error and stop
                                        if (!contentContainer) {
                                            debugError('Could not find message content container for AI message');
                                            isGenerating = false;
                                            return;
                                        }
                                    }
                                    
                                    aiMessage += delta.content;

                                    // Track thinking process for progress indication
                                    const hasThinkTags = aiMessage.includes('<think>') || aiMessage.includes('</think>');
                                    const currentlyInThinking = hasThinkTags && aiMessage.lastIndexOf('</think>') < aiMessage.lastIndexOf('<think>');

                                    // Detect start of thinking process
                                    if (!isInThinkingProcess && currentlyInThinking) {
                                        isInThinkingProcess = true;
                                        thinkingStartTime = Date.now();
                                        debugLog('Reasoning model started thinking process');
                                    }

                                    // Detect end of thinking process
                                    if (isInThinkingProcess && !currentlyInThinking && aiMessage.includes('</think>')) {
                                        isInThinkingProcess = false;
                                        const thinkingDuration = Date.now() - thinkingStartTime;
                                        debugLog(`Reasoning model completed thinking process in ${thinkingDuration}ms`);
                                    }

                                    // Check if this is a code block outside of think tags
                                    if (!hasCodeBlock &&
                                        (delta.content.includes('```') ||
                                         aiMessage.includes('```'))) {

                                        // Only trigger reload for code blocks outside think tags
                                        if (containsCodeBlocksOutsideThinkTags(aiMessage)) {
                                            hasCodeBlock = true;

                                            // Special handling for first message - detect code blocks early
                                            if (isFirstMessage) {
                                                // Check if we have a complete code block already (outside think tags)
                                                const contentWithoutThinkTags = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                const codeBlockStart = contentWithoutThinkTags.indexOf('```');
                                                const codeBlockEnd = contentWithoutThinkTags.indexOf('```', codeBlockStart + 3);

                                                // If we have a complete code block in first message (outside think tags),
                                                // prepare for faster reload by setting up flag
                                                if (codeBlockStart !== -1 && codeBlockEnd !== -1) {
                                                    debugLog('Complete code block detected outside think tags in first message, preparing for fast reload');
                                                    hasInitializedCodeBlocks = true; // Mark as detected for reload

                                                    // Code block detected - no longer triggering reload
                                                }
                                            }
                                        }
                                    }

                                    // Apply the appropriate sanitization based on hide-thinking setting
                                    const hideThinking = getHideThinking();
                                    // hasThinkTags already declared above, reuse it

                                    // Check if we're in a thinking section (between <think> and </think>)
                                    const inThinkingSection = hasThinkTags && aiMessage.lastIndexOf('</think>') < aiMessage.lastIndexOf('<think>');

                                    // Check if content after </think> exists
                                    let contentAfterThink = "";
                                    if (hasThinkTags && aiMessage.includes('</think>')) {
                                        const afterThinkMatch = aiMessage.match(/<\/think>([\s\S]*)$/);
                                        if (afterThinkMatch && afterThinkMatch[1]) {
                                            contentAfterThink = afterThinkMatch[1].trim();
                                        }
                                    }

                                    // Apply the appropriate sanitization based on message type and hide thinking setting (only if container exists)
                                    if (hasThinkTags && contentContainer) {
                                        if (hideThinking) {
                                            // When hide thinking is enabled, always hide thinking tags and content
                                            if (contentAfterThink !== "") {
                                                // We have content after </think>, show ONLY that content (streaming)
                                                const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                contentContainer.innerHTML = basicSanitizeInput(processedContent);

                                                // Remove any thinking indicator that might exist
                                                const thinkingIndicator = contentContainer.querySelector('.thinking-indicator');
                                                if (thinkingIndicator) {
                                                    thinkingIndicator.remove();
                                                }
                                            } else if (inThinkingSection) {
                                                // We're in thinking section and hide thinking is enabled, show indicator
                                                let thinkingIndicator = contentContainer.querySelector('.thinking-indicator');

                                                // Create thinking indicator if it doesn't exist
                                                if (!thinkingIndicator) {
                                                    thinkingIndicator = document.createElement('div');
                                                    thinkingIndicator.className = 'thinking-indicator';

                                                    // Enhanced thinking indicator with progress
                                                    const thinkingDuration = thinkingStartTime ? Date.now() - thinkingStartTime : 0;
                                                    const durationText = thinkingDuration > 1000 ? ` (${Math.round(thinkingDuration / 1000)}s)` : '';

                                                    thinkingIndicator.innerHTML = `<i class="fas fa-brain"></i>${durationText}`;
                                                    thinkingIndicator.setAttribute('data-thinking-content', '');

                                                    // Clear the container and add the indicator
                                                    contentContainer.innerHTML = '';
                                                    contentContainer.appendChild(thinkingIndicator);
                                                } else {
                                                    // Update existing indicator with duration (throttled to avoid too frequent updates)
                                                    const now = Date.now();
                                                    if (!window._lastThinkingUpdateTime || now - window._lastThinkingUpdateTime > 100) {
                                                        window._lastThinkingUpdateTime = now;
                                                        const thinkingDuration = thinkingStartTime ? Date.now() - thinkingStartTime : 0;
                                                        const durationText = thinkingDuration > 1000 ? ` (${Math.round(thinkingDuration / 1000)}s)` : '';
                                                        thinkingIndicator.innerHTML = `<i class="fas fa-brain"></i>${durationText}`;
                                                    }
                                                }

                                                // Update the data attribute with current thinking content
                                                const thinkingContent = aiMessage.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                                                if (thinkingContent && thinkingContent[1]) {
                                                    thinkingIndicator.setAttribute('data-thinking-content', thinkingContent[1]);
                                                }
                                            } else {
                                                // Hide thinking is enabled but we're not in thinking section and no content after think
                                                // This means thinking tags are complete but no content after them yet
                                                const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                contentContainer.innerHTML = basicSanitizeInput(processedContent);
                                            }
                                        } else {
                                            // Hide thinking is disabled, show everything including thinking tags (streaming)
                                            contentContainer.innerHTML = sanitizeInput(aiMessage);
                                        }

                                        // Mark this message as having thinking
                                        aiMessageElement.dataset.hasThinking = 'true';
                                    } else if (contentContainer) {
                                        // For non-reasoning models, apply basic sanitization
                                        contentContainer.innerHTML = basicSanitizeInput(aiMessage);
                                        // Mark this message as a non-reasoning model response
                                        aiMessageElement.dataset.hasThinking = 'false';
                                    }

                                    // Initialize code blocks once we detect a completed code block
                                    // and only if we haven't already initialized them
                                    if (hasCodeBlock && aiMessage.includes('```') && aiMessage.lastIndexOf('```') > aiMessage.indexOf('```') + 3 && !hasInitializedCodeBlocks) {
                                        // Just mark that we've detected code blocks but don't initialize yet
                                        // Monaco Editor removed - code initialization no longer needed
                                        hasInitializedCodeBlocks = true;
                                    }
                                    
                                    // Scroll to bottom during streaming if auto-scroll is enabled
                                    if (getAutoScrollEnabled()) {
                                        scrollToBottom(messagesContainer, false);
                                    }
                                }
                            }
                        } catch (error) {
                            debugLog('Error parsing JSON:', error);
                        }
                    }
                }
            }
        }

        // Final decoding to ensure all UTF-8 sequences are properly handled
        try {
            // Flush the decoder to handle any remaining bytes
            if (incompleteChunk.length > 0) {
                const finalChunk = decoder.decode(incompleteChunk);
                aiMessage += finalChunk;
            }
        } catch (e) {
            debugLog('Final UTF-8 decoding error:', e);
        }

        // Immediately terminate the connection to ensure proper cleanup
        if (abortController) {
            debugLog('Terminating connection after streaming completion');
            try {
                abortController.abort();
                abortController = null;
            } catch (abortError) {
                debugLog('Error when closing connection:', abortError);
            }
        }

        // Apply final content processing based on thinking tags and settings
        const hideThinking = getHideThinking();
        const hasThinkTags = aiMessage.includes('<think>') || aiMessage.includes('</think>');

        if (hasThinkTags) {
            // Check if content after </think> exists
            let contentAfterThink = "";
            if (aiMessage.includes('</think>')) {
                const afterThinkMatch = aiMessage.match(/<\/think>([\s\S]*)$/);
                if (afterThinkMatch && afterThinkMatch[1]) {
                    contentAfterThink = afterThinkMatch[1].trim();
                }
            }

            if (contentContainer) {
                if (hideThinking) {
                    // Hide thinking tags when hide thinking is enabled
                    const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                    contentContainer.innerHTML = basicSanitizeInput(processedContent);
                } else {
                    // Show everything including thinking tags when hide thinking is disabled
                    contentContainer.innerHTML = sanitizeInput(aiMessage);
                }
            }
        } else if (contentContainer) {
            // No thinking tags, show content normally
            contentContainer.innerHTML = basicSanitizeInput(aiMessage);
        }

        // Update chat history first but don't wait for UI updates if we're going to reload
        // This makes the reload happen faster
        if (containsCodeBlocksOutsideThinkTags(aiMessage)) {
            // Fast path for code blocks outside think tags - minimal chat update without UI refresh
            await fastUpdateChatHistoryBeforeReload(userMessage, aiMessage, fileContents);
        } else {
            // Normal path for non-code blocks or code blocks only in think tags - full history update with UI refresh
            await updateChatHistory(userMessage, aiMessage, fileContents);
        }

        // Set isFirstMessage to false after first successful message
        if (isFirstMessage) {
            debugLog('First message processed successfully, updating isFirstMessage flag');
            setIsFirstMessage(false);
        }

        // Handle code blocks if present (only those outside think tags)
        if (containsCodeBlocksOutsideThinkTags(aiMessage)) {
            // Check if Monaco is already having issues before deciding to reload
            const hasMonacoIssues = window.monacoHasErrors ||
                                    (window.monacoLoaded === false &&
                                    Date.now() - (window.monacoLoadStartTime || 0) > 5000);

            if (hasMonacoIssues) {
                // Don't reload if Monaco is having issues - just render with fallback
                debugLog('Monaco appears to have loading issues - skipping reload and using fallback');

                // Don't do a second updateChatHistory - redundant with the one above
                // Initialize with fallback code display
                if (!hasInitializedCodeBlocks) {
                    queueMicrotask(() => {
                        refreshAllCodeBlocks();
                    });
                }
                scrollToBottom(messagesContainer, true);
                return;
            }

            // Code blocks detected - no longer triggering reload, just continue normally
            scrollToBottom(messagesContainer, true);
        } else {
            scrollToBottom(messagesContainer, true);
        }
    } catch (error) {
        // Clean up timeouts on error
        if (streamingTimeoutId) {
            clearTimeout(streamingTimeoutId);
        }
        if (chunkTimeoutId) {
            clearTimeout(chunkTimeoutId);
        }

        if (error.name === 'AbortError') {
            debugLog('Fetch aborted');
        } else {
            debugError('Error:', error);

            // Special handling for "No models available" error
            if (error.message === 'No models available') {
                // Don't show any error message during initial startup
                if (!window.isInitialStartup) {
                    // Show a clear message to the user about loading a model
                    appendMessage('error', 'No models are currently loaded. Click the "Models" button in the sidebar to load a model.');
                } else {
                    debugLog('Suppressing "No models available" error during initial startup');
                }

                // Don't automatically show model modal - let user decide when to load a model
            } else {
                appendMessage('error', `An error occurred: ${error.message}`);
            }

            // Show send button again in case of error
            hideLoadingIndicator();
            toggleSendStopButton();
        }
    } finally {
        debugLog('Finalizing text generation...');

        // Clean up all timeouts
        if (streamingTimeoutId) {
            clearTimeout(streamingTimeoutId);
        }
        if (chunkTimeoutId) {
            clearTimeout(chunkTimeoutId);
        }

        // Reset the generation status flag
        isGenerating = false;

        // Ensure proper cleanup regardless of how we got here (success, error, or abort)
        // Save reference to controller before clearing it
        const controller = abortController;
        
        // Immediately clear the global reference first to prevent race conditions
        abortController = null;
        
        // Then try to abort the controller if it exists
        if (controller) {
            try {
                debugLog('Final connection cleanup in finally block');
                controller.abort();
                
                // Second abort attempt for additional safety
                setTimeout(() => {
                    try {
                        controller.abort();
                        debugLog('Second abort completed successfully');
                    } catch (e) {
                        // Ignore errors on second abort
                    }
                }, 50);
            } catch (finallyAbortError) {
                debugLog('Error during final connection cleanup:', finallyAbortError);
            }
        }

        // Extra safety measure for first message - ensure UI is reset
        if (isFirstMessage) {
            // Force reset UI for first message immediately
            debugLog('First message cleanup in finally - forcing full UI reset');

            // Make sure loading indicator is hidden
            hideLoadingIndicator();

            // Make sure we toggle the button back to send when complete
            const stopButton = document.getElementById('stop-button');
            if (stopButton && !stopButton.classList.contains('hidden')) {
                toggleSendStopButton();
            }
        } else {
            // Standard cleanup for subsequent messages
            // Make sure loading indicator is hidden
            hideLoadingIndicator();

            // Make sure we toggle the button back to send when complete
            debugLog('Ensuring send button is visible...');
            // Only toggle if we're currently showing the stop button
            const stopButton = document.getElementById('stop-button');
            if (stopButton && !stopButton.classList.contains('hidden')) {
                toggleSendStopButton();
            }
        }

        // Final check to ensure hide thinking is applied correctly
        if (getHideThinking()) {
            // Apply the thinking visibility setting to all messages
            import('./ui-manager.js').then(module => {
                module.applyThinkingVisibility();
            });

            // Also ensure any thinking indicators are properly handled
            import('./settings-manager.js').then(module => {
                module.removeVisibleThinkTags();
            });
        }
    }
}

/**
 * Updates the chat history with a new AI response
 * The user message should already be in the history via addUserMessageToHistory
 * @param {string} userMessage - The user's message (for validation)
 * @param {string} aiMessage - The AI's response
 * @param {Array} fileContents - Optional array of file contents (for validation)
 */
export async function updateChatHistory(userMessage, aiMessage, fileContents = []) {
    // Ensure chatHistoryData is initialized
    if (!chatHistoryData) {
        chatHistoryData = {};
    }

    // Initialize chat data structure if it doesn't exist
    if (!chatHistoryData[currentChatId]) {
        // Create a proper structure for the chat with messages array and metadata
        chatHistoryData[currentChatId] = {
            messages: [],
            title: null, // Initialize with no title
        };
    }

    // If the chat data is still in the old format (just an array), convert it
    if (Array.isArray(chatHistoryData[currentChatId])) {
        // Save the old messages
        const oldMessages = [...chatHistoryData[currentChatId]]; // Create a proper copy
        // Get the title if it exists and clean any <think> tags
        const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
        // Convert to new format
        chatHistoryData[currentChatId] = {
            messages: oldMessages,
            title: oldTitle,
        };
    }

    // Ensure messages array exists
    if (!chatHistoryData[currentChatId].messages) {
        chatHistoryData[currentChatId].messages = [];
    }

    // Get a reference to the messages array
    const messages = chatHistoryData[currentChatId].messages;

    // Verify the user message is already in the history
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    // If the last message is not the expected user message, add it
    // This handles cases where the user message wasn't added via addUserMessageToHistory
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userMessage) {
        debugLog('User message not found in history, adding it now');
        
        // Create user message object
        const userMsg = { role: 'user', content: userMessage };

        // Store file attachments separately without modifying the user message content
        if (fileContents && fileContents.length > 0) {
            debugLog(`Adding ${fileContents.length} files to chat history`);
            userMsg.files = fileContents;
            debugLog(`Files added to chat history: ${fileContents.map(f => f.name).join(', ')}`);
        }

        messages.push(userMsg);

        // Check if this is the first message in the chat and auto-generate title is enabled
        // Generate title right after adding the user message, before adding AI response
        if (messages.length === 1 && getAutoGenerateTitles()) {
            try {
                // Get the user's first message (which we just added)
                const firstUserMessage = userMsg.content;

                // Log the message being used for title generation
                debugLog('Generating title based on user message:', firstUserMessage);

                // Generate a title for the chat based on the user's first message
                // The generateChatTitle function now ensures the title is clean of <think> tags
                const title = await generateChatTitle(firstUserMessage);
                if (title) {
                    // Double-check that the title is clean of <think> tags before storing
                    const cleanTitle = removeThinkTags(title);
                    debugLog('Storing clean title with chat:', cleanTitle);

                    // Store the clean title with the chat
                    chatHistoryData[currentChatId].title = cleanTitle;

                    // Save the chat history to ensure the clean title is persisted
                    saveChatHistory();
                }
            } catch (error) {
                debugError('Error generating chat title:', error);
                // If title generation fails, continue without a title
            }
        }
    }

    // Add the AI response
    messages.push({ role: 'assistant', content: aiMessage });

    // Log the current chat history for debugging
    debugLog('Updated chat history:',
        messages.map(msg => msg.role).join(', '));
    debugLog('Chat title:', chatHistoryData[currentChatId].title);

    // Log file attachments if any
    if (fileContents && fileContents.length > 0) {
        debugLog('Chat includes file attachments:', fileContents.map(f => f.name).join(', '));
    }

    // Make sure to save to localStorage before updating the UI
    // This ensures the chat is saved even if there's an issue with the UI update
    saveChatHistory();

    // Update the UI after saving
    updateChatHistoryUI();
}

/**
 * Adds a topic boundary marker to the chat history
 */
export function addTopicBoundary() {
    // Initialize chat data structure if it doesn't exist
    if (!chatHistoryData[currentChatId]) {
        chatHistoryData[currentChatId] = {
            messages: [],
            title: null,
        };
    }

    // If the chat data is still in the old format (just an array), convert it
    if (Array.isArray(chatHistoryData[currentChatId])) {
        // Save the old messages
        const oldMessages = chatHistoryData[currentChatId];
        // Get the title if it exists and clean any <think> tags
        const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
        // Convert to new format
        chatHistoryData[currentChatId] = {
            messages: oldMessages,
            title: oldTitle,
        };
    }

    // Create a topic boundary marker in the UI
    const boundaryElement = document.createElement('div');
    boundaryElement.classList.add('topic-boundary');
    boundaryElement.innerHTML = '<span class="topic-boundary-text"><i class="fas fa-exchange-alt mr-2"></i>New Topic</span>';
    messagesContainer.appendChild(boundaryElement);

    // Add a topic boundary marker to the chat history
    chatHistoryData[currentChatId].messages.push({
        role: 'system',
        content: '--- New Topic ---',
        isTopicBoundary: true
    });

    // Set the new topic flag to true
    isNewTopic = true;

    // Save the updated chat history
    saveChatHistory();

    // Scroll to the bottom to show the new topic marker
    scrollToBottom(messagesContainer);
}

/**
 * Updates the chat history UI
 */
export function updateChatHistoryUI() {
    try {
        debugLog('Updating chat history UI');

        const chatHistory = document.getElementById('chat-history');
        if (!chatHistory) {
            debugError('Chat history element not found');
            return;
        }

        chatHistory.innerHTML = '';

        // Make sure chatHistoryData is valid
        if (!chatHistoryData || typeof chatHistoryData !== 'object') {
            debugError('Invalid chatHistoryData:', chatHistoryData);
            return;
        }

        // Log the number of chats in the history
        debugLog(`Updating UI with ${Object.keys(chatHistoryData).length} chats`);

        // Convert to array, sort by chat ID (newest first), then create buttons
        const sortedChats = Object.entries(chatHistoryData).sort((a, b) => {
            // Parse IDs as numbers and sort in descending order (newest first)
            return parseInt(b[0]) - parseInt(a[0]);
        });

        sortedChats.forEach(([id, chatData]) => {
            try {
                // Handle both old format (array) and new format (object with messages and title)
                const messages = Array.isArray(chatData) ? chatData : chatData.messages;
                if (!messages || messages.length === 0) {
                    debugLog(`Skipping empty chat ${id}`);
                    return; // Skip empty chats
                }

                const button = document.createElement('button');
                button.classList.add('chat-item', 'w-full', 'text-left', 'py-2', 'px-3', 'focus:outline-none',
                    'rounded-md', 'flex', 'items-center', 'justify-between', 'transition-all', 'duration-200');

                // Highlight current chat
                if (id === currentChatId) {
                    button.classList.add('active');
                }

                // Add the chat ID as a data attribute for the touch handler
                button.dataset.chatId = id;

                // Create a wrapper for the chat title and icon
                const titleWrapper = document.createElement('div');
                titleWrapper.classList.add('flex', 'items-center', 'overflow-hidden', 'flex-grow');

                // Add chat icon
                const chatIcon = document.createElement('i');
                chatIcon.classList.add('fas', 'fa-comment-alt', 'mr-3', 'flex-shrink-0');

                // Set icon color based on theme and active state
                const isLightTheme = document.body.classList.contains('light-theme');
                const isActive = (id === currentChatId);
                if (isLightTheme) {
                    chatIcon.style.color = isActive ? '#1d4ed8' : '#2563eb';
                } else {
                    chatIcon.style.color = 'var(--button-primary-bg)';
                }

                titleWrapper.appendChild(chatIcon);

                const chatTitle = document.createElement('span');
                chatTitle.classList.add('truncate', 'text-sm');

                // Check if this chat has a generated title
                // Handle both old format (title on array) and new format (title in object)
                const title = Array.isArray(chatData) ? chatData.title : chatData.title;

                if (title) {
                    // Always ensure the title is clean of <think> tags
                    // This is critical for ensuring titles are clean regardless of hide-thinking setting
                    const cleanTitle = removeThinkTags(title);

                    // Log the original and cleaned title for debugging
                    debugLog('Original title:', title);
                    debugLog('Cleaned title for display:', cleanTitle);

                    // Set the cleaned title in the UI
                    chatTitle.textContent = cleanTitle;

                    // Add a title attribute to show the full title on hover
                    button.title = cleanTitle;

                    // Update the stored title to ensure it's clean
                    // This ensures the clean title persists in the chat history data
                    if (Array.isArray(chatData)) {
                        chatData.title = cleanTitle;
                    } else {
                        chatData.title = cleanTitle;
                    }
                } else {
                    // Fall back to using the first message content, but remove any <think> tags
                    const cleanContent = removeThinkTags(messages[0].content);

                    // Log the fallback content for debugging
                    debugLog('Using fallback title from first message:', cleanContent.substring(0, 30));

                    // Set the fallback title in the UI
                    chatTitle.textContent = cleanContent.substring(0, 30) + (cleanContent.length > 30 ? '...' : '');

                    // Add a title attribute to show more of the message on hover
                    button.title = cleanContent;
                }
                titleWrapper.appendChild(chatTitle);
                button.appendChild(titleWrapper);

                // Create action buttons wrapper
                const actionWrapper = document.createElement('div');
                actionWrapper.classList.add('action-wrapper', 'flex-shrink-0');

                // Create trash icon container for better touch target
                const trashContainer = document.createElement('button');
                trashContainer.classList.add('trash-icon-container');
                trashContainer.setAttribute('aria-label', 'Delete chat');
                trashContainer.setAttribute('title', 'Delete this chat');
                trashContainer.style.cssText = `
                    background: transparent;
                    border: none;
                    padding: 8px;
                    margin: 0;
                    cursor: pointer;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 44px;
                    min-height: 44px;
                    transition: all 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                `;

                const trashIcon = document.createElement('i');
                trashIcon.classList.add('fas', 'fa-trash');

                // Function to get the appropriate trash icon color based on theme
                const getTrashIconColor = () => {
                    return document.body.classList.contains('light-theme') ? '#dc2626' : '#b91c1c';
                };

                trashIcon.style.cssText = `
                    color: ${getTrashIconColor()};
                    font-size: 14px;
                    transition: all 0.2s ease;
                    pointer-events: none;
                `;

                // Add hover/focus styles programmatically for better control
                trashContainer.addEventListener('mouseenter', () => {
                    trashContainer.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                    trashIcon.style.color = 'var(--button-danger-bg)';
                    trashIcon.style.transform = 'scale(1.1)';
                });

                trashContainer.addEventListener('mouseleave', () => {
                    trashContainer.style.backgroundColor = 'transparent';
                    trashIcon.style.color = getTrashIconColor();
                    trashIcon.style.transform = 'scale(1)';
                });

                // Add focus styles
                trashContainer.addEventListener('focus', () => {
                    trashContainer.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                    trashContainer.style.outline = '2px solid rgba(220, 38, 38, 0.5)';
                    trashContainer.style.outlineOffset = '2px';
                });

                trashContainer.addEventListener('blur', () => {
                    trashContainer.style.backgroundColor = 'transparent';
                    trashContainer.style.outline = 'none';
                    trashContainer.style.outlineOffset = '0';
                });

                // Add touch feedback for mobile
                trashContainer.addEventListener('touchstart', (e) => {
                    e.stopPropagation(); // Prevent chat item touch handling
                    trashContainer.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
                    trashIcon.style.transform = 'scale(0.95)';
                }, { passive: true });

                trashContainer.addEventListener('touchend', () => {
                    setTimeout(() => {
                        trashContainer.style.backgroundColor = 'transparent';
                        trashIcon.style.transform = 'scale(1)';
                    }, 150);
                }, { passive: true });

                trashContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(id);
                    const sidebar = document.getElementById('sidebar');
                    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
                        toggleSidebar();
                    }
                });

                trashContainer.appendChild(trashIcon);
                actionWrapper.appendChild(trashContainer);
                button.appendChild(actionWrapper);

                button.addEventListener('click', () => loadChat(id));
                chatHistory.appendChild(button);
            } catch (chatError) {
                debugError(`Error processing chat ${id}:`, chatError);
                // Continue with the next chat
            }
        });

        // Update scrolling behavior after updating the chat history
        updateChatHistoryScroll();

        // Final pass to ensure all titles are clean of <think> tags
        // This is especially important when "Hide thinking text" is disabled
        Object.entries(chatHistoryData).forEach(([chatId, chatData]) => {
            try {
                if (Array.isArray(chatData)) {
                    // Old format - ensure title is clean
                    if (chatData.title) {
                        chatData.title = removeThinkTags(chatData.title);
                    }
                } else if (chatData && typeof chatData === 'object') {
                    // New format - ensure title is clean
                    if (chatData.title) {
                        chatData.title = removeThinkTags(chatData.title);
                    }
                }
            } catch (cleanError) {
                debugError(`Error cleaning title for chat ${chatId}:`, cleanError);
            }
        });

        // Save the chat history to ensure any title cleaning is persisted
        // This is critical for ensuring clean titles are saved to storage
        saveChatHistory();
        debugLog('Chat history saved with clean titles');

        debugLog('Chat history UI updated successfully');
    } catch (error) {
        debugError('Error updating chat history UI:', error);
    }
}

/**
 * Shows the delete confirmation modal for a chat
 * @param {string} id - The ID of the chat to delete
 */
export function showDeleteConfirmation(id) {
    chatToDelete = id;
    setActionToPerform('deleteChat');
    showConfirmationModal('Are you sure you want to delete this chat? This action cannot be undone.');
}

/**
 * Deletes a chat from the chat history
 * @param {string} id - The ID of the chat to delete
 */
export function deleteChatHistory(id) {
    delete chatHistoryData[id];
    updateChatHistoryUI(); // This will also call updateChatHistoryScroll()
    saveChatHistory();
    if (id === currentChatId) {
        messagesContainer.innerHTML = '';
        showWelcomeMessage();
        currentChatId = Date.now();

        // Check if the system prompt was user-created before clearing the active character
        const isUserCreated = isUserCreatedPrompt();
        const savedPrompt = localStorage.getItem('systemPrompt');


        // If the system prompt was user-created, restore it
        if (isUserCreated && savedPrompt) {
            console.log('System prompt was user-created, restoring it after deleting chat');
            // Set the system prompt
            import('./settings-manager.js').then(module => {
                module.setSystemPrompt(savedPrompt, false);
            });

            // Update the UI to show the system prompt
            const systemPromptInput = document.getElementById('system-prompt');
            if (systemPromptInput) {
                systemPromptInput.value = savedPrompt;
            }

            // Update the system prompt display
            const systemPromptDisplay = document.getElementById('system-prompt-display');
            if (systemPromptDisplay) {
                systemPromptDisplay.textContent = savedPrompt;
            }

            // Update the system prompt preview
            const systemPromptPreview = document.getElementById('system-prompt-preview');
            if (systemPromptPreview) {
                systemPromptPreview.textContent = savedPrompt;
            }

            // Force update any CodeMirror editor that might be showing the system prompt
            if (window.systemPromptEditor && typeof window.systemPromptEditor.setValue === 'function') {
                window.systemPromptEditor.setValue(savedPrompt);
            }
        }
    }
    hideConfirmationModal();
}

/**
 * Loads a chat from history
 * @param {string} id - The ID of the chat to load
 * @param {boolean} isFirstMessageReload - Optional: Whether this is a first message reload
 */
export function loadChat(id, isFirstMessageReload = false) {
    if (!chatHistoryData[id]) {
        debugError(`Chat with ID ${id} not found in history`);
        return;
    }

    // Check if this is an explicit first message reload or if the flag is set in localStorage
    isFirstMessageReload = isFirstMessageReload || localStorage.getItem('isFirstMessageReload') === 'true';

    // Update the current chat ID
    setCurrentChatId(id);

    const chatData = chatHistoryData[id];

    // Ensure chat data is in the proper format
    if (Array.isArray(chatData)) {
        // Convert old format to new format
        const oldMessages = [...chatData]; // Create a proper copy
        const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
        chatHistoryData[id] = {
            messages: oldMessages,
            title: oldTitle,
        };
    }

    // Ensure messages property exists and is an array
    if (!chatHistoryData[id].messages) {
        chatHistoryData[id].messages = [];
    }

    // Get messages
    const messages = chatHistoryData[id].messages;

    // First hide the welcome message completely, then load the chat
    // This prevents the welcome screen from showing through during the transition
    hideWelcomeMessage();

    // Hide the scroll-to-bottom button when switching chats
    hideScrollToBottomButton();

    // Check if the system prompt was user-created
    const isUserCreated = isUserCreatedPrompt();
    const savedPrompt = localStorage.getItem('systemPrompt');

    // If the system prompt was user-created, restore it
    if (isUserCreated && savedPrompt) {
        console.log('System prompt was user-created, restoring it after loading chat');
        // Set the system prompt
        import('./settings-manager.js').then(module => {
            module.setSystemPrompt(savedPrompt, false);
        });

        // Update the UI to show the system prompt
        const systemPromptInput = document.getElementById('system-prompt');
        if (systemPromptInput) {
            systemPromptInput.value = savedPrompt;
        }

        // Update the system prompt display
        const systemPromptDisplay = document.getElementById('system-prompt-display');
        if (systemPromptDisplay) {
            systemPromptDisplay.textContent = savedPrompt;
        }

        // Update the system prompt preview
        const systemPromptPreview = document.getElementById('system-prompt-preview');
        if (systemPromptPreview) {
            systemPromptPreview.textContent = savedPrompt;
        }

        // Force update any CodeMirror editor that might be showing the system prompt
        if (window.systemPromptEditor && typeof window.systemPromptEditor.setValue === 'function') {
            window.systemPromptEditor.setValue(savedPrompt);
        }
    }

    // Close the sidebar if it's open - skip for first message reloads to improve speed
    if (!isFirstMessageReload) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }

    // For first message reloads, we load the messages immediately with minimal animation
    if (isFirstMessageReload) {
        debugLog('Fast-loading chat for first message reload');
        // Clear the messages container immediately
        messagesContainer.innerHTML = '';

        // Load messages directly without animation delay
        lazyLoadMessages(messages, 0, 50); // Load more messages at once

        // Make sure the chat is saved to localStorage
        saveChatHistory();

        // Update UI display and sidebar
        updateChatHistoryUI();
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === id) {
                item.classList.add('active');
            }
        });

        // Refresh all code blocks immediately
        setTimeout(() => {
            refreshAllCodeBlocks();
            // Force scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);

        // Clear the first message reload flag
        localStorage.removeItem('isFirstMessageReload');

        return; // Skip the standard loading process
    }

    // Standard loading process for regular messages
    // Wait for the welcome message to be fully hidden before loading messages
    setTimeout(() => {
        // Clear the messages container
        messagesContainer.innerHTML = '';

        // Lazily load messages to avoid UI freezing with large chats
        lazyLoadMessages(messages, 0);

        // Make sure the chat is saved to localStorage after loading
        // This ensures any format conversions are persisted
        saveChatHistory();

        // Update UI display and sidebar
        updateChatHistoryUI();
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === id) {
                item.classList.add('active');
            }
        });

        // Ensure chat is visible in sidebar if on mobile
        if (window.innerWidth < 768) {
            document.querySelectorAll('.chat-item.active')[0]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }

        // Refresh all code blocks to ensure proper styling
        refreshAllCodeBlocks();

        // Scroll messages container to bottom after code blocks are refreshed
        scrollToBottom(messagesContainer, true);
    }, 350); // Wait slightly longer than the welcome message transition (300ms)
}

/**
 * Lazy loads messages
 * @param {Array} messages - Array of messages to load
 * @param {number} startIndex - Starting index
 * @param {number} chunkSize - Number of messages to load at once
 */
export function lazyLoadMessages(messages, startIndex, chunkSize = 10) {
    // If messages is not an array (could be undefined or null), return
    if (!Array.isArray(messages)) {
        debugError('Invalid messages format:', messages);
        return;
    }

    // Clear any existing messages if this is the first batch
    if (startIndex === 0) {
        messagesContainer.innerHTML = '';

        // Ensure the messages container is properly displayed
        if (messagesContainer.style.display === 'none') {
            messagesContainer.style.display = 'flex';
            messagesContainer.style.height = '100%';
            messagesContainer.style.opacity = '1';
            messagesContainer.style.visibility = 'visible';
        }
    }

    const endIndex = Math.min(startIndex + chunkSize, messages.length);

    // Load messages in chronological order
    for (let i = startIndex; i < endIndex; i++) {
        const message = messages[i];

        // Check if this is a topic boundary marker
        if (message.isTopicBoundary) {
            // Create a topic boundary marker in the UI
            const boundaryElement = document.createElement('div');
            boundaryElement.classList.add('topic-boundary');
            boundaryElement.innerHTML = '<span class="topic-boundary-text"><i class="fas fa-exchange-alt mr-2"></i>New Topic</span>';
            messagesContainer.appendChild(boundaryElement);
            continue; // Skip to the next message
        }

        let contentDisplay = message.content;

        // Add file attachment indicator if present
        if (message.has_files) {
            contentDisplay += ' [File attached]';
        }

        // Use appendMessage to ensure proper message formatting and controls
        appendMessage(message.role === 'user' ? 'user' : 'ai', contentDisplay);
    }

    // If there are more messages to load, schedule the next chunk
    if (endIndex < messages.length) {
        setTimeout(() => {
            lazyLoadMessages(messages, endIndex, chunkSize);
        }, 0);
    } else {
        // Scroll to bottom after all messages are loaded
        // Force scroll to bottom to ensure messages are visible
        scrollToBottom(messagesContainer, true);
    }
}

/**
 * Clears all chats
 */
export function clearAllChats() {
    messagesContainer.innerHTML = '';
    showWelcomeMessage();
    chatHistoryData = {};
    updateChatHistoryUI();

    // Hide the scroll-to-bottom button when clearing all chats
    hideScrollToBottomButton();

    // Character functionality has been removed - no character clearing needed
    // System prompt remains unchanged when clearing chats

    // Import the settings modal manager to properly hide the settings modal
    import('./settings-modal-manager.js').then(module => {
        if (typeof module.hideSettingsModal === 'function') {
            module.hideSettingsModal();
        } else {
            // Fallback if the import fails
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.classList.add('hidden');
                settingsModal.style.display = 'none';
                settingsModal.style.opacity = '0';
                settingsModal.style.pointerEvents = 'none';
                settingsModal.style.zIndex = '-1';
            }
        }
    }).catch(() => {
        // Fallback if the import fails
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
            settingsModal.style.display = 'none';
            settingsModal.style.opacity = '0';
            settingsModal.style.pointerEvents = 'none';
            settingsModal.style.zIndex = '-1';
        }
    });

    // Make sure the deprecated delete-all-confirmation-modal is hidden
    const deleteAllConfirmationModal = document.getElementById('delete-all-confirmation-modal');
    if (deleteAllConfirmationModal) {
        deleteAllConfirmationModal.classList.add('hidden');
        deleteAllConfirmationModal.style.display = 'none';
        deleteAllConfirmationModal.style.visibility = 'hidden';
    }

    // Clear local storage
    localStorage.removeItem('chatHistory');

    // Reset current chat ID
    currentChatId = Date.now();
}

/**
 * Creates a new chat
 * @returns {string} - The ID of the new chat
 */
export function createNewChat() {

    // Generate a new chat ID
    const newChatId = Date.now().toString();

    // Initialize the new chat with the proper structure
    // Ensure the title is explicitly set to null (not undefined or containing <think> tags)
    chatHistoryData[newChatId] = {
        messages: [],
        title: null, // Explicitly set to null to avoid any issues with <think> tags
    };

    // Update the current chat ID
    setCurrentChatId(newChatId);

    // Clear the messages container and show the welcome message
    messagesContainer.innerHTML = '';
    showWelcomeMessage();

    // Hide the scroll-to-bottom button when starting a new chat
    hideScrollToBottomButton();

    // Update UI
    updateChatHistoryUI();
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === newChatId) {
            item.classList.add('active');
        }
    });

    // Reset the first message flag
    setIsFirstMessage(true);

    // Check if there's a user-created system prompt that should be preserved
    const savedPrompt = localStorage.getItem('systemPrompt');
    const isUserCreated = localStorage.getItem('isUserCreatedSystemPrompt') === 'true';

    if (isUserCreated && savedPrompt) {
        console.log('Preserving user-created system prompt for new chat:', savedPrompt);

        // Set the system prompt
        getSystemPrompt(); // This is just to ensure the function is properly imported
        import('./settings-manager.js').then(module => {
            module.setSystemPrompt(savedPrompt, false);
        });

            // Update the UI to show the system prompt
            const systemPromptInput = document.getElementById('system-prompt');
            if (systemPromptInput) {
                systemPromptInput.value = savedPrompt;
            }

            // Update the system prompt display
            const systemPromptDisplay = document.getElementById('system-prompt-display');
            if (systemPromptDisplay) {
                systemPromptDisplay.textContent = savedPrompt;
            }
            // Update the system prompt preview
            const systemPromptPreview = document.getElementById('system-prompt-preview');
            if (systemPromptPreview) {
                systemPromptPreview.textContent = savedPrompt;
            }

            // Force update any CodeMirror editor that might be showing the system prompt
            if (window.systemPromptEditor && typeof window.systemPromptEditor.setValue === 'function') {
                window.systemPromptEditor.setValue(savedPrompt);
            }
        }

        // Save the empty chat to localStorage first to ensure it's saved
        // even if there's an issue with subsequent operations
        debugLog(`Saving new empty chat with ID ${newChatId} to localStorage`);
        saveChatHistory();

        // Hide the scroll-to-bottom button if it's visible
        const scrollButton = document.getElementById('scroll-to-bottom');
        if (scrollButton) {
            scrollButton.classList.remove('visible');
            scrollButton.classList.add('hidden');
        }

        // Close the sidebar if it's open (especially important on mobile)
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }

        return newChatId;
    }

/**
 * Saves the chat history to localStorage
 */
export function saveChatHistory() {
    try {
        debugLog('Starting to save chat history to localStorage');

        // Make a deep copy of the chat history to avoid reference issues
        const chatHistoryToSave = JSON.parse(JSON.stringify(chatHistoryData));

        // Log the number of chats being saved
        debugLog(`Saving ${Object.keys(chatHistoryToSave).length} chats to localStorage`);

        // Ensure all chat entries have the proper structure
        Object.keys(chatHistoryToSave).forEach(chatId => {
            const chatData = chatHistoryToSave[chatId];

            // Log the chat being processed
            debugLog(`Processing chat ${chatId} for saving`);

            // Convert any array-formatted chats to object format
            if (Array.isArray(chatData)) {
                debugLog(`Converting chat ${chatId} from array format to object format`);
                const oldMessages = [...chatData];
                const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
                chatHistoryToSave[chatId] = {
                    messages: oldMessages,
                    title: oldTitle,
                        };
            }

            // Ensure messages property exists and is an array
            if (!chatData.messages) {
                debugLog(`Chat ${chatId} has no messages array, creating empty array`);
                chatData.messages = [];
            }

            // Ensure title property exists and clean any <think> tags
            if (!('title' in chatData)) {
                debugLog(`Chat ${chatId} has no title property, setting to null`);
                chatData.title = null;
            } else if (chatData.title) {
                // Make sure any <think> tags are removed from the title
                // This is critical for ensuring titles are clean regardless of hide-thinking setting
                const originalTitle = chatData.title;
                chatData.title = removeThinkTags(chatData.title);
                if (originalTitle !== chatData.title) {
                    debugLog(`Removed think tags from title for chat ${chatId}`);
                }

                // Double-check to ensure all <think> tags are completely removed
                // This is especially important when "Hide thinking text" is disabled
                if (chatData.title.includes('<think>') || chatData.title.includes('</think>') ||
                    chatData.title.includes('&lt;think&gt;') || chatData.title.includes('&lt;/think&gt;')) {
                    debugLog(`Found remaining think tags in title for chat ${chatId}, applying aggressive cleaning`);
                    // Apply more aggressive cleaning
                    chatData.title = removeThinkTags(removeThinkTags(chatData.title));
                }
            }

            // Process each message to ensure code blocks are properly encoded
            if (Array.isArray(chatData.messages)) {
                chatData.messages.forEach(message => {
                    if (message.content && typeof message.content === 'string') {
                        // For messages with code blocks, use a simple but effective preservation method
                        if (message.content.includes('```')) {
                            debugLog('Saving message with code blocks - preserving format');

                            // Process code blocks with minimal modification to preserve format
                            const codeBlocks = [];
                            let processedContent = message.content;

                            // First locate and tag all code blocks
                            processedContent = processedContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
                                const isHtmlCode = language === 'html' || language === 'xml';
                                codeBlocks.push({
                                    language: language || '',
                                    code: code.trim(),
                                    isHtml: isHtmlCode
                                });
                                return `[CODE_BLOCK_${codeBlocks.length - 1}]`;
                            });

                            // Then restore them with special markers for HTML
                            for (let i = 0; i < codeBlocks.length; i++) {
                                const block = codeBlocks[i];
                                let preservedCode;

                                if (block.isHtml) {
                                    // For HTML code, add preservation markers
                                    preservedCode = `[HTML_CODE_BLOCK_START]${block.code}[HTML_CODE_BLOCK_END]`;
                                } else {
                                    // For non-HTML, preserve as-is
                                    preservedCode = block.code;
                                }

                                // Replace the placeholder with the preserved code
                                processedContent = processedContent.replace(
                                    `[CODE_BLOCK_${i}]`,
                                    `\`\`\`${block.language}\n${preservedCode}\`\`\``
                                );
                            }

                            // Update the message content
                            message.content = processedContent;
                            debugLog('Preserved code blocks with minimal processing');
                        }
                    }
                });
            }
        });

        // Convert the chat history to a JSON string
        const chatHistoryJSON = JSON.stringify(chatHistoryToSave);

        // Log the size of the JSON string
        debugLog(`Chat history JSON size: ${chatHistoryJSON.length} characters`);

        // Save to localStorage
        localStorage.setItem('chatHistory', chatHistoryJSON);

        // Verify the data was saved correctly by reading it back
        const savedData = localStorage.getItem('chatHistory');
        if (savedData) {
            debugLog(`Verified chat history was saved successfully (${savedData.length} characters)`);

            // Parse the saved data to ensure it's valid JSON
            try {
                const parsedData = JSON.parse(savedData);
                const chatCount = Object.keys(parsedData).length;
                debugLog(`Successfully parsed saved chat history, contains ${chatCount} chats`);
            } catch (parseError) {
                debugError('Error parsing saved chat history:', parseError);
            }
        } else {
            debugError('Failed to verify chat history was saved - localStorage.getItem returned null or empty');
        }
    } catch (error) {
        debugError('Error saving chat history:', error);
    }
}

/**
 * Loads the chat history from localStorage
 */
export function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        try {
            // Debug: Log the raw saved history
            debugLog('Raw saved history:', savedHistory);

            const loadedChatHistory = JSON.parse(savedHistory);

            // Initialize chatHistoryData as an empty object if not already initialized
            if (!chatHistoryData) {
                chatHistoryData = {};
            }

            // Process each chat entry
            Object.keys(loadedChatHistory).forEach(chatId => {
                const chatData = loadedChatHistory[chatId];

                // Convert old format (array with title property) to new format (object with messages and title)
                if (Array.isArray(chatData)) {
                    // Save the old messages
                    const oldMessages = [...chatData]; // Create a proper copy

                    // Get the title if it exists and clean any <think> tags with double cleaning
                    let oldTitle = null;
                    if (oldMessages.title) {
                        // First cleaning pass
                        oldTitle = removeThinkTags(oldMessages.title);

                        // Check if any tags remain and apply a second pass if needed
                        if (oldTitle.includes('<think>') || oldTitle.includes('</think>') ||
                            oldTitle.includes('&lt;think&gt;') || oldTitle.includes('&lt;/think&gt;')) {
                            debugLog(`Found remaining think tags in title for chat ${chatId} during format conversion, applying second cleaning`);
                            oldTitle = removeThinkTags(oldTitle);
                        }
                    }

                    // Convert to new format
                    chatHistoryData[chatId] = {
                        messages: oldMessages,
                        title: oldTitle,
                                };
                    debugLog(`Converted chat ${chatId} to new format`);
                } else {
                    // For already converted chats, ensure proper structure
                    // Apply double cleaning to ensure titles are completely free of <think> tags
                    let cleanTitle = null;
                    if (chatData.title) {
                        // First cleaning pass
                        cleanTitle = removeThinkTags(chatData.title);

                        // Check if any tags remain and apply a second pass if needed
                        if (cleanTitle.includes('<think>') || cleanTitle.includes('</think>') ||
                            cleanTitle.includes('&lt;think&gt;') || cleanTitle.includes('&lt;/think&gt;')) {
                            debugLog(`Found remaining think tags in title for chat ${chatId} during load, applying second cleaning`);
                            cleanTitle = removeThinkTags(cleanTitle);
                        }
                    }

                    chatHistoryData[chatId] = {
                        messages: Array.isArray(chatData.messages) ? [...chatData.messages] : [],
                        title: cleanTitle,
                            };
                }

                // Get the messages array (now guaranteed to be in the new format)
                const messages = chatHistoryData[chatId].messages;

                // Process each message for backward compatibility and code block handling
                messages.forEach(msg => {
                    // If this is a system message with the topic boundary marker text
                    // but doesn't have the isTopicBoundary flag, add it
                    if (msg.role === 'system' &&
                        msg.content === '--- New Topic ---' &&
                        !msg.hasOwnProperty('isTopicBoundary')) {
                        msg.isTopicBoundary = true;
                    }

                    // Process code blocks but preserve their exact content
                    if (msg.content && typeof msg.content === 'string' && msg.content.includes('```')) {
                        // Clean up any visible HTML markers that may have been incorrectly added
                        // These markers should only be used internally during save/load, not displayed to users
                        if (msg.content.includes('][HTML_CODE_BLOCK_START]') || 
                            msg.content.includes('[HTML_CODE_BLOCK_END]') ||
                            msg.content.includes('[HTML_CODE_BLOCK_START]')) {
                            
                            // Clean up various forms of visible markers
                            msg.content = msg.content.replace(/\]\[HTML_CODE_BLOCK_START\]/g, '');
                            msg.content = msg.content.replace(/\[HTML_CODE_BLOCK_START\]/g, '');
                            msg.content = msg.content.replace(/\[HTML_CODE_BLOCK_END\]/g, '');
                            debugLog('Cleaned up visible HTML markers from message content');
                        }
                        
                        // Only preserve the original content during load - don't add any markers
                        // HTML markers should only be added during save operations, not load operations
                        debugLog('Preserved original code block content on load');
                    }
                });

                // Debug: Log if this chat has a title
                if (chatHistoryData[chatId].title) {
                    debugLog(`Chat ${chatId} has title: ${chatHistoryData[chatId].title}`);
                } else {
                    debugLog(`Chat ${chatId} has no title`);
                }
            });

            debugLog('Chat history loaded successfully');
            updateChatHistoryUI();
        } catch (error) {
            debugError('Error loading chat history:', error);
            // If there's an error, initialize with empty chat history
            chatHistoryData = {};
        }
    }
}

/**
 * Checks if text is currently being generated
 * @returns {boolean} - True if text is being generated, false otherwise
 */
export function isGeneratingText() {
    return isGenerating;
}

/**
 * Sets the global abort controller (for external access)
 * @param {AbortController} controller - The abort controller
 */
export function setAbortController(controller) {
    abortController = controller;
}

/**
 * Cleans up incomplete AI responses when generation is cancelled
 */
function cleanupIncompleteAIResponse() {
    // Find the last AI message in the UI
    const aiMessages = messagesContainer.querySelectorAll('.ai');
    if (aiMessages.length > 0) {
        const lastAIMessage = aiMessages[aiMessages.length - 1];
        const contentContainer = lastAIMessage.querySelector('.message-content');
        
        // If the AI message is empty or only contains whitespace, remove it
        if (contentContainer && (!contentContainer.textContent.trim() || contentContainer.textContent.trim() === '')) {
            debugLog('Removing empty AI message after cancellation');
            lastAIMessage.remove();
        }
    }
}

/**
 * Aborts the current AI response generation
 */
export function abortGeneration() {
    if (abortController) {
        debugLog('Aborting generation...');

        // Save reference to the controller before nullifying it
        const controller = abortController;

        // Immediately set the abort controller to null to prevent any race conditions
        abortController = null;

        // Now abort the controller
        try {
            controller.abort();
            
            // Second abort attempt for additional safety
            setTimeout(() => {
                try {
                    controller.abort();
                    debugLog('Second abort completed for abort generation');
                } catch (e) {
                    // Ignore any errors on second abort
                }
            }, 50);
        } catch (error) {
            debugLog('Error during abort generation:', error);
        }

        // Reset the generation status flag first
        isGenerating = false;

        // Ensure UI immediately reflects that generation is stopped
        hideLoadingIndicator();
        debugLog('Toggling button back to send...');
        
        // Only toggle if we're currently showing the stop button
        const stopButton = document.getElementById('stop-button');
        if (stopButton && !stopButton.classList.contains('hidden')) {
            toggleSendStopButton(); // Switch back to send button
        }

        // Clean up any incomplete AI responses
        cleanupIncompleteAIResponse();

        // Add a message to indicate generation was stopped
        appendMessage('system', 'Generation stopped by user');

        debugLog('Text generation aborted successfully');
    } else {
        debugLog('No abort controller found when trying to abort generation');

        // Ensure the UI is reset even if no abort controller exists
        isGenerating = false;
        hideLoadingIndicator();
        
        // Only toggle if we're currently showing the stop button
        const stopButton = document.getElementById('stop-button');
        if (stopButton && !stopButton.classList.contains('hidden')) {
            toggleSendStopButton(); // Make sure we switch back to send button
        }
    }
}

/**
 * Gets the current chat ID
 * @returns {string} - The current chat ID
 */
export function getCurrentChatId() {
    return currentChatId;
}

/**
 * Sets the current chat ID
 * @param {string} id - The chat ID to set
 */
export function setCurrentChatId(id) {
    currentChatId = id;
}

/**
 * Gets the chat history data
 * @returns {Object} - The chat history data
 */
export function getChatHistoryData() {
    return chatHistoryData;
}

/**
 * Sets the chat to delete
 * @param {string} id - The ID of the chat to delete
 */
export function setChatToDelete(id) {
    chatToDelete = id;
}

/**
 * Gets the chat to delete
 * @returns {string} - The ID of the chat to delete
 */
export function getChatToDelete() {
    return chatToDelete;
}

/**
 * Generates a title for a chat using the LLM
 * @param {string} userMessage - The user's first message in the chat
 * @returns {Promise<string>} - The generated title
 */
export async function generateChatTitle(userMessage) {
    // If auto-generate titles is disabled, return null
    if (!getAutoGenerateTitles()) {
        debugLog('Auto-generate titles is disabled, skipping title generation');
        return null;
    }

    // If we're already generating a title, return null to prevent multiple requests
    if (isGeneratingTitle) {
        debugLog('Already generating a title, skipping request');
        return null;
    }

    // Clean the user message of any think tags before using it for title generation
    // This ensures clean input even if the user message somehow contains think tags
    const cleanUserMessage = removeThinkTags(userMessage);

    // If the cleaned user message is empty or invalid, return null
    if (!cleanUserMessage || typeof cleanUserMessage !== 'string' || cleanUserMessage.trim() === '') {
        debugError('Invalid user message for title generation:', cleanUserMessage);
        return null;
    }

    // Log the user message received for title generation
    debugLog('generateChatTitle received user message:', userMessage);
    debugLog('generateChatTitle using cleaned user message:', cleanUserMessage);

    // Set the title generation flag to true
    isGeneratingTitle = true;

    try {
        if (!(await isServerRunning())) {
            throw new Error('LM Studio server is not running');
        }

        // Get the latest available models
        const availableModels = getAvailableModels();

        if (availableModels.length === 0) {
            // Try to fetch models if none are available
            await fetchAvailableModels();
            // Get the updated list of models
            const updatedModels = getAvailableModels();

            if (updatedModels.length === 0) {
                throw new Error('No models available');
            }
        }

        // Create a system prompt specifically for title generation
        const titleSystemPrompt = 'You are a helpful assistant that generates concise, descriptive titles. Create a short title (2-3 words) that describes what the chat is ABOUT, not the content itself. For example, if the user asks for a poem about Michigan, the title should be "Michigan Poem Request" not "The Great Lakes". Focus on the topic/purpose of the conversation. DO NOT use any markdown formatting (like **bold**, *italic*, or `code`) in your title - use plain text only.';

        // Create the messages array with the cleaned user message
        const messages = [
            { role: 'system', content: titleSystemPrompt },
            { role: 'user', content: cleanUserMessage }
        ];

        // Create request body with a lower temperature for more predictable titles
        const requestBody = {
            model: getAvailableModels()[0], // Use the first available model
            messages: messages,
            temperature: 0.2, // Lower temperature for more predictable titles
            stream: false, // No need for streaming for title generation
        };

        debugLog('Sending API request to generate chat title');

        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        // Get the title and filter out any non-English characters
        let title = filterToEnglishCharacters(data.choices[0].message.content.trim());

        // Log the raw title for debugging
        debugLog('Raw title before cleaning:', title);

        // Remove any <think> tags and their content from the title
        // This is critical for ensuring titles are clean regardless of hide-thinking setting
        title = removeThinkTags(title);

        // Log the cleaned title for debugging
        debugLog('Cleaned title after removing think tags:', title);

        // Remove markdown formatting from the title
        // Remove bold formatting
        title = title.replace(/\*\*(.+?)\*\*/g, '$1');
        // Remove italic formatting
        title = title.replace(/\*(.+?)\*/g, '$1');
        title = title.replace(/_(.+?)_/g, '$1');
        // Remove code formatting
        title = title.replace(/`(.+?)`/g, '$1');
        // Remove links - keep only the text part
        title = title.replace(/\[(.+?)\]\(.+?\)/g, '$1');
        // Remove headers
        title = title.replace(/^#+\s+(.+)$/gm, '$1');

        // Ensure the title is no more than 3 words
        const words = title.split(/\s+/);
        if (words.length > 3) {
            title = words.slice(0, 3).join(' ');
        }

        // Remove any quotes that might be in the title
        title = title.replace(/["']/g, '');

        // Make sure we have a valid title
        if (!title || typeof title !== 'string' || title.trim() === '') {
            debugLog('Generated title is empty or invalid, using default');
            // Return a default title based on the first few words of the cleaned user message
            const words = cleanUserMessage.trim().split(/\s+/);
            title = words.slice(0, 3).join(' ');
            if (title.length > 30) {
                title = title.substring(0, 30) + '...';
            }
        }

        debugLog('Generated title:', title);

        // Save the chat with the new title immediately to ensure it's persisted
        if (chatHistoryData[currentChatId]) {
            // Always ensure the title is clean of <think> tags before saving
            // Apply the cleaning again to be absolutely certain
            const cleanTitle = removeThinkTags(title);

            // Log the final clean title that will be saved
            debugLog('Final clean title to be saved:', cleanTitle);

            // Save the clean title
            chatHistoryData[currentChatId].title = cleanTitle;
            saveChatHistory();
            debugLog('Saved chat with new title (cleaned of <think> tags):', cleanTitle);

            // Return the clean title
            return cleanTitle;
        }

        // Even if we don't save it, return a clean title
        return removeThinkTags(title);
    } catch (error) {
        debugError('Error generating title:', error);

        // In case of error, try to generate a simple title from the cleaned user message
        try {
            const words = cleanUserMessage.trim().split(/\s+/);
            let fallbackTitle = words.slice(0, 3).join(' ');

            // Make sure the fallback title is also clean of <think> tags
            // This is important even for fallback titles in case the user message contains think tags
            fallbackTitle = removeThinkTags(fallbackTitle);

            // Log the fallback title for debugging
            debugLog('Using fallback title (cleaned of <think> tags):', fallbackTitle);

            // If we have a current chat ID, save this fallback title
            if (chatHistoryData[currentChatId]) {
                chatHistoryData[currentChatId].title = fallbackTitle;
                saveChatHistory();
                debugLog('Saved chat with fallback title');
            }

            return fallbackTitle;
        } catch (fallbackError) {
            debugError('Error generating fallback title:', fallbackError);
            return null;
        }
    } finally {
        // Reset the title generation flag
        isGeneratingTitle = false;
    }
}

// Track regeneration attempts to handle browser-specific issues
let regenerationAttemptCount = 0;
let regenerationAttemptTimer = null;

/**
 * Regenerates the last AI response
 * @param {boolean} isRetry - Whether this is a retry attempt
 */
export async function regenerateLastResponse(isRetry = false) {
    try {
        // Clear any existing timer
        if (regenerationAttemptTimer) {
            clearTimeout(regenerationAttemptTimer);
        }

        // Reset attempt counter after 5 seconds
        regenerationAttemptTimer = setTimeout(() => {
            regenerationAttemptCount = 0;
        }, 5000);

        debugLog(`Regeneration attempt #${regenerationAttemptCount}`);

        // Force reset isGenerating flag if this is a retry or multiple attempts
        if (isRetry || regenerationAttemptCount > 1) {
            debugLog('Forcing reset of isGenerating flag due to retry or multiple attempts');
            isGenerating = false;
        }

        // Set the generation flag
        isGenerating = true;

        // Ensure first message flag is initialized
        ensureFirstMessageInitialized();

        // Check if there is an active chat
        if (!currentChatId || !chatHistoryData[currentChatId]) {
            appendMessage('error', 'No chat available to regenerate');
            isGenerating = false;
            return;
        }

        // Get the chat messages
        const messages = Array.isArray(chatHistoryData[currentChatId])
            ? chatHistoryData[currentChatId]
            : chatHistoryData[currentChatId].messages;

        if (!messages || messages.length === 0) {
            appendMessage('error', 'No messages to regenerate');
            return;
        }

        // Find the last user message
        let lastUserMessageIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMessageIndex = i;
                break;
            }
        }

        if (lastUserMessageIndex === -1) {
            appendMessage('error', 'No user message found to regenerate a response for');
            return;
        }

        // Get the last user message
        const lastUserMessage = messages[lastUserMessageIndex].content;
        let fileContents = messages[lastUserMessageIndex].files || [];

        // Set the generation flag
        isGenerating = true;

        // Create a new abort controller for this request
        abortController = new AbortController();
        const signal = abortController.signal;

        // Clear any AI messages after the last user message
        const filteredMessages = messages.slice(0, lastUserMessageIndex + 1);

        // Remove existing AI messages from the DOM after the last user message
        const messageElements = Array.from(messagesContainer.children);
        let lastUserMessageElementIndex = -1;

        // Find the last user message element in the DOM
        for (let i = messageElements.length - 1; i >= 0; i--) {
            if (messageElements[i].classList.contains('user')) {
                lastUserMessageElementIndex = i;
                break;
            }
        }

        // Remove all AI messages after the last user message
        if (lastUserMessageElementIndex !== -1) {
            for (let i = messageElements.length - 1; i > lastUserMessageElementIndex; i--) {
                if (messageElements[i].classList.contains('ai')) {
                    debugLog('Removing existing AI message during regeneration');
                    messageElements[i].remove();
                }
            }
        }

        // Show loading indicator and toggle to stop button
        showLoadingIndicator();
        toggleSendStopButton();

        // Prepare variables for the AI message (will be created when first content arrives)
        let aiMessageElement = null;
        let contentContainer = null;

        let aiMessage = '';
        let hasCodeBlock = false; // Track if we detected a code block

        // Declare timeout variables outside try block to ensure they're accessible in finally block
        let streamingTimeoutId;
        let chunkTimeoutId;

        try {
            // Check if the server is running
            if (!(await isServerRunning())) {
                throw new Error('LM Studio server is not running');
            }

            // Get the model to use
            const availableModels = getAvailableModels();
            if (availableModels.length === 0) {
                throw new Error('No models available');
            }

            // Get the system prompt
            const systemPrompt = getSystemPrompt();

            // Create messages array for the API request
            const apiMessages = [];

            // Add system prompt only if one is explicitly set by the user
            if (systemPrompt && systemPrompt.trim() !== '') {
                apiMessages.push({ role: 'system', content: systemPrompt });
            }
            // Note: No default system prompt is added to allow reasoning models to behave naturally


            // Add all messages up to and including the last user message
            for (const msg of filteredMessages) {
                apiMessages.push(msg);
            }

            // Create request body
        const requestBody = {
                model: getSelectedModel(),
                messages: apiMessages,
            temperature: getTemperature(),
                stream: true,
            };

            // Add max_tokens if set
            const maxTokens = getMaxTokens();
            if (maxTokens > 0) {
                requestBody.max_tokens = maxTokens;
            }

            debugLog('Regenerating with request:', requestBody);

            // Create decoder for handling streamed data
            const decoder = new TextDecoder('utf-8');
            let incompleteChunk = new Uint8Array();

            // Track whether we've already initialized code blocks
            let hasInitializedCodeBlocks = false;

            // Create a timeout for the streaming response (configurable for reasoning models)
            const streamingTimeoutMs = getReasoningTimeout() * 1000; // Convert seconds to milliseconds

            // Create a promise that rejects after the timeout
            const timeoutPromise = new Promise((_, reject) => {
                streamingTimeoutId = setTimeout(() => {
                    if (abortController) {
                        abortController.abort();
                    }
                    reject(new Error('Streaming response timed out during regeneration. This may happen with reasoning models during long thinking processes. Please try again.'));
                }, streamingTimeoutMs);
            });

            // Send request to API with timeout protection
            const fetchPromise = fetch(getApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: signal
            });

            // Race between fetch and timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // Clear the initial timeout since we got a response
            if (streamingTimeoutId) {
                clearTimeout(streamingTimeoutId);
            }

            if (!response.ok) {
                let errorText;
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || `HTTP Error: ${response.status} ${response.statusText}`;
                } catch (jsonError) {
                    errorText = `HTTP Error: ${response.status} ${response.statusText}`;
                }

                throw new Error(errorText);
            }

            const reader = response.body.getReader();

            // Create a new timeout for the streaming process (reset on each chunk)
            const resetChunkTimeout = () => {
                if (chunkTimeoutId) {
                    clearTimeout(chunkTimeoutId);
                }
                // 2 minutes timeout between chunks (reasoning models may pause during thinking)
                chunkTimeoutId = setTimeout(() => {
                    debugLog('No data received for 2 minutes during regeneration, aborting stream');
                    if (abortController) {
                        abortController.abort();
                    }
                }, 120000); // 2 minutes
            };

            resetChunkTimeout();

            // Track streaming progress for reasoning models (same as initial generation)
            let lastChunkTime = Date.now();
            let isInThinkingProcess = false;
            let thinkingStartTime = null;

            // Process the streaming response
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // Clear chunk timeout when stream is complete
                    if (chunkTimeoutId) {
                        clearTimeout(chunkTimeoutId);
                    }
                    break;
                }

                // Reset timeout since we received data
                resetChunkTimeout();

                // Handle partial UTF-8 sequences
                let processedChunk;
                if (incompleteChunk.length > 0) {
                    processedChunk = new Uint8Array(incompleteChunk.length + value.length);
                    processedChunk.set(incompleteChunk);
                    processedChunk.set(value, incompleteChunk.length);
                    incompleteChunk = new Uint8Array();
                } else {
                    processedChunk = value;
                }

                // Decode the chunk
                let chunkText;
                try {
                    chunkText = decoder.decode(processedChunk, { stream: true });
                } catch (e) {
                    incompleteChunk = processedChunk;
                    debugLog('UTF-8 decoding error, storing chunk for next iteration:', e);
                    continue;
                }

                // Process the chunk line by line (SSE format)
                if (chunkText.startsWith('data: ')) {
                    const lines = chunkText.split('\n');

                    for (const line of lines) {
                        if (!line.trim() || line === 'data: [DONE]' || line === 'data: ') {
                            continue;
                        }

                        if (line.startsWith('data: ')) {
                            try {
                                const jsonData = line.substring(6);
                                const data = JSON.parse(jsonData);

                                if (data.choices && data.choices[0] && data.choices[0].delta) {
                                    const delta = data.choices[0].delta;

                                    if (delta.content) {
                                        // Create the AI message bubble on first content arrival
                                        if (!aiMessageElement) {
                                            aiMessageElement = appendMessage('ai', '');
                                            contentContainer = aiMessageElement.querySelector('.message-content');
                                            
                                            // If we couldn't find a container, log error and stop
                                            if (!contentContainer) {
                                                debugError('Could not find message content container for regenerated AI message');
                                                isGenerating = false;
                                                hideLoadingIndicator();
                                                return;
                                            }
                                        }
                                        
                                        aiMessage += delta.content;

                                        // Track thinking process for progress indication (same as initial generation)
                                        const hasThinkTagsNow = aiMessage.includes('<think>') || aiMessage.includes('</think>');
                                        const currentlyInThinking = hasThinkTagsNow && aiMessage.lastIndexOf('</think>') < aiMessage.lastIndexOf('<think>');

                                        // Detect start of thinking process
                                        if (!isInThinkingProcess && currentlyInThinking) {
                                            isInThinkingProcess = true;
                                            thinkingStartTime = Date.now();
                                            debugLog('Reasoning model started thinking process during regeneration');
                                        }

                                        // Detect end of thinking process
                                        if (isInThinkingProcess && !currentlyInThinking && aiMessage.includes('</think>')) {
                                            isInThinkingProcess = false;
                                            const thinkingDuration = Date.now() - thinkingStartTime;
                                            debugLog(`Reasoning model completed thinking process in ${thinkingDuration}ms during regeneration`);
                                        }

                                        // Track thinking tags (recalculate each time like in regular function)
                                        const hasThinkTags = aiMessage.includes('<think>') || aiMessage.includes('</think>');

                                        // Check if this is a code block outside of think tags
                                        if (!hasCodeBlock &&
                                            (delta.content.includes('```') ||
                                             aiMessage.includes('```'))) {

                                            // Only trigger reload for code blocks outside think tags
                                            if (containsCodeBlocksOutsideThinkTags(aiMessage)) {
                                                hasCodeBlock = true;

                                                // Special handling for first message - detect code blocks early
                                                if (isFirstMessage) {
                                                    // Check if we have a complete code block already (outside think tags)
                                                    const contentWithoutThinkTags = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                    const codeBlockStart = contentWithoutThinkTags.indexOf('```');
                                                    const codeBlockEnd = contentWithoutThinkTags.indexOf('```', codeBlockStart + 3);

                                                    // If we have a complete code block in first message (outside think tags),
                                                    // prepare for faster reload by setting up flag
                                                    if (codeBlockStart !== -1 && codeBlockEnd !== -1) {
                                                        debugLog('Complete code block detected outside think tags in first message, preparing for fast reload');
                                                        hasInitializedCodeBlocks = true; // Mark as detected for reload

                                                        // Code block detected - no longer triggering reload
                                                    }
                                                }
                                            }
                                        }

                                        // Apply appropriate sanitization - check if we have content after </think> tags first
                                        const hideThinking = getHideThinking();
                                        const inThinkingSection = hasThinkTags && aiMessage.lastIndexOf('</think>') < aiMessage.lastIndexOf('<think>');

                                        // Check if content after </think> exists
                                        let contentAfterThink = "";
                                        if (hasThinkTags && aiMessage.includes('</think>')) {
                                            const afterThinkMatch = aiMessage.match(/<\/think>([\s\S]*)$/);
                                            if (afterThinkMatch && afterThinkMatch[1]) {
                                                contentAfterThink = afterThinkMatch[1].trim();
                                            }
                                        }

                                        if (hasThinkTags && contentContainer) {
                                            if (hideThinking) {
                                                // When hide thinking is enabled, always hide thinking tags and content
                                                if (contentAfterThink !== "") {
                                                    // We have content after </think>, show ONLY that content (streaming)
                                                    const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                    contentContainer.innerHTML = basicSanitizeInput(processedContent);

                                                    // Remove any thinking indicator that might exist
                                                    const thinkingIndicator = contentContainer.querySelector('.thinking-indicator');
                                                    if (thinkingIndicator) {
                                                        thinkingIndicator.remove();
                                                    }
                                                } else if (inThinkingSection) {
                                                    // We're in thinking section and hide thinking is enabled, show indicator
                                                    let thinkingIndicator = contentContainer.querySelector('.thinking-indicator');

                                                    // Create thinking indicator if it doesn't exist
                                                    if (!thinkingIndicator) {
                                                        thinkingIndicator = document.createElement('div');
                                                        thinkingIndicator.className = 'thinking-indicator';

                                                        // Enhanced thinking indicator with progress (same as initial generation)
                                                        const thinkingDuration = thinkingStartTime ? Date.now() - thinkingStartTime : 0;
                                                        const durationText = thinkingDuration > 1000 ? ` (${Math.round(thinkingDuration / 1000)}s)` : '';

                                                        thinkingIndicator.innerHTML = `<i class="fas fa-brain"></i>${durationText}`;
                                                        thinkingIndicator.setAttribute('data-thinking-content', '');

                                                        // Clear the container and add the indicator
                                                        contentContainer.innerHTML = '';
                                                        contentContainer.appendChild(thinkingIndicator);
                                                    } else {
                                                        // Update existing indicator with duration (throttled to avoid too frequent updates)
                                                        const now = Date.now();
                                                        if (!window._lastThinkingUpdateTime || now - window._lastThinkingUpdateTime > 100) {
                                                            window._lastThinkingUpdateTime = now;
                                                            const thinkingDuration = thinkingStartTime ? Date.now() - thinkingStartTime : 0;
                                                            const durationText = thinkingDuration > 1000 ? ` (${Math.round(thinkingDuration / 1000)}s)` : '';
                                                            thinkingIndicator.innerHTML = `<i class="fas fa-brain"></i>${durationText}`;
                                                        }
                                                    }

                                                    // Update the data attribute with current thinking content
                                                    const thinkingContent = aiMessage.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                                                    if (thinkingContent && thinkingContent[1]) {
                                                        thinkingIndicator.setAttribute('data-thinking-content', thinkingContent[1]);
                                                    }
                                                } else {
                                                    // Hide thinking is enabled but we're not in thinking section and no content after think
                                                    // This means thinking tags are complete but no content after them yet
                                                    const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                                                    contentContainer.innerHTML = basicSanitizeInput(processedContent);
                                                }
                                            } else {
                                                // Hide thinking is disabled, show everything including thinking tags (streaming)
                                                contentContainer.innerHTML = sanitizeInput(aiMessage);
                                            }

                                            // Mark this message as having thinking
                                            aiMessageElement.dataset.hasThinking = 'true';
                                        } else if (contentContainer) {
                                            // For non-reasoning models, apply basic sanitization
                                            contentContainer.innerHTML = basicSanitizeInput(aiMessage);
                                            // Mark this message as a non-reasoning model response
                                            aiMessageElement.dataset.hasThinking = 'false';
                                        }

                                        // Only mark code blocks as detected once we see a completed code block
                                        // But don't initialize them yet - defer initialization until after connection is closed
                                        if (hasCodeBlock && aiMessage.includes('```') &&
                                            aiMessage.lastIndexOf('```') > aiMessage.indexOf('```') + 3 &&
                                            !hasInitializedCodeBlocks) {

                                            // Just mark that we've detected code blocks
                                            hasInitializedCodeBlocks = true;
                                        }

                                        // Scroll to bottom during streaming if auto-scroll is enabled
                                        if (getAutoScrollEnabled()) {
                                            scrollToBottom(messagesContainer, true);
                                        }
                                    }
                                }
                            } catch (error) {
                                debugLog('Error parsing JSON:', error);
                            }
                        }
                    }
                }
            }

            // Handle any remaining UTF-8 data
            if (incompleteChunk.length > 0) {
                const finalChunk = decoder.decode(incompleteChunk);
                aiMessage += finalChunk;
            }

            // Immediately terminate the connection to ensure proper cleanup
            if (abortController) {
                debugLog('Terminating connection after regeneration completion');
                try {
                    abortController.abort();
                    abortController = null;
                } catch (abortError) {
                    debugLog('Error when closing connection during regeneration:', abortError);
                }
            }

            // Apply final content processing based on thinking tags and settings
            const hideThinking = getHideThinking();
            const hasThinkTags = aiMessage.includes('<think>') || aiMessage.includes('</think>');

            if (hasThinkTags) {
                // Check if content after </think> exists
                let contentAfterThink = "";
                if (aiMessage.includes('</think>')) {
                    const afterThinkMatch = aiMessage.match(/<\/think>([\s\S]*)$/);
                    if (afterThinkMatch && afterThinkMatch[1]) {
                        contentAfterThink = afterThinkMatch[1].trim();
                    }
                }

                if (contentContainer) {
                    if (hideThinking) {
                        // Hide thinking tags when hide thinking is enabled
                        const processedContent = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, '');
                        contentContainer.innerHTML = basicSanitizeInput(processedContent);
                    } else {
                        // Show everything including thinking tags when hide thinking is disabled
                        contentContainer.innerHTML = sanitizeInput(aiMessage);
                    }
                }
            } else if (contentContainer) {
                // No thinking tags, show content normally
                contentContainer.innerHTML = basicSanitizeInput(aiMessage);
            }

            // Only initialize code blocks if they exist outside think tags and we haven't initialized them already
            // Schedule code block initialization after connection is closed
            if (containsCodeBlocksOutsideThinkTags(aiMessage)) {
                setTimeout(() => {
                    initializeCodeMirror(aiMessageElement);
                }, 100);
            }

            scrollToBottom(messagesContainer, true);

        // Update chat history: remove messages after the last user message and add new AI response
        if (Array.isArray(chatHistoryData[currentChatId])) {
            // Convert to new format if needed
            chatHistoryData[currentChatId] = {
                messages: chatHistoryData[currentChatId].slice(0, lastUserMessageIndex + 1),
                title: chatHistoryData[currentChatId].title || null,
                };
        } else {
            chatHistoryData[currentChatId].messages = chatHistoryData[currentChatId].messages.slice(0, lastUserMessageIndex + 1);
        }

        // Add the new AI response
        chatHistoryData[currentChatId].messages.push({ role: 'assistant', content: aiMessage });

        // Make sure to save to localStorage before any other operations
        // This ensures the chat is saved even if there's an issue with subsequent operations
        saveChatHistory();

        // Since this is a regeneration, ensure isFirstMessage is set to false
        if (isFirstMessage) {
            debugLog('Setting isFirstMessage to false during regeneration');
            setIsFirstMessage(false);
        }

        // Update the UI to reflect the changes
        updateChatHistoryUI();

        // Final processing for thinking tags
        if (getHideThinking()) {
            // Remove any remaining thinking indicators
            const thinkingIndicators = document.querySelectorAll('.thinking-indicator');
            thinkingIndicators.forEach(indicator => {
                indicator.remove();
            });

            // Import the removeVisibleThinkTags function to ensure thinking tags are hidden
            import('./settings-manager.js').then(module => {
                module.removeVisibleThinkTags();
            });

            // Apply the thinking visibility setting to all messages
            import('./ui-manager.js').then(module => {
                module.applyThinkingVisibility();
            });
        }

        debugLog('Regeneration completed successfully');
    } catch (error) {
        // Clean up timeouts on error
        if (streamingTimeoutId) {
            clearTimeout(streamingTimeoutId);
        }
        if (chunkTimeoutId) {
            clearTimeout(chunkTimeoutId);
        }

        if (error.name === 'AbortError') {
            debugLog('Fetch aborted');
        } else {
            debugError('Error during regeneration:', error);
            appendMessage('error', 'An error occurred while regenerating the response: ' + error.message);
        }
    } finally {
        debugLog('Finalizing regeneration...');

        // Clean up all timeouts
        if (streamingTimeoutId) {
            clearTimeout(streamingTimeoutId);
        }
        if (chunkTimeoutId) {
            clearTimeout(chunkTimeoutId);
        }

        isGenerating = false;

        // Make sure the connection is closed by explicitly aborting
        if (abortController) {
            try {
                debugLog('Ensuring LLM connection is closed in finally block during regeneration');

                // Save a reference to the controller before nullifying it
                const controller = abortController;

                // Immediately set to null to prevent any further operations on it
                abortController = null;

                // Now abort the controller
                controller.abort();
            } catch (finallyAbortError) {
                debugLog('Error when ensuring connection closure during regeneration:', finallyAbortError);
            }
        }

        hideLoadingIndicator();

        const stopButton = document.getElementById('stop-button');
        if (stopButton && !stopButton.classList.contains('hidden')) {
            toggleSendStopButton();
        }

        abortController = null;

        // Final check to ensure hide thinking is applied correctly
        if (getHideThinking()) {
            // Remove any remaining thinking indicators
            const thinkingIndicators = document.querySelectorAll('.thinking-indicator');
            thinkingIndicators.forEach(indicator => {
                indicator.remove();
            });

            // Apply the thinking visibility setting to all messages
            import('./ui-manager.js').then(module => {
                module.applyThinkingVisibility();
            });

            // Also ensure any thinking indicators are properly handled
            import('./settings-manager.js').then(module => {
                module.removeVisibleThinkTags();
            });
            }
        }
    } catch (error) {
        debugError('Error in regenerateLastResponse:', error);

        // Special handling for "No models available" error
        if (error.message === 'No models available') {
            // Don't show any error message during initial startup
            if (!window.isInitialStartup) {
                // Show a clear message to the user about loading a model
                appendMessage('error', 'No models are currently loaded. Click the "Models" button in the sidebar to load a model.');
            } else {
                debugLog('Suppressing "No models available" error during initial startup');
            }

            // Don't automatically show model modal - let user decide when to load a model
        } else {
            appendMessage('error', 'An error occurred: ' + error.message);
        }

        // Reset generation flag
        isGenerating = false;

        // Hide loading indicator
        hideLoadingIndicator();

        // Reset UI state
        const stopButton = document.getElementById('stop-button');
        if (stopButton && !stopButton.classList.contains('hidden')) {
            toggleSendStopButton();
        }
    }
}

// Add this new function for faster chat history updates before reload
/**
 * Updates the chat history without UI updates for faster reloads
 * @param {string} userMessage - The user's message
 * @param {string} aiMessage - The AI's response
 * @param {Array} fileContents - Optional array of file contents
 */
async function fastUpdateChatHistoryBeforeReload(userMessage, aiMessage, fileContents = []) {
    debugLog('Fast update of chat history before reload');

    // Ensure chatHistoryData is initialized
    if (!chatHistoryData) {
        chatHistoryData = {};
    }

    // Initialize chat data structure if it doesn't exist
    if (!chatHistoryData[currentChatId]) {
        // Create a proper structure for the chat with messages array and metadata
        chatHistoryData[currentChatId] = {
            messages: [],
            title: null,
            characterId: null
        };
    }

    // If the chat data is still in the old format (just an array), convert it
    if (Array.isArray(chatHistoryData[currentChatId])) {
        // Save the old messages
        const oldMessages = [...chatHistoryData[currentChatId]];
        // Get the title if it exists and clean any <think> tags
        const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
        // Convert to new format
        chatHistoryData[currentChatId] = {
            messages: oldMessages,
            title: oldTitle,
            characterId: null
        };
    }

    // Get a reference to the messages array
    const messages = chatHistoryData[currentChatId].messages || [];

    // Make sure messages array exists
    if (!chatHistoryData[currentChatId].messages) {
        chatHistoryData[currentChatId].messages = messages;
    }

    // Create user message object
    const userMsg = { role: 'user', content: userMessage };

    // Store file attachments if any
    if (fileContents && fileContents.length > 0) {
        userMsg.files = fileContents;
    }

    // Check if we're adding a duplicate message
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Only add the user message if it's not already the last message in the history
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userMessage) {
        messages.push(userMsg);
    }

    // Add the AI response
    messages.push({ role: 'assistant', content: aiMessage });

    // Just save to localStorage quickly without UI updates
    try {
        const chatHistoryJSON = JSON.stringify(chatHistoryData);
        localStorage.setItem('chatHistory', chatHistoryJSON);
        debugLog('Fast chat history save complete before reload');
    } catch (error) {
        debugError('Error saving chat history before reload:', error);
    }
}

/**
 * Adds a user message to the chat history immediately
 * @param {string} userMessage - The user's message
 * @param {Array} fileContents - Optional array of file contents
 */
export async function addUserMessageToHistory(userMessage, fileContents = []) {
    // Ensure chatHistoryData is initialized
    if (!chatHistoryData) {
        chatHistoryData = {};
    }

    // Initialize chat data structure if it doesn't exist
    if (!chatHistoryData[currentChatId]) {
        // Create a proper structure for the chat with messages array and metadata
        chatHistoryData[currentChatId] = {
            messages: [],
            title: null, // Initialize with no title
        };
    }

    // If the chat data is still in the old format (just an array), convert it
    if (Array.isArray(chatHistoryData[currentChatId])) {
        // Save the old messages
        const oldMessages = [...chatHistoryData[currentChatId]]; // Create a proper copy
        // Get the title if it exists and clean any <think> tags
        const oldTitle = oldMessages.title ? removeThinkTags(oldMessages.title) : null;
        // Convert to new format
        chatHistoryData[currentChatId] = {
            messages: oldMessages,
            title: oldTitle,
        };
    }

    // Ensure messages array exists
    if (!chatHistoryData[currentChatId].messages) {
        chatHistoryData[currentChatId].messages = [];
    }

    // Get a reference to the messages array
    const messages = chatHistoryData[currentChatId].messages;

    // Create user message object
    const userMsg = { role: 'user', content: userMessage };

    // Store file attachments separately without modifying the user message content
    if (fileContents && fileContents.length > 0) {
        debugLog(`Adding ${fileContents.length} files to chat history`);
        userMsg.files = fileContents;
        debugLog(`Files added to chat history: ${fileContents.map(f => f.name).join(', ')}`);
    }

    // Check if we're adding a duplicate message (can happen with regeneration)
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Only add the user message if it's not already the last message in the history
    // This prevents duplicate user messages when regenerating responses
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userMessage) {
        messages.push(userMsg);

        // Check if this is the first message in the chat and auto-generate title is enabled
        // Generate title right after adding the user message, before adding AI response
        if (messages.length === 1 && getAutoGenerateTitles()) {
            try {
                // Get the user's first message (which we just added)
                const firstUserMessage = userMsg.content;

                // Log the message being used for title generation
                debugLog('Generating title based on user message:', firstUserMessage);

                // Generate a title for the chat based on the user's first message
                // The generateChatTitle function now ensures the title is clean of <think> tags
                const title = await generateChatTitle(firstUserMessage);
                if (title) {
                    // Double-check that the title is clean of <think> tags before storing
                    const cleanTitle = removeThinkTags(title);
                    debugLog('Storing clean title with chat:', cleanTitle);

                    // Store the clean title with the chat
                    chatHistoryData[currentChatId].title = cleanTitle;
                }
            } catch (error) {
                debugError('Error generating chat title:', error);
                // If title generation fails, continue without a title
            }
        }

        // Save the updated chat history
        saveChatHistory();

        // Update the UI after saving
        updateChatHistoryUI();
    }
}

/**
 * Updates all trash icon colors when theme changes
 */
function updateTrashIconColors() {
    const isLightTheme = document.body.classList.contains('light-theme');
    const trashIcons = document.querySelectorAll('.trash-icon-container .fas.fa-trash');
    const color = isLightTheme ? '#dc2626' : '#b91c1c';

    trashIcons.forEach(icon => {
        // Only update if not currently being hovered
        if (!icon.parentElement.matches(':hover')) {
            icon.style.color = color;
        }
    });
}

/**
 * Updates chat icon colors when theme changes
 */
function updateChatIconColors() {
    const isLightTheme = document.body.classList.contains('light-theme');
    const chatIcons = document.querySelectorAll('.chat-item .fa-comment-alt');

    chatIcons.forEach(icon => {
        // Check if this is the active chat
        const isActive = icon.closest('.chat-item').classList.contains('active');
        const color = isLightTheme ? (isActive ? '#1d4ed8' : '#2563eb') : 'var(--button-primary-bg)';
        icon.style.color = color;
    });
}

// Listen for theme changes to update icon colors
document.addEventListener('themeChanged', () => {
    updateTrashIconColors();
    updateChatIconColors();
});
