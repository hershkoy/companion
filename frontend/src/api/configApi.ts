import axios from 'axios';
import { API_BASE_URL } from './config';
import {
  ApiConfig,
  GetConfigResponse,
  PutConfigResponse,
} from '../types/api';

/**
 * Fetches the configuration for a given session
 * @param sessionId - The ID of the chat session
 * @returns Promise with the configuration response
 */
export const getConfig = async (sessionId: string): Promise<GetConfigResponse> => {
  try {
    const response = await axios.get<GetConfigResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/config`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
};

/**
 * Updates the configuration for a given session
 * @param sessionId - The ID of the chat session
 * @param config - The configuration data to update
 * @returns Promise with the configuration response
 */
export const putConfig = async (
  sessionId: string,
  config: Partial<ApiConfig>
): Promise<PutConfigResponse> => {
  try {
    const response = await axios.put<PutConfigResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/config`,
      config
    );
    return response.data;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
};
