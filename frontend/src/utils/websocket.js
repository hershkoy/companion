import logger from './logger';

const WS_URL = 'ws://localhost:5000/ws';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.isConnecting = false;
    this.listeners = new Set();
    this.reconnectTimeout = null;
  }

  connect() {
    if (this.ws || this.isConnecting) {
      logger.debug('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    logger.info('[WebSocket] Attempting connection');

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      logger.info('[WebSocket] Connection established');
      this.isConnecting = false;
      this.notifyListeners('connected');
    };

    ws.onclose = () => {
      logger.info('[WebSocket] Connection closed');
      this.ws = null;
      this.notifyListeners('disconnected');
      
      // Attempt reconnection
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          logger.info('[WebSocket] Attempting reconnection');
          this.reconnectTimeout = null;
          this.connect();
        }, 5000);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.debug('[WebSocket] Received message:', data);
        this.notifyListeners('message', data);
      } catch (error) {
        logger.error('[WebSocket] Error processing message:', error);
      }
    };

    ws.onerror = (error) => {
      logger.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
    };

    this.ws = ws;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    // If already connected, notify the new listener
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      callback('connected');
    }
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }
}

// Create a singleton instance
const wsManager = new WebSocketManager();

export default wsManager; 