from typing import Dict, List, Optional
import logging
from datetime import datetime
import os
from backend.database import db

logger = logging.getLogger('kokoro')

class ConversationStore:
    def __init__(self):
        # In-memory cache of conversations
        self._conversations: Dict[str, List[dict]] = {}

    def create_chat(self, chat_id: str, title: str = "New Chat") -> str:
        """Create a new chat session with the given ID and title"""
        db.create_session(chat_id, title)
        self._conversations[chat_id] = []
        return chat_id

    def update_chat_title(self, chat_id: str, title: str) -> None:
        """Update the title of a chat session"""
        db.update_session_title(chat_id, title)

    def add_message(self, chat_id: str, message: dict) -> None:
        """Add a message to the conversation history"""
        if not isinstance(message, dict) or 'type' not in message or 'text' not in message:
            raise ValueError("Message must be a dict with 'type' and 'text' keys")

        db.add_message(chat_id, message['type'], message['text'])
        
        # Update in-memory cache
        if chat_id not in self._conversations:
            self._conversations[chat_id] = []
        self._conversations[chat_id].append(message)
        
        logger.info(f"Added message to chat {chat_id}: {message}")

    def get_history(self, chat_id: str, max_tokens: Optional[int] = None) -> List[dict]:
        """Get conversation history for a chat, optionally limited by token count"""
        # Check cache first
        if chat_id not in self._conversations:
            self._conversations[chat_id] = db.get_messages(chat_id)
            
        messages = self._conversations[chat_id]
        
        if max_tokens is None:
            return messages
            
        # If max_tokens specified, get most recent messages that fit
        total_tokens = 0
        result = []
        
        # Start from most recent messages
        for message in reversed(messages):
            # Rough token estimation (4 chars per token)
            tokens = len(message['text']) // 4
            if total_tokens + tokens > max_tokens:
                break
                
            result.insert(0, message)  # Insert at start to maintain order
            total_tokens += tokens
            
        return result

    def get_all_chats(self) -> List[dict]:
        """Get all active chats"""
        return db.get_sessions()

    def clear_chat(self, chat_id: str) -> None:
        """Clear the conversation history for a chat"""
        db.delete_session(chat_id)
        if chat_id in self._conversations:
            del self._conversations[chat_id]
        logger.info(f"Cleared conversation history for chat {chat_id}")

# Global instance
conversation_store = ConversationStore() 