from flask import Blueprint, jsonify, request, current_app

bp = Blueprint('embeddings', __name__, url_prefix='/api/embeddings')

@bp.route('/status', methods=['GET'])
def get_status():
    """Get current indexing status and GPU utilization."""
    gpu_monitor = current_app.gpu_monitor
    metrics = gpu_monitor.get_metrics()
    
    return jsonify({
        'is_indexing': gpu_monitor._is_indexing,
        'gpu_utilization': metrics['utilization'],
        'gpu_available': metrics['gpu_available']
    })

@bp.route('/index', methods=['POST'])
def trigger_indexing():
    """Manually trigger document indexing."""
    gpu_monitor = current_app.gpu_monitor
    metrics = gpu_monitor.get_metrics()
    
    if not metrics['gpu_available']:
        return jsonify({
            'error': 'GPU monitoring not available'
        }), 503
    
    if gpu_monitor._is_indexing:
        return jsonify({
            'error': 'Indexing already in progress'
        }), 409
    
    # Set indexing status to true
    gpu_monitor.set_indexing_status(True)
    
    # TODO: Call scheduler service to start indexing
    # When indexing is complete, call gpu_monitor.set_indexing_status(False)
    
    return jsonify({
        'message': 'Indexing started',
        'status': {
            'is_indexing': True,
            'gpu_utilization': gpu_monitor.get_utilization(),
            'gpu_available': metrics['gpu_available']
        }
    }) 