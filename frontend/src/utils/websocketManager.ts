import logger from './logger';
import { WS_BASE_URL } from '../api/config';

// Event types that can be emitted by the WebSocket
export type WebSocketEvent = 'connected' | 'disconnected' | 'message' | 'error';

// Type for the message data received from WebSocket
export interface WebSocketMessage {
  type: string;
  payload?: any;
  status?: string;
  message?: string;
}

// Type for the listener callback function
export type WebSocketListener = (event: WebSocketEvent, data?: WebSocketMessage) => void;

// WebSocket manager class
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private listeners = new Set<WebSocketListener>();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000; // Start with 1 second
  private readonly maxReconnectDelay = 30000; // Max 30 seconds

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      logger.debug('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    logger.info('[WebSocket] Attempting connection');

    try {
      const ws = new WebSocket(WS_BASE_URL);

      ws.onopen = (): void => {
        logger.info('[WebSocket] Connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset counter on successful connection
        this.notifyListeners('connected');
      };

      ws.onclose = (): void => {
        logger.info('[WebSocket] Connection closed');
        this.ws = null;
        this.isConnecting = false;
        this.notifyListeners('disconnected');

        // Attempt reconnection if not at max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.getReconnectDelay();
          logger.info(`[WebSocket] Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
          
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        } else {
          logger.error('[WebSocket] Max reconnection attempts reached');
          this.notifyListeners('error', {
            type: 'error',
            message: 'Failed to establish WebSocket connection after maximum attempts'
          });
        }
      };

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          logger.debug('[WebSocket] Received message:', data);
          
          // Handle connection status messages
          if (data.type === 'connection_status') {
            if (data.status === 'connected') {
              logger.info('[WebSocket] Server confirmed connection');
            }
          }
          
          this.notifyListeners('message', data);
        } catch (error) {
          logger.error('[WebSocket] Error processing message:', error);
          this.notifyListeners('error', {
            type: 'error',
            message: 'Failed to process WebSocket message'
          });
        }
      };

      ws.onerror = (error: Event): void => {
        logger.error('[WebSocket] Connection error:', error);
        this.isConnecting = false;
        this.notifyListeners('error', {
          type: 'error',
          message: 'WebSocket connection error'
        });
      };

      this.ws = ws;
    } catch (error) {
      logger.error('[WebSocket] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.notifyListeners('error', {
        type: 'error',
        message: 'Failed to create WebSocket connection'
      });
    }
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
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  addListener(callback: WebSocketListener): void {
    this.listeners.add(callback);
    // If already connected, notify the new listener
    if (this.ws?.readyState === WebSocket.OPEN) {
      callback('connected');
    }
  }

  removeListener(callback: WebSocketListener): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(event: WebSocketEvent, data?: WebSocketMessage): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('[WebSocket] Error in listener callback:', error);
      }
    });
  }

  private getReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.maxReconnectDelay,
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    );
    // Add random jitter ±20%
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
    return exponentialDelay + jitter;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
} 