export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  latest_message?: string;
  isActive?: boolean;
  messages: Message[];
}

export interface ModelConfig {
  name: string;
  id: string;
}

export interface ThinkingMode {
  id: string;
  name: string;
  description: string;
}
