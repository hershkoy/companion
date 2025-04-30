import pytest
from flask import json

@pytest.fixture
def session_id(client):
    response = client.post('/api/sessions', json={'title': 'Test Session'})
    return response.json['session_id']

def test_get_config(client, session_id):
    response = client.get(f'/api/config/{session_id}')
    assert response.status_code == 200
    assert 'model_name' in response.json
    assert 'thinking_mode' in response.json
    assert 'top_k' in response.json
    assert 'embed_light' in response.json
    assert 'embed_deep' in response.json
    assert 'idle_threshold_s' in response.json

def test_update_config(client, session_id):
    data = {
        'model_name': 'llama-2-13b',
        'thinking_mode': 'hybrid',
        'top_k': 10,
        'embed_light': 'all-MiniLM-L6-v2',
        'embed_deep': 'sentence-7b',
        'idle_threshold_s': 300
    }
    response = client.put(f'/api/config/{session_id}', json=data)
    assert response.status_code == 200
    assert response.json == data

def test_update_config_invalid_mode(client, session_id):
    data = {
        'thinking_mode': 'invalid'
    }
    response = client.put(f'/api/config/{session_id}', json=data)
    assert response.status_code == 400

def test_update_config_invalid_top_k(client, session_id):
    data = {
        'top_k': 0
    }
    response = client.put(f'/api/config/{session_id}', json=data)
    assert response.status_code == 400 