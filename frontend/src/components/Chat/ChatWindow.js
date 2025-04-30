import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { fetchMessages } from '../../store/slices/chatSlice';

const ChatWindow = ({ sessionId }) => {
  const dispatch = useDispatch();
  const { messages, status, error } = useSelector(state => state.chat);

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchMessages(sessionId));
    }
  }, [dispatch, sessionId]);

  if (status === 'loading') {
    return <div>Loading messages...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="chat-window">
      <MessageList messages={messages} />
      <MessageInput sessionId={sessionId} />
    </div>
  );
};

export default ChatWindow;
