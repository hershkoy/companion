from flask import Blueprint, jsonify, request
from ..models.session_config import SessionConfig

bp = Blueprint('config', __name__, url_prefix='/api/config')

@bp.route('/<session_id>', methods=['GET'])
def get_config(session_id: str):
    """Get configuration for a session."""
    # TODO: Implement database query
    # For now, return mock data
    config = SessionConfig(
        session_id=session_id,
        model_name="llama-2-13b"
    )
    return jsonify(config.model_dump())

@bp.route('/<session_id>', methods=['PUT'])
def update_config(session_id: str):
    """Update configuration for a session."""
    data = request.get_json()
    
    # TODO: Get existing config from database
    current_config = SessionConfig(
        session_id=session_id,
        model_name="llama-2-13b"
    )
    
    # Update fields that are present in request
    update_data = {
        'session_id': session_id,  # Ensure this doesn't change
        **current_config.model_dump(),
        **data
    }
    
    try:
        # Validate and create updated config
        updated_config = SessionConfig(**update_data)
        # TODO: Save to database
        return jsonify(updated_config.model_dump())
    except ValueError as e:
        return jsonify({'error': str(e)}), 400 