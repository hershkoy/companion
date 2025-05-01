import json
import logging
from flask_sock import Sock
from typing import Optional, Set
from simple_websocket import Server as WebSocket

logger = logging.getLogger(__name__)

class WebSocketService:
    def __init__(self, app):
        self.sock = Sock(app)
        self.ws_connections: Set[WebSocket] = set()
        self._setup_routes()
        logger.info("WebSocket service initialized")

    def _setup_routes(self):
        @self.sock.route('/backend/ws')
        def ws_handler(ws):
            """Handle WebSocket connections"""
            try:
                logger.info("New WebSocket connection established")
                self.ws_connections.add(ws)
                
                # Send initial connection confirmation
                ws.send(json.dumps({
                    "type": "connection_status",
                    "status": "connected"
                }))
                
                while True:
                    # Keep connection alive and handle incoming messages
                    message = ws.receive()
                    if message is None:
                        break
                    try:
                        data = json.loads(message)
                        logger.debug(f"Received WebSocket message: {data}")
                        # Echo back to confirm connection
                        ws.send(json.dumps({"type": "pong", "status": "ok"}))
                    except json.JSONDecodeError:
                        logger.warning(f"Received invalid JSON message: {message}")
                        ws.send(json.dumps({"type": "error", "message": "Invalid JSON format"}))
                        
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
            finally:
                self._remove_connection(ws)
                logger.info("WebSocket connection closed")

    def _remove_connection(self, ws: WebSocket) -> None:
        """Safely remove a WebSocket connection"""
        try:
            self.ws_connections.remove(ws)
        except KeyError:
            pass  # Connection already removed
        try:
            ws.close()
        except:
            pass  # Already closed

    def broadcast_title_update(self, chat_id: str, title: str) -> None:
        """Broadcast title update to all connected clients"""
        if not self.ws_connections:
            logger.debug("No WebSocket connections available for title update broadcast")
            return
            
        message = json.dumps({
            'type': 'session_title_update',
            'session_id': chat_id,
            'title': title
        })
        
        self._broadcast_message(message)

    def broadcast_gpu_status(self, is_indexing: bool, gpu_utilization: float) -> None:
        """Broadcast GPU status update to all connected clients"""
        if not self.ws_connections:
            logger.debug("No WebSocket connections available for GPU status broadcast")
            return
            
        message = json.dumps({
            'type': 'gpu_status_update',
            'payload': {
                'is_indexing': is_indexing,
                'gpu_utilization': gpu_utilization
            }
        })
        
        self._broadcast_message(message)

    def _broadcast_message(self, message: str) -> None:
        """Helper method to broadcast a message to all connected clients"""
        if not message:
            logger.warning("Attempted to broadcast empty message")
            return
            
        logger.debug(f"Broadcasting message to {len(self.ws_connections)} clients: {message}")
        dead_connections = set()
        
        for ws in self.ws_connections:
            try:
                ws.send(message)
                logger.debug("Message sent successfully to a client")
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {str(e)}")
                dead_connections.add(ws)
        
        # Clean up dead connections
        for ws in dead_connections:
            self._remove_connection(ws)
            logger.info("Removed dead WebSocket connection") 