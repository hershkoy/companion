import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { sendMessage } from '../../store/slices/chatSlice';
import ThinkingModeSelector from './ThinkingModeSelector';

interface MessageInputProps {
  sessionId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ sessionId }) => {
  const dispatch = useAppDispatch();
  const [content, setContent] = useState('');
  const { thinkingMode } = useAppSelector(state => state.config);
  const { status } = useAppSelector(state => state.chat);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await dispatch(
        sendMessage({
          sessionId,
          content: content.trim(),
          thinkingMode,
        })
      ).unwrap();
      setContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input">
      <ThinkingModeSelector />
      <div className="input-container">
        <textarea
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Type your message..."
          disabled={status === 'loading'}
        />
        <button type="submit" disabled={status === 'loading' || !content.trim()}>
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 