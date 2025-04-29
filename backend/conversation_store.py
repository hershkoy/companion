from typing import Dict, List, Optional
import logging
from database import db

logger = logging.getLogger('kokoro')

class ConversationStore:
    def __init__(self):
        # In-memory cache of conversations
        self._conversations: Dict[str, List[dict]] = {}
        
    def add_message(self, chat_id: str, message: dict) -> None:
        """Add a message to the conversation history.
        
        Args:
            chat_id: The chat identifier
            message: Dict containing 'type' ('user' or 'ai') and 'text' keys
        """
        if chat_id not in self._conversations:
            # Load from database if not in memory
            self._conversations[chat_id] = db.get_chat_messages(chat_id)
            
        self._conversations[chat_id].append(message)
        # Persist to database
        db.add_message(chat_id, message['type'], message['text'])
        logger.info(f"Added message to chat {chat_id}: {message}")
        
    def get_history(self, chat_id: str, max_tokens: Optional[int] = None) -> List[dict]:
        """Get conversation history for a chat.
        
        Args:
            chat_id: The chat identifier
            max_tokens: Optional maximum number of tokens to include (most recent messages prioritized)
            
        Returns:
            List of message dictionaries
        """
        if chat_id not in self._conversations:
            # Load from database if not in memory
            self._conversations[chat_id] = db.get_chat_messages(chat_id)
            
        history = self._conversations[chat_id]
        
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
        
    def clear_chat(self, chat_id: str) -> None:
        """Clear the conversation history for a chat.
        
        Args:
            chat_id: The chat identifier
        """
        if chat_id in self._conversations:
            del self._conversations[chat_id]
        # Delete from database
        db.delete_chat(chat_id)
        logger.info(f"Cleared conversation history for chat {chat_id}")
            
    def get_all_chats(self) -> List[str]:
        """Get all active chats.
        
        Returns:
            List of chat data
        """
        return db.get_all_chats()

    def create_chat(self, chat_id: str, title: str = None) -> None:
        """Create a new chat.
        
        Args:
            chat_id: The chat identifier
            title: Optional title for the chat
        """
        db.create_chat(chat_id, title)
        self._conversations[chat_id] = []
        logger.info(f"Created new chat: {chat_id}")

    def update_chat_title(self, chat_id: str, title: str) -> None:
        """Update the title of a chat.
        
        Args:
            chat_id: The chat identifier
            title: New title for the chat
        """
        db.update_chat_title(chat_id, title)
        logger.info(f"Updated title for chat {chat_id}: {title}")

# Global instance
conversation_store = ConversationStore() 