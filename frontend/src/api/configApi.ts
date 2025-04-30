import axios from 'axios';
import { ModelConfig } from '../types/chat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const getConfig = async (sessionId: string): Promise<ModelConfig> => {
  try {
    const response = await axios.get<ModelConfig>(`${API_BASE_URL}/config/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
};

export const putConfig = async (sessionId: string, config: ModelConfig): Promise<ModelConfig> => {
  try {
    const response = await axios.put<ModelConfig>(`${API_BASE_URL}/config/${sessionId}`, config);
    return response.data;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
}; 