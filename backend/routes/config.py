from flask import Blueprint, jsonify, request
from backend.models.session_config import SessionConfig
import os
import requests
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('config', __name__, url_prefix='/api')

def get_ollama_models():
    """Fetch available models from Ollama API"""
    try:
        url = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/tags')
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        # Extract model names and metadata
        models = response.json().get('models', [])
        return [{
            'id': model['name'],
            'name': model['name'],
            'modified_at': model.get('modified_at', ''),
            'size': model.get('size', 0),
            'digest': model.get('digest', ''),
            'details': {
                'format': model.get('format', ''),
                'family': model.get('family', ''),
                'families': model.get('families', []),
                'parameter_size': model.get('parameter_size', ''),
                'quantization_level': model.get('quantization_level', '')
            }
        } for model in models]
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Ollama models: {str(e)}")
        return []

@bp.route('/models', methods=['GET'])
def get_models():
    """Get available AI models"""
    try:
        ai_service = os.getenv('AI_SERVICE', 'ollama').lower()
        current_model = os.getenv('OLLAMA_MODEL', 'deepseek-r1')
        
        if ai_service == 'ollama':
            models = get_ollama_models()
        else:
            models = []
        
        # If no models found, return at least the current model
        if not models:
            models = [{
                'id': current_model,
                'name': current_model
            }]
        
        return jsonify({
            'success': True,
            'models': models,
            'current_model': current_model,
            'service': ai_service
        })
    except Exception as e:
        logger.error(f"Error getting models: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/models/current', methods=['PUT'])
def set_current_model():
    """Set the current AI model"""
    try:
        data = request.get_json()
        model_id = data.get('model_id')
        
        if not model_id:
            return jsonify({
                'success': False,
                'error': 'Model ID is required'
            }), 400
        
        # Verify model exists in Ollama
        models = get_ollama_models()
        if not any(m['id'] == model_id for m in models):
            return jsonify({
                'success': False,
                'error': f'Model {model_id} not found in Ollama'
            }), 404
        
        # Update environment variable
        os.environ['OLLAMA_MODEL'] = model_id
        
        return jsonify({
            'success': True,
            'current_model': model_id
        })
    except Exception as e:
        logger.error(f"Error setting current model: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/sessions/<session_id>/config', methods=['GET'])
def get_config(session_id: str):
    """Get configuration for a session."""
    # TODO: Implement database query
    # For now, return mock data
    config = SessionConfig(
        session_id=session_id,
        model_name="llama-2-13b"
    )
    return jsonify(config.model_dump())

@bp.route('/sessions/<session_id>/config', methods=['PUT'])
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