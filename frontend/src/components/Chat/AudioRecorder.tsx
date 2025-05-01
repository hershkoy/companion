import React, { useState, useRef } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { sendAudioMessage } from '../../store/slices/chatSlice';
import './AudioRecorder.css';

interface AudioRecorderProps {
  sessionId: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ sessionId }) => {
  const dispatch = useAppDispatch();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('sessionId', sessionId);

        try {
          await dispatch(sendAudioMessage(formData)).unwrap();
        } catch (error) {
          console.error('Failed to send audio:', error);
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        chunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      chunksRef.current = [];
    }
  };

  return (
    <div className="audio-recorder">
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
};

export default AudioRecorder; 