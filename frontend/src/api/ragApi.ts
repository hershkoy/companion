import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/backend/api';

interface Model {
  id: string;
  name: string;
  description: string;
}

interface EmbeddingStatus {
  is_indexing: boolean;
  total_documents: number;
  indexed_documents: number;
  last_indexed: string | null;
}

interface IndexingResponse {
  status: string;
  message: string;
}

export const getModels = async (): Promise<Model[]> => {
  try {
    const response = await axios.get<Model[]>(`${API_BASE_URL}/models`);
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

export const getEmbeddingStatus = async (): Promise<EmbeddingStatus> => {
  try {
    const response = await axios.get<EmbeddingStatus>(`${API_BASE_URL}/embeddings/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching embedding status:', error);
    throw error;
  }
};

export const triggerIndexing = async (): Promise<IndexingResponse> => {
  try {
    const response = await axios.post<IndexingResponse>(`${API_BASE_URL}/embeddings/index`);
    return response.data;
  } catch (error) {
    console.error('Error triggering indexing:', error);
    throw error;
  }
};
