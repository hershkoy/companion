import axios from 'axios';
import { API_BASE_URL } from './config';
import {
  GetModelsResponse,
  GetEmbeddingStatusResponse,
  TriggerIndexingResponse,
} from '../types/api';

/**
 * Fetches available models from the API
 * @returns Promise with the models response
 */
export const getModels = async (): Promise<GetModelsResponse> => {
  try {
    const response = await axios.get<GetModelsResponse>(
      `${API_BASE_URL}/models`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

/**
 * Fetches the current embedding indexing status
 * @returns Promise with the embedding status response
 */
export const getEmbeddingStatus = async (): Promise<GetEmbeddingStatusResponse> => {
  try {
    const response = await axios.get<GetEmbeddingStatusResponse>(
      `${API_BASE_URL}/embeddings/status`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching embedding status:', error);
    throw error;
  }
};

/**
 * Triggers a new embedding indexing job
 * @returns Promise with the indexing job response
 */
export const triggerIndexing = async (): Promise<TriggerIndexingResponse> => {
  try {
    const response = await axios.post<TriggerIndexingResponse>(
      `${API_BASE_URL}/embeddings/index`
    );
    return response.data;
  } catch (error) {
    console.error('Error triggering indexing:', error);
    throw error;
  }
};
