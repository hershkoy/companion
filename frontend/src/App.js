import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import logger from './utils/logger';
import ChatList from './components/ChatList';

// Simple token count estimation (approximately 4 chars per token)
const estimateTokenCount = (text) => {
  return Math.ceil(text.length / 4);
};

// Calculate total context tokens including system prompt and history
const calculateTotalContextTokens = (currentMessage, conversation, systemPrompt) => {
  let total = estimateTokenCount(systemPrompt); // System prompt tokens
  
  // Add tokens from conversation history
  for (const msg of conversation) {
    if (msg.type === 'system') continue;
    total += estimateTokenCount(msg.text);
  }
  
  // Add current message tokens
  total += estimateTokenCount(currentMessage);
  
  return total;
};

// Get conversation history within token limit
const getConversationHistory = (conversation, maxTokens) => {
  const history = [];
  let totalTokens = 0;

  // Start from the end (most recent messages)
  for (let i = conversation.length - 1; i >= 0; i--) {
    const message = conversation[i];
    if (message.type === 'system') continue; // Skip system messages
    
    const tokens = estimateTokenCount(message.text);
    if (totalTokens + tokens > maxTokens) break;
    
    history.unshift(message);
    totalTokens += tokens;
  }

  return history;
};

// Add WebSocket connection
const WS_URL = 'ws://localhost:5000/ws';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are a helpful and conversational assistant. Match the length of the user's message most of the time. Only elaborate if it is necessary to clarify or explain something important. Be friendly, direct, and natural.`
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [numCtx, setNumCtx] = useState(2048);
  const [isEditingNumCtx, setIsEditingNumCtx] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Load sessions only on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        logger.info('WebSocket connected');
        setWsConnected(true);
      };

      wsRef.current.onclose = () => {
        logger.info('WebSocket disconnected');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'title_update') {
            logger.info('Received title update:', data);
            // Update the session title and reload sessions to get latest data
            loadSessions();
          }
        } catch (error) {
          logger.error('Error processing WebSocket message:', error);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Load sessions from the backend
  const loadSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
        // If no current session, select the most recent one
        if (!sessionId && data.sessions.length > 0) {
          await selectSession(data.sessions[0].id);
        }
        // Update current session data if it exists
        else if (sessionId) {
          const currentSession = data.sessions.find(s => s.id === sessionId);
          if (currentSession) {
            // Update session data if needed
            const sessionResponse = await fetch(`http://localhost:5000/api/sessions/${sessionId}/messages`);
            const sessionData = await sessionResponse.json();
            if (sessionData.success) {
              setConversation(sessionData.messages);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error loading sessions:', error);
      setError('Error loading chat sessions');
    }
  };

  // Create a new chat session
  const createSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await response.json();
      if (data.success) {
        // Add new session to the list and select it
        setSessions(prev => [data.session, ...prev]);
        await selectSession(data.session.id);
        setConversation([]); // Clear conversation for new chat
      }
    } catch (error) {
      logger.error('Error creating session:', error);
      setError('Error creating new chat');
    }
  };

  // Select a chat session
  const selectSession = async (id) => {
    try {
      setSessionId(id); // Update session ID immediately
      const response = await fetch(`http://localhost:5000/api/sessions/${id}/messages`);
      const data = await response.json();
      if (data.success) {
        setConversation(data.messages);
        setError(null);
        // Update UI to show this is the current session
        setSessions(prev => prev.map(s => ({
          ...s,
          isActive: s.id === id
        })));
      }
    } catch (error) {
      logger.error('Error loading session messages:', error);
      setError('Error loading chat messages');
    }
  };

  // Delete a chat session
  const deleteSession = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (sessionId === id) {
          const remainingSessions = sessions.filter(s => s.id !== id);
          if (remainingSessions.length > 0) {
            await selectSession(remainingSessions[0].id);
          } else {
            setSessionId('');
            setConversation([]);
          }
        }
      }
    } catch (error) {
      logger.error('Error deleting session:', error);
      setError('Error deleting chat');
    }
  };

  // Update session title
  const updateSessionTitle = async (id, title) => {
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (data.success) {
        setSessions(prev => prev.map(s => 
          s.id === id ? { ...s, title } : s
        ));
      }
    } catch (error) {
      logger.error('Error updating session title:', error);
      setError('Error updating chat title');
    }
  };

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

      // Check if the agent wants to modify the system prompt
      if (data.response?.newSystemPrompt) {
        setSystemPrompt(data.response.newSystemPrompt);
        setConversation(prev => [...prev, { 
          type: 'system', 
          text: 'System prompt updated by AI' 
        }]);
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
        formData.append('systemPrompt', systemPrompt);
        formData.append('num_ctx', numCtx.toString());
        
        // Add conversation history within token limit
        const maxHistoryTokens = Math.floor(numCtx * 0.75);
        const history = getConversationHistory(conversation, maxHistoryTokens);
        formData.append('conversationHistory', JSON.stringify(history));

        try {
          const response = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            logger.info('Successfully processed audio', { sessionId });
            // Show transcription immediately
            if (data.transcription) {
              setConversation(prev => [...prev, { type: 'user', text: data.transcription }]);
            }
            
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
      <ChatList
        sessions={sessions}
        currentSession={sessions.find(s => s.id === sessionId)}
        onSelectSession={selectSession}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
        onUpdateSessionTitle={updateSessionTitle}
      />
      <div className="main-content">
        <header className="App-header">
          <h1>Audio Chat Assistant</h1>
          
          <div className="config-accordion">
            <button 
              className="config-header"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
              <span>Configuration</span>
              <svg 
                stroke="currentColor" 
                fill="none" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                height="1em" 
                width="1em" 
                style={{
                  transform: isConfigOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isConfigOpen && (
              <div className="config-content">
                <div className="config-row">
                  <div className="config-label">System Prompt</div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="config-input"
                    rows="3"
                  />
                </div>
                <div className="config-row">
                  <div className="config-label">Context Window</div>
                  <input
                    type="number"
                    value={numCtx}
                    onChange={(e) => setNumCtx(Math.max(1, parseInt(e.target.value) || 0))}
                    className="context-window-input"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-container">
            <div className="messages">
              {conversation.map((message, index) => (
                <div key={index} className={`message ${message.type}`}>
                  <div className="message-content">
                    {message.text}
                    <div className="token-count">
                      {message.type === 'user' ? (
                        <>
                          ~{estimateTokenCount(message.text)} tokens
                          <div className="total-context-tokens">
                            Total context: ~{calculateTotalContextTokens(
                              message.text,
                              conversation.slice(0, index),
                              systemPrompt
                            )} tokens
                          </div>
                        </>
                      ) : (
                        <>~{estimateTokenCount(message.text)} tokens</>
                      )}
                    </div>
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
    </div>
  );
}

export default App;
