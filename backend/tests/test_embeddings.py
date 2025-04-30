import pytest
from flask import json
from unittest.mock import patch

def test_get_status(client):
    response = client.get('/api/embeddings/status')
    assert response.status_code == 200
    assert 'is_indexing' in response.json
    assert 'gpu_util' in response.json
    assert isinstance(response.json['is_indexing'], bool)
    assert isinstance(response.json['gpu_util'], (int, float))

@patch('services.gpu_monitor.get_utilization')
def test_get_status_with_mock(mock_get_utilization, client):
    mock_get_utilization.return_value = 45.6
    response = client.get('/api/embeddings/status')
    assert response.status_code == 200
    assert response.json['gpu_util'] == 45.6

def test_trigger_indexing(client):
    response = client.post('/api/embeddings/index')
    assert response.status_code == 202  # Accepted
    assert 'message' in response.json

@patch('services.scheduler.is_indexing')
def test_trigger_indexing_while_running(mock_is_indexing, client):
    mock_is_indexing.return_value = True
    response = client.post('/api/embeddings/index')
    assert response.status_code == 409  # Conflict 