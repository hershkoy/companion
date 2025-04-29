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
            
            # Create chats table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chats (
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
                    chat_id TEXT,
                    type TEXT,
                    text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chat_id) REFERENCES chats (id)
                )
            ''')
            
            # Migrate existing sessions table if it exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")
            if cursor.fetchone():
                logger.info("Migrating sessions table to chats")
                # Copy data from sessions to chats
                cursor.execute('''
                    INSERT OR IGNORE INTO chats (id, created_at, last_updated, title)
                    SELECT id, created_at, last_updated, title FROM sessions
                ''')
                # Update messages foreign key
                cursor.execute('''
                    UPDATE messages SET chat_id = session_id WHERE chat_id IS NULL
                ''')
                # Drop old table
                cursor.execute('DROP TABLE sessions')
                
            conn.commit()

    def create_chat(self, chat_id: str, title: str = None) -> None:
        """Create a new chat."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO chats (id, title) VALUES (?, ?)',
                (chat_id, title or "New Chat")
            )
            conn.commit()

    def update_chat_title(self, chat_id: str, title: str) -> None:
        """Update the title of a chat."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE chats SET title = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                (title, chat_id)
            )
            conn.commit()

    def add_message(self, chat_id: str, message_type: str, text: str) -> None:
        """Add a message to a chat."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO messages (chat_id, type, text) VALUES (?, ?, ?)',
                (chat_id, message_type, text)
            )
            # Update chat last_updated timestamp
            cursor.execute(
                'UPDATE chats SET last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                (chat_id,)
            )
            conn.commit()

    def get_chat_messages(self, chat_id: str) -> list:
        """Get all messages for a chat."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT type, text FROM messages WHERE chat_id = ? ORDER BY created_at',
                (chat_id,)
            )
            return [{'type': msg[0], 'text': msg[1]} for msg in cursor.fetchall()]

    def get_all_chats(self) -> list:
        """Get all chats with their latest message."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    c.id,
                    c.title,
                    c.created_at,
                    c.last_updated,
                    m.text as latest_message
                FROM chats c
                LEFT JOIN messages m ON m.chat_id = c.id
                WHERE m.id = (
                    SELECT id FROM messages 
                    WHERE chat_id = c.id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                )
                ORDER BY c.last_updated DESC
            ''')
            return [{
                'id': row[0],
                'title': row[1],
                'created_at': row[2],
                'last_updated': row[3],
                'latest_message': row[4]
            } for row in cursor.fetchall()]

    def delete_chat(self, chat_id: str) -> None:
        """Delete a chat and all its messages."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM messages WHERE chat_id = ?', (chat_id,))
            cursor.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
            conn.commit()

# Global database instance
db = Database() 