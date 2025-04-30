import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { fetchMessages } from '../../store/slices/chatSlice';
import { Message } from '../../types/chat';
import './ChatWindow.css';

interface ChatWindowProps {
  sessionId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const dispatch = useAppDispatch();
  const { messages, status, error } = useAppSelector(state => state.chat);

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchMessages(sessionId));
    }
  }, [dispatch, sessionId]);

  if (status === 'loading') {
    return (
      <div className="chat-window">
        <div className="chat-loading">
          <div className="chat-loading-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-window">
        <div className="chat-error">
          <div>
            <p>Error loading messages: {error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchMessages(sessionId))}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <MessageList messages={messages} />
      <MessageInput sessionId={sessionId} />
    </div>
  );
};

export default ChatWindow; 