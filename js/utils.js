// Debug logging utility
let isDebugEnabled = false; // Debug mode disabled by default

// Utility functions

export function setDebugEnabled(enabled) {
    isDebugEnabled = enabled;
}

export function debugLog(...args) {
    if (isDebugEnabled) {
        console.log(...args);
    }
}

export function debugError(...args) {
    if (isDebugEnabled) {
        console.error(...args);
    }
}

/**
 * Previously filtered out non-English characters, but now preserves all characters from all languages
 * This function now simply returns the original text without any filtering
 * @param {string} text - The text to process
 * @returns {string} - The original text with all characters preserved
 */
export function filterToEnglishCharacters(text) {
    // Simply return the original text without any filtering
    // This preserves all characters from all languages (Chinese, Japanese, Arabic, Cyrillic, etc.)
    return text;
}

/**
 * Removes <think> tags and their content from text
 * @param {string} text - The text to process
 * @returns {string} - The text with <think> tags and their content removed
 */
export function removeThinkTags(text) {
    if (!text) return text;

    // Make a copy of the text to avoid modifying the original
    let cleanedText = String(text);

    // Handle both standard and non-greedy patterns to ensure all think tags are removed
    // First pass: Remove <think> tags and their content (standard format)
    cleanedText = cleanedText.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Second pass: Remove any nested or malformed think tags that might remain
    cleanedText = cleanedText.replace(/<think>[\s\S]*/g, '');

    // Remove HTML-escaped &lt;think&gt; tags and their content (standard format)
    cleanedText = cleanedText.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/g, '');

    // Remove any escaped nested or malformed think tags that might remain
    cleanedText = cleanedText.replace(/&lt;think&gt;[\s\S]*/g, '');

    // Remove any standalone opening or closing tags that might remain
    cleanedText = cleanedText.replace(/<think>/g, '');
    cleanedText = cleanedText.replace(/<\/think>/g, '');
    cleanedText = cleanedText.replace(/&lt;think&gt;/g, '');
    cleanedText = cleanedText.replace(/&lt;\/think&gt;/g, '');

    // Trim any extra whitespace
    return cleanedText.trim();
}

// Utility functions

/**
 * Detects if content contains HTML-like patterns that should be displayed as code
 * @param {string} content - The content to check
 * @returns {boolean} - True if content appears to be HTML code
 */
function isHtmlContent(content) {
    if (!content) return false;
    
    // First check if content is wrapped in code blocks
    const codeBlockMatch = content.match(/```html?\s*\n([\s\S]*?)```/i);
    if (codeBlockMatch) {
        // Extract the content from the code block and check if it's HTML
        const codeContent = codeBlockMatch[1];
        return isHtmlContentRaw(codeContent);
    }
    
    // Check for HTML_CODE_BLOCK markers and extract content
    if (content.includes('[HTML_CODE_BLOCK_START]') && content.includes('[HTML_CODE_BLOCK_END]')) {
        const startMarker = content.indexOf('[HTML_CODE_BLOCK_START]');
        const endMarker = content.indexOf('[HTML_CODE_BLOCK_END]');
        if (startMarker !== -1 && endMarker !== -1) {
            const markerLength = 22; // Length of [HTML_CODE_BLOCK_START]
            const extractedContent = content.substring(startMarker + markerLength, endMarker);
            return isHtmlContentRaw(extractedContent);
        }
    }
    
    // Check raw content
    return isHtmlContentRaw(content);
}

/**
 * Detects if raw content contains HTML-like patterns
 * @param {string} content - The raw content to check
 * @returns {boolean} - True if content appears to be HTML code
 */
function isHtmlContentRaw(content) {
    if (!content) return false;
    
    // Check for HTML patterns
    const htmlPatterns = [
        /<!DOCTYPE\s+html/i,
        /<html[\s>]/i,
        /<head[\s>]/i,
        /<body[\s>]/i,
        /<\/html>/i,
        /<\/head>/i,
        /<\/body>/i,
        /<div[\s>]/i,
        /<span[\s>]/i,
        /<p[\s>]/i,
        /<h[1-6][\s>]/i,
        /<meta[\s>]/i,
        /<title[\s>]/i,
        /<style[\s>]/i,
        /<script[\s>]/i,
        /<link[\s>]/i
    ];
    
    // Check if content matches HTML patterns
    return htmlPatterns.some(pattern => pattern.test(content));
}

/**
 * Formats HTML content for display as code text
 * @param {string} htmlContent - The HTML content to format
 * @returns {string} - Formatted HTML for display
 */
function formatHtmlAsCode(htmlContent) {
    let content = htmlContent;
    
    // Extract content from code blocks if present
    const codeBlockMatch = content.match(/```html?\s*\n([\s\S]*?)```/i);
    if (codeBlockMatch) {
        content = codeBlockMatch[1];
    }
    
    // Remove HTML_CODE_BLOCK markers if present
    if (content.includes('[HTML_CODE_BLOCK_START]') && content.includes('[HTML_CODE_BLOCK_END]')) {
        const startMarker = content.indexOf('[HTML_CODE_BLOCK_START]');
        const endMarker = content.indexOf('[HTML_CODE_BLOCK_END]');
        if (startMarker !== -1 && endMarker !== -1) {
            const markerLength = 22; // Length of [HTML_CODE_BLOCK_START]
            content = content.substring(startMarker + markerLength, endMarker);
        }
    }
    
    // Remove other HTML markers
    content = content
        .replace(/\[HTML_CODE_BLOCK\]/g, '')
        .replace(/\[\/HTML_CODE_BLOCK\]/g, '')
        .replace(/\[HTMLCODEBLOCK\]/g, '')
        .replace(/\[\/HTMLCODEBLOCK\]/g, '')
        .replace(/\[HTML_CODE_BLOCK_EXACT\]/g, '')
        .replace(/\[\/HTML_CODE_BLOCK_EXACT\]/g, '');
    
    // Escape HTML entities to prevent rendering
    const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    // Split into lines and format each line
    const lines = escaped.split('\n');
    const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Add proper indentation based on original spacing
        const leadingSpaces = line.length - line.trimStart().length;
        const indent = '&nbsp;'.repeat(leadingSpaces);
        
        return `<div class="html-code-line">${indent}${trimmed}</div>`;
    }).filter(line => line);
    
    return formattedLines.join('\n');
}

/**
 * Sanitizes input for non-reasoning models
 * @param {string} input - The input text to sanitize
 * @returns {string} - Sanitized HTML
 */
export function basicSanitizeInput(input) {
    // First, remove any <think> tags that might be present
    let processedInput = input.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Check if the entire content appears to be HTML code
    if (isHtmlContent(processedInput)) {
        // Format as HTML code display
        return `<div class="html-code-container">${formatHtmlAsCode(processedInput)}</div>`;
    }

    // Escape HTML for XSS prevention
    const div = document.createElement('div');
    div.textContent = processedInput;
    let sanitized = div.innerHTML;

    // Handle code blocks with language specification
    sanitized = sanitized.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        // Preserve newlines but escape HTML in the code
        const escapedCode = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#x2F;');

        // Split by newlines and join with explicit <br> tags
        const lines = escapedCode.split('\n');
        const formattedCode = lines.join('<br>');

        // Add a special data attribute to indicate this is a code block with preserved newlines
        return `<pre data-multiline="true" data-language="${language || 'plaintext'}"><code class="language-${language || 'plaintext'}">${formattedCode}</code></pre>`;
    });

    // Handle inline code
    sanitized = sanitized.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle headers
    sanitized = sanitized.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    sanitized = sanitized.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    sanitized = sanitized.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Handle lists
    sanitized = sanitized.replace(/^\* (.+)$/gm, '<li>$1</li>');
    sanitized = sanitized.replace(/^- (.+)$/gm, '<li>$1</li>');
    sanitized = sanitized.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap lists in appropriate containers
    sanitized = sanitized.replace(/(<li>.*?<\/li>\n*)+/g, '<ul>$&</ul>');

    // Handle emphasis and strong
    sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    sanitized = sanitized.replace(/\*(.+?)\*/g, '<em>$1</em>');
    sanitized = sanitized.replace(/_(.+?)_/g, '<em>$1</em>');

    // Handle links
    sanitized = sanitized.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:text-blue-300">$1</a>');

    // Handle paragraphs - treat all newlines as paragraph breaks
    // First, split the text by newlines and wrap each paragraph in <p> tags
    const paragraphs = sanitized.split(/\n/);
    sanitized = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        
        // Check if this line contains HTML-like content that should be displayed as text
        // Look for patterns like &lt;tag&gt; which indicate escaped HTML
        const hasEscapedHtml = /&lt;\/?[a-zA-Z][^&]*&gt;/.test(trimmed);
        
        if (hasEscapedHtml) {
            // For lines containing escaped HTML, use a pre-formatted style to preserve formatting
            return `<div class="html-code-line">${trimmed}</div>`;
        } else {
            // Regular paragraph handling
            return `<p>${trimmed}</p>`;
        }
    }).join('\n');

    // Add extra spacing between regular paragraphs with CSS
    sanitized = sanitized.replace(/<\/p>\s*<p>/g, '</p><p style="margin-top: 1.5em;">');

    return sanitized;
}

/**
 * Sanitizes input with thinking tag processing
 * @param {string} input - The input text to sanitize
 * @returns {string} - Sanitized HTML with thinking tags processed
 */
export function sanitizeInput(input) {
    // First extract all <think> tag contents before any HTML escaping
    let processedInput = input;
    const thinkMatches = [];
    let hasThinkTag = false;

    // Find all <think> sections and store them
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let match;
    while ((match = thinkRegex.exec(processedInput)) !== null) {
        // Only consider think tags with meaningful content (not just whitespace)
        const content = match[1].trim();
        if (content.length > 0) {
            thinkMatches.push({
                fullMatch: match[0],
                content: match[1]
            });
            hasThinkTag = true;
        }
    }

    // Remove think tags to check if remaining content is HTML
    const contentWithoutThink = processedInput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Check if the content (excluding think tags) appears to be HTML code
    if (contentWithoutThink && isHtmlContent(contentWithoutThink)) {
        // Format as HTML code display, but preserve think tags if they exist
        let result = '';
        
        // Add think sections first if they exist
        if (hasThinkTag) {
            thinkMatches.forEach(match => {
                result += `<div class="think"><div class="reasoning-intro"><i class="fas fa-brain"></i> Reasoning Process<span class="reasoning-toggle" onclick="toggleReasoningVisibility(this)" title="Toggle visibility">[<span class="toggle-text">Hide</span>]</span></div><div class="reasoning-content">${match.content.split('\n\n').map(paragraph => {
                    if (!paragraph.trim()) return '';
                    return `<div class="reasoning-step">${paragraph.trim()}</div>`;
                }).join('')}</div></div>`;
            });
        }
        
        // Add the HTML content formatted as code
        result += `<div class="html-code-container">${formatHtmlAsCode(contentWithoutThink)}</div>`;
        
        return result;
    }

    // Now escape HTML for XSS prevention
    const div = document.createElement('div');
    div.textContent = processedInput;
    let sanitized = div.innerHTML;

    // Replace the escaped <think> tags with properly formatted HTML
    thinkMatches.forEach(match => {
        const escapedMatch = match.fullMatch.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        sanitized = sanitized.replace(escapedMatch, `<div class="think"><div class="reasoning-intro"><i class="fas fa-brain"></i> Reasoning Process<span class="reasoning-toggle" onclick="toggleReasoningVisibility(this)" title="Toggle visibility">[<span class="toggle-text">Hide</span>]</span></div><div class="reasoning-content">${match.content.split('\n\n').map(paragraph => {
                    if (!paragraph.trim()) return '';
                    return `<div class="reasoning-step">${paragraph.trim()}</div>`;
                }).join('')}</div></div>`);
    });

    // If we didn't replace any think tags but they exist in the text,
    // mark the output with a special class for CSS targeting
    if (hasThinkTag && thinkMatches.length === 0) {
        sanitized = `<div class="contains-think-tag">${sanitized}</div>`;
    }

    // Handle thinking sections (legacy format)
    sanitized = sanitized.replace(/Let's approach this step by step:\n/g, '<div class="think"><div class="reasoning-intro">Let\'s approach this step by step:</div>');
    sanitized = sanitized.replace(/^(\d+\)\s*.*?)(?=\n\d+\)|$)/gm, '<div class="reasoning-step">$1</div>');

    // Handle raw think tags that might have been escaped
    sanitized = sanitized.replace(/&lt;think&gt;([\s\S]*?)&lt;\/think&gt;/g, (match, content) => {
        // Only create reasoning header if content is not empty or just whitespace
        const trimmedContent = content.trim();
        if (trimmedContent.length > 0) {
            return `<div class="think"><div class="reasoning-intro"><i class="fas fa-brain"></i> Reasoning Process<span class="reasoning-toggle" onclick="toggleReasoningVisibility(this)" title="Toggle visibility">[<span class="toggle-text">Hide</span>]</span></div><div class="reasoning-content"><div class="reasoning-step">${trimmedContent}</div></div></div>`;
        } else {
            // For empty think tags, return empty string (remove them completely)
            return '';
        }
    });

    // Process text after think tags to ensure proper spacing
    // This regex finds content after the last </think> tag
    if (hasThinkTag) {
        const afterThinkRegex = /&lt;\/think&gt;([\s\S]*)$/;
        const afterThinkMatch = sanitized.match(afterThinkRegex);

        if (afterThinkMatch && afterThinkMatch[1]) {
            // Get the content after the last think tag
            let afterContent = afterThinkMatch[1];

            // Apply paragraph styling to content after think tags
            const afterParagraphs = afterContent.split(/\n/);
            afterContent = afterParagraphs.map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
            afterContent = afterContent.replace(/<\/p>\s*<p>/g, '</p><p style="margin-top: 1.5em;">');

            // Wrap the entire content after </think> in a visible div
            afterContent = `<div class="visible-after-think" style="display: block !important; visibility: visible !important; opacity: 1 !important; color: var(--text-primary) !important;">${afterContent}</div>`;

            // Replace the original content after think tag with the styled version
            sanitized = sanitized.replace(afterThinkRegex, `&lt;/think&gt;${afterContent}`);
        }
    }

    // Handle code blocks with language specification
    sanitized = sanitized.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        // Preserve newlines but escape HTML in the code
        const escapedCode = code.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#x2F;');

        // Split by newlines and join with explicit <br> tags
        const lines = escapedCode.split('\n');
        const formattedCode = lines.join('<br>');

        // Add special data attributes to indicate this is a code block with preserved newlines
        // Add a data-has-thinking attribute to help with follow-up message handling
        return `<pre data-multiline="true" data-language="${language || 'plaintext'}" data-has-thinking="${hasThinkTag ? 'true' : 'false'}"><code class="language-${language || 'plaintext'}">${formattedCode}</code></pre>`;
    });

    // Handle inline code
    sanitized = sanitized.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle headers
    sanitized = sanitized.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    sanitized = sanitized.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    sanitized = sanitized.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Handle lists
    sanitized = sanitized.replace(/^\* (.+)$/gm, '<li>$1</li>');
    sanitized = sanitized.replace(/^- (.+)$/gm, '<li>$1</li>');
    sanitized = sanitized.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap lists in appropriate containers
    sanitized = sanitized.replace(/(<li>.*?<\/li>\n*)+/g, '<ul>$&</ul>');

    // Handle emphasis and strong
    sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    sanitized = sanitized.replace(/\*(.+?)\*/g, '<em>$1</em>');
    sanitized = sanitized.replace(/_(.+?)_/g, '<em>$1</em>');

    // Handle links
    sanitized = sanitized.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:text-blue-300">$1</a>');

    // Handle paragraphs - treat all newlines as paragraph breaks
    // First, split the text by newlines and wrap each paragraph in <p> tags
    const paragraphs = sanitized.split(/\n/);
    sanitized = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        
        // Check if this line contains HTML-like content that should be displayed as text
        // Look for patterns like &lt;tag&gt; which indicate escaped HTML
        const hasEscapedHtml = /&lt;\/?[a-zA-Z][^&]*&gt;/.test(trimmed);
        
        if (hasEscapedHtml) {
            // For lines containing escaped HTML, use a pre-formatted style to preserve formatting
            return `<div class="html-code-line">${trimmed}</div>`;
        } else {
            // Regular paragraph handling
            return `<p>${trimmed}</p>`;
        }
    }).join('\n');

    // Add extra spacing between regular paragraphs with CSS
    sanitized = sanitized.replace(/<\/p>\s*<p>/g, '</p><p style="margin-top: 1.5em;">');

    // Close thinking section div if it was opened
    if (sanitized.includes('think') && !sanitized.includes('reasoning-content')) {
        sanitized += '</div>';
    }

    return sanitized;
}

/**
 * Escapes HTML special characters in a string
 * @param {string} unsafe - The string to escape
 * @returns {string} - The escaped string
 */
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Initializes basic code blocks with copy functionality
 * @param {HTMLElement} element - The element containing code blocks
 */
export function initializeCodeMirror(element) {
    if (!element) return;

    setTimeout(() => {
        const contentContainer = element.querySelector('.message-content');
        if (!contentContainer) return;

        // Use event delegation to handle copy button clicks for all code containers
        // This avoids the issue of multiple event listeners on the same element
        if (!contentContainer.hasAttribute('data-copy-delegation-added')) {
            contentContainer.setAttribute('data-copy-delegation-added', 'true');
            
            contentContainer.addEventListener('click', (e) => {
                // Handle HTML code container clicks
                const htmlContainer = e.target.closest('.html-code-container');
                if (htmlContainer) {
                    const rect = htmlContainer.getBoundingClientRect();
                    const isTopRightCorner = (
                        e.clientX >= rect.right - 100 &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.top + 40
                    );

                    if (isTopRightCorner) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        debugLog('Click on HTML copy button');
                        
                        // Extract the original HTML content from the container
                        const htmlLines = htmlContainer.querySelectorAll('.html-code-line');
                        let htmlContent = '';
                        
                        htmlLines.forEach(line => {
                            // Get the text content and decode HTML entities
                            let lineText = line.textContent || '';
                            // Remove the &nbsp; characters used for indentation
                            lineText = lineText.replace(/\u00A0/g, ' ');
                            htmlContent += lineText + '\n';
                        });
                        
                        // Remove the last newline
                        htmlContent = htmlContent.replace(/\n$/, '');
                        
                        debugLog('Copying HTML content:', htmlContent);
                        
                        copyToClipboard(htmlContent);

                        // Visual feedback
                        htmlContainer.setAttribute('data-copied', 'true');
                        setTimeout(() => {
                            htmlContainer.removeAttribute('data-copied');
                        }, 2000);
                        return;
                    }
                }

                // Handle pre element clicks
                const preElement = e.target.closest('pre[data-multiline="true"]');
                if (preElement) {
                    const rect = preElement.getBoundingClientRect();
                    const isTopRightCorner = (
                        e.clientX >= rect.right - 40 &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.top + 40
                    );

                    // Get the computed style to check if we're hovering over the ::before element
                    const computedStyle = window.getComputedStyle(preElement, '::before');
                    const buttonVisible = computedStyle.getPropertyValue('content') !== 'none';

                    // If clicked in top-right corner or on "Copy" button
                    if (isTopRightCorner && buttonVisible) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        debugLog('Click on copy button');
                        // Extract text content from the pre element
                        let text = preElement.textContent || "";

                        // Create a temporary div to decode HTML entities
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = text;
                        text = tempDiv.textContent || tempDiv.innerText || "";

                        // Remove thinking tags from the text before copying
                        text = removeThinkTags(text);

                        // Log the copied text for debugging
                        debugLog('Copying text:', text);

                        copyToClipboard(text);

                        // Visual feedback
                        preElement.setAttribute('data-copied', 'true');
                        setTimeout(() => {
                            preElement.removeAttribute('data-copied');
                        }, 2000);
                    }
                }
            });
        }

        const codeBlocks = contentContainer.querySelectorAll('pre code');

        // No code blocks found, nothing to do
        if (!codeBlocks.length) return;

        // Process code blocks to ensure they have proper styling and copy functionality
        codeBlocks.forEach(block => {
            const pre = block.parentNode;
            const language = block.className.replace('language-', '') || 'plaintext';
            
            // Add language as data attribute for styling
            pre.setAttribute('data-language', language);
            pre.setAttribute('data-multiline', 'true');

            // Get the code content, preserving whitespace and newlines
            let codeContent = block.innerHTML;

            // Process block content
            codeContent = codeContent.replace(/<br\s*\/?>/g, '\n');
            codeContent = decodeHtmlEntities(codeContent);

            // Check for special HTML markers and clean them up
            const hasHtmlMarkers = codeContent.includes('[HTML_CODE_BLOCK') ||
                                 codeContent.includes('[HTMLCODEBLOCK');

            if (hasHtmlMarkers) {
                // Find and extract content between markers
                let startMarker = -1, endMarker = -1, markerLength = 0;

                if (codeContent.includes('[HTML_CODE_BLOCK_START]')) {
                    startMarker = codeContent.indexOf('[HTML_CODE_BLOCK_START]');
                    endMarker = codeContent.indexOf('[HTML_CODE_BLOCK_END]');
                    markerLength = 22;
                } else if (codeContent.includes('[HTMLCODEBLOCK]')) {
                    startMarker = codeContent.indexOf('[HTMLCODEBLOCK]');
                    endMarker = codeContent.indexOf('[/HTMLCODEBLOCK]');
                    markerLength = 14;
                } else if (codeContent.includes('[HTML_CODE_BLOCK]')) {
                    startMarker = codeContent.indexOf('[HTML_CODE_BLOCK]');
                    endMarker = codeContent.indexOf('[/HTML_CODE_BLOCK]');
                    markerLength = 17;
                }

                if (startMarker !== -1 && endMarker !== -1) {
                    codeContent = codeContent.substring(startMarker + markerLength, endMarker);
                }
            }

            // Clean up any remaining markers
            codeContent = codeContent
                .replace(/\[HTMLCODEBLOCKSTART\]/g, '')
                .replace(/\[HTMLCODEBLOCKEND\]/g, '')
                .replace(/\[HTML_CODE_BLOCK\]/g, '')
                .replace(/\[\/HTML_CODE_BLOCK\]/g, '')
                .replace(/\[HTMLCODEBLOCK\]/g, '')
                .replace(/\[\/HTMLCODEBLOCK\]/g, '')
                .replace(/\[HTML_CODE_BLOCK_EXACT\]/g, '')
                .replace(/\[\/HTML_CODE_BLOCK_EXACT\]/g, '');

            // Update the block content
            block.textContent = codeContent;
        });
    }, 50);
}

/**
 * Converts HTML content to formatted plain text, preserving paragraph breaks and line spacing
 * @param {HTMLElement|string} content - The HTML element or HTML string to convert
 * @returns {string} - Formatted plain text with preserved spacing
 */
export function htmlToFormattedText(content) {
    let element;
    
    if (typeof content === 'string') {
        // Create a temporary element to parse the HTML string
        element = document.createElement('div');
        element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        // Clone the element to avoid modifying the original
        element = content.cloneNode(true);
    } else {
        return '';
    }
    
    // Remove any thinking/reasoning sections from the clone
    const thinkSections = element.querySelectorAll('.think, .reasoning-intro, .reasoning-content, .reasoning-step');
    thinkSections.forEach(section => section.remove());
    
    // Function to recursively convert HTML to formatted text
    function processNode(node) {
        let result = '';
        
        for (let child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Add text content, preserving whitespace
                const text = child.textContent;
                result += text;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                
                switch (tagName) {
                    case 'p':
                        // Paragraphs get double line breaks
                        result += processNode(child) + '\n\n';
                        break;
                    case 'div':
                        // Divs get single line breaks unless they're empty
                        const divContent = processNode(child);
                        if (divContent.trim()) {
                            result += divContent + '\n';
                        }
                        break;
                    case 'br':
                        // Line breaks
                        result += '\n';
                        break;
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        // Headers get extra spacing
                        result += '\n' + processNode(child) + '\n\n';
                        break;
                    case 'ul':
                    case 'ol':
                        // Lists get spacing before and after
                        result += '\n' + processNode(child) + '\n';
                        break;
                    case 'li':
                        // List items get bullet points or numbers (simplified to bullets)
                        result += '• ' + processNode(child) + '\n';
                        break;
                    case 'blockquote':
                        // Blockquotes get indentation
                        const quoteContent = processNode(child);
                        result += '\n' + quoteContent.split('\n').map(line => 
                            line.trim() ? '> ' + line : ''
                        ).join('\n') + '\n\n';
                        break;
                    case 'pre':
                    case 'code':
                        // Code blocks preserve formatting
                        result += processNode(child);
                        break;
                    case 'strong':
                    case 'b':
                        // Bold text (keep as is for plain text)
                        result += processNode(child);
                        break;
                    case 'em':
                    case 'i':
                        // Italic text (keep as is for plain text)
                        result += processNode(child);
                        break;
                    default:
                        // For other elements, just process their content
                        result += processNode(child);
                        break;
                }
            }
        }
        
        return result;
    }
    
    let formattedText = processNode(element);
    
    // Clean up excessive line breaks (more than 2 consecutive)
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
    
    // Trim leading and trailing whitespace
    formattedText = formattedText.trim();
    
    return formattedText;
}

/**
 * Copies text to clipboard with fallback methods
 * @param {string} text - The text to copy
 * @returns {Promise} - Promise that resolves when text is copied
 */
export function copyToClipboard(text) {
    // First try the modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                debugLog('Text copied to clipboard using Clipboard API');
                return true;
            })
            .catch(err => {
                debugLog('Clipboard API failed, trying fallback method:', err);
                return fallbackCopyToClipboard(text);
            });
    } else {
        // Fallback for browsers that don't support Clipboard API
        debugLog('Clipboard API not available, using fallback method');
        return fallbackCopyToClipboard(text);
    }
}

// Make copyToClipboard available globally for use in index.html
window.copyToClipboard = copyToClipboard;

/**
 * Fallback method to copy text to clipboard using execCommand
 * @param {string} text - The text to copy
 * @returns {Promise} - Promise that resolves when text is copied
 */
function fallbackCopyToClipboard(text) {
    return new Promise((resolve, reject) => {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Make the textarea invisible but still selectable
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.setAttribute('readonly', '');

        document.body.appendChild(textArea);

        try {
            // Select the text
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, text.length);

            // Try to copy using execCommand
            const successful = document.execCommand('copy');

            if (successful) {
                debugLog('Text copied to clipboard using fallback method');
                resolve(true);
            } else {
                debugError('Fallback copy method failed');
                reject(new Error('Copy command was unsuccessful'));
            }
        } catch (err) {
            debugError('Error in fallback copy method:', err);
            reject(err);
        } finally {
            // Clean up the temporary element
            document.body.removeChild(textArea);
        }
    });
}

// isMobileDevice function is defined later in the file

/**
 * Decodes HTML entities in a string
 * @param {string} html - The HTML string to decode
 * @returns {string} - The decoded string
 */
export function decodeHtmlEntities(html) {
    if (!html) return '';

    // Create a temporary div to decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, "/");

    return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Processes code blocks in a message to ensure proper encoding/decoding
 * @param {string} content - The message content to process
 * @param {boolean} encode - Whether to encode (true) or decode (false) HTML entities
 * @returns {string} - The processed content
 */
export function processCodeBlocks(content, encode = false) {
    if (!content) return content;

    // Check if the content contains code blocks
    if (!content.includes('```')) return content;

    // Process code blocks
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        // Special handling for HTML code blocks
        const isHtmlCode = language === 'html' || language === 'xml';
        let processedCode = code.trim();

        if (encode) {
            // For storage: When saving content

            // If the code already contains HTML entities, decode them first
            if (processedCode.includes('&lt;') || processedCode.includes('&gt;') ||
                processedCode.includes('&amp;')) {
                processedCode = decodeHtmlEntities(processedCode);
            }

            // For HTML code blocks, add a special marker and store the raw code
            if (isHtmlCode) {
                // Store the raw HTML code without entity encoding
                const decodedCode = decodeHtmlEntities(processedCode);
                // Add special markers for HTML content to ensure exact preservation
                return '```' + (language || '') + '\n' + '[HTML_CODE_BLOCK_START]' + decodedCode + '[HTML_CODE_BLOCK_END]' + '```';
            } else {
                // For non-HTML code, preserve the exact content
                return '```' + (language || '') + '\n' + processedCode + '```';
            }
        } else {
            // For display: When rendering content

            // Check if this is a specially marked HTML code block
            if (isHtmlCode && processedCode.includes('[HTML_CODE_BLOCK_START]') &&
                processedCode.includes('[HTML_CODE_BLOCK_END]')) {

                // Extract the content between markers
                const startMarker = processedCode.indexOf('[HTML_CODE_BLOCK_START]');
                const endMarker = processedCode.indexOf('[HTML_CODE_BLOCK_END]');

                if (startMarker !== -1 && endMarker !== -1) {
                    // Get the raw content
                    const markerLength = 22; // Length of [HTML_CODE_BLOCK_START]
                    const rawContent = processedCode.substring(startMarker + markerLength, endMarker);

                    // For display: Return clean content without visible markers
                    // Monaco Editor will handle HTML properly without needing visible markers
                    debugLog('Using preserved HTML content for display without visible markers');
                    return '```' + (language || '') + '\n' + rawContent + '```';
                }
            }

            // For regular HTML content that isn't specially marked
            if (isHtmlCode) {
                // Encode HTML entities to prevent rendering as markup
                const displayCode = processedCode
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/\//g, '&#x2F;');

                return '```' + (language || '') + '\n' + displayCode + '```';
            }

            // For non-HTML code blocks
            return '```' + (language || '') + '\n' + processedCode + '```';
        }
    });
}

/**
 * Scrolls to the bottom of the messages container
 * @param {HTMLElement} messagesContainer - The messages container element
 * @param {boolean} [force=false] - Whether to force scrolling even if already at bottom
 */
export function scrollToBottom(messagesContainer, force = false) {
    if (!messagesContainer) return;

    // Completely disable auto-scrolling during streaming (when force=true is passed)
    // This allows users to read anywhere in the chat history while responses are streaming
    if (force) {
        return;
    }

    // Only allow manual scrolling to bottom (when force=false or not specified)
    // Check how far we've scrolled from the bottom
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    
    // Use a more generous threshold (50px) to determine if we're already at the bottom
    // This helps with inconsistent detection across devices
    const bottomThreshold = 50;
    const isAlreadyAtBottom = distanceFromBottom < bottomThreshold;

    // If already at bottom and not forcing, just return
    if (isAlreadyAtBottom && !force) {
        return;
    }

    // Determine if we should use smooth scrolling based on distance
    const useSmooth = distanceFromBottom < 1000; // Only use smooth scrolling for shorter distances

    // Simple scrolling approach
    if (useSmooth) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        // For long distances, first jump most of the way instantly
        messagesContainer.scrollTop = messagesContainer.scrollHeight - 500;

        // Then scroll smoothly for the final part
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Log scroll position for debugging (only in debug mode)
    if (isDebugEnabled) {
        debugLog('Scrolling to bottom:', {
            scrollHeight: messagesContainer.scrollHeight,
            clientHeight: messagesContainer.clientHeight,
            scrollTop: messagesContainer.scrollTop,
            distance: distanceFromBottom,
            useSmooth: useSmooth,
            forced: force
        });
    }

    // Reset the userHasScrolledUp flag since we've now scrolled to the bottom
    // This will only happen when we actually scroll to the bottom
    window.userHasScrolledUp = false;
}

/**
 * Manually scrolls to bottom - always scrolls regardless of current position
 * This is specifically for user-initiated actions like clicking the scroll button
 * @param {HTMLElement} messagesContainer - The messages container element
 */
export function scrollToBottomManual(messagesContainer) {
    if (!messagesContainer) return;
    
    // Calculate distance for smooth scrolling decision
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    const useSmooth = distanceFromBottom < 1000;
    
    // Always scroll, regardless of current position
    if (useSmooth) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        // For long distances, first jump most of the way instantly
        messagesContainer.scrollTop = messagesContainer.scrollHeight - 500;
        
        // Then scroll smoothly for the final part
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    // Reset the userHasScrolledUp flag since we've now scrolled to the bottom
    window.userHasScrolledUp = false;
    
    // Trigger scroll event to hide the button
    setTimeout(() => {
        handleScroll(messagesContainer);
    }, 100);
}

/**
 * Closes the application (for desktop app)
 */
export function closeApplication() {
    // Send a message to the main process to close the application
    if (window.electron) {
        window.electron.send('close-app');
    } else {
        debugLog('Electron not available. Unable to close the application.');
        alert('This function is only available in the desktop application.');
    }
}

/**
 * Ensures the cursor is visible in an input field by scrolling it into view if needed
 * @param {HTMLInputElement} inputField - The input field element
 */
export function ensureCursorVisible(inputField) {
    if (!inputField) return;

    // Check if we're in Android WebView
    const isAndroidWebView = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android') && userAgent.includes('wv');
    };

    try {
        // For Android WebView, use a simpler approach
        if (isAndroidWebView()) {
            // Give the keyboard time to appear
            setTimeout(() => {
                inputField.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
            return;
        }

        // Get cursor position
        const cursorPosition = inputField.selectionStart;

        // If there's no text or cursor is at the beginning, reset scroll
        if (!inputField.value || cursorPosition === 0) {
            inputField.scrollLeft = 0;
            return;
        }

        // Get computed styles for accurate measurements
        const computedStyle = window.getComputedStyle(inputField);

        // Create a temporary span to measure text width
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.style.font = computedStyle.font;
        tempSpan.style.fontSize = computedStyle.fontSize;
        tempSpan.style.letterSpacing = computedStyle.letterSpacing;
        tempSpan.style.textTransform = computedStyle.textTransform;
        tempSpan.style.padding = '0'; // No padding to get exact text width

        // Get text up to cursor position
        const textBeforeCursor = inputField.value.substring(0, cursorPosition);
        tempSpan.textContent = textBeforeCursor;

        // Add span to DOM to get measurements
        document.body.appendChild(tempSpan);
        const textWidth = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);

        // Get input field dimensions and padding
        const inputWidth = inputField.clientWidth;
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const contentWidth = inputWidth - paddingLeft - paddingRight;

        // Calculate the scroll position needed to make cursor visible
        // Add a small offset to ensure cursor isn't at the very edge
        const scrollOffset = 20;

        // Calculate where the cursor should be visible
        const cursorScreenPosition = textWidth + paddingLeft;

        // Adjust scroll position to keep cursor visible
        if (cursorScreenPosition > inputField.scrollLeft + contentWidth - scrollOffset) {
            // Cursor is too far to the right, scroll right
            inputField.scrollLeft = cursorScreenPosition - contentWidth + scrollOffset;
        } else if (cursorScreenPosition < inputField.scrollLeft + scrollOffset) {
            // Cursor is too far to the left, scroll left
            inputField.scrollLeft = Math.max(0, cursorScreenPosition - scrollOffset);
        }
    } catch (error) {
        debugError('Error in ensureCursorVisible:', error);
        
        // Fallback: ensure the input field is visible in the viewport
        try {
            inputField.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        } catch (fallbackError) {
            debugError('Error in ensureCursorVisible fallback:', fallbackError);
        }
    }
}

/**
 * Handles the scroll event to detect when user has scrolled up
 * @param {HTMLElement} messagesContainer - The messages container element
 */
export function handleScroll(messagesContainer) {
    if (!messagesContainer) return;

    /**
     * Checks the scroll position to determine if user has scrolled up
     */
    function checkScrollPosition() {
        // Get the messages in the container
        const messages = messagesContainer.querySelectorAll('.user, .ai, .system');
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

        // If there are no messages, nothing to do
        if (!lastMessage) return;

        // Calculate how far we've scrolled from the bottom
        const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;

        // Calculate what percentage of the total content has been scrolled
        const totalScrollableHeight = messagesContainer.scrollHeight - messagesContainer.clientHeight;
        const scrollPercentage = totalScrollableHeight > 0 ?
                                (messagesContainer.scrollTop / totalScrollableHeight) * 100 : 0;

        // Set a flag on the window object that can be checked by other parts of the application
        // This flag indicates whether the user has scrolled up significantly
        // Use a smaller threshold (100px) to make the button more responsive
        window.userHasScrolledUp = distanceFromBottom >= 100;

        // Control scroll-to-bottom button visibility
        const scrollButton = document.getElementById('scroll-to-bottom');
        if (scrollButton) {
            const wasVisible = scrollButton.classList.contains('visible');
            
            if (window.userHasScrolledUp) {
                // Show button when user has scrolled up
                scrollButton.classList.remove('hidden');
                scrollButton.classList.add('visible', 'show');
            } else {
                // Hide button when user is at or near bottom
                scrollButton.classList.remove('visible', 'show');
                scrollButton.classList.add('hidden');
            }
        } else {
            console.warn('Scroll-to-bottom button element not found');
        }

        if (isDebugEnabled) {
            debugLog('Scroll position analysis:', {
                scrollHeight: messagesContainer.scrollHeight,
                clientHeight: messagesContainer.clientHeight,
                scrollTop: messagesContainer.scrollTop,
                distanceFromBottom: distanceFromBottom,
                totalScrollableHeight: totalScrollableHeight,
                scrollPercentage: scrollPercentage.toFixed(2) + '%',
                userHasScrolledUp: window.userHasScrolledUp,
                buttonVisible: scrollButton ? !scrollButton.classList.contains('hidden') : false
            });
        }
    }

    checkScrollPosition();
}

/**
 * Detects if the app is running in an Android WebView environment
 * @returns {boolean} - True if running in Android WebView, false otherwise
 */
export function isAndroidWebView() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf('android') > -1 && userAgent.indexOf('wv') > -1;
}

/**
 * Detects if the app is running on a mobile device
 * @returns {boolean} - True if running on a mobile device, false otherwise
 */
export function isMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    // Check both user agent and screen width for better detection
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|crios/i.test(userAgent) || window.innerWidth < 768;
}

/**
 * Adjusts the chat form position when keyboard is visible on Android WebView
 */
export function adjustChatFormForAndroidKeyboard() {
    if (!isAndroidWebView()) return;
    
    const chatForm = document.getElementById('chat-form');
    if (!chatForm) return;
    
    // Add a class for Android-specific styling
    document.body.classList.add('android-webview');
    
    // Use VisualViewport API if available (Android Chrome 62+)
    if (window.visualViewport) {
        const viewport = window.visualViewport;
        
        const handleViewportChange = () => {
            // Calculate the keyboard height considering zoom/scale
            const keyboardHeight = window.innerHeight - (viewport.height * viewport.scale);
            
            if (keyboardHeight > 100) {
                // Keyboard is visible
                document.body.classList.add('keyboard-visible');
                document.body.style.paddingBottom = `${keyboardHeight}px`;
                
                // Scroll to input
                const userInput = document.getElementById('user-input');
                if (userInput) {
                    setTimeout(() => {
                        userInput.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }, 100);
                }
            } else {
                // Keyboard is hidden
                document.body.classList.remove('keyboard-visible');
                document.body.style.paddingBottom = '';
            }
        };
        
        viewport.addEventListener('resize', handleViewportChange);
    }
}

/**
 * Formats a date for display
 * @param {Date} date - The date to format
 * @returns {string} - The formatted date string
 */
export function formatDate(date) {
    if (!date) return '';

    // Check if the date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    if (isToday) {
        return 'today';
    }

    // Check if the date is yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
        return 'yesterday';
    }

    // Otherwise, return a formatted date
    return date.toLocaleDateString();
}

/**
 * Refreshes all code blocks in the application with basic styling
 * This is useful when switching between chats or after loading saved chats
 */
export function refreshAllCodeBlocks() {
    // Use queueMicrotask to avoid blocking the main thread
    queueMicrotask(() => {
        // Process all messages (user, AI, and system) in the main chat container
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            const allMessages = messagesContainer.querySelectorAll('.user, .ai, .system');
            allMessages.forEach(messageEl => {
                // Check if this message has code blocks that need special handling
                const preElements = messageEl.querySelectorAll('pre');
                preElements.forEach(pre => {
                    const codeElement = pre.querySelector('code');
                    if (codeElement) {
                        // Get language from class
                        const classNames = codeElement.className.split(' ');
                        const languageClass = classNames.find(cls => cls.startsWith('language-'));
                        const language = languageClass ? languageClass.replace('language-', '') : '';

                        // Add language as data attribute for styling
                        pre.setAttribute('data-language', language);
                        pre.setAttribute('data-multiline', 'true');

                        // Special handling for HTML code blocks
                        if (language === 'html' || language === 'xml') {
                            let codeContent = codeElement.innerHTML;

                            // If content contains HTML entities but no special markers, decode them
                            if ((codeContent.includes('&lt;') || codeContent.includes('&gt;')) &&
                                !codeContent.includes('[HTML_CODE_BLOCK_START]') &&
                                !codeContent.includes('[HTML_CODE_BLOCK]') &&
                                !codeContent.includes('[HTMLCODEBLOCK]') &&
                                !codeContent.includes('[HTML_CODE_BLOCK_EXACT]')) {

                                // Decode HTML entities for display
                                const decodedContent = decodeHtmlEntities(codeContent);
                                codeElement.textContent = decodedContent;
                            }
                        }

                        // Check if this message has thinking tags and add the attribute to the pre element
                        const messageHasThinking = messageEl.dataset && messageEl.dataset.hasThinking === 'true';
                        if (messageHasThinking && pre) {
                            pre.setAttribute('data-has-thinking', 'true');
                        }
                    }
                });

                // Initialize basic code styling for this message
                queueMicrotask(() => {
                    initializeCodeMirror(messageEl);
                });
            });
        }
    });
}

/**
 * Checks if a message contains code blocks outside of think tags
 * @param {string} message - The message to check
 * @returns {boolean} - True if the message contains code blocks outside think tags, false otherwise
 */
export function containsCodeBlocksOutsideThinkTags(message) {
    if (!message) return false;

    // If no code blocks at all, return false
    if (!message.includes('```')) return false;

    // If no think tags, all code blocks are outside think tags
    if (!message.includes('<think>') && !message.includes('</think>')) {
        return true;
    }

    // Remove all content within think tags and check if code blocks remain
    const contentWithoutThinkTags = message.replace(/<think>[\s\S]*?<\/think>/g, '');
    return contentWithoutThinkTags.includes('```');
}

/**
 * Checks if a message contains code blocks
 * @param {string} message - The message to check
 * @param {boolean} excludeThinkTags - Whether to exclude code blocks within think tags
 * @returns {boolean} - True if the message contains code blocks, false otherwise
 */
export function containsCodeBlocks(message, excludeThinkTags = false) {
    if (!message) return false;

    if (excludeThinkTags) {
        return containsCodeBlocksOutsideThinkTags(message);
    }

    // Check for code blocks with triple backticks
    return message.includes('```');
}

/**
 * Saves the current chat ID before refresh
 * @param {string} chatId - The chat ID to save
 * @param {boolean} isFirstMessage - Optional: Whether this is the first message (for faster save)
 */
export function saveCurrentChatBeforeRefresh(chatId, isFirstMessage = false) {
    if (!chatId) return;

    try {
        // Set all flags
        localStorage.setItem('lastActiveChatId', chatId);
        localStorage.setItem('refreshDueToCodeGeneration', 'true');
        if (isFirstMessage) {
            localStorage.setItem('isFirstMessageReload', 'true');
        }
    } catch (e) {
        // Fail silently if localStorage isn't available
        debugError('Error saving chat data:', e);
    }
}

/**
 * Checks if a refresh was triggered due to code generation
 * @returns {boolean} - True if a refresh was triggered due to code generation
 */
export function wasRefreshDueToCodeGeneration() {
    return localStorage.getItem('refreshDueToCodeGeneration') === 'true';
}

/**
 * Gets the last active chat ID before refresh
 * @returns {string|null} - The last active chat ID or null if not found
 */
export function getLastActiveChatId() {
    return localStorage.getItem('lastActiveChatId');
}

/**
 * Clears the refresh due to code generation flag
 */
export function clearRefreshDueToCodeGenerationFlag() {
    localStorage.removeItem('refreshDueToCodeGeneration');
    debugLog('Cleared refresh due to code generation flag');
}

/**
 * Adds hardware acceleration CSS properties to an element for smoother animations
 * @param {HTMLElement} element - The element to add hardware acceleration to
 */
export function addHardwareAcceleration(element) {
    if (!element) return;
    
    // Apply CSS properties that enable hardware acceleration
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    element.style.backfaceVisibility = 'hidden';
    element.style.webkitBackfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    element.style.webkitPerspective = '1000px';
}

// Add the toggle function for reasoning visibility to the window object
// This needs to be global to be callable from the onclick attribute
if (typeof window !== 'undefined') {
    // Make initializeCodeMirror available in the global scope
    window.initializeCodeMirror = initializeCodeMirror;
    window.toggleReasoningVisibility = function(toggleElement) {
        const toggleText = toggleElement.querySelector('.toggle-text');
        const thinkContainer = toggleElement.closest('.think');
        const reasoningContent = thinkContainer.querySelector('.reasoning-content');

        if (reasoningContent.style.display === 'none') {
            reasoningContent.style.display = 'block';
            toggleText.textContent = 'Hide';
        } else {
            reasoningContent.style.display = 'none';
            toggleText.textContent = 'Show';
        }
    };

    // Add the toggle function for thinking visibility during streaming
    window.toggleThinkingVisibility = function(toggleElement) {
        // If toggleElement is null, this was called automatically when hideThinking is enabled
        const isAutomatic = !toggleElement;

        let toggleText, thinkingContainer;

        if (isAutomatic) {
            // Find the thinking indicator without using the toggle element
            thinkingContainer = document.querySelector('.thinking-indicator');
            if (!thinkingContainer) return; // No thinking indicator found
        } else {
            // Normal case when user clicks the toggle
            toggleText = toggleElement.querySelector('.toggle-text');
            thinkingContainer = toggleElement.closest('.thinking-indicator');
        }

        // Get the thinking content from the data attribute
        const thinkingContent = thinkingContainer.getAttribute('data-thinking-content');

        if (thinkingContent) {
            // Check if the thinking content is already displayed
            const existingContent = thinkingContainer.querySelector('.thinking-content');

            if (existingContent) {
                // If content exists and this is not automatic, toggle its visibility
                if (!isAutomatic) {
                    if (existingContent.style.display === 'none') {
                        existingContent.style.display = 'block';
                        toggleText.textContent = 'Hide';
                    } else {
                        existingContent.style.display = 'none';
                        toggleText.textContent = 'Show';
                    }
                }
            } else {
                // If content doesn't exist yet, create and add it
                const contentDiv = document.createElement('div');
                contentDiv.className = 'thinking-content';

                // If this is automatic (hideThinking enabled), hide the content
                if (isAutomatic) {
                    contentDiv.style.display = 'none';
                }

                // Process the thinking content - first remove any <think> tags that might still be present
                let processedContent = thinkingContent.replace(/<\/?think>/g, '');

                // Create a temporary div to escape HTML for XSS prevention
                const tempDiv = document.createElement('div');
                tempDiv.textContent = processedContent;
                let sanitized = tempDiv.innerHTML;

                // Handle code blocks with language specification
                sanitized = sanitized.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
                    // Preserve newlines but escape HTML in the code
                    const escapedCode = code.trim()
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/\//g, '&#x2F;');

                    // Split by newlines and join with explicit <br> tags
                    const lines = escapedCode.split('\n');
                    const formattedCode = lines.join('<br>');

                    // Add a special data attribute to indicate this is a code block with preserved newlines
                    return `<pre data-multiline="true" data-language="${language || 'plaintext'}"><code class="language-${language || 'plaintext'}">${formattedCode}</code></pre>`;
                });

                // Handle inline code
                sanitized = sanitized.replace(/`([^`]+)`/g, '<code>$1</code>');

                // Handle headers
                sanitized = sanitized.replace(/^### (.+)$/gm, '<h3>$1</h3>');
                sanitized = sanitized.replace(/^## (.+)$/gm, '<h2>$1</h2>');
                sanitized = sanitized.replace(/^# (.+)$/gm, '<h1>$1</h1>');

                // Handle lists
                sanitized = sanitized.replace(/^\* (.+)$/gm, '<li>$1</li>');
                sanitized = sanitized.replace(/^- (.+)$/gm, '<li>$1</li>');
                sanitized = sanitized.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

                // Wrap lists in appropriate containers
                sanitized = sanitized.replace(/(<li>.*?<\/li>\n*)+/g, '<ul>$&</ul>');

                // Handle emphasis and strong
                sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                sanitized = sanitized.replace(/\*(.+?)\*/g, '<em>$1</em>');
                sanitized = sanitized.replace(/_(.+?)_/g, '<em>$1</em>');

                // Handle links
                sanitized = sanitized.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:text-blue-300">$1</a>');

                // Handle paragraphs - treat all newlines as paragraph breaks
                const paragraphs = sanitized.split(/\n/);
                sanitized = paragraphs.map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');

                // Add extra spacing between paragraphs with CSS
                sanitized = sanitized.replace(/<\/p>\s*<p>/g, '</p><p style="margin-top: 1.5em;">');

                contentDiv.innerHTML = sanitized;

                // Initialize code blocks if any
                setTimeout(() => {
                    window.initializeCodeMirror(contentDiv);
                }, 100);
                thinkingContainer.appendChild(contentDiv);
                toggleText.textContent = 'Hide';
            }
        }
    };
}

/**
 * Hides the scroll-to-bottom button
 * Utility function to avoid code duplication across chat switching functions
 */
export function hideScrollToBottomButton() {
    const scrollButton = document.getElementById('scroll-to-bottom');
    if (scrollButton) {
        scrollButton.classList.remove('visible', 'show');
        scrollButton.classList.add('hidden');
    }
}
