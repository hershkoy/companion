import pytest
from unittest.mock import Mock, patch
from services.rag_service import RagService

@pytest.fixture
def mock_chroma():
    return Mock()

@pytest.fixture
def mock_model_manager():
    return Mock()

@pytest.fixture
def rag_service(mock_chroma, mock_model_manager):
    return RagService(chroma_client=mock_chroma, model_manager=mock_model_manager)

def test_generate_response_cot(rag_service, mock_model_manager):
    mock_model_manager.generate.return_value = "Let me think step by step...\nFinal answer: Test response"
    
    response = rag_service.generate_response(
        session_id="test-session",
        user_message="test question",
        thinking_mode="cot"
    )
    
    assert "Test response" in response
    assert mock_model_manager.generate.called
    assert not mock_model_manager.embed.called

def test_generate_response_rag(rag_service, mock_chroma, mock_model_manager):
    mock_model_manager.embed.return_value = [0.1, 0.2, 0.3]
    mock_chroma.query.return_value = [
        {"text": "relevant context", "score": 0.9}
    ]
    mock_model_manager.generate.return_value = "Based on the context: Test response"
    
    response = rag_service.generate_response(
        session_id="test-session",
        user_message="test question",
        thinking_mode="rag"
    )
    
    assert "Test response" in response
    assert mock_model_manager.embed.called
    assert mock_chroma.query.called
    assert mock_model_manager.generate.called

def test_generate_response_hybrid(rag_service, mock_chroma, mock_model_manager):
    mock_model_manager.embed.return_value = [0.1, 0.2, 0.3]
    mock_chroma.query.return_value = [
        {"text": "relevant context", "score": 0.9}
    ]
    mock_model_manager.generate.side_effect = [
        "Let me think step by step...\nIntermediate thought",
        "Based on context and reasoning: Final response"
    ]
    
    response = rag_service.generate_response(
        session_id="test-session",
        user_message="test question",
        thinking_mode="hybrid"
    )
    
    assert "Final response" in response
    assert mock_model_manager.embed.called
    assert mock_chroma.query.called
    assert mock_model_manager.generate.call_count == 2

def test_generate_response_error(rag_service, mock_model_manager):
    mock_model_manager.generate.side_effect = Exception("Model error")
    
    with pytest.raises(Exception):
        rag_service.generate_response(
            session_id="test-session",
            user_message="test question",
            thinking_mode="cot"
        ) 