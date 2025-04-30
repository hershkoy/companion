import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ChatWindow from '../components/Chat/ChatWindow';
import ModelSelector from '../components/Chat/ModelSelector';
import IndexingIndicator from '../components/Chat/IndexingIndicator';
import { fetchModels, fetchConfig } from '../store/slices/configSlice';
import useGpuStatus from '../hooks/useGpuStatus';
import './ChatPage.css';

function ChatPage() {
  const { sessionId } = useParams();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  // Start GPU status polling
  useGpuStatus();

  useEffect(() => {
    if (sessionId) {
      // Fetch initial data
      const loadData = async () => {
        try {
          await Promise.all([
            dispatch(fetchModels()).unwrap(),
            dispatch(fetchConfig(sessionId)).unwrap(),
          ]);
        } catch (err) {
          setError(err.message || 'Failed to load chat data');
        }
      };
      loadData();
    }
  }, [dispatch, sessionId]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <button type="button" onClick={() => window.location.reload()} className="retry-button">
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
