from flask import Blueprint, jsonify, request

bp = Blueprint('embeddings', __name__, url_prefix='/api/embeddings')

# Mock state (replace with proper state management)
indexing_state = {
    'is_indexing': False,
    'gpu_utilization': 0.0
}

@bp.route('/status', methods=['GET'])
def get_status():
    """Get current indexing status and GPU utilization."""
    # TODO: Get real GPU utilization from gpu_monitor service
    # TODO: Get real indexing status from scheduler service
    return jsonify(indexing_state)

@bp.route('/index', methods=['POST'])
def trigger_indexing():
    """Manually trigger document indexing."""
    if indexing_state['is_indexing']:
        return jsonify({
            'error': 'Indexing already in progress'
        }), 409
    
    # TODO: Call scheduler service to start indexing
    indexing_state['is_indexing'] = True
    
    return jsonify({
        'message': 'Indexing started',
        'status': indexing_state
    }) 