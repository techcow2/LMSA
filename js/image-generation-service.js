import { debugLog } from './utils.js';

/**
 * Generates an image from a text prompt using the Pollinations.ai API
 * @param {string} prompt - The text description for the image
 * @returns {Promise<string>} - The URL of the generated image
 */
export async function generateImage(prompt) {
    try {
        // Encode the prompt for URL
        const encodedPrompt = encodeURIComponent(prompt);

        // Build the API URL with nologo and private parameters
        // nologo=true removes watermark, private=true hides from public feeds
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&private=true&width=1024&height=1024`;

        console.log('Generating image with prompt:', prompt);
        console.log('Pollinations URL:', pollinationsUrl);

        // Fetch the image to ensure it's generated and accessible
        console.log('Fetching image to verify generation...');
        const response = await fetch(pollinationsUrl);

        if (!response.ok) {
            throw new Error(`Image generation failed with status: ${response.status}`);
        }

        console.log('Image fetched successfully');

        // Convert to blob and create an object URL for local display
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        console.log('Blob URL created:', blobUrl);

        // Return both URLs - blob for immediate display, pollinations for saving
        return {
            blobUrl: blobUrl,
            pollinationsUrl: pollinationsUrl
        };
    } catch (error) {
        console.error('Error generating image:', error);
        throw new Error('Failed to generate image: ' + error.message);
    }
}

/**
 * Validates if a message is an image generation command
 * @param {string} message - The message to validate
 * @returns {Object|null} - Object with { isImageCommand: true, prompt: string } or null
 */
export function parseImageCommand(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }

    const trimmedMessage = message.trim();

    // Check if message starts with /image
    if (trimmedMessage.toLowerCase().startsWith('/image ')) {
        const prompt = trimmedMessage.substring(7).trim(); // Remove '/image ' prefix

        if (prompt.length > 0) {
            return {
                isImageCommand: true,
                prompt: prompt
            };
        }
    }

    return null;
}

/**
 * Downloads an image from URL and triggers browser download
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - The filename for the downloaded image
 */
export async function downloadImage(imageUrl, filename = 'generated-image.jpg') {
    try {
        debugLog('Downloading image from:', imageUrl);

        // Check if we're in Android WebView and have native file operations available
        if (window.AndroidFileOps && typeof window.AndroidFileOps.saveImageFile === 'function') {
            debugLog('Using Android native image saving');
            
            // Fetch the image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }

            // Convert to blob
            const blob = await response.blob();

            // Convert blob to base64
            const reader = new FileReader();
            reader.onload = function() {
                const base64Data = reader.result; // This includes the data:image/jpeg;base64, prefix
                
                // Set up callback for Android save result
                window.onImageSaved = function(success) {
                    if (success) {
                        debugLog('Image saved successfully via Android native interface');
                    } else {
                        debugLog('Failed to save image via Android native interface');
                        // Fallback to browser download
                        fallbackBrowserDownload(imageUrl, filename);
                    }
                    // Clean up callback
                    delete window.onImageSaved;
                };

                // Call Android native save method
                window.AndroidFileOps.saveImageFile(base64Data, filename);
            };
            reader.onerror = function() {
                debugLog('Error converting image to base64, falling back to browser download');
                fallbackBrowserDownload(imageUrl, filename);
            };
            reader.readAsDataURL(blob);
            
        } else {
            // Fallback to browser download for non-Android or older versions
            debugLog('Using browser download fallback');
            await fallbackBrowserDownload(imageUrl, filename);
        }

    } catch (error) {
        debugLog('Error downloading image:', error);
        throw new Error('Failed to download image: ' + error.message);
    }
}

/**
 * Fallback browser download method
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - The filename for the downloaded image
 */
async function fallbackBrowserDownload(imageUrl, filename) {
    try {
        // Fetch the image
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }

        // Convert to blob
        const blob = await response.blob();

        // Create a temporary URL for the blob
        const blobUrl = URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        debugLog('Image downloaded successfully via browser');
    } catch (error) {
        debugLog('Error in fallback browser download:', error);
        throw error;
    }
}
