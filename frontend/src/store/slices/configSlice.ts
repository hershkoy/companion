import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ConfigState } from '../../types/store';
import { ModelConfig } from '../../types/chat';
import { apiClient } from '../../api/config';

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
};

export const fetchModels = createAsyncThunk<ModelConfig[]>('config/fetchModels', async () => {
  try {
    const response = await apiClient.get<ModelConfig[]>('/models');
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
});

export const fetchConfig = createAsyncThunk<ConfigState, string>(
  'config/fetchConfig',
  async (sessionId: string) => {
    try {
      const response = await apiClient.get<ConfigState>(`/sessions/${sessionId}/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }
);

interface UpdateConfigPayload {
  model_name?: string;
  thinking_mode?: string;
  top_k?: number;
  embed_light?: string;
  embed_deep?: string;
  idle_threshold?: number;
}

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
  },
  extraReducers: builder => {
    builder
      .addCase(fetchModels.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.modelList = action.payload;
        if (!state.currentModel && action.payload.length > 0) {
          state.currentModel = action.payload[0].id;
        }
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch models';
      })
      .addCase(fetchConfig.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        return { ...state, ...action.payload, status: 'succeeded', error: null };
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch config';
      });
  },
});

export const { updateConfig } = configSlice.actions;
export default configSlice.reducer;
