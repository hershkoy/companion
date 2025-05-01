import React, { useEffect, useRef, useState } from 'react';
import './AudioPlayer.css';

interface AudioPlayerProps {
  audioData: string;  // base64 encoded audio data
  text: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, text }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', updateProgress);
          audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
        }
      };
    }
  }, []);

  const updateProgress = () => {
    if (audioRef.current) {
      const value = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(value);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget;
      const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
      audioRef.current.currentTime = clickPosition * audioRef.current.duration;
    }
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={`data:audio/wav;base64,${audioData}`}
      />
      <div className="player-controls">
        <button
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="progress-bar" onClick={handleProgressClick}>
          <div
            className="progress"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="audio-text">{text}</div>
    </div>
  );
};

export default AudioPlayer; 