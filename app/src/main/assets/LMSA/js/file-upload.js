// File Upload functionality
import { fileUploadInput as importedFileUploadInput } from './dom-elements.js';
import { appendMessage } from './ui-manager.js';
import { memoryManager } from './memory-manager.js';

let uploadedFiles = [];
let uploadedFileIds = []; // Track uploaded file IDs for API requests
let localFileInput; // Local reference to the file input element
let processingFiles = new Map(); // Track files being processed to avoid memory leaks

// Cache for vision model detection to reduce API calls
let visionModelCache = {
    modelId: null,
    isVision: false,
    timestamp: 0,
    ttl: 10000 // 10 second cache
};

/**
 * Check if the current model is a vision language model
 * This now checks actual model capabilities through the LM Studio API
 * @returns {Promise<boolean>} - True if current model supports vision
 */
export async function isVisionModel() {
    try {

        // Check if there's a currently loaded model
        if (!window.currentLoadedModel) {
            return false;
        }

        // Try to get model information from various LM Studio endpoints
        const modelId = window.currentLoadedModel;

        // Check cache first - if same model and cache is still valid
        const now = Date.now();
        if (visionModelCache.modelId === modelId &&
            (now - visionModelCache.timestamp) < visionModelCache.ttl) {
            console.log('Returning cached vision capability:', visionModelCache.isVision);
            return visionModelCache.isVision;
        }

        // Get server connection details
        const serverIp = document.getElementById('server-ip')?.value?.trim() || 'localhost';
        const serverPort = document.getElementById('server-port')?.value?.trim() || '1234';

        if (!serverIp || !serverPort) {
            const result = fallbackNameBasedDetection();
            updateVisionCache(modelId, result);
            return result;
        }
        
        // Method 1: Check model details from /v1/models endpoint
        try {
            const modelsResponse = await fetch(`http://${serverIp}:${serverPort}/v1/models`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000) // 3 second timeout
            });

            if (modelsResponse.ok) {
                const modelsData = await modelsResponse.json();
                
                if (modelsData.data && Array.isArray(modelsData.data)) {
                    const currentModel = modelsData.data.find(model => model.id === modelId);
                    if (currentModel) {
                        
                        // Check for vision capabilities in model metadata
                        if (hasVisionCapabilities(currentModel)) {
                            updateVisionCache(modelId, true);
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
        }

        // Method 2: Test vision capability with a small image request
        try {
            const visionTestResult = await testVisionCapability(serverIp, serverPort, modelId);
            if (visionTestResult !== null) {
                updateVisionCache(modelId, visionTestResult);
                return visionTestResult;
            }
        } catch (error) {
        }

        // Method 3: Check model info through additional endpoints
        // REDUCED from 3 to 2 endpoints to minimize log noise
        try {
            const infoEndpoints = [
                '/v1/internal/model/info',
                '/v1/model/info'
            ];

            for (const endpoint of infoEndpoints) {
                try {
                    const infoResponse = await fetch(`http://${serverIp}:${serverPort}${endpoint}`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(2000)
                    });

                    if (infoResponse.ok) {
                        const infoData = await infoResponse.json();

                        if (hasVisionCapabilities(infoData)) {
                            updateVisionCache(modelId, true);
                            return true;
                        }
                    }
                } catch (endpointError) {
                    // Silently continue to next endpoint
                }
            }
        } catch (error) {
        }

        // Method 4: Fallback to name-based detection
        const result = fallbackNameBasedDetection();
        updateVisionCache(modelId, result);
        return result;

    } catch (error) {
        console.error('Error checking vision model capabilities:', error);
        // Fallback to name-based detection on any error
        const result = fallbackNameBasedDetection();
        if (window.currentLoadedModel) {
            updateVisionCache(window.currentLoadedModel, result);
        }
        return result;
    }
}

/**
 * Updates the vision model cache
 * @param {string} modelId - The model ID
 * @param {boolean} isVision - Whether the model has vision capabilities
 */
function updateVisionCache(modelId, isVision) {
    visionModelCache.modelId = modelId;
    visionModelCache.isVision = isVision;
    visionModelCache.timestamp = Date.now();
}

/**
 * Fallback method for name-based vision detection
 * @returns {boolean} - True if model name suggests vision capabilities
 */
function fallbackNameBasedDetection() {
    if (!window.currentLoadedModel) {
        return false;
    }

    const modelName = window.currentLoadedModel.toLowerCase();
    
    // Check if the model name contains vision indicators
    const visionIndicators = [
        'vision', 'visual', 'multimodal', 'mm', 'vlm',
        'qwen2-vl', 'qwen2.5-vl', 'llava', 'pixtral',
        'gemma-3-4b', 'gemma-3-12b', 'gemma-3-27b', 'gemma-3', 'gemma3', 
        'phi-3.5-vision', 'minicpm-v',
        'internvl', 'cogvlm', 'blip', 'flamingo'
    ];
    
    
    // Check each indicator individually for debugging
    const matches = visionIndicators.filter(indicator => {
        const matches = modelName.includes(indicator);
        return matches;
    });
    
    const hasVisionKeyword = matches.length > 0;
    return hasVisionKeyword;
}

/**
 * Check if model metadata indicates vision capabilities
 * @param {Object} modelData - Model metadata object
 * @returns {boolean} - True if vision capabilities are detected
 */
function hasVisionCapabilities(modelData) {
    if (!modelData || typeof modelData !== 'object') {
        return false;
    }

    // Check various possible capability indicators in model metadata
    const capabilityFields = [
        'capabilities', 'modalities', 'supported_modalities', 
        'input_modalities', 'features', 'model_capabilities'
    ];

    for (const field of capabilityFields) {
        const capabilities = modelData[field];
        if (capabilities) {
            // Check if capabilities is an array
            if (Array.isArray(capabilities)) {
                const hasVision = capabilities.some(cap => 
                    typeof cap === 'string' && (
                        cap.toLowerCase().includes('vision') ||
                        cap.toLowerCase().includes('image') ||
                        cap.toLowerCase().includes('visual') ||
                        cap.toLowerCase() === 'multimodal'
                    )
                );
                if (hasVision) return true;
            }
            // Check if capabilities is an object
            else if (typeof capabilities === 'object') {
                const hasVision = Object.keys(capabilities).some(key => 
                    key.toLowerCase().includes('vision') || 
                    key.toLowerCase().includes('image') ||
                    key.toLowerCase().includes('visual')
                ) || Object.values(capabilities).some(value => 
                    typeof value === 'string' && (
                        value.toLowerCase().includes('vision') ||
                        value.toLowerCase().includes('image') ||
                        value.toLowerCase().includes('visual')
                    )
                );
                if (hasVision) return true;
            }
            // Check if capabilities is a string
            else if (typeof capabilities === 'string') {
                const hasVision = capabilities.toLowerCase().includes('vision') ||
                               capabilities.toLowerCase().includes('image') ||
                               capabilities.toLowerCase().includes('visual') ||
                               capabilities.toLowerCase().includes('multimodal');
                if (hasVision) return true;
            }
        }
    }

    // Check for vision-specific model properties
    const visionProperties = [
        'vision_model', 'image_processor', 'vision_config', 
        'vision_tower', 'mm_projector', 'image_encoder'
    ];
    
    for (const prop of visionProperties) {
        if (modelData[prop]) {
            return true;
        }
    }

    // Check model type or architecture indicators
    const modelType = modelData.model_type || modelData.architecture || modelData.type;
    if (modelType && typeof modelType === 'string') {
        const typeIndicators = ['vlm', 'vision', 'multimodal', 'mm'];
        if (typeIndicators.some(indicator => modelType.toLowerCase().includes(indicator))) {
            return true;
        }
    }

    return false;
}

/**
 * Test vision capability by attempting a minimal image input request
 * @param {string} serverIp - Server IP address
 * @param {string} serverPort - Server port
 * @param {string} modelId - Model identifier
 * @returns {Promise<boolean|null>} - True if vision capable, false if not, null if test failed
 */
async function testVisionCapability(serverIp, serverPort, modelId) {
    try {
        // Create a minimal test image (1x1 PNG in base64)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const testRequest = {
            model: modelId,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'test'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${testImageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1,
            stream: false
        };

        
        const response = await fetch(`http://${serverIp}:${serverPort}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testRequest),
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
            return true;
        } else {
            const errorText = await response.text().catch(() => '');
            
            // If the error suggests the model doesn't support images, it's not a vision model
            if (errorText.toLowerCase().includes('image') || 
                errorText.toLowerCase().includes('vision') ||
                errorText.toLowerCase().includes('multimodal')) {
                return false;
            }
            
            // For other errors, we can't determine capability
            return null;
        }
    } catch (error) {
        return null;
    }
}

/**
 * Get the allowed file extensions based on whether vision model is loaded
 * @returns {Promise<Array>} - Array of allowed file extensions
 */
async function getAllowedFileExtensions() {
    const baseExtensions = [
        // Text files
        '.txt', '.md',
        // Code files
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
        '.go', '.rs', '.rb', '.php', '.sh', '.ps1',
        // Data files
        '.json', '.csv', '.tsv', '.xml', '.yaml', '.yml', '.toml', '.ini', '.config', '.jsonl', '.jsonlines',
        // Document files
        '.docx', '.doc', '.pdf',
        // Log files
        '.log',
        // Web files
        '.html', '.css'
    ];

    // Add image extensions if vision model is loaded
    if (await isVisionModel()) {
        const imageExtensions = [
            '.jpg', '.jpeg', '.png', '.webp'
        ];
        return [...baseExtensions, ...imageExtensions];
    }

    return baseExtensions;
}

/**
 * Get allowed MIME types based on whether vision model is loaded
 * @returns {Promise<Array>} - Array of allowed MIME types
 */
async function getAllowedMimeTypes() {
    const baseMimeTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/csv'
    ];

    // Add image MIME types if vision model is loaded
    if (await isVisionModel()) {
        const imageMimeTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp'
        ];
        return [...baseMimeTypes, ...imageMimeTypes];
    }

    return baseMimeTypes;
}

/**
 * Update the file input accept attribute based on current model
 * Simplified to always allow all files
 */
async function updateFileInputAccept() {
    if (!localFileInput) {
        return;
    }
    
    // Always allow all file types - no restrictions
    localFileInput.removeAttribute('accept');
    
    // Verify the accept attribute was removed
    setTimeout(() => {
        const actualAccept = document.getElementById('file-upload-input')?.accept;
    }, 100);
}

/**
 * Initialize file upload functionality
 * This needs to be called when the app starts to set up file upload handlers
 */
export function initializeFileUpload() {
    // console.log('Initializing file upload functionality');
    
    // Get file upload input element - use imported reference or find it directly
    localFileInput = importedFileUploadInput || document.getElementById('file-upload-input');
    
    if (!localFileInput) {
        console.error('File upload input element not found');
        return;
    }
    
    // console.log('Found file upload input element:', localFileInput.id);

    // Remove any existing event listeners to prevent duplicates
    // Only replace if the element has a parent node
    if (localFileInput.parentNode) {
        const newFileInput = localFileInput.cloneNode(true);
        localFileInput.parentNode.replaceChild(newFileInput, localFileInput);
        localFileInput = newFileInput;
    } else {
        // If no parent node, just remove existing event listeners directly
        // console.log('File input has no parent node, removing event listeners directly');
        localFileInput.removeEventListener('change', handleFileSelection);
    }
    
    // Add event listener for file selection
    localFileInput.addEventListener('change', async (event) => {
        // console.log('File upload input change event triggered');
        await handleFileSelection(event);
        
        // Always clear the file input after processing to ensure change event fires next time
        // This is especially important for the case where user selects same file multiple times
        setTimeout(() => {
            if (event.target && 'value' in event.target) {
                event.target.value = '';
            }
        }, 100);
    });
    
    // Reset the uploaded files state - commented out to preserve file previews
    // resetUploadedFiles();
    
    // Update file input accept attribute based on current model
    updateFileInputAccept();
    
    // Add event listener to the paperclip button
    const paperclipButton = document.getElementById('paperclip-button');
    if (paperclipButton) {
        // console.log('Found paperclip button, adding click listener');

        // Remove any existing event listeners to prevent duplicates
        // Only replace if the element has a parent node
        if (paperclipButton.parentNode) {
            const newPaperclipButton = paperclipButton.cloneNode(true);
            paperclipButton.parentNode.replaceChild(newPaperclipButton, paperclipButton);

            // Add click event to open file dialog
            newPaperclipButton.addEventListener('click', async () => {
                // console.log('Paperclip button clicked, triggering file input');
                // Update accept attribute before opening dialog
                await updateFileInputAccept();
                localFileInput.click();
            });
        } else {
            // If no parent node, add event listener directly
            // console.log('Paperclip button has no parent node, adding event listener directly');
            paperclipButton.addEventListener('click', async () => {
                // console.log('Paperclip button clicked, triggering file input');
                // Update accept attribute before opening dialog
                await updateFileInputAccept();
                localFileInput.click();
            });
        }
    }
    
    // console.log('File upload initialization complete');
}

/**
 * Update file upload capabilities when model changes
 * Call this function when a new model is loaded
 */
export async function updateFileUploadCapabilities() {
    // console.log('Updating file upload capabilities for model:', window.currentLoadedModel);
    
    const visionCapable = await isVisionModel();
    // console.log('Vision model detected:', visionCapable);
    
    // Update the file input accept attribute
    await updateFileInputAccept();
    
    // Update UI to show/hide image upload capability
    const paperclipButton = document.getElementById('paperclip-button');
    if (paperclipButton) {
        // Update tooltip based on vision capability, but maintain consistent visual appearance
        if (visionCapable) {
            paperclipButton.setAttribute('title', 'Upload files or images (Vision model detected)');
            paperclipButton.classList.add('vision-enabled');
            
            // Camera icon indicator disabled to maintain consistent appearance
            // Remove any existing camera icon indicator
            const existingCameraIcon = paperclipButton.querySelector('.vision-indicator');
            if (existingCameraIcon) {
                existingCameraIcon.remove();
            }
        } else {
            paperclipButton.setAttribute('title', 'Upload files');
            paperclipButton.classList.remove('vision-enabled');
            
            // Remove camera icon indicator
            const existingCameraIcon = paperclipButton.querySelector('.vision-indicator');
            if (existingCameraIcon) {
                existingCameraIcon.remove();
            }
        }
    }
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
    try {
        if (window.JSZip) {
            return window.JSZip;
        }
        
        // Use the lazy loader from index.html
        if (typeof window.loadJSZipLibrary === 'function') {
            return await window.loadJSZipLibrary();
        }
        
        throw new Error('JSZip lazy loader not available');
    } catch (error) {
        console.error('Error loading JSZip:', error);
        throw error;
    }
}

/**
 * Check if PDF.js library is available
 */
async function loadPDFJS() {
    return new Promise((resolve, reject) => {
        
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }
        
        // Check alternative global variable names
        if (window.PDFJS) {
            window.pdfjsLib = window.PDFJS;
            resolve(window.PDFJS);
            return;
        }
        
        // Check if we're already in the process of loading PDF.js
        if (window._loadingPDFJS) {
            window._loadingPDFJS.then(resolve).catch(reject);
            return;
        }
        
        
        // Create a promise to track the loading process
        window._loadingPDFJS = new Promise((loadResolve, loadReject) => {
            // Use the HTML lazy loader
            if (typeof window.loadPDFLibrary === 'function') {
                window.loadPDFLibrary()
                    .then(() => {
                        console.log('HTML loadPDFLibrary resolved, checking for PDF.js...');
                        
                        // Wait a bit and check multiple times
                        let checkAttempts = 0;
                        const maxChecks = 20;
                        
                        const checkForPDFJS = () => {
                            checkAttempts++;
                            console.log(`Checking for PDF.js, attempt ${checkAttempts}/${maxChecks}`);
                            
                            if (window.pdfjsLib) {
                                console.log('PDF.js found as pdfjsLib after HTML loader');
                                loadResolve(window.pdfjsLib);
                            } else if (window.PDFJS) {
                                console.log('PDF.js found as PDFJS after HTML loader');
                                window.pdfjsLib = window.PDFJS;
                                loadResolve(window.pdfjsLib);
                            } else if (checkAttempts < maxChecks) {
                                console.log('PDF.js not found yet, waiting...');
                                setTimeout(checkForPDFJS, 100);
                            } else {
                                console.error('PDF.js not found after HTML loader and multiple checks');
                                loadReject(new Error('PDF.js not available after loading'));
                            }
                        };
                        
                        // Start checking immediately
                        checkForPDFJS();
                    })
                    .catch(error => {
                        console.error('HTML loadPDFLibrary failed:', error);
                        loadReject(error);
                    });
            } else {
                console.error('HTML loadPDFLibrary function not available');
                loadReject(new Error('PDF.js loader not available'));
            }
        });
        
        // Return the loading promise
        window._loadingPDFJS
            .then(lib => {
                console.log('PDF.js loading completed successfully');
                resolve(lib);
            })
            .catch(error => {
                console.error('PDF.js loading failed:', error);
                reject(error);
            });
    });
}

/**
 * Preprocess image for better OCR accuracy
 * @param {HTMLCanvasElement} originalCanvas - The original canvas with the PDF page
 * @returns {HTMLCanvasElement} - Preprocessed canvas optimized for OCR
 */
function preprocessImageForOCR(originalCanvas) {
    // Create a new canvas for preprocessing
    const preprocessedCanvas = document.createElement('canvas');
    const ctx = preprocessedCanvas.getContext('2d');
    
    // Set canvas size to match original
    preprocessedCanvas.width = originalCanvas.width;
    preprocessedCanvas.height = originalCanvas.height;
    
    // Draw original image to new canvas
    ctx.drawImage(originalCanvas, 0, 0);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, preprocessedCanvas.width, preprocessedCanvas.height);
    const data = imageData.data;
    
    // Apply image preprocessing techniques
    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale using luminance formula
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        
        // Apply contrast enhancement and binarization
        // Threshold for black/white conversion (adjust as needed)
        const threshold = 128;
        const binaryValue = gray > threshold ? 255 : 0;
        
        // Set RGB values to binary result
        data[i] = binaryValue;     // Red
        data[i + 1] = binaryValue; // Green
        data[i + 2] = binaryValue; // Blue
        // Alpha channel (data[i + 3]) remains unchanged
    }
    
    // Put processed image data back to canvas
    ctx.putImageData(imageData, 0, 0);
    
    return preprocessedCanvas;
}

/**
 * Load Tesseract.js OCR library
 * @returns {Promise<Object>} - Tesseract library object
 */
async function loadTesseract() {
    try {
        // Check if Tesseract is already loaded and ready
        if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
            console.log('Tesseract.js already available and ready');
            return window.Tesseract;
        }
        
        // Use the lazy loader from index.html
        if (typeof window.loadTesseractLibrary === 'function') {
            console.log('Loading Tesseract library...');
            const tesseract = await window.loadTesseractLibrary();
            
            // Wait for Tesseract to be fully ready
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds max wait
            
            while (attempts < maxAttempts) {
                if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
                    console.log('Tesseract.js fully initialized and ready');
                    return window.Tesseract;
                }
                
                if (attempts % 10 === 0) { // Log every second
                    console.log(`Waiting for Tesseract.js initialization... attempt ${attempts}/${maxAttempts}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            throw new Error('Tesseract.js failed to initialize after waiting 10 seconds');
        }
        
        throw new Error('Tesseract lazy loader not available');
    } catch (error) {
        console.error('Error loading Tesseract:', error);
        throw error;
    }
}

/**
 * Extract text from PDF files using PDF.js and OCR for image-based content
 * @param {File|ArrayBuffer|Object} input - The PDF file, its content as ArrayBuffer, or a file-like object with content
 * @returns {Promise<string>} - Extracted text from the PDF file
 */
async function extractPdfText(input) {
    try {
        // If input is an object with content property (from chat history), use it directly
        if (input && typeof input === 'object' && input.content && typeof input.content === 'string') {
            return input.content;
        }
        
        // Load PDF.js library if not already available
        let pdfjsLib = window.pdfjsLib || window.PDFJS;
        if (!pdfjsLib) {
            console.log('PDF.js library not available. Loading it dynamically.');
            try {
                pdfjsLib = await loadPDFJS();
            } catch (loadError) {
                console.error('Failed to load PDF.js:', loadError);
                // Check one more time if the library is available despite the error
                pdfjsLib = window.pdfjsLib || window.PDFJS;
                if (!pdfjsLib) {
                    throw new Error(`PDF.js library could not be loaded: ${loadError.message}`);
                } else {
                    console.log('PDF.js library found despite loading error, continuing with extraction...');
                }
            }
        }
        
        // Convert File to ArrayBuffer if needed
        let arrayBuffer;
        if (input instanceof File) {
            console.log(`Converting File ${input.name} to ArrayBuffer for PDF processing`);
            arrayBuffer = await readFileAsArrayBuffer(input);
        } else {
            // Assume it's already an ArrayBuffer
            arrayBuffer = input;
        }
        
        // Load the PDF document
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        
        console.log(`PDF loaded successfully. Number of pages: ${pdf.numPages}`);
        
        let extractedText = '';
        let hasTextContent = false;
        let ocrNeeded = false;
        
        // First pass: Extract text from each page using PDF.js
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                console.log(`Page ${pageNum}: Found ${textContent.items.length} text items`);
                
                // Debug: Log first few text items to see what we're getting
                if (textContent.items.length > 0 && pageNum === 1) {
                    console.log(`First 5 text items on page 1:`, textContent.items.slice(0, 5).map(item => ({ str: item.str, transform: item.transform })));
                }
                
                // Process text items with better spacing and formatting
                let pageText = '';
                let lastY = null;
                
                textContent.items.forEach((item, index) => {
                    // item.transform[5] contains the Y coordinate
                    const currentY = item.transform ? item.transform[5] : 0;
                    
                    // If this is a new line (different Y coordinate), add line break
                    if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                        pageText += '\n';
                    }
                    
                    // Add the text content
                    pageText += item.str;
                    
                    // Add space if needed (check if next item needs a space)
                    if (index < textContent.items.length - 1) {
                        const nextItem = textContent.items[index + 1];
                        const nextY = nextItem.transform ? nextItem.transform[5] : 0;
                        
                        // If on the same line and there's a gap, add space
                        if (Math.abs(currentY - nextY) <= 5 && !item.str.endsWith(' ') && !nextItem.str.startsWith(' ')) {
                            pageText += ' ';
                        }
                    }
                    
                    lastY = currentY;
                });
                
                // Clean up excessive whitespace
                pageText = pageText
                    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double line break
                    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
                    .trim();
                
                if (pageText.length > 10) {
                    hasTextContent = true;
                }
                
                extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
                
                console.log(`Successfully extracted text from page ${pageNum}, length: ${pageText.length} characters`);
                console.log(`Page ${pageNum} raw text preview:`, pageText.substring(0, 200) + (pageText.length > 200 ? '...' : ''));
            } catch (pageError) {
                console.error(`Error extracting text from page ${pageNum}:`, pageError);
                extractedText += `--- Page ${pageNum} ---\n[Error extracting text from this page: ${pageError.message}]\n\n`;
            }
        }
        
        console.log(`Successfully extracted PDF content from ${input.name || 'PDF'}, total length: ${extractedText.length} characters`);
        
        // Check if we got very little or no text content - if so, try OCR
        const cleanedText = extractedText.replace(/--- Page \d+ ---\n/g, '').trim();
        if (cleanedText.length < 50) {
            console.warn(`PDF appears to be image-based or has very little text content. Extracted length: ${cleanedText.length}. Attempting OCR...`);
            ocrNeeded = true;
            
            try {
                // Notify user that OCR is starting
                const fileName = input.name || 'PDF';
                appendMessage('system', `📄 Processing image-based PDF "${fileName}" with OCR (Optical Character Recognition). This may take a few moments...`);
                
                // Load Tesseract.js for OCR
                const Tesseract = await loadTesseract();
                console.log('Tesseract.js loaded successfully, starting OCR process...');
                
                let ocrText = '';
                
                // Second pass: Render pages as images and perform OCR
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    try {
                        console.log(`Starting OCR for page ${pageNum}...`);
                        
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR accuracy
                        
                        // Create canvas to render PDF page
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        // Render PDF page to canvas
                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        
                        await page.render(renderContext).promise;
                        
                        // Preprocess the image for better OCR accuracy
                        const preprocessedCanvas = preprocessImageForOCR(canvas);
                        
                        // Convert canvas to image data for OCR
                        const imageData = preprocessedCanvas.toDataURL('image/png');
                        
                        console.log(`Performing OCR on page ${pageNum}...`);
                        
                        // Perform OCR on the rendered page with optimized settings
                        const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    console.log(`OCR progress for page ${pageNum}: ${Math.round(m.progress * 100)}%`);
                                }
                            },
                            tessedit_pageseg_mode: '1',  // Automatic page segmentation with OSD
                            preserve_interword_spaces: '1',
                            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:;()-[]{}"\'/\\@#$%^&*+=<>|~`'
                        });
                        
                        const cleanedOcrText = text.trim();
                        if (cleanedOcrText.length > 0) {
                            ocrText += `--- Page ${pageNum} (OCR) ---\n${cleanedOcrText}\n\n`;
                            console.log(`OCR completed for page ${pageNum}, extracted ${cleanedOcrText.length} characters`);
                        } else {
                            ocrText += `--- Page ${pageNum} (OCR) ---\n[No text detected via OCR]\n\n`;
                            console.log(`OCR completed for page ${pageNum}, but no text was detected`);
                        }
                        
                    } catch (ocrError) {
                        console.error(`OCR error for page ${pageNum}:`, ocrError);
                        ocrText += `--- Page ${pageNum} (OCR) ---\n[OCR failed: ${ocrError.message}]\n\n`;
                    }
                }
                
                if (ocrText.trim().length > 0) {
                    const fileName = input.name || 'PDF';
                    const ocrExtractedText = ocrText.replace(/--- Page \d+ \(OCR\) ---\n/g, '').trim();
                    
                    if (ocrExtractedText.length > 50) {
                        console.log(`OCR successful! Extracted ${ocrExtractedText.length} characters from image-based PDF`);
                        appendMessage('system', `✅ OCR processing completed for "${fileName}". Successfully extracted ${ocrExtractedText.length} characters of text.`);
                        return `[OCR Text Extraction from ${fileName}]\n\n${ocrText}`;
                    } else {
                        console.warn(`OCR completed but extracted very little text (${ocrExtractedText.length} characters)`);
                        appendMessage('system', `⚠️ OCR processing completed for "${fileName}", but only extracted ${ocrExtractedText.length} characters. The image quality may be too poor for accurate text recognition.`);
                    }
                } else {
                    appendMessage('system', `❌ OCR processing completed for "${fileName}", but no text was detected in the images.`);
                }
                
            } catch (ocrError) {
                console.error('OCR processing failed:', ocrError);
                const fileName = input.name || 'PDF';
                appendMessage('system', `❌ OCR processing failed for "${fileName}": ${ocrError.message}. The PDF will be processed without OCR.`);
                // Fall through to original error message
            }
            
            // If OCR failed or didn't find much text, return the original message
            const fileName = input.name || 'PDF';
            return `[This PDF (${fileName}) appears to be an image-based/scanned document with ${pdf.numPages} pages. ${ocrNeeded ? 'OCR was attempted but' : ''} No extractable text was found. This could be because:

1. The PDF contains scanned images of text rather than actual text
2. The PDF is encrypted or password-protected
3. The text is embedded in a format that cannot be extracted
4. The image quality is too poor for OCR recognition

${ocrNeeded ? 'OCR (Optical Character Recognition) was attempted but did not yield sufficient results.' : 'To analyze image-based PDFs, OCR (Optical Character Recognition) will be attempted automatically.'}

The PDF was successfully loaded and has ${pdf.numPages} pages, but contains no extractable text content.]`;
        }
        
        return extractedText;
        
    } catch (error) {
        console.error('Error extracting PDF content:', error);
        console.error('PDF extraction error details:', {
            errorMessage: error.message,
            errorStack: error.stack,
            inputType: typeof input,
            inputName: input?.name || 'unknown',
            pdfjsLibAvailable: !!window.pdfjsLib,
            PDFJSAvailable: !!window.PDFJS
        });
        return `[Failed to extract PDF content: ${error.message}]`;
    }
}

/**
 * Handles file selection from the file input
 * @param {Event} event - The change event from the file input
 */
export async function handleFileSelection(event) {
    console.log('handleFileSelection called with event:', event);
    
    // Defensive programming: ensure event and event.target exist
    if (!event || !event.target) {
        console.error('Invalid event or event.target in handleFileSelection');
        return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) {
        console.log('No files selected');
        return;
    }

    console.log('Files selected:', Array.from(files).map(f => `${f.name} (${f.type})`).join(', '));

    // Accept all files - no filtering based on model type
    const validFiles = Array.from(files);
    console.log('All files accepted:', validFiles.map(f => f.name).join(', '));

    uploadedFiles = validFiles;
    console.log('Valid files for upload:', uploadedFiles.map(f => f.name).join(', '));

    // Create file previews
    createFilePreviewsContainer(uploadedFiles);

    // Focus the input field for additional text
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
}

/**
 * Creates a simple file previews container
 * @param {FileList|Array} files - The files to create previews for
 */
function createFilePreviewsContainer(files) {
    console.log('createFilePreviewsContainer called with files:', files.length);
    // Remove any existing file previews container
    const existingContainer = document.querySelector('.file-previews');
    if (existingContainer) {
        console.log('Removing existing container');
        existingContainer.remove();
    }

    if (!files || files.length === 0) {
        console.log('No files to create previews for');
        return;
    }

    // Create the container
    const container = document.createElement('div');
    container.className = 'file-previews';

    // Create preview for each file
    Array.from(files).forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'file-preview loaded'; // Add 'loaded' class for CSS animations
        preview.dataset.fileIndex = index;

        // Create file icon or image preview
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            // Reuse existing blob URL if available, otherwise create new one
            if (file.blobUrl) {
                img.src = file.blobUrl;
            } else {
                file.blobUrl = URL.createObjectURL(file);
                img.src = file.blobUrl;
            }
            img.alt = file.name;
            preview.appendChild(img);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fas fa-file';
            preview.appendChild(icon);
        }

        // Create file name
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        fileName.title = file.name; // Show full name on hover
        preview.appendChild(fileName);

        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove file';
        removeBtn.addEventListener('click', () => removeFilePreview(index, file.name));
        preview.appendChild(removeBtn);

        container.appendChild(preview);
    });

    // Insert the container before the chat form
    const chatForm = document.getElementById('chat-form');
    if (chatForm && chatForm.parentNode) {
        console.log('Inserting file preview container before chat form');
        chatForm.parentNode.insertBefore(container, chatForm);
        console.log('File preview container inserted successfully');
        
        // Debug: Check if container still exists after a delay
        setTimeout(() => {
            const existingContainer = document.querySelector('.file-previews');
            if (existingContainer) {
                console.log('File preview container still exists after 1 second');
                console.log('Container visibility:', window.getComputedStyle(existingContainer).visibility);
                console.log('Container display:', window.getComputedStyle(existingContainer).display);
                console.log('Container opacity:', window.getComputedStyle(existingContainer).opacity);
                
                // Check image elements inside the container
                const images = existingContainer.querySelectorAll('img');
                console.log(`Found ${images.length} image(s) in container`);
                images.forEach((img, index) => {
                    console.log(`Image ${index}: src="${img.src}", alt="${img.alt}"`);
                    console.log(`Image ${index} visibility:`, window.getComputedStyle(img).visibility);
                    console.log(`Image ${index} display:`, window.getComputedStyle(img).display);
                    console.log(`Image ${index} opacity:`, window.getComputedStyle(img).opacity);
                    console.log(`Image ${index} naturalWidth:`, img.naturalWidth, 'naturalHeight:', img.naturalHeight);
                    
                    // Check if blob URL is still valid
                    if (img.src.startsWith('blob:')) {
                        const testImg = new Image();
                        testImg.onload = () => console.log(`Image ${index} blob URL is valid and loadable`);
                        testImg.onerror = () => console.error(`Image ${index} blob URL is invalid or revoked`);
                        testImg.src = img.src;
                    }
                });
            } else {
                console.error('File preview container disappeared after 1 second!');
            }
        }, 1000);
        
        // Debug: Add MutationObserver to track container removal
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.classList && node.classList.contains('file-previews')) {
                            console.error('File preview container was removed by:', mutation.target);
                            console.error('Mutation type:', mutation.type);
                            console.error('Target element:', mutation.target.tagName, mutation.target.className);
                            console.trace('Container removal stack trace');
                        }
                    });
                    
                    // Also check for any changes to the container's parent
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const existingContainer = node.querySelector('.file-previews');
                            if (existingContainer) {
                                console.log('File preview container found in added node:', node.tagName, node.className);
                            }
                        }
                    });
                }
                
                // Track attribute changes that might affect visibility
                if (mutation.type === 'attributes' && mutation.target.classList && mutation.target.classList.contains('file-previews')) {
                    console.log('File preview container attribute changed:', mutation.attributeName, 'new value:', mutation.target.getAttribute(mutation.attributeName));
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        
    } else {
        console.error('Could not find chat form or its parent for file preview insertion');
    }
}

/**
 * Removes a file preview and the corresponding file
 * @param {number} fileIndex - Index of the file to remove
 * @param {string} fileName - Name of the file to remove
 */
function removeFilePreview(fileIndex, fileName) {
    console.log(`removeFilePreview called for file: ${fileName}, index: ${fileIndex}`);
    
    // Clean up blob URL for the file being removed
    if (uploadedFiles[fileIndex] && uploadedFiles[fileIndex].blobUrl) {
        URL.revokeObjectURL(uploadedFiles[fileIndex].blobUrl);
        console.log(`Revoked blob URL for removed file: ${fileName}`);
    }
    
    // Remove from uploadedFiles array
    uploadedFiles = uploadedFiles.filter((file, index) => index !== fileIndex);
    console.log(`uploadedFiles length after removal: ${uploadedFiles.length}`);
    
    // Remove the file preview container if no files left
    if (uploadedFiles.length === 0) {
        console.log('No files left, removing file preview container');
        const container = document.querySelector('.file-previews');
        if (container) {
            container.remove();
            console.log('File preview container removed');
        }
    } else {
        // Recreate the previews with updated indices
        createFilePreviewsContainer(uploadedFiles);
    }
    
    console.log(`Removed file: ${fileName}`);
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
            
            // Check file types by extension and MIME type
            const fileNameLower = file.name.toLowerCase();
            const isPdfFile = fileNameLower.endsWith('.pdf') || (file.type && file.type === 'application/pdf');
            const isDocxFile = fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc');
            const isImageFile = (file.type && file.type.startsWith('image/')) || 
                               ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileNameLower.endsWith(ext));
            
            // Define text file types
            const textFileTypes = [
                'text/', 
                'application/json', 
                'application/javascript', 
                'application/typescript',
                'application/xml', 
                'application/x-sh', 
                'application/xhtml+xml'
            ];
            
            // Define text file extensions
            const textFileExtensions = [
                '.txt', '.json', '.md', '.py', '.js', '.ts', '.jsx', '.tsx', 
                '.sh', '.c', '.cpp', '.h', '.hpp', '.yaml', '.yml', '.html', 
                '.css', '.svg', '.csv', '.log', '.java', '.php', '.rb', '.go', 
                '.rs', '.toml', '.ini', '.config', '.sql'
            ];
            
            // Check if it's a text file based on type or extension
            const isTextTypeByMimeType = textFileTypes.some(type => file.type && file.type.startsWith(type));
            const isTextTypeByExtension = textFileExtensions.some(ext => fileNameLower.endsWith(ext));
            const isTextFile = isTextTypeByMimeType || isTextTypeByExtension;
            
            console.log(`File ${file.name} classification: isPdf=${isPdfFile}, isDocx=${isDocxFile}, isImage=${isImageFile}, isTextByMime=${isTextTypeByMimeType}, isTextByExt=${isTextTypeByExtension}`);
            
            if (isImageFile) {
                // Process image files as base64
                readAsDataURL(file).then(async (base64Content) => {
                    console.log(`Successfully read image content from ${file.name}, base64 length: ${base64Content.length}`);
                    
                    // Check if this is a WebP image and convert it to PNG for better compatibility
                    let finalContent = base64Content;
                    if (base64Content.startsWith('data:image/webp')) {
                        try {
                            console.log(`Detected WebP image ${file.name}, converting to PNG for API compatibility`);
                            // Check if convertWebPToPNG function is available
                            if (typeof convertWebPToPNG === 'function') {
                                finalContent = await convertWebPToPNG(base64Content);
                                console.log(`Successfully converted WebP ${file.name} to PNG`);
                            } else {
                                console.warn(`convertWebPToPNG function not available for ${file.name}, using original WebP`);
                            }
                        } catch (conversionError) {
                            console.warn(`Failed to convert WebP image ${file.name} to PNG, using original:`, conversionError);
                            // Keep the original WebP content if conversion fails
                            finalContent = base64Content;
                        }
                    }
                    
                    // Validate and clean the base64 data URL for all images
                    try {
                        finalContent = validateBase64DataURL(finalContent);
                        console.log(`Validated base64 data URL for ${file.name}`);
                    } catch (validationError) {
                        console.warn(`Failed to validate base64 data URL for ${file.name}:`, validationError);
                    }
                    
                    resolve({
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: finalContent,
                        isImage: true
                    });
                }).catch(error => {
                    console.error(`Error reading image from ${file.name}:`, error);
                    resolve({
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: `[Failed to read image: ${error.message}]`,
                        isImage: true
                    });
                });
            } else if (isPdfFile) {
                // Process PDF files using PDF.js
                extractPdfText(file).then(content => {
                    console.log(`Successfully extracted PDF content from ${file.name}, length: ${content.length}`);
                    
                    // Check if the content looks like an error message
                    if (content.includes('[Failed to extract PDF content:') || content.length < 50) {
                        console.warn(`PDF extraction may have failed for ${file.name}, content length: ${content.length}`);
                        console.warn(`Content preview: ${content.substring(0, 100)}`);
                    }
                    
                    resolve({
                        name: file.name,
                        type: file.type || 'application/pdf',
                        content: content
                    });
                }).catch(error => {
                    console.error(`Error extracting PDF content from ${file.name}:`, error);
                    
                    // Try a simple text extraction as fallback
                    console.log(`Attempting text fallback for PDF ${file.name}...`);
                    readAsText(file).then(textContent => {
                        console.log(`Text fallback for PDF ${file.name} returned ${textContent.length} characters`);
                        
                        // Check if the text content contains any readable text
                        const hasReadableText = textContent.length > 100 && 
                                              /[a-zA-Z]{3,}/.test(textContent) && 
                                              !textContent.includes('PDF') || textContent.includes('%PDF');
                        
                        resolve({
                            name: file.name,
                            type: file.type || 'application/pdf',
                            content: hasReadableText ? 
                                `[PDF processed as raw text - may contain formatting artifacts and binary data]\n\n${textContent.substring(0, 5000)}${textContent.length > 5000 ? '\n\n[Content truncated due to length...]' : ''}` :
                                `[Failed to extract PDF content: ${error.message}. This appears to be an image-based PDF. OCR (Optical Character Recognition) processing will be attempted automatically for image-based PDFs.]`
                        });
                    }).catch(textError => {
                        console.error(`Text fallback also failed for ${file.name}:`, textError);
                        resolve({
                            name: file.name,
                            type: file.type || 'application/pdf',
                            content: `[Failed to extract PDF content: ${error.message}. Text fallback also failed: ${textError.message}. This PDF may be image-based, encrypted, or corrupted. OCR processing will be attempted if possible.]`
                        });
                    });
                });
            } else if (isDocxFile) {
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
            } else if (isTextFile || !file.type) {
                // Read as text for all text file types - also default to text for unknown types
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
                // For unsupported types, try to read as text anyway as a fallback
                console.log(`Unsupported file type: ${file.type} for ${file.name}, trying text fallback`);
                readAsText(file).then(content => {
                    console.log(`Fallback text read successful for ${file.name}, length: ${content.length}`);
                    resolve({
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: content
                    });
                }).catch(error => {
                    console.error(`Fallback text read failed for ${file.name}:`, error);
                    // Return an empty string as content if we can't read the file
                    resolve({
                        name: file.name,
                        type: file.type || inferFileType(file.name),
                        content: `[Unable to read file content: ${error.message}]`
                    });
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
 * Read a file as data URL (base64)
 * @param {File} file - The file to read
 * @returns {Promise<string>} - Base64 data URL content of the file
 */
function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        // If file is not a Blob (e.g., not a real File object), we can't use FileReader
        if (!(file instanceof Blob)) {
            console.error(`File ${file.name} is not a Blob, cannot use FileReader for data URL`);
            reject(new Error('Input is not a Blob. Cannot use FileReader for data URL.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const dataUrl = e.target.result;
                console.log(`Successfully read ${file.name} as data URL, length: ${dataUrl.length}`);
                resolve(dataUrl);
            } catch (error) {
                console.error(`Error in FileReader onload for data URL ${file.name}:`, error);
                reject(error);
            }
        };
        
        reader.onerror = function(e) {
            console.error(`FileReader error for data URL ${file.name}:`, e);
            reject(new Error(`FileReader error: ${e.target.error}`));
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(`Error initiating readAsDataURL for ${file.name}:`, error);
            reject(error);
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
    console.log('resetUploadedFiles called - clearing uploaded files array');
    console.trace('resetUploadedFiles call stack');
    // Clean up any blob URLs and object references
    uploadedFiles.forEach(file => {
        if (file.objectUrl) {
            URL.revokeObjectURL(file.objectUrl);
        }
        if (file.blobUrl) {
            URL.revokeObjectURL(file.blobUrl);
        }
        if (file.blob) {
            file.blob = null;
        }
        if (file.arrayBuffer) {
            file.arrayBuffer = null;
        }
        // Track cleanup for memory manager
        memoryManager.trackFileReference(`file_${file.name}_${Date.now()}`, {
            element: null,
            objectUrl: file.objectUrl || file.blobUrl,
            blob: file.blob
        });
    });
    
    uploadedFiles = [];
    console.log('uploadedFiles array cleared in resetUploadedFiles');
    uploadedFileIds = [];
    
    // Clear processing files
    processingFiles.clear();
    
    if (localFileInput) {
        localFileInput.value = '';
    }
    
    // Remove file preview container
    const filePreviewsContainer = document.querySelector('.file-previews');
    if (filePreviewsContainer) {
        filePreviewsContainer.remove();
    }
    
    // console.log('Uploaded files reset and memory cleaned up');
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
        
        // PDF files
        if (fileName.endsWith('.pdf')) {
            console.log(`Processing ${file.name} as PDF document`);
            return await extractPdfText(file);
        }
        
        // DOCX files
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            console.log(`Processing ${file.name} as DOCX document`);
            return await extractDocxText(file);
        }
        
        // For all other file types, try to read as text
        console.log(`Processing ${file.name} as text file`);
        try {
            return await readAsText(file);
        } catch (error) {
            console.error(`Error reading ${file.name} as text:`, error);
            return `[Error reading file: ${error.message}]`;
        }
        
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
        
        // Build the formatted context for the LLM with very clear attachment markers
        const totalFiles = extractionResults.length;
        const fileTypes = extractionResults.map(r => r.type.includes('pdf') ? 'PDF' : 
                                                    r.type.includes('word') || r.name.toLowerCase().includes('doc') ? 'Word Document' :
                                                    r.type.includes('text') ? 'Text File' : 'Document').join(', ');
        
        let formattedContext = `📎 ATTACHMENTS: ${totalFiles} file(s) attached (${fileTypes})\n`;
        formattedContext += "=".repeat(60) + "\n\n";
        
        extractionResults.forEach((result, index) => {
            // Determine file type for display
            let fileTypeDisplay = 'Document';
            if (result.isImage) {
                fileTypeDisplay = 'Image';
            } else if (result.type === 'application/pdf' || result.name.toLowerCase().endsWith('.pdf')) {
                fileTypeDisplay = 'PDF Document';
            } else if (result.type.includes('word') || result.name.toLowerCase().includes('doc')) {
                fileTypeDisplay = 'Word Document';
            } else if (result.type.includes('text')) {
                fileTypeDisplay = 'Text File';
            }
            
            formattedContext += `📄 ATTACHMENT ${index + 1}: ${fileTypeDisplay}\n`;
            formattedContext += `📝 Filename: ${result.name}\n`;
            formattedContext += `📋 Content Type: ${result.type}\n`;
            
            // Handle image files differently
            if (result.isImage) {
                formattedContext += `🖼️ Image Content: Base64 encoded image data (${result.content.length} characters)\n`;
                formattedContext += `ℹ️ Note: This image is attached for vision-capable models.\n`;
                formattedContext += "─".repeat(50) + "\n";
                formattedContext += "=".repeat(60) + "\n\n";
                return; // Skip the normal content processing for images
            }
            
            // More conservative content length limits for better API compatibility
            let maxContentLength = 50000; // Reduced from 100000 to be more conservative
            
            // For PDFs, be even more conservative as they tend to have dense content
            if (result.type === 'application/pdf' || result.name.toLowerCase().endsWith('.pdf')) {
                maxContentLength = 30000; // Further reduced for PDFs
            }
            
            const wasContentTruncated = result.content.length > maxContentLength;
            const displayContent = wasContentTruncated ? result.content.substring(0, maxContentLength) : result.content;
            
            formattedContext += `📊 Content Length: ${wasContentTruncated ? `${maxContentLength} chars (truncated from ${result.content.length})` : `${result.content.length} chars (complete)`}\n`;
            formattedContext += "─".repeat(50) + "\n";
            formattedContext += "CONTENT:\n";
            formattedContext += "```\n";
            formattedContext += displayContent;
            
            if (wasContentTruncated) {
                formattedContext += `\n\n⚠️ [CONTENT TRUNCATED: Original document had ${result.content.length} characters. Showing first ${maxContentLength} characters for analysis.]`;
                
                // Add a brief summary of what was truncated
                const remainingLength = result.content.length - maxContentLength;
                if (remainingLength > 1000) {
                    formattedContext += `\n💡 [NOTE: ${remainingLength} additional characters contain more content from this document.]`;
                }
            }
            
            formattedContext += "\n```\n";
            formattedContext += "=".repeat(60) + "\n\n";
        });
        
        formattedContext += `✅ Total ${totalFiles} attachment(s) processed and ready for analysis.\n`;
        formattedContext += `💬 Please analyze the attached ${fileTypes.toLowerCase()} and respond to the user's question.\n\n`;
        
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
    
    const mimeTypes = {
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'csv': 'text/csv',
        'md': 'text/markdown',
        'py': 'text/x-python',
        'java': 'text/x-java',
        'c': 'text/x-c',
        'cpp': 'text/x-c++',
        'h': 'text/x-c',
        'rb': 'text/x-ruby',
        'php': 'text/x-php',
        'go': 'text/x-go',
        'rs': 'text/x-rust',
        'sh': 'text/x-shellscript',
        'yaml': 'text/yaml',
        'yml': 'text/yaml',
        'toml': 'text/toml',
        'ini': 'text/ini',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Image types
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Removes a file from the uploadedFiles array by file name
 * @param {string} fileName - The name of the file to remove
 */
export function removeUploadedFileByName(fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
}

/**
 * Convert WebP image data URL to PNG data URL for better API compatibility
 * @param {string} webpDataUrl - The WebP data URL
 * @returns {Promise<string>} - PNG data URL
 */
export async function convertWebPToPNG(webpDataUrl) {
    console.log('Starting WebP to PNG conversion, input length:', webpDataUrl.length);
    return new Promise((resolve, reject) => {
        try {
            // Create an image element to load the WebP
            const img = new Image();
            
            img.onload = function() {
                try {
                    // Create a canvas to convert the image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions to match the image
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw the image onto the canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas to PNG data URL
                    const pngDataUrl = canvas.toDataURL('image/png');
                    
                    console.log(`Successfully converted WebP to PNG, original: ${webpDataUrl.length} chars, converted: ${pngDataUrl.length} chars`);
                    resolve(pngDataUrl);
                } catch (error) {
                    console.error('Error converting WebP to PNG:', error);
                    reject(error);
                }
            };
            
            img.onerror = function(error) {
                console.error('Error loading WebP image for conversion:', error);
                reject(new Error('Failed to load WebP image for conversion'));
            };
            
            // Load the WebP image
            img.src = webpDataUrl;
        } catch (error) {
            console.error('Error in WebP to PNG conversion setup:', error);
            reject(error);
        }
    });
}

/**
 * Validate and fix base64 data URL format
 * @param {string} dataUrl - The data URL to validate
 * @returns {string} - Validated and potentially fixed data URL
 */
export function validateBase64DataURL(dataUrl) {
    try {
        // Check if it's a valid data URL format
        if (!dataUrl.startsWith('data:')) {
            throw new Error('Invalid data URL format - missing data: prefix');
        }
        
        // Split the data URL into parts
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            throw new Error('Invalid data URL format - missing comma separator');
        }
        
        const [header, base64Data] = parts;
        
        // Validate the header format
        if (!header.includes('base64')) {
            throw new Error('Invalid data URL format - missing base64 declaration');
        }
        
        // Validate that the base64 data is properly formatted
        // Remove any whitespace or newlines that might have been added
        const cleanBase64 = base64Data.replace(/\s/g, '');
        
        // Check if the base64 string is valid
        try {
            // Try to decode the base64 to validate it
            atob(cleanBase64);
        } catch (base64Error) {
            throw new Error(`Invalid base64 data: ${base64Error.message}`);
        }
        
        // Return the cleaned data URL
        return `${header},${cleanBase64}`;
        
    } catch (error) {
        console.error('Base64 data URL validation failed:', error);
        // Return the original if validation fails
        return dataUrl;
    }
}
