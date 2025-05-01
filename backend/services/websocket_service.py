import json
import logging
from flask_sock import Sock

logger = logging.getLogger(__name__)

class WebSocketService:
    def __init__(self, app):
        self.sock = Sock(app)
        self.ws_connections = set()
        self._setup_routes()

    def _setup_routes(self):
        @self.sock.route('/backend/ws')
        def ws_handler(ws):
            """Handle WebSocket connections"""
            logger.info("New WebSocket connection established")
            self.ws_connections.add(ws)
            try:
                while True:
                    # Keep connection alive and handle incoming messages
                    message = ws.receive()
                    if message is None:
                        break
                    # Echo back to confirm connection
                    ws.send(json.dumps({"type": "ping", "status": "ok"}))
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
            finally:
                logger.info("WebSocket connection closed")
                self.ws_connections.remove(ws)

    def broadcast_title_update(self, chat_id: str, title: str) -> None:
        """Broadcast title update to all connected clients"""
        if not self.ws_connections:
            # logger.warning("No WebSocket connections available for broadcasting")
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
            # logger.warning("No WebSocket connections available for broadcasting")
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
        logger.info(f"Broadcasting message: {message}")
        dead_connections = set()
        
        for ws in self.ws_connections:
            try:
                ws.send(message)
                logger.debug(f"Message sent successfully to a client")
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {str(e)}")
                dead_connections.add(ws)
        
        # Clean up dead connections
        for ws in dead_connections:
            try:
                ws.close()
            except:
                pass
            self.ws_connections.remove(ws)
            logger.info("Removed dead WebSocket connection") 