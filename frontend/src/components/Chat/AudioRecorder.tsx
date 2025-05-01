import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { sendAudioMessage } from '../../store/slices/chatSlice';
import './AudioRecorder.css';

const MIME_TYPE = 'audio/webm;codecs=opus';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface AudioRecorderProps {
  sessionId: string;
}

interface ApiError {
  message: string;
  status?: number;
}

export function AudioRecorder({ sessionId }: AudioRecorderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Array<Blob>>([]);
  const retryCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
        chunksRef.current = [];
      }
    };
  }, [isRecording]);

  async function sendAudioWithRetry(formData: FormData): Promise<void> {
    try {
      setError(null);
      const result = await dispatch(sendAudioMessage(formData)).unwrap();
      if (!result.success) {
        throw new Error(result.error || 'Failed to process audio');
      }
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Failed to send audio:', apiError);
      
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        await sendAudioWithRetry(formData);
      } else {
        setError(apiError.message || 'Failed to send audio after multiple attempts');
        retryCountRef.current = 0;
      }
    }
  }

  async function startRecording(): Promise<void> {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MIME_TYPE
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: MIME_TYPE });
          if (audioBlob.size === 0) {
            throw new Error('No audio data recorded');
          }
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('sessionId', sessionId);

          await sendAudioWithRetry(formData);
        } finally {
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          chunksRef.current = [];
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      const error = err as Error;
      console.error('Error accessing microphone:', error);
      setError(error.message || 'Failed to access microphone');
    }
  }

  function stopRecording(): void {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }

  function togglePause(): void {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  }

  function cancelRecording(): void {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      chunksRef.current = [];
      setError(null);
    }
  }

  return (
    <div className="audio-recorder">
      {error && <div className="error-message">{error}</div>}
      {!isRecording ? (
        <button
          className="record-button"
          onClick={startRecording}
          title="Start Recording"
        >
          🎤 Record
        </button>
      ) : (
        <div className="recording-controls">
          <button
            className={`record-button ${isPaused ? '' : 'recording'}`}
            onClick={togglePause}
            title={isPaused ? "Resume Recording" : "Pause Recording"}
          >
            {isPaused ? "⏵" : "⏸"}
          </button>
          <button
            className="stop-button"
            onClick={stopRecording}
            title="Stop Recording"
          >
            ⏹
          </button>
          <button
            className="cancel-button"
            onClick={cancelRecording}
            title="Cancel Recording"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
} 