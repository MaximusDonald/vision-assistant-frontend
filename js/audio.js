/**
 * Gestion lecture audio
 */

class AudioManager {
    constructor() {
        this.player = document.getElementById('audio-player');
        this.currentAudio = null;
        this.isPlaying = false;
    }

    /**
     * Joue audio depuis base64
     */
    play(base64Audio) {
        try {
            // Conversion base64 → blob
            const audioBlob = this.base64ToBlob(base64Audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);

            // Nettoyage ancien audio
            if (this.currentAudio) {
                URL.revokeObjectURL(this.currentAudio);
            }

            this.currentAudio = audioUrl;
            this.player.src = audioUrl;

            // Lecture
            this.player.play();
            this.isPlaying = true;

            wsManager.log('🔊 Lecture audio...', 'info');

            // Event fin lecture
            this.player.onended = () => {
                this.isPlaying = false;
                wsManager.log('🔇 Audio terminé', 'info');
            };

            return true;

        } catch (error) {
            console.error('Erreur lecture audio:', error);
            wsManager.log('❌ Erreur lecture audio', 'error');
            return false;
        }
    }

    /**
     * Arrête lecture
     */
    stop() {
        this.player.pause();
        this.player.currentTime = 0;
        this.isPlaying = false;
    }

    /**
     * Conversion base64 → Blob
     */
    base64ToBlob(base64, contentType = '') {
        const byteCharacters = atob(base64);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    }

    /**
     * Sauvegarde dernier audio pour replay
     */
    saveLastAudio(base64Audio) {
        this.lastAudio = base64Audio;
        
        // Active bouton replay
        const btnReplay = document.getElementById('btn-replay-audio');
        btnReplay.disabled = false;
    }

    /**
     * Replay dernier audio
     */
    replayLast() {
        if (this.lastAudio) {
            this.play(this.lastAudio);
        } else {
            wsManager.log('❌ Aucun audio à rejouer', 'warning');
        }
    }
}

// Instance globale
const audioManager = new AudioManager();