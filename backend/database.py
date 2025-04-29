import sqlite3
from datetime import datetime
import logging
from typing import List, Dict, Optional

logger = logging.getLogger('kokoro')

class Database:
    def __init__(self, db_path='database.db'):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize SQLite database with required tables"""
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
            logger.info(f"Database initialized at {self.db_path}")

    def create_session(self, session_id: str, title: str) -> None:
        """Create a new chat session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
                (session_id, title, datetime.now(), datetime.now())
            )
            conn.commit()
        logger.info(f"Created new session: {session_id}")

    def update_session_title(self, session_id: str, title: str) -> None:
        """Update the title of a chat session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?',
                (title, datetime.now(), session_id)
            )
            conn.commit()
        logger.info(f"Updated title for session {session_id}: {title}")

    def add_message(self, session_id: str, message_type: str, text: str) -> None:
        """Add a message to a chat session"""
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
        logger.info(f"Added {message_type} message to session {session_id}")

    def get_messages(self, session_id: str) -> List[Dict[str, str]]:
        """Get all messages for a chat session"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT type, text FROM messages WHERE session_id = ? ORDER BY created_at',
                (session_id,)
            )
            return [{'type': row[0], 'text': row[1]} for row in cursor.fetchall()]

    def get_sessions(self) -> List[Dict[str, str]]:
        """Get all chat sessions"""
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

    def delete_session(self, session_id: str) -> None:
        """Delete a chat session and all its messages"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
            conn.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            conn.commit()
        logger.info(f"Deleted session: {session_id}")

# Global database instance
db = Database() 