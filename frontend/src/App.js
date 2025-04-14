import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import logger from './utils/logger';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioSegments, setAudioSegments] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

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

      // Send the agent message to kokoro for TTS
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

      // Update state with the response
      setAiResponse(agentMessage);
      
      // Store audio segments and prepare for playback
      setAudioSegments(ttsData.segments || []);
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
            setTranscription(data.transcription);
            
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Transcription & Response</h1>
        
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

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {transcription && (
          <div className="transcription">
            <h2>Your Message:</h2>
            <p>{transcription}</p>
          </div>
        )}

        {aiResponse && (
          <div className="ai-response">
            <h2>AI Response:</h2>
            <p>{aiResponse}</p>
          </div>
        )}

        {audioSegments.length > 0 && (
          <div className="segments">
            <h3>Response Segments:</h3>
            {audioSegments.map((segment, index) => (
              <div key={index} className="segment">
                <p>{segment.text}</p>
              </div>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
