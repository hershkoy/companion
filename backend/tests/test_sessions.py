import pytest
from flask import json
from uuid import uuid4

def test_list_sessions(client):
    response = client.get('/api/sessions')
    assert response.status_code == 200
    assert isinstance(response.json, list)

def test_create_session(client):
    data = {'title': 'Test Session'}
    response = client.post('/api/sessions', json=data)
    assert response.status_code == 201
    assert 'session_id' in response.json
    assert response.json['title'] == data['title']

def test_get_session(client):
    # First create a session
    data = {'title': 'Test Session'}
    create_response = client.post('/api/sessions', json=data)
    session_id = create_response.json['session_id']

    # Then get it
    response = client.get(f'/api/sessions/{session_id}')
    assert response.status_code == 200
    assert response.json['session_id'] == session_id
    assert response.json['title'] == data['title']

def test_get_nonexistent_session(client):
    response = client.get(f'/api/sessions/{uuid4()}')
    assert response.status_code == 404 