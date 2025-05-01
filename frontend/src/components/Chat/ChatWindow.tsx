import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import './ChatWindow.css';

interface ChatWindowProps {
  sessionId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const { messages, status, lastAudioMessageId } = useAppSelector(state => state.chat);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<{ messageId: string; segmentIndex: number } | null>(null);
  const playedMessagesRef = useRef<Set<string>>(new Set());

  // Start playback when a new audio message arrives
  useEffect(() => {
    if (lastAudioMessageId && !playedMessagesRef.current.has(lastAudioMessageId)) {
      playedMessagesRef.current.add(lastAudioMessageId);
      setCurrentPlayingIndex({ messageId: lastAudioMessageId, segmentIndex: 0 });
    }
  }, [lastAudioMessageId]); // Only depend on lastAudioMessageId

  // Handle audio segment completion
  const handleAudioComplete = (messageId: string, segmentIndex: number, totalSegments: number) => {
    if (segmentIndex < totalSegments - 1) {
      // Play next segment in the same message
      setCurrentPlayingIndex({ messageId, segmentIndex: segmentIndex + 1 });
    } else {
      // End of segments for this message
      setCurrentPlayingIndex(null);
    }
  };

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
                    shouldPlay={
                      currentPlayingIndex?.messageId === message.id &&
                      currentPlayingIndex?.segmentIndex === index
                    }
                    onComplete={() => handleAudioComplete(
                      message.id,
                      index,
                      message.audioSegments?.length || 0
                    )}
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
