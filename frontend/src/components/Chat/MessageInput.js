import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage } from '../../store/slices/chatSlice';
import ThinkingModeSelector from './ThinkingModeSelector';

const MessageInput = ({ sessionId }) => {
  const dispatch = useDispatch();
  const [content, setContent] = useState('');
  const { thinkingMode } = useSelector(state => state.config);
  const { status } = useSelector(state => state.chat);

  const handleSubmit = async e => {
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
          onChange={e => setContent(e.target.value)}
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
