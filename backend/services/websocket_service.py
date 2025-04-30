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
            logger.warning("No WebSocket connections available for broadcasting")
            return
            
        message = json.dumps({
            'type': 'session_title_update',
            'session_id': chat_id,
            'title': title
        })
        
        logger.info(f"Broadcasting title update: {message}")
        dead_connections = set()
        
        for ws in self.ws_connections:
            try:
                ws.send(message)
                logger.debug(f"Title update sent successfully to a client")
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