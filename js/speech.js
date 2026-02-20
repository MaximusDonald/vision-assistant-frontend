/**
 * Reconnaissance vocale (Speech Recognition API)
 */

class SpeechManager {
    constructor() {
        // Vérification support navigateur
        this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.isSupported = !!this.SpeechRecognition;
        
        if (this.isSupported) {
            this.recognition = new this.SpeechRecognition();
            this.recognition.lang = 'fr-FR';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
        }

        this.isListening = false;
    }

    /**
     * Démarre reconnaissance vocale
     */
    start() {
        if (!this.isSupported) {
            wsManager.log('❌ Reconnaissance vocale non supportée', 'error');
            alert('Votre navigateur ne supporte pas la reconnaissance vocale.\nUtilisez Chrome ou Edge.');
            return Promise.reject('Not supported');
        }

        return new Promise((resolve, reject) => {
            this.isListening = true;

            this.recognition.onstart = () => {
                wsManager.log('🎤 Écoute en cours...', 'info');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;

                wsManager.log(`📝 Reconnu: "${transcript}" (${Math.round(confidence * 100)}%)`, 'success');
                
                this.isListening = false;
                resolve(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                
                let errorMsg = 'Erreur reconnaissance vocale';
                
                if (event.error === 'no-speech') {
                    errorMsg = 'Aucune parole détectée';
                } else if (event.error === 'audio-capture') {
                    errorMsg = 'Microphone non accessible';
                } else if (event.error === 'not-allowed') {
                    errorMsg = 'Accès microphone refusé';
                }

                wsManager.log(`❌ ${errorMsg}`, 'error');
                
                this.isListening = false;
                reject(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
            };

            try {
                this.recognition.start();
            } catch (error) {
                this.isListening = false;
                reject(error);
            }
        });
    }

    /**
     * Arrête reconnaissance
     */
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }
}

// Instance globale
const speechManager = new SpeechManager();