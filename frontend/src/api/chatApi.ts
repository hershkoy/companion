import axios from 'axios';
import { Message } from '../types/chat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

interface PostMessageRequest {
  content: string;
  thinking_mode: string;
}

export const getMessages = async (sessionId: string): Promise<Message[]> => {
  try {
    const response = await axios.get<Message[]>(`${API_BASE_URL}/sessions/${sessionId}/messages`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const postMessage = async (
  sessionId: string,
  { content, thinking_mode }: PostMessageRequest
): Promise<Message> => {
  try {
    const response = await axios.post<Message>(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      content,
      thinking_mode,
    });
    return response.data;
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
};
