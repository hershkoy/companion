from typing import Dict, List, Optional
import logging
from database import db
import sqlite3
import json
from datetime import datetime
import os

logger = logging.getLogger('kokoro')

class ConversationStore:
    def __init__(self, db_path='conversations.db'):
        self.db_path = db_path
        self._init_db()
        # In-memory cache of conversations
        self._conversations: Dict[str, List[dict]] = {}
        
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    type TEXT,
                    text TEXT,
                    created_at TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                )
            ''')
            conn.commit()

    def create_chat(self):
        chat_id = f"chat-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{os.urandom(3).hex()}"
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
                (chat_id, "New Chat", datetime.now(), datetime.now())
            )
            conn.commit()
        logger.info(f"Created new chat: {chat_id}")
        return chat_id

    def update_title(self, session_id, title):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?',
                (title, datetime.now(), session_id)
            )
            conn.commit()
        logger.info(f"Updated title for chat {session_id}: {title}")

    def add_message(self, session_id, message_type, text):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'INSERT INTO messages (session_id, type, text, created_at) VALUES (?, ?, ?, ?)',
                (session_id, message_type, text, datetime.now())
            )
            conn.execute(
                'UPDATE sessions SET updated_at = ? WHERE id = ?',
                (datetime.now(), session_id)
            )
            conn.commit()
        logger.info(f"Added {message_type} message to chat {session_id}")

    def get_messages(self, session_id):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT type, text FROM messages WHERE session_id = ? ORDER BY created_at',
                (session_id,)
            )
            return [{'type': row[0], 'text': row[1]} for row in cursor.fetchall()]

    def get_sessions(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC'
            )
            return [{
                'id': row[0],
                'title': row[1],
                'created_at': row[2],
                'updated_at': row[3]
            } for row in cursor.fetchall()]

    def delete_session(self, session_id):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
            conn.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            conn.commit()
        logger.info(f"Deleted chat: {session_id}")

    def add_message_to_conversation(self, chat_id: str, message: dict) -> None:
        """Add a message to the conversation history.
        
        Args:
            chat_id: The chat identifier
            message: Dict containing 'type' ('user' or 'ai') and 'text' keys
        """
        if chat_id not in self._conversations:
            # Load from database if not in memory
            self._conversations[chat_id] = self.get_messages(chat_id)
            
        self._conversations[chat_id].append(message)
        # Persist to database
        self.add_message(chat_id, message['type'], message['text'])
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
            self._conversations[chat_id] = self.get_messages(chat_id)
            
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
        self.delete_session(chat_id)
        logger.info(f"Cleared conversation history for chat {chat_id}")
            
    def get_all_chats(self) -> List[str]:
        """Get all active chats.
        
        Returns:
            List of chat data
        """
        return self.get_sessions()

    def create_chat_with_title(self, title: str = None) -> str:
        """Create a new chat with a title.
        
        Args:
            title: Optional title for the chat
        
        Returns:
            The chat identifier
        """
        chat_id = self.create_chat()
        self._conversations[chat_id] = []
        self.update_title(chat_id, title)
        logger.info(f"Created new chat: {chat_id}")
        return chat_id

    def update_chat_title(self, chat_id: str, title: str) -> None:
        """Update the title of a chat.
        
        Args:
            chat_id: The chat identifier
            title: New title for the chat
        """
        self.update_title(chat_id, title)
        logger.info(f"Updated title for chat {chat_id}: {title}")

# Global instance
conversation_store = ConversationStore() 