import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const getMessages = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/messages`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const postMessage = async (sessionId, { content, thinking_mode }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      content,
      thinking_mode
    });
    return response.data;
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
}; 