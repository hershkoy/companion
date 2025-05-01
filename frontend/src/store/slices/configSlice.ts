import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ConfigState } from '../../types/store';
import { ModelConfig } from '../../types/chat';
import { apiClient } from '../../api/config';

interface ModelsResponse {
  models: Array<ModelConfig>;
  current_model: string;
  service: string;
  success: boolean;
}

interface ConfigResponse {
  model_name?: string;
  thinking_mode?: string;
  top_k?: number;
  embed_light?: string;
  embed_deep?: string;
  idle_threshold?: number;
}

interface UpdateConfigPayload {
  model_name?: string;
  thinking_mode?: string;
  top_k?: number;
  embed_light?: string;
  embed_deep?: string;
  idle_threshold?: number;
}

const initialState: ConfigState = {
  modelList: [],
  currentModel: '',
  thinkingMode: 'cot',
  topK: 3,
  embedLight: '',
  embedDeep: '',
  idleThreshold: 300,
  status: 'idle',
  error: null,
  isInitialized: false,
  currentRequest: null
};

export const fetchModels = createAsyncThunk<ModelsResponse, void, { state: { config: ConfigState } }>(
  'config/fetchModels',
  async (_, { signal, getState }) => {
    try {
      // Cancel previous request if it exists
      const state = getState();
      if (state.config.currentRequest) {
        state.config.currentRequest.abort();
      }

      // Create new AbortController
      const controller = new AbortController();
      state.config.currentRequest = controller;

      const response = await apiClient.get<ModelsResponse>('/models', { signal: controller.signal });
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        throw error;
      }
      console.error('Error fetching models:', error);
      throw error;
    }
  }
);

export const fetchConfig = createAsyncThunk<UpdateConfigPayload, string, { state: { config: ConfigState } }>(
  'config/fetchConfig',
  async (sessionId, { signal, getState }) => {
    try {
      // Cancel previous request if it exists
      const state = getState();
      if (state.config.currentRequest) {
        state.config.currentRequest.abort();
      }

      // Create new AbortController
      const controller = new AbortController();
      state.config.currentRequest = controller;

      const response = await apiClient.get<UpdateConfigPayload>(`/config/${sessionId}`, { signal: controller.signal });
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        throw error;
      }
      console.error('Error fetching config:', error);
      throw error;
    }
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    updateConfig: (state, action: PayloadAction<UpdateConfigPayload>) => {
      const { model_name, thinking_mode, top_k, embed_light, embed_deep, idle_threshold } =
        action.payload;

      if (model_name) state.currentModel = model_name;
      if (thinking_mode) state.thinkingMode = thinking_mode;
      if (top_k) state.topK = top_k;
      if (embed_light) state.embedLight = embed_light;
      if (embed_deep) state.embedDeep = embed_deep;
      if (idle_threshold) state.idleThreshold = idle_threshold;
    },
    resetInitialization: (state) => {
      state.isInitialized = false;
      if (state.currentRequest) {
        state.currentRequest.abort();
        state.currentRequest = null;
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchModels.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.modelList = action.payload.models;
        if (!state.currentModel && action.payload.models.length > 0) {
          state.currentModel = action.payload.current_model || action.payload.models[0].id;
        }
        state.currentRequest = null;
      })
      .addCase(fetchModels.rejected, (state, action) => {
        if (action.error.name === 'CanceledError') {
          return;
        }
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch models';
        state.currentRequest = null;
      })
      .addCase(fetchConfig.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.isInitialized = true;
        state.currentRequest = null;
        
        // Only update specific fields from the config response
        if (action.payload.model_name) state.currentModel = action.payload.model_name;
        if (action.payload.thinking_mode) state.thinkingMode = action.payload.thinking_mode;
        if (action.payload.top_k) state.topK = action.payload.top_k;
        if (action.payload.embed_light) state.embedLight = action.payload.embed_light;
        if (action.payload.embed_deep) state.embedDeep = action.payload.embed_deep;
        if (action.payload.idle_threshold) state.idleThreshold = action.payload.idle_threshold;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        if (action.error.name === 'CanceledError') {
          return;
        }
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch config';
        state.currentRequest = null;
      });
  },
});

export const { updateConfig, resetInitialization } = configSlice.actions;
export default configSlice.reducer;
