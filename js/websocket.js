/**
 * Gestion WebSocket
 */

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.url = this.getWebSocketUrl();
        this.reconnectDelay = 3000;
        this.reconnectTimer = null;
        this.isManualClose = false;
        this.listeners = {};
    }

    /**
     * Resolve backend WebSocket URL for local/dev/prod
     */
    getWebSocketUrl() {
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';

        if (isLocal) {
            return 'ws://localhost:8000/ws/stream';
        }

        return 'wss://vision-backend.up.railway.app/ws/stream';
    }

    /**
     * Connexion WebSocket
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket deja connecte');
            return;
        }

        this.updateStatus('connecting');
        this.log('Connexion au serveur...', 'info');

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.updateStatus('connected');
                this.log('Connecte au serveur', 'success');
                this.isManualClose = false;

                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }

                this.trigger('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Erreur parsing message:', error);
                    this.log('Erreur parsing message', 'error');
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.log('Erreur connexion', 'error');
            };

            this.ws.onclose = () => {
                this.updateStatus('disconnected');
                this.log('Deconnecte du serveur', 'error');
                this.trigger('disconnected');

                if (!this.isManualClose) {
                    this.log(`Reconnexion dans ${this.reconnectDelay / 1000}s...`, 'warning');
                    this.reconnectTimer = setTimeout(() => {
                        this.connect();
                    }, this.reconnectDelay);
                }
            };
        } catch (error) {
            console.error('Erreur creation WebSocket:', error);
            this.log('Impossible de se connecter', 'error');
        }
    }

    /**
     * Deconnexion
     */
    disconnect() {
        this.isManualClose = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.updateStatus('disconnected');
    }

    /**
     * Envoi message
     */
    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.log('Non connecte', 'error');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erreur envoi message:', error);
            this.log('Erreur envoi', 'error');
            return false;
        }
    }

    /**
     * Gestion messages recus
     */
    handleMessage(data) {
        console.log('Message recu:', data);

        switch (data.type) {
            case 'connected':
                this.log(`${data.message}`, 'success');
                break;

            case 'frame_processed':
                this.trigger('frame_processed', data);
                break;

            case 'question_answered':
                this.trigger('question_answered', data);
                break;

            case 'scene_update':
                this.log('Nouvelle scene detectee', 'info');
                this.trigger('scene_update', data);
                break;

            case 'error':
                this.log(`Erreur: ${data.message}`, 'error');
                this.trigger('error', data);
                break;

            case 'pong':
                break;

            default:
                console.warn('Type message inconnu:', data.type);
        }
    }

    /**
     * Mise a jour status visuel
     */
    updateStatus(status) {
        const statusEl = document.getElementById('ws-status');
        const dot = statusEl.querySelector('div');
        const text = statusEl.querySelector('span');

        dot.classList.remove('ws-connected', 'ws-disconnected', 'ws-connecting', 'animate-pulse');

        switch (status) {
            case 'connected':
                dot.classList.add('ws-connected');
                text.textContent = 'Connecte';
                break;

            case 'connecting':
                dot.classList.add('ws-connecting', 'animate-pulse');
                text.textContent = 'Connexion...';
                break;

            case 'disconnected':
                dot.classList.add('ws-disconnected');
                text.textContent = 'Deconnecte';
                break;
        }
    }

    /**
     * Log dans l'interface
     */
    log(message, type = 'info') {
        const logsContainer = document.getElementById('logs-container');
        const timestamp = new Date().toLocaleTimeString();

        let color = 'text-green-400';
        if (type === 'error') color = 'text-red-400';
        if (type === 'warning') color = 'text-yellow-400';
        if (type === 'success') color = 'text-green-400';

        const logLine = document.createElement('div');
        logLine.className = color;
        logLine.textContent = `[${timestamp}] ${message}`;

        logsContainer.appendChild(logLine);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        while (logsContainer.children.length > 100) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    /**
     * Event listeners
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    trigger(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Ping keep-alive
     */
    startKeepAlive() {
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, 30000);
    }
}

// Instance globale
const wsManager = new WebSocketManager();
