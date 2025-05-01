import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import './ChatWindow.css';

interface ChatWindowProps {
  sessionId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const { messages, status } = useAppSelector(state => state.chat);

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-text">{message.content}</div>
            {message.role === 'assistant' && message.audioSegments && (
              <div className="audio-segments">
                {message.audioSegments.map((segment, index) => (
                  <AudioPlayer
                    key={index}
                    audioData={segment.audio}
                    text={segment.text}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {status === 'loading' && (
          <div className="message system">
            Processing your message...
          </div>
        )}
      </div>
      <div className="input-area">
        <AudioRecorder sessionId={sessionId} />
      </div>
    </div>
  );
};

export default ChatWindow;
