import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './MessageList.css';

function MessageList({ messages }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-messages">
          <p>No messages yet. Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <div
          key={message.message_id}
          className={`message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
        >
          <div className="message-content">{message.content}</div>
          <div className="message-timestamp">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
