from datetime import datetime
import uuid
from flask import Blueprint, jsonify, request
from ..models.session import Session
from ..models.session_config import SessionConfig

bp = Blueprint('sessions', __name__, url_prefix='/api/sessions')

@bp.route('', methods=['GET'])
def list_sessions():
    """List all chat sessions."""
    # TODO: Implement database query
    # For now, return mock data
    sessions = [
        Session(
            session_id="chat-20240315-123456-abc",
            title="Test Chat",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    ]
    return jsonify([session.model_dump() for session in sessions])

@bp.route('', methods=['POST'])
def create_session():
    """Create a new chat session."""
    data = request.get_json()
    
    # Generate unique session ID
    session_id = f"chat-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
    
    # Create session with default title if none provided
    session = Session(
        session_id=session_id,
        title=data.get('title', 'New Chat'),
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    # Create default config for the session
    config = SessionConfig(
        session_id=session_id,
        model_name=data.get('model_name', 'llama-2-13b')
    )
    
    # TODO: Save session and config to database
    
    return jsonify(session.model_dump()), 201

@bp.route('/<session_id>', methods=['GET'])
def get_session(session_id: str):
    """Get session details including its config."""
    # TODO: Implement database query
    # For now, return mock data if ID matches pattern
    if not session_id.startswith('chat-'):
        return jsonify({'error': 'Session not found'}), 404
        
    session = Session(
        session_id=session_id,
        title="Test Chat",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    config = SessionConfig(
        session_id=session_id,
        model_name="llama-2-13b"
    )
    
    return jsonify({
        'session': session.model_dump(),
        'config': config.model_dump()
    }) 