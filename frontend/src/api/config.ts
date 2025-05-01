import axios from 'axios';

// API base URL configuration
const isDevelopment = process.env.NODE_ENV === 'development';
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api'
  : '/api';

export const WS_BASE_URL = isDevelopment
  ? 'ws://localhost:5000/backend/ws'
  : '/backend/ws';

console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', API_BASE_URL);
console.log('WebSocket Base URL:', WS_BASE_URL);

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  config => {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error logging
apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data,
    });
    return response;
  },
  error => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
        config: {
          method: error.config.method?.toUpperCase(),
          url: error.config.url,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
        },
      });
    } else if (error.request) {
      console.error('API Request Error:', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
); 