import axios from 'axios';
import {
  ApiConfig,
  GetConfigResponse,
  PutConfigResponse,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Fetches the configuration for a given session
 * @param sessionId - The ID of the chat session
 * @returns Promise with the configuration response
 */
export const getConfig = async (sessionId: string): Promise<GetConfigResponse> => {
  try {
    const response = await axios.get<GetConfigResponse>(
      `${API_BASE_URL}/config/${sessionId}`
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
      `${API_BASE_URL}/config/${sessionId}`,
      config
    );
    return response.data;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
};
