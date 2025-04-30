from datetime import datetime
from flask import Blueprint, jsonify, request
from backend.models.message import Message
from backend.models.session_config import SessionConfig

# Add url_prefix to match other routes
bp = Blueprint('messages', __name__, url_prefix='/api')

@bp.route('/sessions/<session_id>/messages', methods=['GET'])
def get_messages(session_id: str):
    """Fetch messages for a session."""
    # TODO: Implement database query
    # For now, return mock data
    messages = [
        Message(
            message_id=1,
            session_id=session_id,
            role="user",
            content="Hello, how can you help me today?",
            created_at=datetime.now()
        ),
        Message(
            message_id=2,
            session_id=session_id,
            role="assistant",
            content="I'm here to help! What would you like to know?",
            created_at=datetime.now()
        )
    ]
    return jsonify([msg.model_dump() for msg in messages])

@bp.route('/sessions/<session_id>/messages', methods=['POST'])
def send_message(session_id: str):
    """Send a new message and get AI response."""
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'error': 'Message content is required'}), 400
        
    # Get session config for thinking mode
    # TODO: Get from database
    config = SessionConfig(
        session_id=session_id,
        model_name="llama-2-13b",
        thinking_mode=data.get('thinking_mode', 'hybrid')
    )
    
    # Create user message
    user_msg = Message(
        message_id=1,  # TODO: Get next ID from DB
        session_id=session_id,
        role="user",
        content=data['content'],
        created_at=datetime.now()
    )
    
    # TODO: Save user message to database
    
    # TODO: Call RAG service to generate response
    # For now, return mock response
    assistant_msg = Message(
        message_id=2,  # TODO: Get next ID from DB
        session_id=session_id,
        role="assistant",
        content=f"This is a mock response using {config.thinking_mode} mode.",
        created_at=datetime.now()
    )
    
    # TODO: Save assistant message to database
    
    return jsonify(assistant_msg.model_dump()) 