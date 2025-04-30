import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const getConfig = async sessionId => {
  try {
    const response = await axios.get(`${API_BASE_URL}/config/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
};

export const putConfig = async (sessionId, config) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/config/${sessionId}`, config);
    return response.data;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
};
