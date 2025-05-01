import axios from 'axios';
import { API_BASE_URL } from './config';
import {
  GetMessagesResponse,
  PostMessageRequest,
  PostMessageResponse,
} from '../types/api';

/**
 * Fetches all messages for a given session
 * @param sessionId - The ID of the chat session
 * @returns Promise with the messages response
 */
export const getMessages = async (sessionId: string): Promise<GetMessagesResponse> => {
  try {
    const response = await axios.get<GetMessagesResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/messages`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Posts a new message to a chat session
 * @param sessionId - The ID of the chat session
 * @param messageData - The message data to send
 * @returns Promise with the message response
 */
export const postMessage = async (
  sessionId: string,
  messageData: PostMessageRequest
): Promise<PostMessageResponse> => {
  try {
    const response = await axios.post<PostMessageResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/messages`,
      messageData
    );
    return response.data;
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
};
