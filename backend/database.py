import sqlite3
from datetime import datetime
import json
import logging

logger = logging.getLogger('kokoro')

class Database:
    def __init__(self, db_path='kokoro.db'):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        """Initialize the database with required tables."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    title TEXT
                )
            ''')
            
            # Create messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    type TEXT,
                    text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                )
            ''')
            
            conn.commit()

    def create_session(self, session_id: str, title: str = None) -> None:
        """Create a new chat session."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO sessions (id, title) VALUES (?, ?)',
                (session_id, title or "New Chat")
            )
            conn.commit()

    def update_session_title(self, session_id: str, title: str) -> None:
        """Update the title of a session."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE sessions SET title = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                (title, session_id)
            )
            conn.commit()

    def add_message(self, session_id: str, message_type: str, text: str) -> None:
        """Add a message to a session."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO messages (session_id, type, text) VALUES (?, ?, ?)',
                (session_id, message_type, text)
            )
            # Update session last_updated timestamp
            cursor.execute(
                'UPDATE sessions SET last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                (session_id,)
            )
            conn.commit()

    def get_session_messages(self, session_id: str) -> list:
        """Get all messages for a session."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT type, text FROM messages WHERE session_id = ? ORDER BY created_at',
                (session_id,)
            )
            return [{'type': msg[0], 'text': msg[1]} for msg in cursor.fetchall()]

    def get_all_sessions(self) -> list:
        """Get all sessions with their latest message."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    s.id,
                    s.title,
                    s.created_at,
                    s.last_updated,
                    m.text as latest_message
                FROM sessions s
                LEFT JOIN messages m ON m.session_id = s.id
                WHERE m.id = (
                    SELECT id FROM messages 
                    WHERE session_id = s.id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                )
                ORDER BY s.last_updated DESC
            ''')
            return [{
                'id': row[0],
                'title': row[1],
                'created_at': row[2],
                'last_updated': row[3],
                'latest_message': row[4]
            } for row in cursor.fetchall()]

    def delete_session(self, session_id: str) -> None:
        """Delete a session and all its messages."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
            cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            conn.commit()

# Global database instance
db = Database() 