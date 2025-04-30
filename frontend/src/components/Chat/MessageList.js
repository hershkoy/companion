import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const MessageList = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
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
    </div>
  );
};

export default MessageList; 