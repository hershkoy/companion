import { useState, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioSegments, setAudioSegments] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

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
        console.error('Error playing audio:', error);
        isProcessingRef.current = false;
      });
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            setTranscription(data.transcription);
            setAiResponse(data.response.full_text);
            
            // Store audio segments and prepare for playback
            setAudioSegments(data.response.segments);
            audioQueueRef.current = [...data.response.segments];
            setIsPlaying(true);
            playNextSegment();
          } else {
            console.error('Transcription failed:', data.error);
          }
        } catch (error) {
          console.error('Error sending audio to server:', error);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const stopPlayback = () => {
    if (currentAudioRef.current) {
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
