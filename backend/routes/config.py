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
        base_url = os.getenv('OLLAMA_URL', 'http://localhost:11434').rstrip('/')
        tags_url = f"{base_url}/api/tags"
        
        logger.info(f"[DEBUG] Environment OLLAMA_URL: {os.getenv('OLLAMA_URL')}")
        logger.info(f"[DEBUG] Using base_url: {base_url}")
        logger.info(f"[DEBUG] Fetching models from: {tags_url}")
        
        response = requests.get(tags_url, timeout=5)
        response.raise_for_status()
        
        # Extract model names and metadata
        data = response.json()
        logger.info(f"[DEBUG] Raw Ollama response: {data}")
        
        models = data.get('models', [])
        logger.info(f"[DEBUG] Number of models found: {len(models)}")
        
        transformed_models = [{
            'id': model['name'],
            'name': model['name'].split(':')[0],  # Remove ':latest' suffix
            'modified': model.get('modified_at', ''),
            'size': str(round(model.get('size', 0) / (1024 * 1024 * 1024), 2)) + ' GB',  # Convert to GB
            'format': model.get('details', {}).get('format', ''),
            'family': model.get('details', {}).get('family', ''),
            'parameters': model.get('details', {}).get('parameter_size', ''),
            'quantization': model.get('details', {}).get('quantization_level', '')
        } for model in models]
        
        logger.info(f"[DEBUG] Transformed models: {transformed_models}")
        return transformed_models
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[DEBUG] Error fetching Ollama models from {tags_url}: {str(e)}")
        logger.error(f"[DEBUG] Error type: {type(e)}")
        logger.error(f"[DEBUG] Error details: {e.__dict__}")
        return []

@bp.route('/models', methods=['GET'])
def get_models():
    """Get available AI models"""
    try:
        ai_service = os.getenv('AI_SERVICE', 'ollama').lower()
        current_model = os.getenv('OLLAMA_MODEL', 'deepseek-r1')
        
        logger.info(f"[DEBUG] Getting models for service: {ai_service}")
        logger.info(f"[DEBUG] Current model from env: {current_model}")
        
        if ai_service == 'ollama':
            models = get_ollama_models()
            logger.info(f"[DEBUG] Found {len(models)} Ollama models")
        else:
            models = []
            logger.warning(f"Unknown AI service: {ai_service}")
        
        # If no models found, return at least the current model
        if not models:
            logger.warning("[DEBUG] No models found, falling back to current model only")
            models = [{
                'id': current_model,
                'name': current_model
            }]
        
        response_data = {
            'success': True,
            'models': models,
            'current_model': current_model,
            'service': ai_service
        }
        logger.info(f"[DEBUG] Returning response: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"[DEBUG] Error getting models: {str(e)}")
        logger.error(f"[DEBUG] Error type: {type(e)}")
        logger.error(f"[DEBUG] Error details: {e.__dict__}")
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