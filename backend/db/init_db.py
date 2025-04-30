import sqlite3
import logging
import os

logger = logging.getLogger(__name__)

def create_tables(db_path: str = None):
    """Create all required tables in the SQLite database."""
    if db_path is None:
        # Use the backend directory as the base
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database.db")
    
    conn = None
    try:
        # Create the database directory if it doesn't exist
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create sessions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id   TEXT PRIMARY KEY,
            title        TEXT,
            created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
            updated_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
        """)

        # Create messages table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            message_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id   TEXT NOT NULL REFERENCES sessions(session_id),
            role         TEXT NOT NULL CHECK(role IN ('user','assistant')),
            content      TEXT NOT NULL,
            created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
        """)

        # Create documents table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            doc_id       TEXT PRIMARY KEY,
            source_type  TEXT NOT NULL,
            source_path  TEXT,
            metadata     JSON,
            created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
            updated_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
        """)

        # Create document_chunks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            chunk_id     TEXT PRIMARY KEY,
            doc_id       TEXT NOT NULL REFERENCES documents(doc_id),
            chunk_index  INTEGER NOT NULL,
            text         TEXT NOT NULL,
            chroma_id    TEXT UNIQUE NOT NULL,
            created_at   DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        )
        """)

        # Create session_config table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS session_config (
            session_id        TEXT PRIMARY KEY REFERENCES sessions(session_id),
            model_name        TEXT NOT NULL,
            thinking_mode     TEXT NOT NULL CHECK(thinking_mode IN ('cot','rag','hybrid')),
            top_k             INTEGER NOT NULL DEFAULT 5,
            embed_light       TEXT NOT NULL,
            embed_deep        TEXT NOT NULL,
            idle_threshold_s  INTEGER NOT NULL DEFAULT 600
        )
        """)

        conn.commit()
        logger.info(f"Successfully created all database tables at {db_path}")

    except sqlite3.Error as e:
        logger.error(f"Error creating database tables: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    # Create tables
    create_tables() 