import axios, { type AxiosResponse } from 'axios';
import { API_BASE_URL } from './config';
import {
  GetMessagesResponse,
  PostMessageRequest,
  PostMessageResponse,
} from '../types/api';

/**
 * Fetches all messages for a given session
 * @param sessionId - The ID of the chat session
 * @param signal - Optional AbortController signal for request cancellation
 * @returns Promise with the messages response
 */
export const getMessages = async (
  sessionId: string,
  signal?: AbortSignal
): Promise<GetMessagesResponse> => {
  try {
    const config = { signal };
    const response = await axios.get<GetMessagesResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/messages`,
      config
    );
    return response.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError') {
      throw error;
    }
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Posts a new message to a chat session
 * @param sessionId - The ID of the chat session
 * @param messageData - The message data to send
 * @param signal - Optional AbortController signal for request cancellation
 * @returns Promise with the message response
 */
export const postMessage = async (
  sessionId: string,
  messageData: PostMessageRequest,
  signal?: AbortSignal
): Promise<PostMessageResponse> => {
  try {
    const config = { signal };
    const response = await axios.post<PostMessageResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/messages`,
      messageData,
      config
    );
    return response.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError') {
      throw error;
    }
    console.error('Error posting message:', error);
    throw error;
  }
};
