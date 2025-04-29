from typing import Dict, List, Optional
import logging
from database import db

logger = logging.getLogger('kokoro')

class ConversationStore:
    def __init__(self):
        # In-memory cache of conversations
        self._conversations: Dict[str, List[dict]] = {}
        
    def add_message(self, session_id: str, message: dict) -> None:
        """Add a message to the conversation history.
        
        Args:
            session_id: The session identifier
            message: Dict containing 'type' ('user' or 'ai') and 'text' keys
        """
        if session_id not in self._conversations:
            # Load from database if not in memory
            self._conversations[session_id] = db.get_session_messages(session_id)
            
        self._conversations[session_id].append(message)
        # Persist to database
        db.add_message(session_id, message['type'], message['text'])
        logger.info(f"Added message to session {session_id}: {message}")
        
    def get_history(self, session_id: str, max_tokens: Optional[int] = None) -> List[dict]:
        """Get conversation history for a session.
        
        Args:
            session_id: The session identifier
            max_tokens: Optional maximum number of tokens to include (most recent messages prioritized)
            
        Returns:
            List of message dictionaries
        """
        if session_id not in self._conversations:
            # Load from database if not in memory
            self._conversations[session_id] = db.get_session_messages(session_id)
            
        history = self._conversations[session_id]
        
        if max_tokens is None:
            return history
            
        # If max_tokens specified, get most recent messages that fit
        total_tokens = 0
        messages = []
        
        # Start from most recent messages
        for message in reversed(history):
            # Rough token estimation (4 chars per token)
            tokens = len(message['text']) // 4
            if total_tokens + tokens > max_tokens:
                break
                
            messages.insert(0, message)  # Insert at start to maintain order
            total_tokens += tokens
            
        return messages
        
    def clear_session(self, session_id: str) -> None:
        """Clear the conversation history for a session.
        
        Args:
            session_id: The session identifier
        """
        if session_id in self._conversations:
            del self._conversations[session_id]
        # Delete from database
        db.delete_session(session_id)
        logger.info(f"Cleared conversation history for session {session_id}")
            
    def get_all_sessions(self) -> List[str]:
        """Get all active session IDs.
        
        Returns:
            List of session IDs
        """
        return db.get_all_sessions()

    def create_session(self, session_id: str, title: str = None) -> None:
        """Create a new chat session.
        
        Args:
            session_id: The session identifier
            title: Optional title for the session
        """
        db.create_session(session_id, title)
        self._conversations[session_id] = []
        logger.info(f"Created new session: {session_id}")

    def update_session_title(self, session_id: str, title: str) -> None:
        """Update the title of a session.
        
        Args:
            session_id: The session identifier
            title: New title for the session
        """
        db.update_session_title(session_id, title)
        logger.info(f"Updated title for session {session_id}: {title}")

# Global instance
conversation_store = ConversationStore() 