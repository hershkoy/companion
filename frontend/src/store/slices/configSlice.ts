import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ConfigState } from '../../types/store';
import { ModelConfig } from '../../types/chat';

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

export const fetchModels = createAsyncThunk<ModelConfig[]>(
  'config/fetchModels',
  async () => {
    const response = await fetch('/api/models');
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    return response.json();
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
      const {
        model_name,
        thinking_mode,
        top_k,
        embed_light,
        embed_deep,
        idle_threshold,
      } = action.payload;

      if (model_name) state.currentModel = model_name;
      if (thinking_mode) state.thinkingMode = thinking_mode;
      if (top_k) state.topK = top_k;
      if (embed_light) state.embedLight = embed_light;
      if (embed_deep) state.embedDeep = embed_deep;
      if (idle_threshold) state.idleThreshold = idle_threshold;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
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
      });
  },
});

export const { updateConfig } = configSlice.actions;
export default configSlice.reducer; 