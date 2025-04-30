import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const getModels = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/models`);
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

export const getEmbeddingStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/embeddings/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching embedding status:', error);
    throw error;
  }
};

export const triggerIndexing = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/embeddings/index`);
    return response.data;
  } catch (error) {
    console.error('Error triggering indexing:', error);
    throw error;
  }
}; 