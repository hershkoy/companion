import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ConfigState } from '../../types/store';
import { ModelConfig } from '../../types/chat';
import { apiClient } from '../../api/config';

// Keep track of current requests outside of Redux state
let currentModelsRequest: AbortController | null = null;
let currentConfigRequest: AbortController | null = null;

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
  isInitialized: false
};

export const fetchModels = createAsyncThunk<ModelsResponse, void>(
  'config/fetchModels',
  async (_, { signal }) => {
    try {
      // Cancel previous request if it exists
      if (currentModelsRequest) {
        console.log('[Config] Aborting previous models request');
        currentModelsRequest.abort();
      }

      // Create new AbortController
      currentModelsRequest = new AbortController();
      console.log('[Config] Fetching models from API');

      const response = await apiClient.get<ModelsResponse>('/models', {
        signal: currentModelsRequest.signal
      });

      console.log('[Config] Models API response:', response.data);
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        console.log('[Config] Models request was canceled');
        throw error;
      }
      console.error('[Config] Error fetching models:', error);
      throw error;
    } finally {
      currentModelsRequest = null;
    }
  }
);

export const fetchConfig = createAsyncThunk<UpdateConfigPayload, string>(
  'config/fetchConfig',
  async (sessionId, { signal }) => {
    try {
      // Cancel previous request if it exists
      if (currentConfigRequest) {
        console.log('[Config] Aborting previous config request');
        currentConfigRequest.abort();
      }

      // Create new AbortController
      currentConfigRequest = new AbortController();
      console.log('[Config] Fetching config for session:', sessionId);

      const response = await apiClient.get<UpdateConfigPayload>(`/sessions/${sessionId}/config`, {
        signal: currentConfigRequest.signal
      });

      console.log('[Config] Config API response:', response.data);
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        console.log('[Config] Config request was canceled');
        throw error;
      }
      console.error('[Config] Error fetching config:', error);
      throw error;
    } finally {
      currentConfigRequest = null;
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

      console.log('[Config] Updating config with:', action.payload);

      if (model_name) state.currentModel = model_name;
      if (thinking_mode) state.thinkingMode = thinking_mode;
      if (top_k) state.topK = top_k;
      if (embed_light) state.embedLight = embed_light;
      if (embed_deep) state.embedDeep = embed_deep;
      if (idle_threshold) state.idleThreshold = idle_threshold;
    },
    resetInitialization: (state) => {
      console.log('[Config] Resetting initialization state');
      state.isInitialized = false;
      // Abort any pending requests
      if (currentModelsRequest) {
        currentModelsRequest.abort();
        currentModelsRequest = null;
      }
      if (currentConfigRequest) {
        currentConfigRequest.abort();
        currentConfigRequest = null;
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchModels.pending, state => {
        console.log('[Config] Models fetch pending');
        state.status = 'loading';
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        console.log('[Config] Models fetch succeeded:', action.payload);
        state.status = 'succeeded';
        state.modelList = action.payload.models;
        if (!state.currentModel && action.payload.models.length > 0) {
          state.currentModel = action.payload.current_model || action.payload.models[0].id;
        }
      })
      .addCase(fetchModels.rejected, (state, action) => {
        if (action.error.name === 'CanceledError') {
          console.log('[Config] Models fetch canceled');
          return;
        }
        console.error('[Config] Models fetch failed:', action.error);
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch models';
      })
      .addCase(fetchConfig.pending, state => {
        console.log('[Config] Config fetch pending');
        state.status = 'loading';
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        console.log('[Config] Config fetch succeeded:', action.payload);
        state.status = 'succeeded';
        state.error = null;
        state.isInitialized = true;
        
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
          console.log('[Config] Config fetch canceled');
          return;
        }
        console.error('[Config] Config fetch failed:', action.error);
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch config';
      });
  },
});

export const { updateConfig, resetInitialization } = configSlice.actions;
export default configSlice.reducer;
