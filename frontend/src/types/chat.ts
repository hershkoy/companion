export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioSegments?: Array<{
    text: string;
    audio: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  latest_message?: string;
  isActive?: boolean;
  messages: Message[];
}

export interface ChatState {
  messages: Message[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  currentSessionId: string | null;
  currentRequest: AbortController | null;
}

export interface ModelConfig {
  name: string;
  id: string;
  size?: string;
  family?: string;
  quantization?: string;
  modified?: string;
  format?: string;
  parameters?: string;
  template?: string;
  context_length?: number;
}

export interface ThinkingMode {
  id: string;
  name: string;
  description: string;
}
