import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { fetchMessages } from '../../store/slices/chatSlice';
import './ChatWindow.css';

function ChatWindow({ sessionId }) {
  const dispatch = useDispatch();
  const { messages, status, error } = useSelector(state => state.chat);

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
}

export default ChatWindow;
