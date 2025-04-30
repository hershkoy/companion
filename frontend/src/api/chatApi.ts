import { apiClient } from './config';
import { Message } from '../types/chat';

interface PostMessageRequest {
  content: string;
  thinking_mode: string;
}

export const getMessages = async (sessionId: string): Promise<Message[]> => {
  try {
    const response = await apiClient.get<Message[]>(`/sessions/${sessionId}/messages`);
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
    const response = await apiClient.post<Message>(`/sessions/${sessionId}/messages`, {
      content,
      thinking_mode,
    });
    return response.data;
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
};
