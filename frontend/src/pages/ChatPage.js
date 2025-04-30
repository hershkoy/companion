import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ChatWindow from '../components/Chat/ChatWindow';
import ModelSelector from '../components/Chat/ModelSelector';
import IndexingIndicator from '../components/Chat/IndexingIndicator';
import { fetchModels, fetchConfig } from '../store/slices/configSlice';
import useGpuStatus from '../hooks/useGpuStatus';

const ChatPage = () => {
  const { sessionId } = useParams();
  const dispatch = useDispatch();

  // Start GPU status polling
  useGpuStatus();

  useEffect(() => {
    if (sessionId) {
      // Fetch initial data
      dispatch(fetchModels());
      dispatch(fetchConfig(sessionId));
    }
  }, [dispatch, sessionId]);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <ModelSelector />
        <IndexingIndicator />
      </div>
      <ChatWindow sessionId={sessionId} />
    </div>
  );
};

export default ChatPage;
