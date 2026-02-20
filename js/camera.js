/**
 * Gestion webcam
 */

class CameraManager {
    constructor() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isActive = false;
    }

    /**
     * Démarre la webcam
     */
    async start() {
        try {
            this.updateStatus('Demande accès caméra...');

            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Caméra arrière sur mobile
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Attendre que la vidéo soit prête
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    resolve();
                };
            });

            // Ajuster canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.isActive = true;
            this.updateStatus('✅ Caméra active');
            wsManager.log('📷 Webcam démarrée', 'success');

            return true;

        } catch (error) {
            console.error('Erreur accès caméra:', error);
            
            let errorMsg = 'Erreur accès caméra';
            if (error.name === 'NotAllowedError') {
                errorMsg = '❌ Accès caméra refusé';
            } else if (error.name === 'NotFoundError') {
                errorMsg = '❌ Aucune caméra trouvée';
            }

            this.updateStatus(errorMsg);
            wsManager.log(errorMsg, 'error');
            
            return false;
        }
    }

    /**
     * Arrête la webcam
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
            this.isActive = false;
            this.updateStatus('Caméra arrêtée');
            wsManager.log('📷 Webcam arrêtée', 'info');
        }
    }

    /**
     * Capture frame courante
     */
    captureFrame() {
        if (!this.isActive) {
            wsManager.log('❌ Caméra non active', 'error');
            return null;
        }

        try {
            // Canvas temporaire pour capture
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = this.video.videoWidth;
            captureCanvas.height = this.video.videoHeight;
            
            const captureCtx = captureCanvas.getContext('2d');
            captureCtx.drawImage(this.video, 0, 0);

            // Conversion base64 (JPEG quality 85%)
            const base64 = captureCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

            return base64;

        } catch (error) {
            console.error('Erreur capture frame:', error);
            wsManager.log('❌ Erreur capture', 'error');
            return null;
        }
    }

    /**
     * Mise à jour status visuel
     */
    updateStatus(message) {
        const statusEl = document.getElementById('video-status');
        statusEl.innerHTML = message;
    }

    /**
     * Dessine rectangle sur overlay (pour futures détections)
     */
    drawBox(x, y, width, height, label, color = '#3b82f6') {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);

        // Label
        if (label) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y - 25, label.length * 10 + 10, 25);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(label, x + 5, y - 7);
        }
    }

    /**
     * Efface overlay
     */
    clearOverlay() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Instance globale
const cameraManager = new CameraManager();