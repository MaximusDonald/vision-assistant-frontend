/**
 * Application principale - Orchestration
 */

class VisionAssistantApp {
    constructor() {
        // Stats
        this.stats = {
            framesAnalyzed: 0,
            geminiCalls: 0,
            framesSkipped: 0,
            questionsAsked: 0,
            totalProcessingTime: 0
        };

        // État
        this.isStreaming = false;
        this.streamInterval = null;
        this.fps = 1; // Frames par seconde

        // Éléments DOM
        this.initDOMElements();

        // Event listeners
        this.initEventListeners();

        // WebSocket listeners
        this.initWebSocketListeners();
    }

    /**
     * Initialisation éléments DOM
     */
    initDOMElements() {
        // Boutons
        this.btnToggleStream = document.getElementById('btn-toggle-stream');
        this.btnCapture = document.getElementById('btn-capture');
        this.btnForce = document.getElementById('btn-force');
        this.btnSendQuestion = document.getElementById('btn-send-question');
        this.btnVoiceQuestion = document.getElementById('btn-voice-question');
        this.btnReplayAudio = document.getElementById('btn-replay-audio');
        this.btnHighContrast = document.getElementById('btn-high-contrast');
        this.btnClearLogs = document.getElementById('btn-clear-logs');

        // Inputs
        this.questionInput = document.getElementById('question-input');
        this.fpsSlider = document.getElementById('fps-slider');
        this.fpsValue = document.getElementById('fps-value');

        // Display
        this.lastDescription = document.getElementById('last-description');
        this.answerContainer = document.getElementById('answer-container');
        this.answerText = document.getElementById('answer-text');

        // Stats
        this.statFrames = document.getElementById('stat-frames');
        this.statGemini = document.getElementById('stat-gemini');
        this.statSkipped = document.getElementById('stat-skipped');
        this.statQuestions = document.getElementById('stat-questions');
        this.statAvgTime = document.getElementById('stat-avg-time');
    }

    /**
     * Initialisation event listeners
     */
    initEventListeners() {
        // Toggle stream
        this.btnToggleStream.addEventListener('click', () => {
            if (this.isStreaming) {
                this.stopStream();
            } else {
                this.startStream();
            }
        });

        // Capture manuelle
        this.btnCapture.addEventListener('click', () => {
            this.captureAndSend(false);
        });

        // Force capture
        this.btnForce.addEventListener('click', () => {
            this.captureAndSend(true);
        });

        // Question texte
        this.btnSendQuestion.addEventListener('click', () => {
            this.sendQuestion();
        });

        // Question vocale
        this.btnVoiceQuestion.addEventListener('click', () => {
            this.askVoiceQuestion();
        });

        // Entrée clavier pour question
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendQuestion();
            }
        });

        // Replay audio
        this.btnReplayAudio.addEventListener('click', () => {
            audioManager.replayLast();
        });

        // FPS slider
        this.fpsSlider.addEventListener('input', (e) => {
            this.fps = parseFloat(e.target.value);
            this.fpsValue.textContent = `${this.fps} FPS`;

            // Redémarre stream si actif
            if (this.isStreaming) {
                this.stopStream();
                setTimeout(() => this.startStream(), 100);
            }
        });

        // High contrast
        this.btnHighContrast.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
        });

        // Clear logs
        this.btnClearLogs.addEventListener('click', () => {
            const logsContainer = document.getElementById('logs-container');
            logsContainer.innerHTML = '<div class="text-gray-500">Logs effacés</div>';
        });
    }

    /**
     * Initialisation listeners WebSocket
     */
    initWebSocketListeners() {
        // Connexion établie
        wsManager.on('connected', () => {
            this.enableControls(true);
        });

        // Déconnexion
        wsManager.on('disconnected', () => {
            this.enableControls(false);
            this.stopStream();
        });

        // Frame traitée
        wsManager.on('frame_processed', (data) => {
            this.handleFrameProcessed(data);
        });

        // Question répondue
        wsManager.on('question_answered', (data) => {
            this.handleQuestionAnswered(data);
        });

        // Erreur
        wsManager.on('error', (data) => {
            alert(`Erreur: ${data.message}`);
        });
    }

    /**
     * Active/désactive contrôles
     */
    enableControls(enabled) {
        this.btnToggleStream.disabled = !enabled;
        this.btnCapture.disabled = !enabled;
        this.btnForce.disabled = !enabled;
        this.btnSendQuestion.disabled = !enabled;
        this.btnVoiceQuestion.disabled = !enabled;
        this.questionInput.disabled = !enabled;
    }

    /**
     * Démarre le stream automatique
     */
    async startStream() {
        // Démarre caméra si pas déjà fait
        if (!cameraManager.isActive) {
            const success = await cameraManager.start();
            if (!success) return;
        }

        this.isStreaming = true;

        // Update UI
        this.btnToggleStream.innerHTML = '<i class="fas fa-stop"></i><span>Arrêter l\'analyse</span>';
        this.btnToggleStream.classList.remove('bg-primary', 'hover:bg-blue-600');
        this.btnToggleStream.classList.add('bg-red-500', 'hover:bg-red-600');

        wsManager.log('▶️ Stream démarré', 'success');

        // Intervalle capture
        const intervalMs = 1000 / this.fps;
        this.streamInterval = setInterval(() => {
            this.captureAndSend(false);
        }, intervalMs);
    }

    /**
     * Arrête le stream
     */
    stopStream() {
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }

        this.isStreaming = false;

        // Update UI
        this.btnToggleStream.innerHTML = '<i class="fas fa-play"></i><span>Démarrer l\'analyse</span>';
        this.btnToggleStream.classList.remove('bg-red-500', 'hover:bg-red-600');
        this.btnToggleStream.classList.add('bg-primary', 'hover:bg-blue-600');

        wsManager.log('⏸️ Stream arrêté', 'info');
    }

    /**
     * Capture et envoie frame
     */
    captureAndSend(force = false) {
        const frameBase64 = cameraManager.captureFrame();
        
        if (!frameBase64) {
            wsManager.log('❌ Impossible de capturer la frame', 'error');
            return;
        }

        // Envoi WebSocket
        const success = wsManager.send({
            type: 'frame',
            image_base64: frameBase64,
            force: force,
            timestamp: Date.now()
        });

        if (success) {
            wsManager.log(`📤 Frame envoyée ${force ? '(forcée)' : ''}`, 'info');
        }
    }

    /**
     * Gère réponse frame
     */
    handleFrameProcessed(data) {
        // Update stats
        this.stats.framesAnalyzed++;
        this.statFrames.textContent = this.stats.framesAnalyzed;

        if (data.status === 'processed') {
            // Gemini call
            this.stats.geminiCalls++;
            this.statGemini.textContent = this.stats.geminiCalls;

            // Description
            if (data.description) {
                this.updateDescription(data.description);
                wsManager.log(`📝 ${data.description}`, 'success');
            }

            // Audio
            if (data.audio_base64) {
                audioManager.play(data.audio_base64);
                audioManager.saveLastAudio(data.audio_base64);
            }

            // Temps traitement
            this.stats.totalProcessingTime += data.processing_time_ms;
            const avgTime = Math.round(this.stats.totalProcessingTime / this.stats.geminiCalls);
            this.statAvgTime.textContent = `${avgTime} ms`;

            wsManager.log(`⏱️ Traité en ${data.processing_time_ms}ms`, 'info');

        } else if (data.status === 'skipped') {
            // Frame skipped
            this.stats.framesSkipped++;
            this.statSkipped.textContent = this.stats.framesSkipped;

            wsManager.log(`⏭️ Frame ignorée (diff: ${data.difference_score})`, 'warning');
        }
    }

    /**
     * Met à jour description affichée
     */
    updateDescription(text) {
        this.lastDescription.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas fa-comment-dots text-primary text-2xl mt-1"></i>
                <p class="text-gray-800 text-lg flex-1">${text}</p>
            </div>
        `;
    }

    /**
     * Envoie question textuelle
     */
    sendQuestion() {
        const question = this.questionInput.value.trim();

        if (!question) {
            wsManager.log('❌ Question vide', 'warning');
            return;
        }

        // Envoi WebSocket
        const success = wsManager.send({
            type: 'question',
            question_text: question
        });

        if (success) {
            wsManager.log(`❓ Question: "${question}"`, 'info');
            this.questionInput.value = '';
            this.btnSendQuestion.disabled = true;
            this.btnSendQuestion.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Envoi...</span>';
        }
    }

    /**
     * Question vocale
     */
    async askVoiceQuestion() {
        // Update UI
        this.btnVoiceQuestion.disabled = true;
        this.btnVoiceQuestion.classList.add('recording');
        this.btnVoiceQuestion.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Parlez maintenant...</span>';

        try {
            const transcript = await speechManager.start();

            // Remplir input
            this.questionInput.value = transcript;

            // Envoyer automatiquement
            this.sendQuestion();

        } catch (error) {
            console.error('Erreur reconnaissance vocale:', error);
        } finally {
            // Reset UI
            this.btnVoiceQuestion.disabled = false;
            this.btnVoiceQuestion.classList.remove('recording');
            this.btnVoiceQuestion.innerHTML = '<i class="fas fa-microphone"></i><span>Question vocale</span>';
        }
    }

    /**
     * Gère réponse question
     */
    handleQuestionAnswered(data) {
        // Update stats
        this.stats.questionsAsked++;
        this.statQuestions.textContent = this.stats.questionsAsked;

        // Affiche réponse
        this.answerText.textContent = data.answer;
        this.answerContainer.classList.remove('hidden');

        wsManager.log(`✅ Réponse: "${data.answer}"`, 'success');

        // Audio
        if (data.audio_base64) {
            audioManager.play(data.audio_base64);
            audioManager.saveLastAudio(data.audio_base64);
        }

        // Reset bouton
        this.btnSendQuestion.disabled = false;
        this.btnSendQuestion.innerHTML = '<i class="fas fa-paper-plane"></i><span>Envoyer</span>';

        // Cache réponse après 10s
        setTimeout(() => {
            this.answerContainer.classList.add('hidden');
        }, 10000);
    }

    /**
     * Initialisation app
     */
    async init() {
        wsManager.log('🚀 Vision Assistant démarré', 'success');
        wsManager.log('Connexion au serveur...', 'info');

        // Connexion WebSocket
        wsManager.connect();

        // Keep-alive
        wsManager.startKeepAlive();

        // Demande accès caméra
        const cameraSuccess = await cameraManager.start();
        
        if (cameraSuccess) {
            wsManager.log('✅ Prêt à l\'emploi', 'success');
        }
    }
}

// Initialisation au chargement page
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new VisionAssistantApp();
    app.init();
});

// Nettoyage avant fermeture
window.addEventListener('beforeunload', () => {
    if (app) {
        app.stopStream();
        cameraManager.stop();
        wsManager.disconnect();
    }
});