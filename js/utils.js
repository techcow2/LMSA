// Debug logging utility
let isDebugEnabled = true; // Enable debug mode by default to help troubleshoot the send button issue

// Performance utilities are now simplified - no complex batching needed

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
 * Sanitizes input for non-reasoning models
 * @param {string} input - The input text to sanitize
 * @returns {string} - Sanitized HTML
 */
export function basicSanitizeInput(input) {
    // First, remove any <think> tags that might be present
    let processedInput = input.replace(/<think>[\s\S]*?<\/think>/g, '');

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
    sanitized = paragraphs.map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');

    // Add extra spacing between paragraphs with CSS
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
    sanitized = paragraphs.map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');

    // Add extra spacing between paragraphs with CSS
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
 * Initializes Monaco Editor for code blocks with performance optimizations
 * @param {HTMLElement} element - The element containing code blocks
 */
export function initializeCodeMirror(element) {
    if (!element) return;

    // Use a more efficient scheduling approach with a longer timeout
    // This ensures the browser has time to finish other critical operations first
    setTimeout(() => {
        const contentContainer = element.querySelector('.message-content');
        if (!contentContainer) return;

        // Handle multiline pre blocks (for copy functionality)
        const multilinePreBlocks = contentContainer.querySelectorAll('pre');

        // Add click handlers for the copy button
        multilinePreBlocks.forEach(pre => {
            // Add click handler for the copy button (::before pseudo-element)
            pre.addEventListener('click', (e) => {
                // Check if click was in the top-right corner (where the button is)
                const rect = pre.getBoundingClientRect();
                const isTopRightCorner = (
                    e.clientX >= rect.right - 40 &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.top + 40
                );

                const isBottomRightCorner = (
                    e.clientX >= rect.right - 40 &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.bottom - 40 &&
                    e.clientY <= rect.bottom
                );

                // Get the computed style to check if we're hovering over the ::before or ::after elements
                // This is more reliable than position detection
                const computedStyle = window.getComputedStyle(pre, '::before');
                const buttonVisible = computedStyle.getPropertyValue('content') !== 'none';

                // Special handling if clicking on a Monaco container's parent (the pre tag was replaced)
                if (pre.classList.contains('monaco-container')) {
                    debugLog('Click on Monaco container');
                    const editor = pre.querySelector('.monaco-editor');
                    if (editor && isTopRightCorner) {
                        // Clicked on top corner of Monaco editor, copy its contents
                        let editorContent = pre.getAttribute('data-original-content') || '';
                        // Remove thinking tags from the content before copying (safety measure)
                        editorContent = removeThinkTags(editorContent);
                        copyToClipboard(editorContent);
                        pre.setAttribute('data-copied', 'true');
                        setTimeout(() => {
                            pre.removeAttribute('data-copied');
                        }, 2000);
                    }
                    return;
                }

                // If clicked in top-right corner or on "Copy" button
                if (isTopRightCorner && buttonVisible) {
                    debugLog('Click on copy button');
                    // Extract text content from the pre element
                    let text = pre.textContent || "";

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
                    pre.setAttribute('data-copied', 'true');
                    setTimeout(() => {
                        pre.removeAttribute('data-copied');
                    }, 2000);
                }
            });
        });

        const codeBlocks = contentContainer.querySelectorAll('pre code');

        // No code blocks found, nothing to do
        if (!codeBlocks.length) return;

        // For performance, only initialize Monaco editors if they're visible
        // or will soon be visible in the viewport
        const isInViewport = (el) => {
            const rect = el.getBoundingClientRect();
            // Element is in viewport or just outside (within 500px)
            return (
                rect.top >= -500 &&
                rect.left >= -100 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 500 &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 100
            );
        };

        // Only process visible code blocks immediately
        const visibleBlocks = Array.from(codeBlocks).filter(block => {
            // Skip if this block is already processed with Monaco
            if (block.closest('.monaco-container')) return false;
            return isInViewport(block);
        });

        const offscreenBlocks = Array.from(codeBlocks).filter(block => {
            // Skip if this block is already processed with Monaco
            if (block.closest('.monaco-container')) return false;
            return !isInViewport(block);
        });

        // Process visible blocks with longer delay to avoid UI freeze
        if (visibleBlocks.length > 0) {
            setTimeout(() => {
                // Process one block at a time to avoid blocking the UI
                processCodeBlocks(visibleBlocks.slice(0, 1));

                // If there are more blocks, schedule them with a delay
                if (visibleBlocks.length > 1) {
                    setTimeout(() => {
                        processCodeBlocks(visibleBlocks.slice(1));
                    }, 250);
                }
            }, 200);
        }

        // Process offscreen blocks with a much longer delay
        if (offscreenBlocks.length > 0) {
            setTimeout(() => {
                processCodeBlocks(offscreenBlocks);
            }, 800);
        }

        // Helper function to process code blocks, now processing one at a time
        function processCodeBlocks(blocks) {
            if (!blocks || blocks.length === 0) return;

            // Process block by block with delays
            const processNextBlock = (index) => {
                if (index >= blocks.length) return;

                const block = blocks[index];
                const language = block.className.replace('language-', '') || 'plaintext';
                const monacoContainer = document.createElement('div');
                monacoContainer.className = 'monaco-container';
                // Add language as data attribute for styling
                monacoContainer.setAttribute('data-language', language);

                // Add touch-specific attributes to enable touch scrolling
                monacoContainer.style.webkitOverflowScrolling = 'touch';
                monacoContainer.style.touchAction = 'pan-y';
                monacoContainer.style.overscrollBehavior = 'contain';

                // Add a single touch event handler to prevent parent container from handling touch events
                // This will let our custom touch handler in the Monaco editor handle the scrolling
                monacoContainer.addEventListener('touchmove', function(e) {
                    // If the touch is within the Monaco editor, stop propagation
                    if (e.target.closest('.monaco-editor') ||
                        e.target.closest('.monaco-scrollable-element') ||
                        e.target.closest('.view-lines')) {
                        e.stopPropagation();
                    }
                }, { passive: false });

                // Replace the pre element with our Monaco container
                block.parentNode.replaceWith(monacoContainer);

                // Transfer the data-has-thinking attribute if it exists
                const hasThinking = block.parentNode.getAttribute('data-has-thinking');
                if (hasThinking) {
                    monacoContainer.setAttribute('data-has-thinking', hasThinking);
                }

                // Get the code content, preserving whitespace and newlines
                let codeContent = block.innerHTML;

                // Process block content
                codeContent = codeContent.replace(/<br\s*\/?>/g, '\n');
                codeContent = decodeHtmlEntities(codeContent);

                // Check for special HTML markers
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

                // Store the original content in data attribute for recovery
                monacoContainer.setAttribute('data-original-content', codeContent);

                // Create the editor container
                const editorContainer = document.createElement('div');
                editorContainer.className = 'monaco-editor monaco-touch-scrollable';
                monacoContainer.appendChild(editorContainer);

                // Map language to Monaco format
                const languageMap = {
                    'js': 'javascript',
                    'jsx': 'javascript',
                    'ts': 'typescript',
                    'tsx': 'typescript',
                    'py': 'python',
                    'html': 'html',
                    'css': 'css',
                    'json': 'json',
                    'markdown': 'markdown',
                    'md': 'markdown',
                    'sh': 'shell',
                    'bash': 'shell',
                    'shell': 'shell',
                    'c': 'cpp',
                    'cpp': 'cpp',
                    'csharp': 'csharp',
                    'cs': 'csharp',
                    'java': 'java',
                    'php': 'php',
                    'ruby': 'ruby',
                    'go': 'go',
                    'rust': 'rust',
                    'sql': 'sql',
                    'xml': 'xml',
                    'yaml': 'yaml',
                    'yml': 'yaml'
                };

                const monacoLanguage = languageMap[language] || language;

                // Only initialize if the container is still in the DOM
                if (monacoContainer.isConnected) {
                    // Use fallback text immediately for better user experience,
                    // we'll replace it with Monaco later if available
                    const fallbackText = document.createElement('pre');
                    fallbackText.className = 'fallback-code';
                    fallbackText.textContent = codeContent;
                    monacoContainer.appendChild(fallbackText);

                    // Queue for Monaco initialization
                    if (!window.pendingMonacoEditors) {
                        window.pendingMonacoEditors = [];
                    }

                    window.pendingMonacoEditors.push({
                        container: monacoContainer,
                        editorContainer: editorContainer,
                        language: monacoLanguage,
                        content: codeContent,
                        fallbackElement: fallbackText
                    });

                    // Attempt to initialize with Monaco if it's already loaded
                    // This code is separated from the main processing flow to avoid blocking
                    if (window.monaco) {
                        // Use a minimal delay to avoid blocking the connection closure
                        queueMicrotask(async () => {
                            try {
                                // Remove the fallback first
                                if (fallbackText && fallbackText.parentNode === monacoContainer) {
                                    monacoContainer.removeChild(fallbackText);
                                }

                                // Import and use optimized Monaco editor creation
                                const { createOptimizedMonacoEditor } = await import('./monaco-performance.js');
                                const editor = await createOptimizedMonacoEditor(editorContainer, monacoLanguage, codeContent);

                                // Add copy action
                                editor.addAction({
                                    id: 'copy-code',
                                    label: 'Copy Code',
                                    contextMenuGroupId: 'clipboard',
                                    run: function() {
                                        copyToClipboard(editor.getValue());
                                        monacoContainer.setAttribute('data-copied', 'true');
                                        setTimeout(() => {
                                            monacoContainer.removeAttribute('data-copied');
                                        }, 2000);
                                    }
                                });

                                // Add custom copy button
                                const copyButton = document.createElement('button');
                                copyButton.className = 'copy-button';
                                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                                copyButton.setAttribute('aria-label', 'Copy code');
                                copyButton.setAttribute('title', 'Copy code to clipboard');
                                copyButton.style.zIndex = '30';

                                // Add click event to copy only the code in the editor
                                copyButton.addEventListener('click', (e) => {
                                    e.stopPropagation(); // Prevent event bubbling
                                    e.preventDefault(); // Prevent default behavior

                                    // Copy the code to clipboard
                                    copyToClipboard(editor.getValue())
                                        .then(() => {
                                            // Visual feedback for successful copy
                                            monacoContainer.setAttribute('data-copied', 'true');
                                            copyButton.innerHTML = '<i class="fas fa-check"></i>';
                                            setTimeout(() => {
                                                monacoContainer.removeAttribute('data-copied');
                                                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                                            }, 2000);
                                        })
                                        .catch(err => {
                                            console.error('Failed to copy code:', err);
                                            copyButton.innerHTML = '<i class="fas fa-times"></i>';
                                            setTimeout(() => {
                                                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                                            }, 2000);
                                        });
                                });

                                // Add the button to the container
                                monacoContainer.appendChild(copyButton);

                                // Add scroll arrows using microtask to ensure they're added immediately
                                queueMicrotask(() => {
                                    // Check if this container already has scroll arrows
                                    const hasUpArrow = monacoContainer.querySelector('.monaco-scroll-arrow-up');
                                    const hasDownArrow = monacoContainer.querySelector('.monaco-scroll-arrow-down');

                                    if (!hasUpArrow) {
                                        const upArrow = document.createElement('button');
                                        upArrow.className = 'monaco-scroll-arrow monaco-scroll-arrow-up';
                                        upArrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
                                        upArrow.setAttribute('aria-label', 'Scroll up');
                                        upArrow.addEventListener('click', () => {
                                            const scrollPosition = editor.getScrollTop();
                                            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
                                            const scrollAmount = lineHeight * 5;
                                            editor.setScrollTop(Math.max(0, scrollPosition - scrollAmount));
                                        });
                                        monacoContainer.appendChild(upArrow);
                                    }

                                    if (!hasDownArrow) {
                                        const downArrow = document.createElement('button');
                                        downArrow.className = 'monaco-scroll-arrow monaco-scroll-arrow-down';
                                        downArrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                                        downArrow.setAttribute('aria-label', 'Scroll down');
                                        downArrow.addEventListener('click', () => {
                                            const scrollPosition = editor.getScrollTop();
                                            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
                                            const scrollAmount = lineHeight * 5;
                                            editor.setScrollTop(scrollPosition + scrollAmount);
                                        });
                                        monacoContainer.appendChild(downArrow);
                                    }
                                });

                                // Remove this editor from the pending list immediately
                                if (window.pendingMonacoEditors) {
                                    window.pendingMonacoEditors = window.pendingMonacoEditors.filter(
                                        item => item.container !== monacoContainer
                                    );
                                }
                            } catch (error) {
                                console.error('Error initializing Monaco editor:', error);
                            }
                        });
                    }

                    // Schedule the next block with minimal delay
                    queueMicrotask(() => {
                        processNextBlock(index + 1);
                    });
                } else {
                    // If container not connected, move to next block immediately
                    processNextBlock(index + 1);
                }
            };

            // Start processing with the first block
            processNextBlock(0);
        }
    }, 150); // Longer initial delay to ensure other operations complete first
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
                console.log('Text copied to clipboard using Clipboard API');
                return true;
            })
            .catch(err => {
                console.warn('Clipboard API failed, trying fallback method:', err);
                return fallbackCopyToClipboard(text);
            });
    } else {
        // Fallback for browsers that don't support Clipboard API
        console.log('Clipboard API not available, using fallback method');
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
                console.log('Text copied to clipboard using fallback method');
                resolve(true);
            } else {
                console.error('Fallback copy method failed');
                reject(new Error('Copy command was unsuccessful'));
            }
        } catch (err) {
            console.error('Error in fallback copy method:', err);
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

                    // The key change: PRESERVE the exact content for Monaco
                    // Don't encode/decode it again
                    debugLog('Using preserved HTML content for Monaco display');
                    return '```' + (language || '') + '\n' + '[HTML_CODE_BLOCK_START]' + rawContent + '[HTML_CODE_BLOCK_END]' + '```';
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
 * Scrolls to the bottom of the messages container with optimized performance
 * @param {HTMLElement} messagesContainer - The messages container element
 * @param {boolean} [force=false] - Whether to force scrolling even if already at bottom
 */
export function scrollToBottom(messagesContainer, force = false) {
    if (!messagesContainer) return;

    // Check if auto-scroll is disabled (unless force is true)
    if (!force) {
        // Check localStorage directly to avoid circular imports
        const disableAutoScroll = localStorage.getItem('disableAutoScroll') === 'true';
        if (disableAutoScroll) {
            return; // Auto-scroll is disabled, exit early
        }
    }

    // Use a more generous threshold (50px) to determine if we're already at the bottom
    // This helps with inconsistent detection across devices
    const bottomThreshold = 50;
    const isAlreadyAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < bottomThreshold;

    // If already at bottom and not forcing, just return
    if (isAlreadyAtBottom && !force) {
        return;
    }

    // Determine if we should use smooth scrolling based on distance
    const scrollDistance = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    const useSmooth = scrollDistance < 1000; // Only use smooth scrolling for shorter distances

    // For very large distances, use a two-step approach for better performance
    if (useSmooth) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
    } else {
        // For long distances, first jump most of the way instantly
        messagesContainer.scrollTop = messagesContainer.scrollHeight - 500;

        // Then use requestAnimationFrame for the smooth part
        requestAnimationFrame(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    // Log scroll position for debugging (only in debug mode)
    if (isDebugEnabled) {
        debugLog('Scrolling to bottom:', {
            scrollHeight: messagesContainer.scrollHeight,
            clientHeight: messagesContainer.clientHeight,
            scrollTop: messagesContainer.scrollTop,
            distance: scrollDistance,
            useSmooth: useSmooth,
            forced: force
        });
    }

    // Reset the userHasScrolledUp flag since we've now scrolled to the bottom
    window.userHasScrolledUp = false;
}

/**
 * Closes the application (for desktop app)
 */
export function closeApplication() {
    // Send a message to the main process to close the application
    if (window.electron) {
        window.electron.send('close-app');
    } else {
        console.log('Electron not available. Unable to close the application.');
        alert('This function is only available in the desktop application.');
    }
}

/**
 * Ensures the cursor is visible in an input field by scrolling horizontally
 * @param {HTMLInputElement} inputField - The input field element
 */
export function ensureCursorVisible(inputField) {
    if (!inputField) return;

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
        try {
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

            // If cursor is beyond the visible area, scroll to make it visible
            if (cursorScreenPosition > inputField.scrollLeft + contentWidth) {
                // Cursor is beyond right edge, scroll right
                inputField.scrollLeft = cursorScreenPosition - contentWidth + scrollOffset;
            } else if (cursorScreenPosition < inputField.scrollLeft + paddingLeft) {
                // Cursor is beyond left edge, scroll left
                inputField.scrollLeft = cursorScreenPosition - paddingLeft - scrollOffset;
            }

            // Ensure we don't scroll past the end of the content
            const maxScroll = textWidth - contentWidth + paddingLeft + paddingRight + scrollOffset;
            if (inputField.scrollLeft > maxScroll) {
                inputField.scrollLeft = Math.max(0, maxScroll);
            }

            // Debug logging if enabled
            if (isDebugEnabled) {
                debugLog('Cursor visibility calculation:', {
                    cursorPosition,
                    textWidth,
                    inputWidth,
                    contentWidth,
                    paddingLeft,
                    paddingRight,
                    cursorScreenPosition,
                    scrollLeft: inputField.scrollLeft,
                    maxScroll
                });
            }
        } catch (error) {
            // Log any errors but don't break the app
            if (isDebugEnabled) {
                debugError('Error in ensureCursorVisible:', error);
            }
        }
    });
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
        window.userHasScrolledUp = distanceFromBottom >= 300;

        if (isDebugEnabled) {
            debugLog('Scroll position analysis:', {
                scrollHeight: messagesContainer.scrollHeight,
                clientHeight: messagesContainer.clientHeight,
                scrollTop: messagesContainer.scrollTop,
                distanceFromBottom: distanceFromBottom,
                totalScrollableHeight: totalScrollableHeight,
                scrollPercentage: scrollPercentage.toFixed(2) + '%',
                userHasScrolledUp: window.userHasScrolledUp
            });
        }
    }

    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
        checkScrollPosition();
    });
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
 * Refreshes all code blocks in the application to use Monaco Editor
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

                        // Special handling for HTML code blocks
                        if (language === 'html' || language === 'xml') {
                            let codeContent = codeElement.innerHTML;

                            // If content contains HTML entities but no special markers, add them
                            if ((codeContent.includes('&lt;') || codeContent.includes('&gt;')) &&
                                !codeContent.includes('[HTML_CODE_BLOCK_START]') &&
                                !codeContent.includes('[HTML_CODE_BLOCK]') &&
                                !codeContent.includes('[HTMLCODEBLOCK]') &&
                                !codeContent.includes('[HTML_CODE_BLOCK_EXACT]')) {

                                // Decode HTML entities to prepare content for Monaco
                                const decodedContent = decodeHtmlEntities(codeContent);

                                // Replace content with decoded version wrapped in special markers
                                codeElement.innerHTML = '[HTML_CODE_BLOCK_START]' + decodedContent + '[HTML_CODE_BLOCK_END]';
                                codeContent = codeElement.innerHTML;
                            }
                        }

                        // Check if this message has thinking tags and add the attribute to the pre element
                        const messageHasThinking = messageEl.dataset && messageEl.dataset.hasThinking === 'true';
                        if (messageHasThinking && pre) {
                            pre.setAttribute('data-has-thinking', 'true');
                        }
                    }
                });

                // Initialize Monaco Editor for this message using queueMicrotask
                queueMicrotask(() => {
                    initializeCodeMirror(messageEl);
                });
            });

            // Add scroll arrows more reliably to any existing Monaco containers
            queueMicrotask(() => {
                const monacoContainers = messagesContainer.querySelectorAll('.monaco-container');

                // Process each Monaco container
                monacoContainers.forEach(container => {
                    // Find the Monaco editor instance for this container
                    let editorInstance = null;
                    if (window.monaco && monaco.editor) {
                        monaco.editor.getEditors().forEach(ed => {
                            try {
                                if (container.contains(ed.getDomNode())) {
                                    editorInstance = ed;
                                }
                            } catch (e) {
                                // Ignore errors
                            }
                        });
                    }

                    // Add scroll arrows if missing
                    const hasUpArrow = container.querySelector('.monaco-scroll-arrow-up');
                    const hasDownArrow = container.querySelector('.monaco-scroll-arrow-down');

                    if (!hasUpArrow) {
                        const upArrow = document.createElement('button');
                        upArrow.className = 'monaco-scroll-arrow monaco-scroll-arrow-up';
                        upArrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        upArrow.setAttribute('aria-label', 'Scroll up');
                        upArrow.addEventListener('click', () => {
                            if (editorInstance) {
                                const scrollPosition = editorInstance.getScrollTop();
                                const lineHeight = editorInstance.getOption(monaco.editor.EditorOption.lineHeight);
                                const scrollAmount = lineHeight * 5;
                                editorInstance.setScrollTop(Math.max(0, scrollPosition - scrollAmount));
                            }
                        });
                        container.appendChild(upArrow);
                    }

                    if (!hasDownArrow) {
                        const downArrow = document.createElement('button');
                        downArrow.className = 'monaco-scroll-arrow monaco-scroll-arrow-down';
                        downArrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                        downArrow.setAttribute('aria-label', 'Scroll down');
                        downArrow.addEventListener('click', () => {
                            if (editorInstance) {
                                const scrollPosition = editorInstance.getScrollTop();
                                const lineHeight = editorInstance.getOption(monaco.editor.EditorOption.lineHeight);
                                const scrollAmount = lineHeight * 5;
                                editorInstance.setScrollTop(scrollPosition + scrollAmount);
                            }
                        });
                        container.appendChild(downArrow);
                    }
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
 * Saves the current chat ID before refresh - optimized for performance
 * @param {string} chatId - The chat ID to save
 * @param {boolean} isFirstMessage - Optional: Whether this is the first message (for faster save)
 */
export function saveCurrentChatBeforeRefresh(chatId, isFirstMessage = false) {
    if (!chatId) return;

    try {
        // Set all flags in one batch for better performance
        localStorage.setItem('lastActiveChatId', chatId);
        localStorage.setItem('refreshDueToCodeGeneration', 'true');
        if (isFirstMessage) {
            localStorage.setItem('isFirstMessageReload', 'true');
        }
    } catch (e) {
        // Fail silently if localStorage isn't available
        console.error('Error saving chat data:', e);
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
