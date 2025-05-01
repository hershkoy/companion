import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatWindow.css';

interface ChatWindowProps {
  sessionId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const { messages, status, error } = useAppSelector(state => state.chat);

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
