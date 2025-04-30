import logger from './logger';

const WS_URL = 'ws://localhost:5000/backend/ws';

type WebSocketEvent = 'connected' | 'disconnected' | 'message';
type WebSocketListener = (event: WebSocketEvent, data?: any) => void;

class WebSocketManager {
  private ws: WebSocket | null;
  private isConnecting: boolean;
  private listeners: Set<WebSocketListener>;
  private reconnectTimeout: NodeJS.Timeout | null;

  constructor() {
    this.ws = null;
    this.isConnecting = false;
    this.listeners = new Set();
    this.reconnectTimeout = null;
  }

  connect(): void {
    if (this.ws || this.isConnecting) {
      logger.debug('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    logger.info('[WebSocket] Attempting connection');

    const ws = new WebSocket(WS_URL);

    ws.onopen = (): void => {
      logger.info('[WebSocket] Connection established');
      this.isConnecting = false;
      this.notifyListeners('connected');
    };

    ws.onclose = (): void => {
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

    ws.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data);
        logger.debug('[WebSocket] Received message:', data);
        this.notifyListeners('message', data);
      } catch (error) {
        logger.error('[WebSocket] Error processing message:', error);
      }
    };

    ws.onerror = (error: Event): void => {
      logger.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
    };

    this.ws = ws;
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  addListener(callback: WebSocketListener): void {
    this.listeners.add(callback);
    // If already connected, notify the new listener
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      callback('connected');
    }
  }

  removeListener(callback: WebSocketListener): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(event: WebSocketEvent, data?: any): void {
    this.listeners.forEach(callback => callback(event, data));
  }
}

// Create a singleton instance
const wsManager = new WebSocketManager();

export default wsManager;
