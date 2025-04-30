import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const pollGpuStatus = createAsyncThunk('gpu/pollStatus', async () => {
  const response = await fetch('/api/embeddings/status');
  if (!response.ok) {
    throw new Error('Failed to fetch GPU status');
  }
  return response.json();
});

export const triggerIndexing = createAsyncThunk('gpu/triggerIndexing', async () => {
  const response = await fetch('/api/embeddings/index', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to trigger indexing');
  }
  return response.json();
});

const initialState = {
  isIndexing: false,
  gpuUtilization: 0,
  lastIndexingStart: null,
  status: 'idle',
  error: null,
};

const gpuSlice = createSlice({
  name: 'gpu',
  initialState,
  reducers: {
    resetError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Poll status cases
      .addCase(pollGpuStatus.pending, state => {
        state.status = 'loading';
      })
      .addCase(pollGpuStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isIndexing = action.payload.is_indexing;
        state.gpuUtilization = action.payload.gpu_utilization;
        state.error = null;
      })
      .addCase(pollGpuStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Trigger indexing cases
      .addCase(triggerIndexing.pending, state => {
        state.status = 'loading';
      })
      .addCase(triggerIndexing.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isIndexing = true;
        state.lastIndexingStart = new Date().toISOString();
        state.error = null;
      })
      .addCase(triggerIndexing.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { resetError } = gpuSlice.actions;
export default gpuSlice.reducer;
