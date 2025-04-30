import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchModels = createAsyncThunk('config/fetchModels', async () => {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
});

export const fetchConfig = createAsyncThunk('config/fetchConfig', async sessionId => {
  const response = await fetch(`/api/config/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
});

export const updateConfig = createAsyncThunk(
  'config/updateConfig',
  async ({ sessionId, config }) => {
    const response = await fetch(`/api/config/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error('Failed to update config');
    }
    return response.json();
  }
);

const initialState = {
  modelList: [],
  currentModel: '',
  thinkingMode: 'hybrid',
  topK: 5,
  embedLight: 'all-MiniLM-L6-v2',
  embedDeep: 'sentence-transformers/7b',
  idleThreshold: 600,
  status: 'idle',
  error: null,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setThinkingMode: (state, action) => {
      state.thinkingMode = action.payload;
    },
    setTopK: (state, action) => {
      state.topK = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch models cases
      .addCase(fetchModels.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.modelList = action.payload;
        if (!state.currentModel && action.payload.length > 0) {
          state.currentModel = action.payload[0];
        }
        state.error = null;
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch config cases
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.currentModel = action.payload.model_name;
        state.thinkingMode = action.payload.thinking_mode;
        state.topK = action.payload.top_k;
        state.embedLight = action.payload.embed_light;
        state.embedDeep = action.payload.embed_deep;
        state.idleThreshold = action.payload.idle_threshold_s;
        state.error = null;
      })
      // Update config cases
      .addCase(updateConfig.fulfilled, (state, action) => {
        state.currentModel = action.payload.model_name;
        state.thinkingMode = action.payload.thinking_mode;
        state.topK = action.payload.top_k;
        state.embedLight = action.payload.embed_light;
        state.embedDeep = action.payload.embed_deep;
        state.idleThreshold = action.payload.idle_threshold_s;
        state.error = null;
      });
  },
});

export const { setThinkingMode, setTopK } = configSlice.actions;
export default configSlice.reducer;
