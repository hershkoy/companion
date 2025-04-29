import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import logger from './utils/logger';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Generate session ID on page load
  useEffect(() => {
    const generateSessionId = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `session-${timestamp}-${random}`;
    };
    
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    logger.info('New session started:', newSessionId);
  }, []);

  const playNextSegment = useCallback(() => {
    if (audioQueueRef.current.length > 0 && !isProcessingRef.current) {
      isProcessingRef.current = true;
      const nextSegment = audioQueueRef.current.shift();
      const audio = new Audio(`data:audio/wav;base64,${nextSegment.audio}`);
      currentAudioRef.current = audio;

      audio.onended = () => {
        isProcessingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextSegment();
        } else {
          setIsPlaying(false);
        }
      };

      audio.play().catch(error => {
        logger.error('Error playing audio:', error);
        isProcessingRef.current = false;
        setError('Error playing audio: ' + error.message);
      });
    }
  }, []);

  const processN8nResponse = async (data) => {
    try {
      logger.info('Processing n8n response:', data);
      
      // Extract the agent message from n8n response
      const agentMessage = data.response?.agentMessage;
      if (!agentMessage) {
        throw new Error('No agent message in n8n response');
      }

      // Add AI response to conversation
      setConversation(prev => [...prev, { type: 'ai', text: agentMessage }]);

      // If we already have audio segments, use them directly
      if (data.response?.segments?.length > 0) {
        logger.info('Using pre-generated audio segments');
        audioQueueRef.current = [...data.response.segments];
        setIsPlaying(true);
        playNextSegment();
        return;
      }

      // Otherwise, send to TTS service
      logger.info('Sending to kokoro for TTS:', agentMessage);
      const ttsResponse = await fetch('http://localhost:5000/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: agentMessage }),
      });

      const ttsData = await ttsResponse.json();
      if (!ttsData.success) {
        throw new Error(ttsData.error || 'TTS conversion failed');
      }

      // Store audio segments and prepare for playback
      audioQueueRef.current = [...(ttsData.segments || [])];
      setIsPlaying(true);
      playNextSegment();
      
    } catch (error) {
      logger.error('Error processing n8n response:', error);
      setError('Error processing AI response: ' + error.message);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      logger.info('Starting recording...', { sessionId });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        logger.info('Recording stopped, processing audio...', { sessionId });
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('sessionId', sessionId);

        try {
          const response = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            logger.info('Successfully processed audio', { sessionId });
            // Add user message to conversation
            setConversation(prev => [...prev, { type: 'user', text: data.transcription }]);
            
            // Process n8n response and convert to speech
            await processN8nResponse(data);
          } else {
            const errorMsg = data.error || 'Unknown error occurred';
            logger.error('Transcription failed:', errorMsg, { sessionId });
            setError(errorMsg);
          }
        } catch (error) {
          const errorMessage = error.message || 'Error connecting to server';
          logger.error('Error sending audio to server:', error, { sessionId });
          setError(errorMessage);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      logger.error('Error accessing microphone:', error, { sessionId });
      setError('Error accessing microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      logger.info('Stopping recording...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const stopPlayback = () => {
    if (currentAudioRef.current) {
      logger.info('Stopping audio playback');
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsPlaying(false);
  };

  // Scroll to bottom of messages when conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Chat Assistant</h1>
        
        <div className="chat-container">
          <div className="messages">
            {conversation.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                <div className="message-content">
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="control-buttons">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`record-button ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            {isPlaying && (
              <button 
                onClick={stopPlayback}
                className="stop-button"
              >
                Stop Playback
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
