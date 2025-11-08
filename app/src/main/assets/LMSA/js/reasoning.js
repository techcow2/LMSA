// Function to format reasoning output
function formatReasoning(content) {
    // Extract the content between <think> tags
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (!thinkMatch) return content;

    const thinkContent = thinkMatch[1].trim();

    // If think content is empty, don't show reasoning header
    if (thinkContent.length === 0) {
        return content.replace(/<think>[\s\S]*?<\/think>/g, '');
    }

    // Create the reasoning container
    const reasoningHtml = `
        <div class="think">
            <div class="reasoning-intro">
                <i class="fas fa-brain"></i>
                Reasoning Process
                <span class="reasoning-toggle" title="Toggle visibility">[<span class="toggle-text">Hide</span>]</span>
            </div>
            <div class="reasoning-content">
                ${thinkContent.split('\n\n').map(paragraph => {
                    // Skip empty paragraphs
                    if (!paragraph.trim()) return '';
                    return `<div class="reasoning-step">${paragraph.trim()}</div>`;
                }).join('')}
            </div>
        </div>
    `;

    // Replace the original <think> block with the formatted version
    return content.replace(/<think>[\s\S]*?<\/think>/, reasoningHtml);
}

// Function to format special text elements
function formatSpecialText(content) {
    // Replace color spans with styled spans
    content = content.replace(/<span style="color: #([A-Fa-f0-9]{6})">([^<]+)<\/span>/g,
        (match, color, text) => `<span style="color: #${color}; font-weight: bold;">${text}</span>`);

    // Format mathematical expressions
    content = content.replace(/\\\(([^\)]+)\\\)/g,
        (match, expr) => `<span class="math-expr">${expr}</span>`);

    // Format boxed content
    content = content.replace(/\\boxed\{([^\}]+)\}/g,
        (match, content) => `<span class="boxed">${content}</span>`);

    return content;
}

// Add the styles for special formatting
const style = document.createElement('style');
style.textContent = `
    .math-expr {
        font-family: 'Times New Roman', serif;
        font-style: italic;
        color: #7cb7ff;
    }

    .boxed {
        border: 2px solid #7cb7ff;
        padding: 2px 6px;
        border-radius: 4px;
        margin: 0 2px;
        color: #7cb7ff;
        font-weight: bold;
    }

    .reasoning-toggle {
        font-size: 0.8em;
        margin-left: 10px;
        cursor: pointer;
        color: #7cb7ff;
    }

    .reasoning-toggle:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(style);

// Function to handle toggling visibility of individual thinking sections
function setupReasoningToggles() {
    // We now use a direct onclick handler in the HTML, so we don't need
    // to set up event listeners here anymore.
    // This function is kept for backward compatibility.

    // The toggle functionality is now handled by window.toggleReasoningVisibility
    // which is defined in utils.js
}

// Set up event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', setupReasoningToggles);

// Export the formatting functions
window.formatReasoning = formatReasoning;
window.formatSpecialText = formatSpecialText;