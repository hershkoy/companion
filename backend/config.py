import os
from pathlib import Path

class Config:
    """Base configuration."""
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev')
    
    # Database
    DATABASE_PATH = os.getenv('DATABASE_PATH', 'database.db')
    
    # Chroma
    CHROMA_PERSIST_DIR = os.getenv('CHROMA_PERSIST_DIR', './chroma_db')
    
    # GPU Settings
    GPU_IDLE_THRESHOLD = float(os.getenv('GPU_IDLE_THRESHOLD', '10.0'))  # % utilization
    IDLE_THRESHOLD_S = int(os.getenv('IDLE_THRESHOLD_S', '600'))  # seconds
    
    # Model Settings
    EMBED_LIGHT = os.getenv('EMBED_LIGHT', 'all-MiniLM-L6-v2')
    EMBED_DEEP = os.getenv('EMBED_DEEP', 'sentence-transformers/all-mpnet-base-v2')
    DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'llama2')
    DEFAULT_THINKING_MODE = os.getenv('DEFAULT_THINKING_MODE', 'hybrid')
    DEFAULT_TOP_K = int(os.getenv('DEFAULT_TOP_K', '5'))

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    DATABASE_PATH = ':memory:'  # Use in-memory SQLite for tests

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    # Override these in production environment
    SECRET_KEY = os.getenv('SECRET_KEY')
    DATABASE_PATH = os.getenv('DATABASE_PATH', '/data/database.db')
    CHROMA_PERSIST_DIR = os.getenv('CHROMA_PERSIST_DIR', '/data/chroma_db')

# Map environment names to config classes
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}

# Get current config based on environment
def get_config():
    env = os.getenv('FLASK_ENV', 'development')
    return config_by_name[env] 