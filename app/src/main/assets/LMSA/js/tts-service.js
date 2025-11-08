/**
 * Text-to-Speech Service
 * Provides TTS functionality with Android native bridge and Web Speech API fallback
 */

class TTSService {
    constructor() {
        this.isAndroid = typeof AndroidTTS !== 'undefined';
        this.initialized = false;
        this.isInitializing = false;
        this.currentUtterance = null;
        this.speechSynthesis = window.speechSynthesis;
        this.voices = [];
        
        // Don't auto-initialize, let it be called explicitly
        console.log('TTSService created, Android available:', this.isAndroid);
    }

    /**
     * Initialize TTS service
     */
    async initialize() {
        if (this.isInitializing || this.initialized) return;
        
        this.isInitializing = true;
        
        if (this.isAndroid) {
            await this.initializeAndroidTTS();
        } else {
            await this.initializeWebTTS();
        }
        
        this.isInitializing = false;
    }

    /**
     * Initialize Android native TTS
     */
    async initializeAndroidTTS() {
        return new Promise((resolve) => {
            // Check if AndroidTTS is available
            if (typeof AndroidTTS === 'undefined') {
                console.warn('AndroidTTS interface not available');
                this.initialized = false;
                resolve(false);
                return;
            }

            // Set up callback for TTS initialization
            window.onTTSInitialized = (success) => {
                console.log('TTS initialization callback received:', success);
                this.initialized = success;
                if (success) {
                    console.log('Android TTS initialized successfully');
                } else {
                    console.error('Android TTS initialization failed');
                }
                resolve(success);
            };
            
            // Initialize Android TTS
            try {
                console.log('Calling AndroidTTS.initializeTTS()');
                AndroidTTS.initializeTTS();
                
                // Set a timeout in case the callback never comes
                setTimeout(() => {
                    if (!this.initialized) {
                        console.warn('TTS initialization timeout, assuming failure');
                        resolve(false);
                    }
                }, 5000);
            } catch (error) {
                console.error('Error initializing Android TTS:', error);
                this.initialized = false;
                resolve(false);
            }
        });
    }

    /**
     * Initialize Web Speech API TTS
     */
    async initializeWebTTS() {
        if (!this.speechSynthesis) {
            console.warn('Web Speech API not supported');
            return false;
        }

        return new Promise((resolve) => {
            // Load voices
            const loadVoices = () => {
                this.voices = this.speechSynthesis.getVoices();
                if (this.voices.length > 0) {
                    this.initialized = true;
                    console.log('Web Speech API initialized with', this.voices.length, 'voices');
                    resolve(true);
                } else {
                    // Some browsers load voices asynchronously
                    setTimeout(loadVoices, 100);
                }
            };

            // Handle voice changes
            this.speechSynthesis.onvoiceschanged = loadVoices;
            loadVoices();
        });
    }

    /**
     * Speak the given text
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options
     */
    async speak(text, options = {}) {
        if (!text || text.trim().length === 0) {
            console.warn('No text provided for TTS');
            return Promise.resolve(false);
        }

        // Ensure TTS is initialized
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized) {
            console.error('TTS not available');
            return Promise.resolve(false);
        }

        // Stop any current speech
        this.stop();

        if (this.isAndroid) {
            return this.speakAndroid(text, options);
        } else {
            return this.speakWeb(text, options);
        }
    }

    /**
     * Speak using Android native TTS
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options
     */
    speakAndroid(text, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Set language if specified
                if (options.language) {
                    AndroidTTS.setLanguage(options.language);
                }

                // Set speech rate if specified
                if (options.rate) {
                    AndroidTTS.setSpeechRate(options.rate);
                }

                // Set pitch if specified
                if (options.pitch) {
                    AndroidTTS.setPitch(options.pitch);
                }

                // Speak the text
                AndroidTTS.speak(text);
                
                // Poll for completion since Android TTS doesn't provide completion callbacks
                const checkCompletion = () => {
                    try {
                        if (!AndroidTTS.isSpeaking()) {
                            resolve(true);
                        } else {
                            setTimeout(checkCompletion, 100); // Check every 100ms
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                // Start polling after a short delay to ensure TTS has started
                setTimeout(checkCompletion, 200);
                
            } catch (error) {
                console.error('Error speaking with Android TTS:', error);
                reject(error);
            }
        });
    }

    /**
     * Speak using Web Speech API
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options
     */
    speakWeb(text, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                this.currentUtterance = new SpeechSynthesisUtterance(text);
                
                // Set voice options
                this.currentUtterance.lang = options.language || 'en-US';
                this.currentUtterance.rate = options.rate || 1.0;
                this.currentUtterance.pitch = options.pitch || 1.0;
                this.currentUtterance.volume = options.volume || 1.0;

                // Use selected voice or find appropriate voice
                let voice = this.selectedVoice;
                if (!voice) {
                    voice = this.voices.find(v => 
                        v.lang.startsWith(this.currentUtterance.lang.split('-')[0])
                    );
                }
                if (voice) {
                    this.currentUtterance.voice = voice;
                }

                // Set up event handlers
                this.currentUtterance.onstart = () => {
                    console.log('TTS started');
                    if (options.onStart) options.onStart();
                };

                this.currentUtterance.onend = () => {
                    console.log('TTS ended');
                    this.currentUtterance = null;
                    if (options.onEnd) options.onEnd();
                    resolve(true);
                };

                this.currentUtterance.onerror = (event) => {
                    console.error('TTS error:', event.error);
                    this.currentUtterance = null;
                    if (options.onError) options.onError(event.error);
                    reject(event.error);
                };

                // Speak
                this.speechSynthesis.speak(this.currentUtterance);
            } catch (error) {
                console.error('Error speaking with Web Speech API:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.isAndroid) {
            try {
                AndroidTTS.stop();
            } catch (error) {
                console.error('Error stopping Android TTS:', error);
            }
        } else if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
            this.currentUtterance = null;
        }
    }

    /**
     * Check if TTS is currently speaking
     * @returns {boolean}
     */
    isSpeaking() {
        if (this.isAndroid) {
            try {
                return AndroidTTS.isSpeaking();
            } catch (error) {
                console.error('Error checking Android TTS speaking status:', error);
                return false;
            }
        } else if (this.speechSynthesis) {
            return this.speechSynthesis.speaking;
        }
        return false;
    }

    /**
     * Check if TTS service is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Check if TTS is available
     * @returns {boolean}
     */
    isAvailable() {
        if (this.isAndroid) {
            try {
                return typeof AndroidTTS !== 'undefined' && AndroidTTS.isAvailable();
            } catch (error) {
                console.error('Error checking Android TTS availability:', error);
                return false;
            }
        } else {
            return this.speechSynthesis && this.speechSynthesis.getVoices().length > 0;
        }
    }

    /**
     * Get available voices (Web Speech API only)
     * @returns {Array}
     */
    getVoices() {
        if (!this.isAndroid && this.speechSynthesis) {
            return this.voices;
        }
        return [];
    }

    /**
     * Get available voices from Android TTS or Web Speech API
     * @returns {Promise<Array>} Array of voice objects with name, locale, quality info
     */
    async getAvailableVoices() {
        if (this.isAndroid) {
            try {
                // Ensure TTS is initialized first
                if (!this.initialized) {
                    await this.initialize();
                }

                // Wait for Android TTS to be fully ready
                await this.waitForAndroidTTSReady();

                if (typeof AndroidTTS !== 'undefined' && AndroidTTS.getAvailableVoices) {
                    const voicesJSON = AndroidTTS.getAvailableVoices();
                    const voices = JSON.parse(voicesJSON);
                    console.log('Retrieved voices from Android TTS:', voices.length);
                    return voices;
                }
                return [];
            } catch (error) {
                console.error('Error getting Android TTS voices:', error);
                return [];
            }
        } else {
            // Web Speech API
            if (!this.initialized) {
                await this.initialize();
            }

            return this.voices.map(voice => ({
                name: voice.name,
                locale: voice.lang,
                quality: voice.localService ? 'High' : 'Network',
                isNetworkConnectionRequired: !voice.localService
            }));
        }
    }

    /**
     * Wait for Android TTS to be fully ready
     * @returns {Promise} Promise that resolves when TTS is ready
     */
    async waitForAndroidTTSReady() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait time
            
            const checkReady = () => {
                attempts++;
                
                try {
                    if (typeof AndroidTTS !== 'undefined' && AndroidTTS.isReady && AndroidTTS.isReady()) {
                        console.log('Android TTS is ready after', attempts * 100, 'ms');
                        resolve();
                        return;
                    }
                } catch (error) {
                    console.error('Error checking TTS readiness:', error);
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('Timeout waiting for Android TTS to be ready');
                    reject(new Error('TTS initialization timeout'));
                    return;
                }
                
                // Check again after 100ms
                setTimeout(checkReady, 100);
            };
            
            checkReady();
        });
    }

    /**
     * Set the TTS voice
     * @param {string} voiceName - Name of the voice to set
     * @returns {boolean} Success status
     */
    async setVoice(voiceName) {
        if (this.isAndroid) {
            try {
                if (!this.isInitialized) {
                    await this.initialize();
                }
                
                if (typeof AndroidTTS !== 'undefined' && AndroidTTS.setVoice) {
                    return AndroidTTS.setVoice(voiceName);
                }
                return false;
            } catch (error) {
                console.error('Error setting Android TTS voice:', error);
                return false;
            }
        } else {
            // Web Speech API
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const voice = this.voices.find(v => v.name === voiceName);
            if (voice) {
                this.selectedVoice = voice;
                console.log('Voice set to:', voiceName);
                return true;
            } else {
                console.warn('Voice not found:', voiceName);
                return false;
            }
        }
    }

    /**
     * Clean text for TTS (remove markdown, HTML, etc.)
     * @param {string} text - Raw text
     * @returns {string} - Cleaned text
     */
    cleanTextForTTS(text) {
        if (!text) return '';

        return text
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            // Remove markdown bold
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            // Remove markdown italic
            .replace(/\*([^*]+)\*/g, '$1')
            // Replace code blocks with placeholder
            .replace(/```[\s\S]*?```/g, ' Code block. ')
            // Remove inline code backticks
            .replace(/`([^`]+)`/g, '$1')
            // Remove headers
            .replace(/#{1,6}\s*/g, '')
            // Convert links to text only
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove emojis (they cause TTS to stop or produce artifacts)
            // This regex matches most common emoji ranges
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
            // Remove other problematic unicode characters and symbols
            .replace(/[^\w\s.,!?;:()\-'"]/g, ' ')
            // Fix common abbreviations and acronyms
            .replace(/\bAPI\b/g, 'A P I')
            .replace(/\bURL\b/g, 'U R L')
            .replace(/\bHTML\b/g, 'H T M L')
            .replace(/\bCSS\b/g, 'C S S')
            .replace(/\bJS\b/g, 'JavaScript')
            .replace(/\bJSON\b/g, 'J S O N')
            .replace(/\bXML\b/g, 'X M L')
            .replace(/\bSQL\b/g, 'S Q L')
            // Handle numbers and special cases
            .replace(/(\d+)\.(\d+)/g, '$1 point $2')
            .replace(/\b(\d+)%/g, '$1 percent')
            .replace(/\$(\d+)/g, '$1 dollars')
            // Fix punctuation spacing to reduce audio glitches
            .replace(/([.!?])\s*([.!?])/g, '$1 ')
            .replace(/([,;:])\s*([,;:])/g, '$1 ')
            // Add pauses for better speech flow
            .replace(/\.\s+/g, '. ')
            .replace(/!\s+/g, '! ')
            .replace(/\?\s+/g, '? ')
            .replace(/:\s+/g, ': ')
            .replace(/;\s+/g, '; ')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Create global instance
window.TTSService = new TTSService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TTSService;
}