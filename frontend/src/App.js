import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import logger from './utils/logger';
import ChatList from './components/ChatList';
import wsManager from './utils/websocket';

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

// Add API base URL constant
const API_BASE_URL = 'http://localhost:5000/backend';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [chatId, setChatId] = useState('');
  const [chats, setChats] = useState([]);
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
  const [ws, setWs] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const initRef = useRef(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Select a chat
  const selectChat = useCallback(async (id) => {
    try {
      // Update chats list first to show the selection
      setChats(prev => prev.map(chat => ({
        ...chat,
        isActive: chat.id === id
      })));
      setChatId(id);
      
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}/messages`);
      const data = await response.json();
      if (data.success) {
        setConversation(data.messages);
        setError(null);
      }
    } catch (error) {
      logger.error('Error loading chat messages:', error);
      setError('Error loading chat messages');
    }
  }, []);

  // Load chats from the backend
  const loadChats = useCallback(async () => {
    console.log('[INFO] [Chats] Fetching chats from backend');
    try {
      const response = await fetch('/backend/api/sessions');
      const data = await response.json();
      if (data.success) {
        console.log(`[INFO] [Chats] Loaded ${data.sessions.length} chats`);
        setChats(data.sessions);
        // Only auto-select if no current chat
        if (!chatId && data.sessions.length > 0) {
          selectChat(data.sessions[0].id);
        }
      }
    } catch (error) {
      console.error('[ERROR] [Chats] Failed to load chats:', error);
    }
  }, [chatId, selectChat]);

  // Create a new chat
  const createChat = async () => {
    try {
      logger.info('[Chats] Creating new chat');
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await response.json();
      if (data.success) {
        logger.info(`[Chats] Created new chat: ${data.session.id}`);
        const newChat = {
          ...data.session,
          isActive: true
        };
        
        // Update state in a single batch
        setChats(prev => [newChat, ...prev.map(chat => ({ ...chat, isActive: false }))]);
        setChatId(newChat.id);
        setConversation([]);
        setError(null);
        return newChat;
      }
      throw new Error('Failed to create chat');
    } catch (error) {
      logger.error('[Chats] Error creating chat:', error);
      setError('Error creating new chat');
      throw error;
    }
  };

  // Delete a chat
  const deleteChat = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setChats(prev => prev.filter(chat => chat.id !== id));
        if (chatId === id) {
          const remainingChats = chats.filter(chat => chat.id !== id);
          if (remainingChats.length > 0) {
            await selectChat(remainingChats[0].id);
          } else {
            setChatId('');
            setConversation([]);
          }
        }
      }
    } catch (error) {
      logger.error('Error deleting chat:', error);
      setError('Error deleting chat');
    }
  };

  // Update chat title
  const updateChatTitle = async (id, title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (data.success) {
        setChats(prev => prev.map(chat => 
          chat.id === id ? { ...chat, title } : chat
        ));
      }
    } catch (error) {
      logger.error('Error updating chat title:', error);
      setError('Error updating chat title');
    }
  };

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
      const ttsResponse = await fetch(`${API_BASE_URL}/api/tts`, {
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
      let currentChatId = chatId;
      
      // Check if we have an active chat, if not create one
      if (!currentChatId) {
        logger.info('[Chats] No active chat, creating one');
        const newChat = await createChat();
        currentChatId = newChat.id;
        
        // Update state in a single batch to prevent race conditions
        setChats(prev => [
          { ...newChat, isActive: true },
          ...prev.map(chat => ({ ...chat, isActive: false }))
        ]);
        setChatId(currentChatId);
        setConversation([]);
      }

      setError(null);
      logger.info('Starting recording...', { chatId: currentChatId });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        logger.info('Recording stopped, processing audio...', { chatId: currentChatId });
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('sessionId', currentChatId);
        formData.append('systemPrompt', systemPrompt);
        formData.append('num_ctx', numCtx.toString());
        
        // Add conversation history within token limit
        const maxHistoryTokens = Math.floor(numCtx * 0.75);
        const history = getConversationHistory(conversation, maxHistoryTokens);
        formData.append('conversationHistory', JSON.stringify(history));

        try {
          const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            logger.info('Successfully processed audio', { chatId: currentChatId });
            // Show transcription immediately
            if (data.transcription) {
              setConversation(prev => [...prev, { type: 'user', text: data.transcription }]);
            }
            
            // Process n8n response and convert to speech
            await processN8nResponse(data);
          } else {
            const errorMsg = data.error || 'Unknown error occurred';
            logger.error('Transcription failed:', errorMsg, { chatId: currentChatId });
            setError(errorMsg);
          }
        } catch (error) {
          const errorMessage = error.message || 'Error connecting to server';
          logger.error('Error sending audio to server:', error, { chatId: currentChatId });
          setError(errorMessage);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      logger.error('Error accessing microphone:', error);
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

  useEffect(() => {
    const connectWebSocket = () => {
      if (isConnecting || wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[DEBUG] [WebSocket] Already connected or connecting');
        return;
      }

      setIsConnecting(true);
      console.log('[INFO] [WebSocket] Attempting connection');

      const newWs = new WebSocket('ws://localhost:5000/backend/ws');
      wsRef.current = newWs;

      newWs.onopen = () => {
        console.log('[INFO] [WebSocket] Connection established');
        setWs(newWs);
        setIsConnecting(false);
      };

      newWs.onclose = () => {
        console.log('[INFO] [WebSocket] Connection closed');
        setWs(null);
        wsRef.current = null;
        setIsConnecting(false);

        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[INFO] [WebSocket] Attempting to reconnect');
          connectWebSocket();
        }, 5000);
      };

      newWs.onerror = (error) => {
        console.error('[ERROR] [WebSocket] Connection error:', error);
      };

      newWs.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'session_title_update') {
            console.log('[INFO] [WebSocket] Received title update for chat:', data.session_id);
            // Update only the specific chat's title
            setChats(prevChats => 
              prevChats.map(chat => 
                chat.id === data.session_id 
                  ? { ...chat, title: data.title }
                  : chat
              )
            );
          }
        } catch (error) {
          console.error('[ERROR] [WebSocket] Failed to process message:', error);
        }
      };
    };

    // Initialize only once
    if (!initRef.current) {
      console.log('[DEBUG] [Init] First initialization');
      loadChats();
      connectWebSocket();
      initRef.current = true;
    } else {
      console.log('[DEBUG] [Init] Skipping duplicate initialization');
    }

    // Cleanup function
    return () => {
      console.log('[INFO] [WebSocket] Cleaning up connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [loadChats]);

  return (
    <div className="App">
      <ChatList
        sessions={chats}
        currentSession={chats.find(chat => chat.id === chatId)}
        onSelectSession={selectChat}
        onCreateSession={createChat}
        onDeleteSession={deleteChat}
        onUpdateSessionTitle={updateChatTitle}
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
