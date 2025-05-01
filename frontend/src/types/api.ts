/**
 * Base API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Message object from the API
 */
export interface ApiMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  thinking_mode?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for posting a new message
 */
export interface PostMessageRequest {
  content: string;
  thinking_mode?: string;
}

/**
 * Response from getting messages
 */
export interface GetMessagesResponse extends ApiResponse<ApiMessage[]> {}

/**
 * Response from posting a message
 */
export interface PostMessageResponse extends ApiResponse<ApiMessage> {}

/**
 * Configuration object from the API
 */
export interface ApiConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  thinking_mode: string;
  system_prompt: string;
}

/**
 * Response from getting config
 */
export interface GetConfigResponse extends ApiResponse<ApiConfig> {}

/**
 * Response from updating config
 */
export interface PutConfigResponse extends ApiResponse<ApiConfig> {}

/**
 * Model information from the API
 */
export interface ApiModel {
  id: string;
  name: string;
  provider: string;
  type: string;
  context_length: number;
}

/**
 * Response from getting models
 */
export interface GetModelsResponse extends ApiResponse<ApiModel[]> {}

/**
 * Embedding status information
 */
export interface EmbeddingStatus {
  is_indexing: boolean;
  total_documents: number;
  indexed_documents: number;
  last_indexed: string | null;
}

/**
 * Response from getting embedding status
 */
export interface GetEmbeddingStatusResponse extends ApiResponse<EmbeddingStatus> {}

/**
 * Response from triggering indexing
 */
export interface TriggerIndexingResponse extends ApiResponse<{ job_id: string }> {}

/**
 * Response from audio transcription and processing
 */
export interface AudioResponse {
  success: boolean;
  error?: string;
  transcription?: string;
  response?: {
    agentMessage: string;
    segments: Array<{
      text: string;
      audio: string;
    }>;
  };
  language?: {
    detected: string;
    probability: number;
  };
} 