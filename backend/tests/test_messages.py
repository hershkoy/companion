import pytest
from flask import json

@pytest.fixture
def session_id(client):
    response = client.post('/api/sessions', json={'title': 'Test Session'})
    return response.json['session_id']

def test_list_messages(client, session_id):
    response = client.get(f'/api/sessions/{session_id}/messages')
    assert response.status_code == 200
    assert isinstance(response.json, list)

def test_create_message(client, session_id):
    data = {
        'content': 'Hello, world!',
        'thinking_mode': 'cot'
    }
    response = client.post(f'/api/sessions/{session_id}/messages', json=data)
    assert response.status_code == 201
    assert response.json['content'] == data['content']
    assert response.json['role'] == 'user'

def test_create_message_invalid_mode(client, session_id):
    data = {
        'content': 'Hello, world!',
        'thinking_mode': 'invalid'
    }
    response = client.post(f'/api/sessions/{session_id}/messages', json=data)
    assert response.status_code == 400

def test_create_message_empty_content(client, session_id):
    data = {
        'content': '',
        'thinking_mode': 'cot'
    }
    response = client.post(f'/api/sessions/{session_id}/messages', json=data)
    assert response.status_code == 400 