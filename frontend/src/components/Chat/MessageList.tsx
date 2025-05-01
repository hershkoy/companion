import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { Message } from '../../types/chat';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
}

function formatMessageTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          key={message.id}
          className={`message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
        >
          <div className="message-content">{message.content}</div>
          <div className="message-timestamp">
            {formatMessageTimestamp(message.timestamp)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
