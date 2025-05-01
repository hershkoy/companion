import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ChatWindow from '../components/Chat/ChatWindow';
import ModelSelector from '../components/Chat/ModelSelector';
import IndexingIndicator from '../components/Chat/IndexingIndicator';
import { resetInitialization } from '../store/slices/configSlice';
import useGpuStatus from '../hooks/useGpuStatus';
import { useInitialization } from '../hooks/useInitialization';
import './ChatPage.css';

type ChatPageParams = {
  sessionId?: string;
};

function ChatPage(): React.ReactElement {
  const { sessionId } = useParams<'sessionId'>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useInitialization(sessionId);

  // Redirect to home if no sessionId
  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
    }
  }, [sessionId, navigate]);

  // Start GPU status polling
  useGpuStatus();

  if (!sessionId) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div>Initializing session...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div>Loading chat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <button 
            type="button" 
            onClick={() => {
              dispatch(resetInitialization());
            }} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <ModelSelector />
        <IndexingIndicator />
      </div>
      <ChatWindow sessionId={sessionId} />
    </div>
  );
}

export default ChatPage; 