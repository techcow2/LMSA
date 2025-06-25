// File Upload functionality
import { fileUploadInput as importedFileUploadInput } from './dom-elements.js';
import { appendMessage } from './ui-manager.js';

let uploadedFiles = [];
let uploadedFileIds = []; // Track uploaded file IDs for API requests
let localFileInput; // Local reference to the file input element

/**
 * Initialize file upload functionality
 * This needs to be called when the app starts to set up file upload handlers
 */
export function initializeFileUpload() {
    console.log('Initializing file upload functionality');
    
    // Get file upload input element - use imported reference or find it directly
    localFileInput = importedFileUploadInput || document.getElementById('file-upload-input');
    
    if (!localFileInput) {
        console.error('File upload input element not found');
        return;
    }
    
    console.log('Found file upload input element:', localFileInput.id);

    // Remove any existing event listeners to prevent duplicates
    // Only replace if the element has a parent node
    if (localFileInput.parentNode) {
        const newFileInput = localFileInput.cloneNode(true);
        localFileInput.parentNode.replaceChild(newFileInput, localFileInput);
        localFileInput = newFileInput;
    } else {
        // If no parent node, just remove existing event listeners directly
        console.log('File input has no parent node, removing event listeners directly');
        localFileInput.removeEventListener('change', handleFileSelection);
    }
    
    // Add event listener for file selection
    localFileInput.addEventListener('change', (event) => {
        console.log('File upload input change event triggered');
        handleFileSelection(event);
    });
    
    // Reset the uploaded files state
    resetUploadedFiles();
    
    // Add event listener to the paperclip button
    const paperclipButton = document.getElementById('paperclip-button');
    if (paperclipButton) {
        console.log('Found paperclip button, adding click listener');

        // Remove any existing event listeners to prevent duplicates
        // Only replace if the element has a parent node
        if (paperclipButton.parentNode) {
            const newPaperclipButton = paperclipButton.cloneNode(true);
            paperclipButton.parentNode.replaceChild(newPaperclipButton, paperclipButton);

            // Add click event to open file dialog
            newPaperclipButton.addEventListener('click', () => {
                console.log('Paperclip button clicked, triggering file input');
                localFileInput.click();
            });
        } else {
            // If no parent node, add event listener directly
            console.log('Paperclip button has no parent node, adding event listener directly');
            paperclipButton.addEventListener('click', () => {
                console.log('Paperclip button clicked, triggering file input');
                localFileInput.click();
            });
        }
    }
    
    console.log('File upload initialization complete');
}

/**
 * Parse DOCX files to extract text content
 * @param {File|ArrayBuffer|Object} input - The DOCX file, its content as ArrayBuffer, or a file-like object with content
 * @returns {Promise<string>} - Extracted text from the DOCX file
 */
async function extractDocxText(input) {
    try {
        // If input is an object with content property (from chat history), use it directly
        if (input && typeof input === 'object' && input.content && typeof input.content === 'string') {
            console.log(`File ${input.name} already has content as string, using directly`);
            return input.content;
        }
        
        // Initialize JSZip to extract the XML content from the DOCX (which is a ZIP file)
        const JSZip = window.JSZip;
        if (!JSZip) {
            console.error('JSZip library not available. Loading it dynamically.');
            await loadJSZip();
        }
        
        // Convert File to ArrayBuffer if needed
        let arrayBuffer;
        if (input instanceof File) {
            console.log(`Converting File ${input.name} to ArrayBuffer for DOCX processing`);
            arrayBuffer = await readFileAsArrayBuffer(input);
        } else {
            // Assume it's already an ArrayBuffer
            arrayBuffer = input;
        }
        
        // Parse the DOCX file (ZIP archive)
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // The main document content is in word/document.xml
        const documentFile = zip.file('word/document.xml');
        if (!documentFile) {
            console.error('Invalid DOCX file: Could not find word/document.xml');
            return 'Invalid DOCX file: Missing document content.';
        }
        
        const contentXml = await documentFile.async('text');
        
        // Extract text from XML
        let textContent = '';
        
        // Simple XML parsing using regex to extract text between <w:t> tags
        // This is a simplified approach, proper XML parsing would be more robust
        const textMatches = contentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
            textContent = textMatches
                .map(match => {
                    // Extract content between <w:t> and </w:t>
                    const content = match.match(/<w:t[^>]*>(.*?)<\/w:t>/)[1];
                    return content;
                })
                .join(' ');
        }
        
        console.log(`Successfully extracted DOCX content, length: ${textContent.length} characters`);
        return textContent || 'No text content could be extracted from DOCX file.';
    } catch (error) {
        console.error('Error extracting DOCX content:', error);
        return `[Failed to extract DOCX content: ${error.message}]`;
    }
}

/**
 * Dynamically load JSZip library if not already available
 */
async function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) {
            resolve(window.JSZip);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
    });
}

/**
 * Dynamically load PDF.js library if not already available
 */
async function loadPDFJS() {
    if (window.pdfjsLib) {
        return window.pdfjsLib;
    }
    
    try {
        console.log('Loading PDF.js library...');
        
        // Load PDF.js from CDN using ES6 module import
        const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.31/pdf.min.mjs');
        
        console.log('PDF.js library loaded successfully');
        
        // Set up worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.31/pdf.worker.min.mjs';
        
        // Store in global scope for future use
        window.pdfjsLib = pdfjsLib;
        
        console.log('PDF.js worker configured');
        
        return pdfjsLib;
    } catch (error) {
        console.error('Failed to load PDF.js:', error);
        
        // Fallback error message with more details
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('import') || errorMessage.includes('module')) {
            throw new Error('Browser does not support ES6 modules required for PDF.js. Please use a modern browser.');
        } else {
            throw new Error(`Network error loading PDF.js: ${errorMessage}`);
        }
    }
}

/**
 * Extract text content from a PDF file using PDF.js
 * @param {File} file - The PDF file to read
 * @returns {Promise<string>} - Extracted text content
 */
async function extractPdfText(file) {
    try {
        console.log(`Extracting text from PDF file: ${file.name}`);
        
        // Load PDF.js library
        const pdfjsLib = await loadPDFJS();
        
        // Read file as ArrayBuffer
        const arrayBuffer = await readFileAsArrayBuffer(file);
        
        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`PDF loaded successfully. Page count: ${pdf.numPages}`);
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combine text items into readable text with proper spacing
                let pageText = '';
                let lastY = null;
                let lastX = null;
                
                for (let i = 0; i < textContent.items.length; i++) {
                    const item = textContent.items[i];
                    const currentY = item.transform[5];
                    const currentX = item.transform[4];
                    
                    // Check if we need a line break (Y position changed significantly)
                    if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                        pageText += '\n';
                    }
                    // Check if we need a space (X position has a gap on same line)
                    else if (lastY !== null && lastX !== null && 
                             Math.abs(currentY - lastY) <= 5 && 
                             currentX > lastX + 10) {  // Use fixed gap instead of item.width which might be undefined
                        pageText += ' ';
                    }
                    
                    pageText += item.str;
                    
                    lastY = currentY;
                    lastX = currentX;
                }
                
                // Clean up extra spaces and normalize line breaks
                pageText = pageText
                    .replace(/\s+/g, ' ')           // Multiple spaces to single space
                    .replace(/\s*\n\s*/g, '\n')     // Clean line breaks
                    .replace(/\n+/g, '\n')          // Multiple line breaks to single
                    .trim();
                
                if (pageText) {
                    fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
                }
                
                console.log(`Extracted text from page ${pageNum}, length: ${pageText.length}`);
                
            } catch (pageError) {
                console.error(`Error extracting text from page ${pageNum}:`, pageError);
                fullText += `--- Page ${pageNum} ---\n[Error extracting text from this page: ${pageError.message}]\n\n`;
            }
        }
        
        console.log(`Successfully extracted text from PDF ${file.name}, total length: ${fullText.length}`);
        return fullText.trim();
        
    } catch (error) {
        console.error(`Error extracting text from PDF ${file.name}:`, error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

/**
 * Handles file selection from the file input
 * @param {Event} event - The change event from the file input
 */
function handleFileSelection(event) {
    console.log('handleFileSelection called with event:', event);
    
    const files = event.target.files;
    if (!files || files.length === 0) {
        console.log('No files selected');
        return;
    }

    // Define allowed file extensions - only PDF, DOCX, TXT, and CSV
    const allowedExtensions = [
        '.txt',    // Plain Text
        '.pdf',    // PDF
        '.docx',   // Microsoft Word
        '.csv'     // Comma-Separated Values
    ];

    console.log('Files selected:', Array.from(files).map(f => `${f.name} (${f.type})`).join(', '));

    // Filter files to only include allowed types
    const validFiles = Array.from(files).filter(file => {
        const fileName = file.name.toLowerCase();
        const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));
        
        // Also allow files with specific MIME types for the allowed file types
        const isAllowedMimeType = file.type && (
            file.type === 'text/plain' ||                    // TXT files
            file.type === 'application/pdf' ||               // PDF files
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // DOCX files
            file.type === 'application/msword' ||            // DOC files (legacy)
            file.type === 'text/csv' ||                      // CSV files
            file.type.includes('csv')                        // Alternative CSV MIME types
        );
        
        const isValid = isAllowed || isAllowedMimeType;
        console.log(`File ${file.name} - allowed by extension: ${isAllowed}, allowed mime type: ${isAllowedMimeType}, valid: ${isValid}`);
        return isValid;
    });

    if (validFiles.length === 0) {
        console.error('No valid files selected');
        
        // Use dynamic import to avoid circular dependency
        import('./ui-manager.js').then(uiModule => {
            if (typeof uiModule.appendMessage === 'function') {
                uiModule.appendMessage('error', 'No valid files selected. Please upload files with the following extensions: ' + allowedExtensions.join(', '));
            }
        }).catch(error => {
            console.error('Failed to import ui-manager.js:', error);
        });
        return;
    }

    if (validFiles.length < files.length) {
        import('./ui-manager.js').then(uiModule => {
            if (typeof uiModule.appendMessage === 'function') {
                uiModule.appendMessage('warning', 'Some files were skipped because they are not supported.');
            }
        }).catch(error => {
            console.error('Failed to import ui-manager.js:', error);
        });
    }

    uploadedFiles = validFiles;
    console.log('Valid files for upload:', uploadedFiles.map(f => f.name).join(', '));

    // Create visual file preview indicators
    const filePreviewContainer = document.createElement('div');
    filePreviewContainer.className = 'file-previews flex flex-wrap gap-2 mt-2 mb-2';
    filePreviewContainer.id = 'file-previews';

    uploadedFiles.forEach(file => {
        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview';

        // Choose icon based on file type
        let iconClass = 'fa-file';
        if (file.type.includes('image')) iconClass = 'fa-file-image';
        else if (file.type.includes('text')) iconClass = 'fa-file-alt';
        else if (file.type.includes('pdf')) iconClass = 'fa-file-pdf';
        else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) iconClass = 'fa-file-word';

        filePreview.innerHTML = `
            <i class="fas ${iconClass}"></i>
            ${file.name}
        `;

        filePreviewContainer.appendChild(filePreview);
    });

    // Display the file previews before the form
    const chatForm = document.getElementById('chat-form');
    const filePreviewsExisting = document.querySelector('.file-previews');

    if (filePreviewsExisting) {
        filePreviewsExisting.parentNode.removeChild(filePreviewsExisting);
    }

    if (chatForm) {
        chatForm.parentNode.insertBefore(filePreviewContainer, chatForm);
    } else {
        console.error('Chat form not found for file preview insertion');
    }

    // Focus the input field for additional text
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
}

/**
 * Read a file as ArrayBuffer
 * @param {File|Object} file - The file to read or file-like object
 * @returns {Promise<ArrayBuffer>} - ArrayBuffer content of the file
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        // If file is not a Blob (e.g., not a real File object), we can't use FileReader
        if (!(file instanceof Blob)) {
            console.error(`File ${file.name} is not a Blob, cannot use FileReader for ArrayBuffer`);
            reject(new Error('Input is not a Blob. Cannot use FileReader for ArrayBuffer.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                console.log(`Successfully read ${file.name} as ArrayBuffer, size: ${arrayBuffer.byteLength} bytes`);
                resolve(arrayBuffer);
            } catch (error) {
                console.error(`Error in FileReader onload for ArrayBuffer ${file.name}:`, error);
                reject(error);
            }
        };
        
        reader.onerror = function(e) {
            console.error(`FileReader error for ArrayBuffer ${file.name}:`, e);
            reject(new Error(`FileReader error: ${e.target.error}`));
        };
        
        try {
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error(`Error initiating readAsArrayBuffer for ${file.name}:`, error);
            reject(error);
        }
    });
}

/**
 * Read file content in the most appropriate format based on file type
 * @param {File} file - The file to read
 * @returns {Promise<Object>} - Object with file name, type, and content
 */
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        console.log(`Reading file content for: ${file.name}, type: ${file.type}`);
        
        try {
            // If file is an object with content already
            if (file && typeof file === 'object' && file.content && typeof file.content === 'string') {
                console.log(`File ${file.name} already has content as string, using directly`);
                resolve({
                    name: file.name,
                    type: file.type || inferFileType(file.name),
                    content: file.content
                });
                return;
            }
            
            // Check if it's a DOCX file
            const isDocxFile = file.name.toLowerCase().endsWith('.docx');
            
            // Check if it's a PDF file
            const isPdfFile = file.name.toLowerCase().endsWith('.pdf');
            
            // Define allowed text file types (TXT and CSV)
            const allowedTextFileTypes = [
                'text/plain',    // TXT files
                'text/csv'       // CSV files
            ];
            
            // Define allowed text file extensions (TXT and CSV)
            const allowedTextFileExtensions = ['.txt', '.csv'];
            
            // Check if it's an allowed text file based on type or extension
            const fileNameLower = file.name.toLowerCase();
            const isAllowedTextByMimeType = allowedTextFileTypes.some(type => file.type && file.type === type);
            const isAllowedTextByExtension = allowedTextFileExtensions.some(ext => fileNameLower.endsWith(ext));
            const isAllowedTextFile = isAllowedTextByMimeType || isAllowedTextByExtension || file.type.includes('csv');
            
            console.log(`File ${file.name} classification: isDocx=${isDocxFile}, isPdf=${isPdfFile}, isAllowedText=${isAllowedTextFile}`);
            
            if (isDocxFile) {
                // Process DOCX files using JSZip
                extractDocxText(file).then(content => {
                    console.log(`Successfully extracted DOCX content from ${file.name}, length: ${content.length}`);
                    resolve({
                        name: file.name,
                        type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        content: content
                    });
                }).catch(error => {
                    console.error(`Error extracting DOCX content from ${file.name}:`, error);
                    // Fallback to text reader for DOCX files if extraction fails
                    readAsText(file).then(content => {
                        resolve({
                            name: file.name,
                            type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            content: content
                        });
                    }).catch(readError => {
                        reject(readError);
                    });
                });
            } else if (isPdfFile) {
                // Process PDF files using PDF.js
                extractPdfText(file).then(content => {
                    console.log(`Successfully extracted PDF content from ${file.name}, length: ${content.length}`);
                    resolve({
                        name: file.name,
                        type: file.type || 'application/pdf',
                        content: content
                    });
                }).catch(error => {
                    console.error(`Error extracting PDF content from ${file.name}:`, error);
                    // Fallback to error message if PDF extraction fails
                    resolve({
                        name: file.name,
                        type: file.type || 'application/pdf',
                        content: `[Error extracting PDF content: ${error.message}. Please ensure the PDF is not password-protected or corrupted.]`
                    });
                });
            } else if (isAllowedTextFile) {
                // Read as text for allowed text file types (TXT and CSV)
                readAsText(file).then(content => {
                    console.log(`Successfully read text content from ${file.name}, length: ${content.length}`);
                    resolve({
                        name: file.name,
                        type: file.type || inferFileType(file.name) || 'text/plain',
                        content: content
                    });
                }).catch(error => {
                    console.error(`Error reading text from ${file.name}:`, error);
                    reject(error);
                });
            } else {
                // For unsupported types (should not happen due to filtering)
                console.log(`Unsupported file type: ${file.type} for ${file.name}`);
                resolve({
                    name: file.name,
                    type: file.type || inferFileType(file.name),
                    content: '[Unsupported file type. Only PDF, DOCX, TXT, and CSV files are allowed.]'
                });
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            // Always resolve with at least file name and type, even on error
            resolve({
                name: file.name,
                type: file.type || inferFileType(file.name) || 'application/octet-stream',
                content: `[Error processing file: ${error.message}]`
            });
        }
    });
}

/**
 * Read a file as text
 * @param {File|Object} file - The file to read or a file-like object with content
 * @returns {Promise<string>} - Text content of the file
 */
function readAsText(file) {
    console.log('readAsText called for file:', file?.name);
    
    return new Promise((resolve, reject) => {
        // If the file is actually an object with content property already (from chat history)
        if (file && typeof file === 'object' && file.content && typeof file.content === 'string') {
            console.log(`File ${file.name} already has content as string, using directly`);
            resolve(file.content);
            return;
        }
        
        // If file is not a Blob (e.g., not a real File object), we can't use FileReader
        if (!(file instanceof Blob)) {
            console.error(`File ${file.name} is not a Blob, cannot use FileReader`);
            console.log('File object details:', JSON.stringify({
                constructor: file.constructor?.name,
                isObject: typeof file === 'object',
                hasName: !!file.name,
                hasType: !!file.type,
                properties: Object.keys(file)
            }));
            reject(new Error('Input is not a Blob. Cannot use FileReader.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                console.log(`Successfully read ${file.name} as text, content length: ${content.length}`);
                resolve(content);
            } catch (error) {
                console.error(`Error in FileReader onload for ${file.name}:`, error);
                reject(error);
            }
        };
        
        reader.onerror = function(e) {
            console.error(`FileReader error for ${file.name}:`, e);
            reject(new Error(`FileReader error: ${e.target.error}`));
        };
        
        reader.onabort = function(e) {
            console.error(`FileReader aborted for ${file.name}:`, e);
            reject(new Error('File reading was aborted'));
        };
        
        try {
            console.log(`Starting readAsText for ${file.name}, file type:`, file.type);
            // Set a timeout to prevent potential hangs
            const timeoutId = setTimeout(() => {
                try {
                    reader.abort();
                    reject(new Error('File reading timed out after 30 seconds'));
                } catch (error) {
                    console.error('Error aborting file read:', error);
                }
            }, 30000); // 30 seconds timeout
            
            reader.onloadend = function() {
                clearTimeout(timeoutId);
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error(`Error initiating readAsText for ${file.name}:`, error);
            reject(error);
        }
    });
}

/**
 * Processes uploaded files for sending to the LM Studio server
 * @param {File[]} files - Array of File objects to process
 * @returns {Promise<Object[]>} - Array of processed file objects with content
 */
export async function uploadFilesToLMStudio(files) {
    try {
        if (!files || files.length === 0) {
            console.log('No files to process');
            return [];
        }
        
        console.log(`Processing ${files.length} files for LM Studio:`, files.map(f => f.name).join(', '));
        console.log('Files details:', files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            lastModified: f.lastModified,
            isBlob: f instanceof Blob,
            isFile: f instanceof File
        })));
        
        // Process each file using the unified reader function
        const fileContentsPromises = files.map(file => readFileContent(file));
        
        const fileContents = await Promise.all(fileContentsPromises);
        console.log('Files processed successfully:', fileContents.map(f => f.name).join(', '));
        console.log('File content summary:', fileContents.map(f => `${f.name}: ${f.content ? f.content.length : 0} chars`).join(', '));
        
        return fileContents;
    } catch (error) {
        console.error('Error processing files:', error);
        // Try to get UI function without creating circular dependency
        try {
            const uiModule = await import('./ui-manager.js');
            if (typeof uiModule.appendMessage === 'function') {
                uiModule.appendMessage('error', `Failed to process files: ${error.message}`);
            }
        } catch (e) {
            console.error('Could not append error message to UI:', e);
        }
        return [];
    }
}

/**
 * Resets uploaded files
 */
export function resetUploadedFiles() {
    uploadedFiles = [];
    uploadedFileIds = [];
    if (localFileInput) {
        localFileInput.value = '';
    }
    const filePreviewsExisting = document.querySelector('.file-previews');
    if (filePreviewsExisting) {
        filePreviewsExisting.parentNode.removeChild(filePreviewsExisting);
    }
}

/**
 * Gets the currently uploaded files
 * @returns {File[]} - Array of uploaded File objects
 */
export function getUploadedFiles() {
    return uploadedFiles;
}

/**
 * Gets the uploaded file IDs
 * @returns {string[]} - Array of uploaded file IDs
 */
export function getUploadedFileIds() {
    return uploadedFileIds;
}

/**
 * Extract content from any supported file type
 * @param {File|Object} file - The file to extract content from or a file-like object with content
 * @returns {Promise<string>} - Extracted content as text
 */
async function extractFileContent(file) {
    try {
        console.log(`Extracting content from file: ${file.name}, type: ${file.type}`);
        
        // If the file already has content property (from chat history), use it directly
        if (file && typeof file === 'object' && file.content && typeof file.content === 'string') {
            console.log(`File ${file.name} already has content as string, using directly`);
            return file.content;
        }
        
        // Check file type by extension
        const fileName = file.name.toLowerCase();
        
        // DOCX files
        if (fileName.endsWith('.docx')) {
            console.log(`Processing ${file.name} as DOCX document`);
            return await extractDocxText(file);
        }
        
        // PDF files
        if (fileName.endsWith('.pdf')) {
            console.log(`Processing ${file.name} as PDF document`);
            try {
                return await extractPdfText(file);
            } catch (error) {
                console.error(`Error extracting text from PDF ${file.name}:`, error);
                return `[Error extracting PDF content: ${error.message}. Please ensure the PDF is not password-protected or corrupted.]`;
            }
        }
        
        // TXT and CSV files
        if (fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
            console.log(`Processing ${file.name} as text file`);
            try {
                return await readAsText(file);
            } catch (error) {
                console.error(`Error reading ${file.name} as text:`, error);
                return `[Error reading file: ${error.message}]`;
            }
        }
        
        // Unsupported file type (should not happen due to filtering)
        console.log(`Unsupported file type for ${file.name}`);
        return '[Unsupported file type. Only PDF, DOCX, TXT, and CSV files are allowed.]';
        
    } catch (error) {
        console.error(`Error extracting content from ${file.name}:`, error);
        return `[Error extracting content from ${file.name}: ${error.message}]`;
    }
}

/**
 * Process files for LLM input by extracting and formatting their content
 * @param {File[]|Object[]} files - Array of uploaded files or file-like objects with content
 * @returns {Promise<string>} - Formatted content for LLM context
 */
export async function prepareFilesForLLM(files) {
    if (!files || files.length === 0) {
        console.log('No files to prepare for LLM');
        return "";
    }
    
    console.log(`Preparing ${files.length} files for LLM input`);
    
    try {
        // Process each file to extract content
        const extractionResults = await Promise.all(
            files.map(async (file) => {
                // Make sure file is an object with at least name property
                if (!file || typeof file !== 'object' || !file.name) {
                    console.error('Invalid file object:', file);
                    return {
                        name: 'Unknown file',
                        type: 'application/octet-stream',
                        content: '[Invalid file object]',
                        success: false
                    };
                }
                
                try {
                    const content = await extractFileContent(file);
                    return {
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: content,
                        success: true
                    };
                } catch (error) {
                    console.error(`Failed to extract content from ${file.name}:`, error);
                    return {
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: `[Failed to extract content: ${error.message}]`,
                        success: false
                    };
                }
            })
        );
        
        // Build the formatted context for the LLM with clear attachment markers
        let formattedContext = "--- ATTACHMENTS BEGIN ---\n\n";
        
        extractionResults.forEach((result, index) => {
            formattedContext += `ATTACHMENT ${index + 1}: ${result.name} (${result.type})\n`;
            formattedContext += "```\n";
            
            // Limit content length to avoid excessive tokens
            const maxContentLength = 100000;
            if (result.content.length > maxContentLength) {
                formattedContext += result.content.substring(0, maxContentLength);
                formattedContext += `\n[Content truncated. Original size: ${result.content.length} characters]`;
            } else {
                formattedContext += result.content;
            }
            
            formattedContext += "\n```\n\n";
        });
        
        formattedContext += "--- ATTACHMENTS END ---\n\n";
        
        console.log(`Successfully prepared ${extractionResults.length} attachments for LLM input`);
        console.log(`Total attachment content size: ${formattedContext.length} characters`);
        
        return formattedContext;
    } catch (error) {
        console.error('Error preparing files for LLM:', error);
        return `[Error preparing attachments: ${error.message}]`;
    }
}

/**
 * Infer file type based on file extension
 * @param {string} fileName - The file name
 * @returns {string} - Inferred MIME type
 */
function inferFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Only include MIME types for allowed file types: PDF, DOCX, TXT, CSV
    const mimeTypes = {
        'txt': 'text/plain',
        'csv': 'text/csv',
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
}
