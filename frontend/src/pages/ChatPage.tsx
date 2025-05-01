import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../store/store';
import type { RootState } from '../types/store';
import ChatWindow from '../components/Chat/ChatWindow';
import ModelSelector from '../components/Chat/ModelSelector';
import IndexingIndicator from '../components/Chat/IndexingIndicator';
import { fetchModels, fetchConfig } from '../store/slices/configSlice';
import useGpuStatus from '../hooks/useGpuStatus';
import './ChatPage.css';

type ChatPageParams = {
  sessionId?: string;
};

function ChatPage(): React.ReactElement {
  const { sessionId } = useParams<'sessionId'>();
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { modelList } = useSelector((state: RootState) => state.config);

  // Start GPU status polling
  useGpuStatus();

  useEffect(() => {
    if (sessionId && !hasInitialized) {
      // Fetch initial data
      const loadData = async () => {
        try {
          // Fetch config first
          await dispatch(fetchConfig(sessionId)).unwrap();
          
          // Only fetch models if we don't have any
          if (modelList.length === 0) {
            await dispatch(fetchModels()).unwrap();
          }
          
          setHasInitialized(true);
        } catch (err) {
          const errorMessage = (err as Error).message || 'Failed to load chat data';
          console.error('Error loading data:', errorMessage);
          setError(errorMessage);
        }
      };
      loadData();
    }
  }, [dispatch, sessionId, hasInitialized, modelList.length]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error}
          <button 
            type="button" 
            onClick={() => {
              setError(null);
              setHasInitialized(false);
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
      <ChatWindow sessionId={sessionId || ''} />
    </div>
  );
}

export default ChatPage; 